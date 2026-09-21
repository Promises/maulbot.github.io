import {GithubRepo, MapRelease, PatchNote, PatchNoteRef} from './types';
import {parsePatchNote} from './patchNotes';
import {compareVersionsDesc, formatVersion} from './version';

const API_ROOT = 'https://api.github.com';
const PATCH_NOTES_DIR = 'Quests';

interface ReleaseAssetPayload {
    name: string;
    browser_download_url: string;
}

interface ReleasePayload {
    tag_name: string;
    html_url: string;
    published_at: string;
    draft: boolean;
    assets: ReleaseAssetPayload[];
}

interface ContentEntryPayload {
    name: string;
    type: string;
    download_url: string | null;
    html_url: string;
}

async function getJson<T>(url: string): Promise<T> {
    const response = await fetch(url, {headers: {Accept: 'application/vnd.github+json'}});
    if (!response.ok) {
        throw new Error(`GitHub request failed (${response.status}) for ${url}`);
    }
    return response.json() as Promise<T>;
}

async function getText(url: string): Promise<string> {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`GitHub request failed (${response.status}) for ${url}`);
    }
    return response.text();
}

export function patchNotesFolderUrl(repo: GithubRepo): string {
    return `https://github.com/${repo.owner}/${repo.name}/tree/master/${PATCH_NOTES_DIR}`;
}

/**
 * Newest published release that ships a .w3x asset, or null when the repo has
 * none. Reads the release list rather than /releases/latest because that
 * endpoint ignores prereleases, which is how the map releases are flagged.
 */
export async function fetchLatestMapRelease(repo: GithubRepo): Promise<MapRelease | null> {
    const releases = await getJson<ReleasePayload[]>(
        `${API_ROOT}/repos/${repo.owner}/${repo.name}/releases?per_page=10`,
    );
    for (const release of releases) {
        if (release.draft) {
            continue;
        }
        const map = release.assets.find((asset) => /\.w3x$/i.test(asset.name));
        if (map) {
            return {
                version: formatVersion(release.tag_name),
                downloadUrl: map.browser_download_url,
                htmlUrl: release.html_url,
                publishedAt: new Date(release.published_at),
            };
        }
    }
    return null;
}

/** Lists the patch-note files in the repo, newest version first. */
export async function listPatchNotes(repo: GithubRepo): Promise<PatchNoteRef[]> {
    const entries = await getJson<ContentEntryPayload[]>(
        `${API_ROOT}/repos/${repo.owner}/${repo.name}/contents/${PATCH_NOTES_DIR}`,
    );
    return entries
        .filter((entry) => entry.type === 'file' && /\.md$/i.test(entry.name) && entry.download_url)
        .map((entry) => ({
            version: formatVersion(entry.name),
            downloadUrl: entry.download_url as string,
            htmlUrl: entry.html_url,
        }))
        .sort((a, b) => compareVersionsDesc(a.version, b.version));
}

export async function fetchPatchNote(ref: PatchNoteRef): Promise<PatchNote> {
    const markdown = await getText(ref.downloadUrl);
    return parsePatchNote(markdown, ref.version, ref.htmlUrl);
}
