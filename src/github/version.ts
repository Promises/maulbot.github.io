/** Normalises "4.4.3", "v4.4.3" or "4.4.3.md" to "v4.4.3". */
export function formatVersion(raw: string): string {
    const bare = raw.trim().replace(/\.md$/i, '').replace(/^v/i, '');
    return `v${bare}`;
}

function versionParts(version: string): number[] {
    return version
        .replace(/^v/i, '')
        .split('.')
        .map((part) => parseInt(part, 10) || 0);
}

/** Sort comparator: newest version first. */
export function compareVersionsDesc(a: string, b: string): number {
    const pa = versionParts(a);
    const pb = versionParts(b);
    const length = Math.max(pa.length, pb.length);
    for (let i = 0; i < length; i++) {
        const diff = (pb[i] ?? 0) - (pa[i] ?? 0);
        if (diff !== 0) {
            return diff;
        }
    }
    return 0;
}
