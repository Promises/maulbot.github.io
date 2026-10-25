import {LobbyAdvert, LobbySession} from './types';

/**
 * How long after one advert leaves the list the next one may appear and still be the same lobby.
 * WC3 re-lists a lobby within seconds, but the tracker's client restarts now and then and loses a
 * minute or two of the list. Our host bot numbers every new lobby ("beta #4"), so a lobby of the
 * same name, host, map and region that soon after is a re-list, not a new one.
 */
export const RELIST_GAP_MS = 5 * 60 * 1000;

/**
 * How long a lobby still counts as open after its advert left the list: long enough to cover the
 * few seconds before WC3 lists it again, so a poll that lands in that gap does not drop it.
 */
export const RELIST_GRACE_MS = 20 * 1000;

const keyOf = (advert: LobbyAdvert) => [advert.host, advert.name, advert.map_file, advert.region].join('\u0000');

/**
 * Joins adverts into the lobbies they belong to, newest first. Adverts without a name or host
 * (captured before WC3 sent the details) are left out, and an advert seen twice counts once.
 */
export function groupSessions(adverts: LobbyAdvert[]): LobbySession[] {
    const unique = new Map<string, LobbyAdvert>();
    for (const advert of adverts) {
        if (advert.name && advert.host) {
            unique.set(advert.instance_id, advert);
        }
    }
    const oldestFirst = Array.from(unique.values()).sort((a, b) => Date.parse(a.first_seen) - Date.parse(b.first_seen));

    const chains: LobbyAdvert[][] = [];
    const openChains = new Map<string, LobbyAdvert[]>();
    for (const advert of oldestFirst) {
        const key = keyOf(advert);
        const chain = openChains.get(key);
        const last = chain?.[chain.length - 1];
        const continues = last !== undefined
            && (last.ended_at === null || Date.parse(advert.first_seen) - Date.parse(last.ended_at) <= RELIST_GAP_MS);
        if (chain && continues) {
            chain.push(advert);
        } else {
            const fresh = [advert];
            chains.push(fresh);
            openChains.set(key, fresh);
        }
    }

    return chains
        .map((chain): LobbySession => {
            const newest = chain[chain.length - 1];
            return {
                advert: newest,
                openedAt: chain[0].first_seen,
                closedAt: newest.ended_at,
                players: newest.ended_at === null ? newest.final_players : Math.max(...chain.map((a) => a.final_players)),
            };
        })
        .sort((a, b) => Date.parse(b.openedAt) - Date.parse(a.openedAt));
}

/** Whether the lobby is still open, allowing for the moment between two of its adverts. */
export function isOpen(session: LobbySession, now: number = Date.now()): boolean {
    return session.closedAt === null || now - Date.parse(session.closedAt) < RELIST_GRACE_MS;
}
