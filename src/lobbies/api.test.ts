import {fetchActiveLobbies, fetchLobbyHistory, HISTORY_PAGE_SIZE} from './api';

function mockFetch(body: unknown) {
    const fetchMock = jest.fn(async () => ({ok: true, status: 200, json: async () => body} as Response));
    global.fetch = fetchMock as unknown as typeof fetch;
    return fetchMock;
}

const row = (map_name: string, first_seen: string) => ({instance_id: first_seen, map_name, map_file: null, first_seen});

afterEach(() => {
    // @ts-ignore
    delete global.fetch;
});

test('fetchActiveLobbies reads every live lobby', async () => {
    const fetchMock = mockFetch({data: [row('Legion TD', '2026-10-25T10:00:00Z')]});
    expect(await fetchActiveLobbies()).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledWith('https://wc3.henning.tech/v1/lobbies?live=true');
});

describe('fetchLobbyHistory', () => {
    it('asks our-map for the window and checks again that each lobby is ours', async () => {
        const fetchMock = mockFetch({data: [
            row('Warcraft Maul: Reimagined Beta11 5.0.0', '2026-10-25T10:00:00Z'),
            row('Reimagined Footmen', '2026-10-25T09:00:00Z'),
        ]});
        const page = await fetchLobbyHistory({since: '2026-10-18T00:00:00Z', until: '2026-10-25T00:00:00Z'});
        const url = new URL((fetchMock.mock.calls[0] as unknown[])[0] as string);
        expect(url.pathname).toBe('/v1/our-map');
        expect(Object.fromEntries(url.searchParams)).toEqual({
            limit: String(HISTORY_PAGE_SIZE),
            since: '2026-10-18T00:00:00Z',
            until: '2026-10-25T00:00:00Z',
        });
        expect(page.adverts.map((a) => a.map_name)).toEqual(['Warcraft Maul: Reimagined Beta11 5.0.0']);
        expect(page.continueUntil).toBeNull();
    });

    it('says where to continue when the window held a full page', async () => {
        const rows = Array.from({length: HISTORY_PAGE_SIZE}, (_, i) =>
            row('Warcraft Maul: Reimagined Beta11 5.0.0', new Date(Date.UTC(2026, 9, 25, 10, 0, 0) - i * 1000).toISOString()));
        mockFetch({data: rows});
        const page = await fetchLobbyHistory({since: '2026-10-18T00:00:00Z'});
        expect(page.continueUntil).toBe(rows[rows.length - 1].first_seen);
    });
});
