import {fetchLatestMapRelease, listPatchNotes, patchNotesFolderUrl} from './api';

const repo = {owner: 'Promises', name: 'Warcraft-Maul-Reimagined'};

function mockFetch(handler: (url: string) => {ok: boolean; status?: number; body: unknown}) {
    const fetchMock = jest.fn(async (input: RequestInfo | URL) => {
        const {ok, status = 200, body} = handler(String(input));
        return {
            ok,
            status,
            json: async () => body,
            text: async () => String(body),
        } as Response;
    });
    global.fetch = fetchMock as unknown as typeof fetch;
    return fetchMock;
}

afterEach(() => {
    // @ts-expect-error – restore the jsdom default (undefined) between tests
    delete global.fetch;
});

describe('fetchLatestMapRelease', () => {
    it('returns the newest non-draft release that ships a .w3x, including prereleases', async () => {
        const fetchMock = mockFetch(() => ({
            ok: true,
            body: [
                {tag_name: '4.5.0', draft: true, html_url: 'd', published_at: '2026-09-01T00:00:00Z', assets: [
                    {name: 'Warcraft_Maul_v4.5.0.w3x', browser_download_url: 'https://x/draft.w3x'},
                ]},
                {tag_name: '4.4.4', draft: false, html_url: 'src', published_at: '2026-08-01T00:00:00Z', assets: [
                    {name: 'source.zip', browser_download_url: 'https://x/source.zip'},
                ]},
                {tag_name: '3.1.3', draft: false, prerelease: true, html_url: 'https://github.com/r/3.1.3',
                    published_at: '2018-05-26T11:02:35Z', assets: [
                        {name: 'Warcraft_Maul_BotMod_v3.2.3.w3x', browser_download_url: 'https://x/map.w3x'},
                    ]},
            ],
        }));

        await expect(fetchLatestMapRelease(repo)).resolves.toEqual({
            version: 'v3.1.3',
            downloadUrl: 'https://x/map.w3x',
            htmlUrl: 'https://github.com/r/3.1.3',
            publishedAt: new Date('2018-05-26T11:02:35Z'),
        });
        expect(fetchMock).toHaveBeenCalledWith(
            'https://api.github.com/repos/Promises/Warcraft-Maul-Reimagined/releases?per_page=10',
            expect.anything(),
        );
    });

    it('returns null when the repo has no releases', async () => {
        mockFetch(() => ({ok: true, body: []}));
        await expect(fetchLatestMapRelease(repo)).resolves.toBeNull();
    });

    it('rejects on a failed request', async () => {
        mockFetch(() => ({ok: false, status: 403, body: {}}));
        await expect(fetchLatestMapRelease(repo)).rejects.toThrow('403');
    });
});

describe('listPatchNotes', () => {
    it('keeps only markdown files and sorts them newest first', async () => {
        mockFetch(() => ({
            ok: true,
            body: [
                {name: '4.0.9.md', type: 'file', download_url: 'raw/4.0.9', html_url: 'html/4.0.9'},
                {name: '4.10.0.md', type: 'file', download_url: 'raw/4.10.0', html_url: 'html/4.10.0'},
                {name: 'images', type: 'dir', download_url: null, html_url: 'html/images'},
                {name: 'README.txt', type: 'file', download_url: 'raw/readme', html_url: 'html/readme'},
                {name: '4.4.2.md', type: 'file', download_url: 'raw/4.4.2', html_url: 'html/4.4.2'},
            ],
        }));

        await expect(listPatchNotes(repo)).resolves.toEqual([
            {version: 'v4.10.0', downloadUrl: 'raw/4.10.0', htmlUrl: 'html/4.10.0'},
            {version: 'v4.4.2', downloadUrl: 'raw/4.4.2', htmlUrl: 'html/4.4.2'},
            {version: 'v4.0.9', downloadUrl: 'raw/4.0.9', htmlUrl: 'html/4.0.9'},
        ]);
    });
});

test('patchNotesFolderUrl points at the Quests folder on master', () => {
    expect(patchNotesFolderUrl(repo)).toBe('https://github.com/Promises/Warcraft-Maul-Reimagined/tree/master/Quests');
});
