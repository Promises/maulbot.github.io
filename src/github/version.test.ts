import {compareVersionsDesc, formatVersion} from './version';

describe('formatVersion', () => {
    it.each([
        ['4.4.3', 'v4.4.3'],
        ['v4.4.3', 'v4.4.3'],
        ['4.4.3.md', 'v4.4.3'],
        [' V4.10.0 ', 'v4.10.0'],
    ])('formats %s as %s', (input, expected) => {
        expect(formatVersion(input)).toBe(expected);
    });
});

describe('compareVersionsDesc', () => {
    it('sorts numerically per segment, newest first', () => {
        const sorted = ['v4.2.8', 'v4.10.0', 'v4.4.2', 'v4.0.9', 'v4.4.0'].sort(compareVersionsDesc);
        expect(sorted).toEqual(['v4.10.0', 'v4.4.2', 'v4.4.0', 'v4.2.8', 'v4.0.9']);
    });

    it('treats missing segments as zero', () => {
        expect(compareVersionsDesc('v4.4', 'v4.4.0')).toBe(0);
        expect(compareVersionsDesc('v4.4.1', 'v4.4')).toBeLessThan(0);
    });
});
