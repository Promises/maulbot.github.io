import {analyse, mazeLength, PlacedTower, refusals} from './analysis';
import {buildFileName, parseBuild, toBuild} from './build';
import {PRESETS} from './lane';
import {BUNDLED_RACES, indexRaces, normaliseRaces} from './races';

const races = normaliseRaces(BUNDLED_RACES);
const orc = indexRaces(races, ['Orc Stronghold']);
const at = (corners: [number, number][], chain = ['oC19']): PlacedTower[] => corners.map((corner) => ({at: corner, chain}));

test('an empty lane measures 40, as the map does', () => {
    const {lengths, total} = mazeLength(analyse([], orc).legs);
    expect(lengths).toEqual([12, 18, 10]);
    expect(total).toBe(40);
});

test.each([
    ['Circle', 124],
    ['Simple', 174],
    ['Advanced', 312],
] as const)('the map example %s keeps the rules and measures %i', (name, length) => {
    const analysis = analyse(at(PRESETS[name]), orc);
    expect(analysis.problems.flat()).toEqual([]);
    expect(mazeLength(analysis.legs).total).toBe(length);
});

test('a wall across the lane closes the way', () => {
    const wall = at(Array.from({length: 12}, (_, i) => [1 + 2 * i, 20] as [number, number]));
    expect(mazeLength(analyse(wall, orc).legs).total).toBeNull();
    expect(refusals(wall.slice(1), wall[0], orc, 100000)).toContain('Rule 3: closes the way');
});

test('towers touching only at a corner close the gap between them', () => {
    // A wall over rows 19-20 on the left (cols 0-11) and rows 17-18 on the right (cols 12-23):
    // its two halves meet only at a corner, which closes the way
    const left = Array.from({length: 6}, (_, i) => [1 + 2 * i, 20] as [number, number]);
    const right = Array.from({length: 6}, (_, i) => [13 + 2 * i, 18] as [number, number]);
    expect(mazeLength(analyse(at([...left, ...right]), orc).legs).total).toBeNull();
    // Without the right half's first tower there is a real gap, two cells wide
    expect(mazeLength(analyse(at([...left, ...right.slice(1)]), orc).legs).total).not.toBeNull();
});

test('the rules catch unbuildable cells, overlaps, other races and wrong upgrades', () => {
    const analysis = analyse([
        {at: [12, 28], chain: ['oC19']},
        {at: [5, 5], chain: ['oC19']},
        {at: [6, 5], chain: ['oC19']},
        {at: [20, 20], chain: ['hC66']},
        {at: [20, 30], chain: ['oC19', 'oC58']},
    ], orc);
    expect(analysis.problems[0]).toContain('Rule 1: stands on an unbuildable cell');
    expect(analysis.problems[1]).toContain('Rule 2: overlaps another tower');
    expect(analysis.problems[2]).toContain('Rule 2: overlaps another tower');
    expect(analysis.problems[3].join()).toMatch(/Rule 5: .* is not a base tower of the chosen races/);
    expect(analysis.problems[4].join()).toMatch(/Rule 5: Headhunter does not upgrade to Barrelmaster/);
});

test('a tower costs the gold of every step of its chain', () => {
    const analysis = analyse([{at: [5, 5], chain: ['oC19', 'o00E']}], orc);
    expect(analysis.gold).toBe(100);
    expect(refusals([], {at: [5, 5], chain: ['oC19', 'o00E']}, orc, 99)).toContain('Rule 4: 100 gold is over the budget');
});

test('the playable races leave out the ones no player builds from', () => {
    const names = races.map((race) => race.name);
    ['Loot Boxer', 'Shrine of Buffs', 'Aviaries', 'Heros Altar', 'Dark Troll Hut'].forEach((name) => expect(names).not.toContain(name));
    const orcRace = races.find((race) => race.name === 'Orc Stronghold')!;
    expect(orcRace.base).toContain('oC19');
    expect(orcRace.base).not.toContain('o00E');
});

test('a build file survives a round trip, and a malformed one is refused', () => {
    const build = toBuild('Advanced maze, Orc Stronghold', ['Orc Stronghold', ''], 5700, at(PRESETS.Advanced), 'n');
    expect(parseBuild(JSON.parse(JSON.stringify(build)), 0)).toEqual(build);
    expect(buildFileName(build.name)).toBe('advanced-maze-orc-stronghold.maul-build.json');
    expect(() => parseBuild({format: 'other'}, 0)).toThrow(/maul-build\/1/);
    expect(() => parseBuild({format: 'maul-build/1', towers: [{at: [1], chain: []}]}, 0)).toThrow(/tower 1/);
    expect(parseBuild({format: 'maul-build/1'}, 4200).budget).toBe(4200);
});
