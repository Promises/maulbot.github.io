import {LobbyAdvert, LobbySession} from './types';

/**
 * How long after one advert leaves the list the next one may appear and still be the same lobby.
 * The history before 2026-10-25 14:41 UTC re-lists every lobby within seconds, about every 90
 * seconds (the tracker re-sent its list request), and a tracker restart loses a minute or two of
 * the list. Our host bot numbers every new lobby ("beta #4"), so a lobby of the same name, host,
 * map and region that soon after is a re-list, not a new one.
 */
export const RELIST_GAP_MS = 5 * 60 * 1000;

/**
 * How long a lobby still counts as open after its advert left the list: long enough to cover the
 * few seconds before a re-list's new advert appears.
 */
export const RELIST_GRACE_MS = 20 * 1000;

const keyOf = (advert: LobbyAdvert) => [advert.host, advert.name, advert.map_file, advert.region].join('\u0000');

export interface GroupingClock {
    now: number;
    /**
     * The tracker's live window: how long a lobby may go without news and still be open. A quiet
     * lobby's `last_seen` stands still, so this is the tracker's to say, not a fixed figure.
     */
    liveWindowMs?: number;
}

/**
 * When the advert left the list: its end, or for one the tracker never saw end (its client
 * restarted at the wrong moment), when it was last seen. The tracker calls such an advert `lost`
 * when it was read; one that went past the live window since then counts as lost too.
 */
function endOf(advert: LobbyAdvert, {now, liveWindowMs}: GroupingClock): string | null {
    if (advert.ended_at) {
        return advert.ended_at;
    }
    const lost = advert.state === 'lost'
        || (liveWindowMs !== undefined && now - Date.parse(advert.last_seen) > liveWindowMs);
    return lost ? advert.last_seen : null;
}

/** Whether `next` is `last` listed again: it came while `last` was open, or soon after it left. */
function relists(last: LobbyAdvert, next: LobbyAdvert, clock: GroupingClock): boolean {
    const end = endOf(last, clock);
    return end === null || Date.parse(next.first_seen) - Date.parse(end) <= RELIST_GAP_MS;
}

/**
 * Joins adverts into the lobbies they belong to, newest first. Adverts without a name or host
 * (captured before WC3 sent the details) are left out, and an advert seen twice counts once.
 */
export function groupSessions(adverts: LobbyAdvert[], clock: GroupingClock = {now: Date.now()}): LobbySession[] {
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
        if (chain && last && relists(last, advert, clock)) {
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
            const closedAt = endOf(newest, clock);
            return {
                advert: newest,
                openedAt: chain[0].first_seen,
                closedAt,
                players: closedAt === null ? newest.final_players : Math.max(...chain.map((a) => a.final_players)),
            };
        })
        .sort((a, b) => Date.parse(b.openedAt) - Date.parse(a.openedAt));
}

/** Whether the lobby is still open, allowing for the moment between two of its adverts. */
export function isOpen(session: LobbySession, now: number = Date.now()): boolean {
    return session.closedAt === null || now - Date.parse(session.closedAt) < RELIST_GRACE_MS;
}
