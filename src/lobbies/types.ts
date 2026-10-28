/**
 * One advert of a lobby as the tracker saw it in Battle.net's custom game list. A lobby can be
 * several of these rows, each under a new id: until 2026-10-25 14:41 UTC the tracker made WC3
 * re-issue every lobby about every 90 seconds, and a tracker restart still re-lists every open
 * lobby once. `sessions.ts` joins them back up.
 *
 * Every field but the id can be null on a row captured before WC3 sent the lobby's details.
 */
export interface LobbyAdvert {
    instance_id: string;
    name: string | null;
    /** Battle tag, e.g. "MaulBot#2824". */
    host: string | null;
    map_name: string | null;
    map_file: string | null;
    /** "eu", "usw" or "kr". */
    region: string | null;
    /** Players in the lobby, the host's own slot included: the current count while it is open. */
    final_players: number;
    max_players: number;
    first_seen: string;
    last_seen: string;
    /** Null while the advert is still listed. */
    ended_at: string | null;
    /** When the game started. The tracker cannot see that yet, so this is always null for now. */
    created_time: string | null;
    /**
     * On open lobbies: when the lobby's first advert was listed, across all its re-lists, as the
     * tracker joins them up. Absent on history rows.
     */
    session_first_seen?: string | null;
    /**
     * The tracker's verdict when it was read: `live`, `ended`, or `lost` (never seen to end, and not
     * seen since its live window passed, with `last_seen` the last time it was listed).
     */
    state?: 'live' | 'ended' | 'lost';
    /** Whether the lobby has a password: null where the tracker did not record it. */
    locked?: boolean | null;
}

/** "ok", "stale" (no news from Battle.net for a while), "no_live_lobbies" or "db_unavailable". */
export interface TrackerHealth {
    status: string;
    current_live_lobbies?: number;
    /** How long a lobby may go without news and still count as open, in seconds. */
    live_window_s?: number;
}

/** A lobby in a live-feed event: the advert with `players`, when the event has a count, for `final_players`. */
export type FeedLobby = Omit<LobbyAdvert, 'final_players'> & {players?: number};

export interface FeedEvent {
    instance_id: string;
    ts: string;
    kind: string;
}

/** What the live feed pushes right after joining: the open lobbies as of `as_of`. */
export interface FeedSnapshot {
    as_of: string;
    health: TrackerHealth;
    lobbies: LobbyAdvert[];
}

/** One real lobby: the adverts of the same host, name, map and region, joined end to start. */
export interface LobbySession {
    /** Its newest advert, which carries the name, host, map, region and slot count. */
    advert: LobbyAdvert;
    /** When its first advert was listed. */
    openedAt: string;
    /** When its last advert left the list; null while it is still open. */
    closedAt: string | null;
    /** Players now while it is open, the most it reached once it has closed. */
    players: number;
}
