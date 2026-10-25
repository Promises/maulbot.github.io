import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {fetchActiveLobbies, fetchHealth, fetchLobbyHistory, HistoryWindow} from './api';
import {FeedTopic, subscribeFeed} from './feed';
import {isOurs} from './format';
import {applyEvent, fromSnapshot, LiveSet, openLobbies, prune} from './liveSet';
import {groupSessions} from './sessions';
import {LobbyAdvert, LobbySession, TrackerHealth} from './types';

/** `unavailable`: the tracker is down or restarting, so an empty list would say nothing. */
export type LobbyStatus = 'loading' | 'ready' | 'unavailable';

/** How often the open lobbies are read over REST while the live feed is unreachable. */
export const POLL_MS = 30 * 1000;

// How long the live feed gets to send its first snapshot before the list is read over REST instead.
const FEED_WAIT_MS = 8 * 1000;

// How often "open for" and "updated … ago" move on, and ended adverts are let go.
const TICK_MS = 5 * 1000;

// The history is asked for a day at a time, the API's own default span for our map.
const HISTORY_WINDOW_MS = 24 * 60 * 60 * 1000;

// This many days in a row without a lobby on our map end the history.
const QUIET_DAYS_TO_END = 7;

const iso = (time: number) => new Date(time).toISOString();

const UNREACHABLE: TrackerHealth = {status: 'unreachable'};

/** The current time, moving on every `intervalMs`. */
export function useNow(intervalMs: number = TICK_MS): number {
    const [now, setNow] = useState(Date.now);
    useEffect(() => {
        const timer = setInterval(() => setNow(Date.now()), intervalMs);
        return () => clearInterval(timer);
    }, [intervalMs]);
    return now;
}

export interface LiveLobbiesState {
    status: LobbyStatus;
    /** The open lobbies, newest first. */
    lobbies: LobbySession[];
    /** When the list last changed or was read; null before the first time. */
    updatedAt: number | null;
    /** The time "open for" and "updated … ago" are reckoned from, moving on every few seconds. */
    now: number;
    /** True while the list comes in live over the feed, false while it is read every `POLL_MS`. */
    live: boolean;
    refresh: () => void;
}

/**
 * The open lobbies kept current from the tracker's live feed: its snapshot, then each change as it
 * happens. While the feed cannot be reached the list is read over REST every `POLL_MS` instead,
 * until the feed is back. `keep` picks the lobbies to show, and must not change between renders.
 */
function useLiveFeed(topic: FeedTopic, keep: (advert: Pick<LobbyAdvert, 'map_name' | 'map_file'>) => boolean): LiveLobbiesState {
    const [set, setSet] = useState<LiveSet>(() => new Map());
    const [health, setHealth] = useState<TrackerHealth | null>(null);
    const [updatedAt, setUpdatedAt] = useState<number | null>(null);
    const [live, setLive] = useState(false);
    const [generation, setGeneration] = useState(0);
    const now = useNow();
    // Feed events older than the list they would change are already in it.
    const asOf = useRef(0);
    const polling = useRef<ReturnType<typeof setInterval> | null>(null);
    const mounted = useMounted();

    const replace = useCallback((lobbies: LobbyAdvert[], at: number, status: TrackerHealth) => {
        asOf.current = at;
        setSet(fromSnapshot(lobbies.filter(keep)));
        setHealth(status);
        setUpdatedAt(Date.now());
    }, [keep]);

    const readOverRest = useCallback(async () => {
        const at = Date.now();
        try {
            const lobbies = (await fetchActiveLobbies()).filter(keep);
            // The health only matters when the list is empty: is that real, or is the tracker down?
            const status = lobbies.length > 0 ? {status: 'ok'} : await fetchHealth().catch(() => UNREACHABLE);
            mounted.current && replace(lobbies, at, status);
        } catch {
            // A failed read keeps what was last shown; with nothing shown yet, the list is unavailable.
            mounted.current && setHealth((current) => current ?? UNREACHABLE);
        }
    }, [keep, replace, mounted]);

    const stopPolling = useCallback(() => {
        if (polling.current) {
            clearInterval(polling.current);
            polling.current = null;
        }
    }, []);

    const startPolling = useCallback(() => {
        if (polling.current) {
            return;
        }
        readOverRest();
        polling.current = setInterval(() => !document.hidden && readOverRest(), POLL_MS);
    }, [readOverRest]);

    useEffect(() => {
        const wait = setTimeout(startPolling, FEED_WAIT_MS);
        const unsubscribe = subscribeFeed(topic, {
            snapshot: (snapshot) => {
                clearTimeout(wait);
                stopPolling();
                setLive(true);
                replace(snapshot.lobbies, Date.parse(snapshot.as_of), snapshot.health);
            },
            event: (kind, event, lobby) => {
                if (Date.parse(event.ts) < asOf.current || !keep(lobby)) {
                    return;
                }
                setSet((current) => applyEvent(current, kind, lobby));
                setUpdatedAt(Date.now());
            },
            health: setHealth,
            lost: () => {
                setLive(false);
                startPolling();
            },
        });
        return () => {
            clearTimeout(wait);
            unsubscribe();
            stopPolling();
        };
    }, [topic, generation, keep, replace, startPolling, stopPolling]);

    // Lets go of adverts that ended and were not followed by a re-list.
    useEffect(() => {
        setSet((current) => prune(current, now));
    }, [now]);

    const lobbies = useMemo(() => openLobbies(set, now), [set, now]);
    let status: LobbyStatus = 'ready';
    if (health === null) {
        status = 'loading';
    } else if (lobbies.length === 0 && health.status !== 'ok') {
        status = 'unavailable';
    }

    // Live, a fresh join brings a fresh snapshot; otherwise read the list now.
    const refresh = useCallback(() => (live ? setGeneration((g) => g + 1) : readOverRest()), [live, readOverRest]);

    return {status, lobbies, updatedAt, now, live, refresh};
}

const everyLobby = () => true;

/** Our map's open lobbies, the fullest first. */
export function useOurLobbies(): LiveLobbiesState {
    const state = useLiveFeed('lobbies:our_map', isOurs);
    const lobbies = useMemo(() => [...state.lobbies].sort((a, b) => b.players - a.players), [state.lobbies]);
    return {...state, lobbies};
}

/** Every open lobby on every map, newest first. */
export function useLiveLobbies(): LiveLobbiesState {
    return useLiveFeed('lobbies:all', everyLobby);
}

interface HistoryCursor extends HistoryWindow {
    /** True for the first page of a day, false for the rest of a day that held more than a page. */
    fresh: boolean;
    /** Days in a row before this one that had no lobby on our map. */
    quietDays: number;
}

function dayBefore(until: number, quietDays: number): HistoryCursor {
    return {since: iso(until - HISTORY_WINDOW_MS), until: iso(until), fresh: true, quietDays};
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
 * Our map's lobby history, read a day at a time going back: the last day up front, older ones
 * through `loadOlder`. A week of days without a lobby ends it.
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
            setCursor({...from, until: page.continueUntil, fresh: false});
            return;
        }
        const quietDays = from.fresh && page.adverts.length === 0 ? from.quietDays + 1 : 0;
        setCursor(quietDays >= QUIET_DAYS_TO_END ? null : dayBefore(Date.parse(from.since), quietDays));
    }, [mounted]);

    useEffect(() => {
        loadPage(dayBefore(Date.now(), 0))
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
