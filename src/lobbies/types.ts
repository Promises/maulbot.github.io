/**
 * One advert of a lobby as the tracker saw it in Battle.net's custom game list. WC3 re-lists
 * every public lobby under a new id about every 90 seconds, so one real lobby is a chain of
 * these rows; `sessions.ts` joins them back up.
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
}

export interface TrackerHealth {
    status: string;
    current_live_lobbies: number;
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
