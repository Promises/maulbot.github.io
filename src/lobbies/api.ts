import {LobbyAdvert, TrackerHealth} from './types';
import {isOurs} from './format';

/**
 * Our lobby tracker's public, read-only API. A signed-in WC3 client reads Battle.net's custom
 * game list and the API serves what it saw. No auth, CORS open to any origin, about 10 requests
 * a second per visitor.
 */
const API_ROOT = 'https://wc3.henning.tech/v1';

/** The most adverts one history request returns. */
export const HISTORY_PAGE_SIZE = 1000;

// The API matches `map_like` anywhere in the map's name or file, ignoring case. Every spelling of
// our map contains "reimagined"; `isOurs` then drops other maps that happen to as well.
const OUR_MAP_FILTER = 'reimagined';

async function getJson<T>(path: string): Promise<T> {
    const response = await fetch(`${API_ROOT}${path}`);
    if (!response.ok) {
        throw new Error(`Lobby tracker request failed (${response.status}) for ${path}`);
    }
    return response.json() as Promise<T>;
}

/** Whether the tracker is seeing the list right now; its client restarts now and then. */
export function fetchHealth(): Promise<TrackerHealth> {
    return getJson<TrackerHealth>('/health');
}

/** Every lobby listed right now, on any map. */
export async function fetchActiveLobbies(): Promise<LobbyAdvert[]> {
    const {data} = await getJson<{data: LobbyAdvert[]}>('/lobbies?live=true');
    return data;
}

export interface HistoryWindow {
    /** Only adverts first listed at or after this time. */
    since: string;
    /** Only adverts first listed before this time; now when left out. */
    until?: string;
}

export interface HistoryPage {
    /** Adverts on our map, the open ones included, newest first. */
    adverts: LobbyAdvert[];
    /** How many adverts the API returned before other maps were dropped. */
    listed: number;
    /**
     * Set when the window held more than one page: the first-listed time of the oldest advert
     * returned, to ask for the rest of the window with as `until`.
     */
    continueUntil: string | null;
}

/** Adverts on our map listed in the window, at most `HISTORY_PAGE_SIZE` of them, newest first. */
export async function fetchLobbyHistory(window: HistoryWindow): Promise<HistoryPage> {
    const params = new URLSearchParams({map_like: OUR_MAP_FILTER, limit: String(HISTORY_PAGE_SIZE), since: window.since});
    if (window.until) {
        params.set('until', window.until);
    }
    const {data} = await getJson<{data: LobbyAdvert[]}>(`/lobbies?${params}`);
    const oldest = data.reduce<string | null>(
        (min, advert) => (min === null || advert.first_seen < min ? advert.first_seen : min), null);
    return {
        adverts: data.filter(isOurs),
        listed: data.length,
        continueUntil: data.length >= HISTORY_PAGE_SIZE ? oldest : null,
    };
}
