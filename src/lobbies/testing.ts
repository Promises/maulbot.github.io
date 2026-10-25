import {Socket} from 'phoenix';
import type {FakeChannel, FakeSocket} from '../__mocks__/phoenix';
import {LobbyAdvert, TrackerHealth} from './types';

let nextId = 0;

/** An advert of our bot's lobby, with whatever fields a test sets. */
export function advert(fields: Partial<LobbyAdvert> = {}): LobbyAdvert {
    nextId += 1;
    const firstSeen = fields.first_seen ?? new Date(Date.now() - 60 * 1000).toISOString();
    return {
        instance_id: `advert-${nextId}`,
        name: 'Warcraft Maul Reim beta #4',
        host: 'MaulBot#2824',
        map_name: 'Warcraft Maul: Reimagined Beta11 5.0.0',
        map_file: 'Maps/Warcraft Maul Reimagined Beta11 5.0.0.w3x',
        region: 'eu',
        final_players: 1,
        max_players: 14,
        first_seen: firstSeen,
        last_seen: fields.ended_at ?? firstSeen,
        ended_at: null,
        created_time: null,
        ...fields,
    };
}

interface TrackerData {
    history?: LobbyAdvert[];
    live?: LobbyAdvert[];
    health?: TrackerHealth;
}

/** Answers the tracker's endpoints with the given data: history for any window, then nothing older. */
export function mockTracker({history = [], live = [], health = {status: 'ok', current_live_lobbies: 100, live_window_s: 3600}}: TrackerData) {
    const fetchMock = jest.fn(async (input: RequestInfo | URL) => {
        const url = new URL(String(input));
        let body: unknown;
        if (url.pathname.endsWith('/health')) {
            body = health;
        } else if (url.searchParams.get('live') === 'true') {
            body = {data: live};
        } else {
            const until = url.searchParams.get('until');
            const since = url.searchParams.get('since') ?? '';
            body = {data: history.filter((a) => a.first_seen >= since && (!until || a.first_seen < until))};
        }
        return {ok: true, status: 200, json: async () => body} as Response;
    });
    global.fetch = fetchMock as unknown as typeof fetch;
    return fetchMock;
}

/** The live-feed socket the code under test opened last (tests get a stand-in Phoenix client). */
export function feedSocket(): FakeSocket {
    const opened = (Socket as unknown as typeof FakeSocket).opened;
    return opened[opened.length - 1];
}

/** The live-feed channel the code under test joined last. */
export function feedChannel(): FakeChannel {
    const {channels} = feedSocket();
    return channels[channels.length - 1];
}
