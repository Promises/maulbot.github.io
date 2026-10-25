import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {fetchActiveLobbies, fetchHealth, fetchLobbyHistory, HistoryWindow} from './api';
import {groupSessions, isOpen} from './sessions';
import {LobbyAdvert, LobbySession} from './types';

/** `unavailable`: the tracker is down or restarting, so an empty list would say nothing. */
export type LobbyStatus = 'loading' | 'ready' | 'unavailable';

export const POLL_MS = 30 * 1000;

// How far back the open lobbies' first adverts are looked for, which bounds "open for".
const OPEN_LOOKBACK_MS = 12 * 60 * 60 * 1000;

// The history is asked for a week at a time, the API's own default span.
const HISTORY_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

const iso = (time: number) => new Date(time).toISOString();

/**
 * Whether the tracker is seeing Battle.net's list. Its client restarts now and then, and while it
 * is down the list is empty or frozen.
 */
async function trackerIsUp(): Promise<boolean> {
    try {
        const health = await fetchHealth();
        return health.status === 'ok' && health.current_live_lobbies > 0;
    } catch {
        return false;
    }
}

/** Runs `load` now and every `POLL_MS` after, skipping the ticks while the tab is hidden. */
function usePolling(load: () => void): void {
    const latest = useRef(load);
    latest.current = load;
    useEffect(() => {
        latest.current();
        const timer = setInterval(() => !document.hidden && latest.current(), POLL_MS);
        return () => clearInterval(timer);
    }, []);
}

export interface OurLobbiesState {
    status: LobbyStatus;
    /** Our open lobbies, the fullest first. */
    lobbies: LobbySession[];
    /** When the list was read, for "open for". */
    readAt: number;
}

/** Our map's open lobbies, read every `POLL_MS`. */
export function useOurLobbies(): OurLobbiesState {
    const [state, setState] = useState<OurLobbiesState>({status: 'loading', lobbies: [], readAt: Date.now()});
    const mounted = useMounted();

    usePolling(async () => {
        const now = Date.now();
        try {
            const {adverts} = await fetchLobbyHistory({since: iso(now - OPEN_LOOKBACK_MS)});
            const lobbies = groupSessions(adverts)
                .filter((session) => isOpen(session, now))
                .sort((a, b) => b.players - a.players);
            const status = lobbies.length > 0 || await trackerIsUp() ? 'ready' : 'unavailable';
            mounted.current && setState({status, lobbies, readAt: now});
        } catch {
            // One failed poll keeps what was last shown; only a first load turns unavailable.
            mounted.current && setState((current) => current.status === 'loading'
                ? {status: 'unavailable', lobbies: [], readAt: now}
                : current);
        }
    });

    return state;
}

interface HistoryCursor extends HistoryWindow {
    /** True for the first page of a week, so an empty one can end the history. */
    fresh: boolean;
}

function weekBefore(until: number): HistoryCursor {
    return {since: iso(until - HISTORY_WINDOW_MS), until: iso(until), fresh: true};
}

export interface LobbyLogState {
    status: LobbyStatus;
    /** Every lobby read so far on our map, newest first, the open ones included. */
    lobbies: LobbySession[];
    /** Whether older history is left to read. */
    hasOlder: boolean;
    loadingOlder: boolean;
    loadOlder: () => void;
}

/**
 * Our map's lobby history, read a page at a time going back: the newest page up front, older
 * ones through `loadOlder`. A week with no adverts at all ends it.
 */
export function useLobbyLog(): LobbyLogState {
    const [status, setStatus] = useState<LobbyStatus>('loading');
    const [adverts, setAdverts] = useState<LobbyAdvert[]>([]);
    const [cursor, setCursor] = useState<HistoryCursor | null>(null);
    const [loadingOlder, setLoadingOlder] = useState(false);
    const mounted = useMounted();

    const loadPage = useCallback(async (from: HistoryCursor) => {
        const page = await fetchLobbyHistory(from);
        if (!mounted.current) {
            return;
        }
        setAdverts((current) => [...current, ...page.adverts]);
        if (page.continueUntil) {
            setCursor({since: from.since, until: page.continueUntil, fresh: false});
        } else if (from.fresh && page.listed === 0) {
            setCursor(null);
        } else {
            setCursor(weekBefore(Date.parse(from.since)));
        }
    }, [mounted]);

    useEffect(() => {
        loadPage(weekBefore(Date.now()))
            .then(() => mounted.current && setStatus('ready'))
            .catch(() => mounted.current && setStatus('unavailable'));
    }, [loadPage, mounted]);

    const loadOlder = useCallback(() => {
        if (!cursor || loadingOlder || status !== 'ready') {
            return;
        }
        setLoadingOlder(true);
        loadPage(cursor)
            .catch(() => mounted.current && setCursor(null))
            .finally(() => mounted.current && setLoadingOlder(false));
    }, [cursor, loadingOlder, status, loadPage, mounted]);

    const lobbies = useMemo(() => groupSessions(adverts), [adverts]);
    return {status, lobbies, hasOlder: cursor !== null, loadingOlder, loadOlder};
}

export interface LiveLobby {
    advert: LobbyAdvert;
    /**
     * When it opened, as far as this page has seen: WC3 re-lists every lobby under a new advert
     * about every 90 seconds, so a lobby that was already up when the page loaded counts from then.
     */
    openedAt: string;
}

export interface LiveLobbiesState {
    status: LobbyStatus;
    lobbies: LiveLobby[];
    /** When the list was last read; null before the first read. */
    updatedAt: number | null;
    refresh: () => void;
}

const lobbyKey = (advert: LobbyAdvert) => [advert.host, advert.name, advert.map_file, advert.region].join('\u0000');

interface TrackedLobby extends LiveLobby {
    readAt: number;
}

/**
 * Every open lobby on every map, read every `POLL_MS` and on `refresh`. A lobby missing from one
 * read stays listed until the next, since a read can fall between two of its adverts.
 */
export function useLiveLobbies(): LiveLobbiesState {
    const [state, setState] = useState<Omit<LiveLobbiesState, 'refresh'>>({status: 'loading', lobbies: [], updatedAt: null});
    const tracked = useRef(new Map<string, TrackedLobby>());
    const mounted = useMounted();

    const load = useCallback(async () => {
        try {
            const adverts = (await fetchActiveLobbies()).filter((advert) => advert.name && advert.host);
            const now = Date.now();
            const next = new Map<string, TrackedLobby>();
            for (const advert of adverts) {
                const key = lobbyKey(advert);
                const earlier = tracked.current.get(key)?.openedAt;
                const openedAt = earlier && earlier < advert.first_seen ? earlier : advert.first_seen;
                next.set(key, {advert, openedAt, readAt: now});
            }
            tracked.current.forEach((lobby, key) => {
                if (!next.has(key) && now - lobby.readAt <= POLL_MS * 1.5) {
                    next.set(key, lobby);
                }
            });
            tracked.current = next;
            const lobbies = Array.from(next.values()).map(({advert, openedAt}) => ({advert, openedAt}));
            const status = adverts.length > 0 || await trackerIsUp() ? 'ready' : 'unavailable';
            mounted.current && setState({status, lobbies, updatedAt: now});
        } catch {
            mounted.current && setState((current) => ({...current, status: current.updatedAt ? current.status : 'unavailable'}));
        }
    }, [mounted]);

    usePolling(load);
    return {...state, refresh: load};
}

function useMounted() {
    const mounted = useRef(true);
    useEffect(() => {
        mounted.current = true;
        return () => {
            mounted.current = false;
        };
    }, []);
    return mounted;
}
