import {FeedLobby, LobbyAdvert, LobbySession} from './types';

/**
 * How long an ended advert still counts as an open lobby. A lobby keeps one advert for life, but
 * a tracker restart ends every open lobby's advert and lists it again under a new one: a gap of a
 * few seconds, plus up to three of batching on the tracker. Without this the join panel's card
 * would blink out then; lobbies that really closed linger this long instead.
 */
export const FEED_RELIST_GRACE_MS = 10 * 1000;

/** The open lobbies' adverts by id, as a snapshot and the events after it describe them. */
export type LiveSet = ReadonlyMap<string, LobbyAdvert>;

export function fromSnapshot(lobbies: LobbyAdvert[]): LiveSet {
    return new Map(lobbies.map((lobby) => [lobby.instance_id, lobby]));
}

/**
 * The set after one feed event. `appeared`, `meta` and `players` add or update the advert; `ended`
 * marks it ended, and it stays in the set a little longer, since after a tracker restart the lobby
 * comes back under a new advert. Events carry the count as `players`, and only when they
 * have one.
 */
export function applyEvent(set: LiveSet, kind: string, lobby: FeedLobby): LiveSet {
    const known = set.get(lobby.instance_id);
    const {players, ...fields} = lobby;
    const next = new Map(set);
    next.set(lobby.instance_id, {
        ...known,
        ...fields,
        final_players: players ?? known?.final_players ?? 1,
        ended_at: kind === 'ended' ? lobby.ended_at ?? new Date().toISOString() : lobby.ended_at,
    });
    return next;
}

/** The set without adverts that ended longer ago than a re-list takes; the same set if none did. */
export function prune(set: LiveSet, now: number): LiveSet {
    const gone = Array.from(set.values())
        .filter((advert) => advert.ended_at && now - Date.parse(advert.ended_at) >= FEED_RELIST_GRACE_MS);
    if (gone.length === 0) {
        return set;
    }
    const next = new Map(set);
    gone.forEach((advert) => next.delete(advert.instance_id));
    return next;
}

const keyOf = (advert: LobbyAdvert) => [advert.host, advert.name, advert.map_file, advert.region].join('\u0000');

/**
 * The open lobbies in the set, one per lobby however many of its adverts are in it, newest first.
 * A lobby counts from its first advert (`session_first_seen`), and one whose advert just ended stays
 * for the moment until the next appears. Adverts without a name or host are left out.
 */
export function openLobbies(set: LiveSet, now: number): LobbySession[] {
    const byLobby = new Map<string, LobbyAdvert[]>();
    set.forEach((advert) => {
        if (advert.name && advert.host) {
            const key = keyOf(advert);
            byLobby.set(key, [...(byLobby.get(key) ?? []), advert]);
        }
    });

    const lobbies: LobbySession[] = [];
    byLobby.forEach((adverts) => {
        const newest = adverts.reduce((a, b) => (b.first_seen > a.first_seen ? b : a));
        if (newest.ended_at && now - Date.parse(newest.ended_at) >= FEED_RELIST_GRACE_MS) {
            return;
        }
        const openedAt = adverts
            .map((advert) => advert.session_first_seen ?? advert.first_seen)
            .reduce((a, b) => (b < a ? b : a));
        lobbies.push({advert: newest, openedAt, closedAt: null, players: newest.final_players});
    });
    return lobbies.sort((a, b) => Date.parse(b.openedAt) - Date.parse(a.openedAt));
}
