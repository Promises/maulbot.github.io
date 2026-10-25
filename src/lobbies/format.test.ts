import {ago, dayLabel, isOurs, mapNameOf, regionCode, regionName, span, splitHost, versionOf} from './format';

const map = (map_name: string | null, map_file: string | null = null) => ({map_name, map_file});

describe('isOurs', () => {
    it.each([
        ['Warcraft Maul: Reimagined Beta11 5.0.0', 'Maps/Warcraft Maul Reimagined Beta11 5.0.0.w3x'],
        ['Warcraft Maul Reimagined Beta11 5.0.0.w3x', 'Maps/Download/Warcraft Maul Reimagined Beta11 5.0.0.w3x'],
        ['WarcraftMaulReimagined-Beta7-5.0.0.w3x', null],
        [null, 'Maps/Download/Warcraft_Maul_Reimagined_fixed.w3x'],
    ])('claims %s', (name, file) => {
        expect(isOurs(map(name, file))).toBe(true);
    });

    it.each([
        ['WarCraft Maul 8.2.w3x'],
        ['WarCraft Maul NextGen v2.65-p.w3x'],
        ['Wintermaul_Chaos_Mod_0.66.3.w3x'],
        [null],
    ])('leaves out %s', (name) => {
        expect(isOurs(map(name, name && `Maps/Download/${name}`))).toBe(false);
    });
});

describe('versionOf', () => {
    it.each([
        ['Warcraft Maul: Reimagined Beta11 5.0.0', null, 'Beta11 5.0.0'],
        ['Warcraft Maul Reimagined Beta11 5.0.0.w3x', null, 'Beta11 5.0.0'],
        ['WarcraftMaulReimagined-Beta7-5.0.0.w3x', null, 'Beta7 5.0.0'],
        [null, 'Maps/Warcraft Maul Reimagined 4.4.3.w3x', '4.4.3'],
        ['Warcraft Maul: Reimagined', null, 'Warcraft Maul: Reimagined'],
    ])('reads %s / %s as %s', (name, file, version) => {
        expect(versionOf(map(name, file))).toBe(version);
    });
});

test('mapNameOf drops the extension and falls back to the file name', () => {
    expect(mapNameOf(map('Legion TD Mega 4.6'))).toBe('Legion TD Mega 4.6');
    expect(mapNameOf(map(null, 'Maps/Download/Island Defense 3.1.2.w3x'))).toBe('Island Defense 3.1.2');
});

test('regions read as names and codes, US west as the Americas', () => {
    expect([regionName('eu'), regionName('usw'), regionName('kr')]).toEqual(['Europe', 'Americas', 'Asia']);
    expect([regionCode('eu'), regionCode('usw'), regionCode('kr')]).toEqual(['EU', 'US', 'KR']);
    expect(regionName(null)).toBe('Unknown');
});

test('splitHost separates the battle tag', () => {
    expect(splitHost('MaulBot#2824')).toEqual({name: 'MaulBot', tag: '#2824'});
    expect(splitHost('Someone')).toEqual({name: 'Someone', tag: ''});
    expect(splitHost(null)).toEqual({name: 'Unknown', tag: ''});
});

describe('durations', () => {
    const now = Date.parse('2026-10-25T12:00:00Z');
    it.each([
        ['2026-10-25T11:59:15Z', '45s'],
        ['2026-10-25T11:48:00Z', '12m'],
        ['2026-10-25T09:55:00Z', '2h 5m'],
        ['2026-10-22T12:00:00Z', '3d'],
        ['2026-10-25T12:00:05Z', '0s'],
    ])('ago(%s) is %s', (time, label) => {
        expect(ago(time, now)).toBe(label);
    });

    it('span counts minutes, then hours and minutes, never under a minute', () => {
        expect(span('2026-10-25T11:00:00Z', '2026-10-25T11:07:00Z')).toBe('7 min');
        expect(span('2026-10-25T11:00:00Z', '2026-10-25T12:12:00Z')).toBe('1h 12m');
        expect(span('2026-10-25T11:00:00Z', '2026-10-25T11:00:10Z')).toBe('1 min');
    });
});

test('dayLabel names today and yesterday in local time', () => {
    const now = new Date(2026, 9, 25, 15, 0).getTime();
    expect(dayLabel(new Date(2026, 9, 25, 0, 30).toISOString(), now)).toMatch(/^Today · /);
    expect(dayLabel(new Date(2026, 9, 24, 23, 30).toISOString(), now)).toMatch(/^Yesterday · /);
    expect(dayLabel(new Date(2026, 9, 22, 12, 0).toISOString(), now)).not.toMatch(/Today|Yesterday/);
});
