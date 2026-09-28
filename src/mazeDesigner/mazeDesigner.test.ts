import {analyse, mazeLength, PlacedTower, refusals} from './analysis';
import {buildFileName, parseBuild, toBuild} from './build';
import {PRESETS} from './lane';
import {BUNDLED_RACES, indexRaces, normaliseRaces, racesByTier} from './races';
import {clickSelection, commonUpgrades, downgradeAll, removeAll, replaceAll, sameForm, upgradeAll} from './selection';
import {poseAt, routeLength, walkRoute, walkSeconds} from './walk';

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

test('the races are offered by tier, Beginner first, alphabetical within a tier', () => {
    const tiers = racesByTier(races);
    expect(tiers.map((group) => group.tier).slice(0, 3)).toEqual(['Beginner', 'Intermediate', 'Advanced']);
    tiers.forEach((group) => expect(group.names).toEqual([...group.names].sort((a, b) => a.localeCompare(b))));
    expect(tiers.flatMap((group) => group.names).sort()).toEqual(races.map((race) => race.name).sort());
});

test('a click selects one tower, shift-click adds or drops one, a double-click takes every tower of its kind', () => {
    expect(clickSelection([], 2, false)).toEqual([2]);
    expect(clickSelection([2], 2, false)).toEqual([]);
    expect(clickSelection([2, 5], 5, false)).toEqual([5]);
    expect(clickSelection([5], 2, true)).toEqual([2, 5]);
    expect(clickSelection([2, 5], 2, true)).toEqual([5]);
    const design: PlacedTower[] = [
        {at: [3, 3], chain: ['oC19']},
        {at: [6, 3], chain: ['oC19', 'o00E']},
        {at: [9, 3], chain: ['oC19']},
    ];
    expect(sameForm(design, 0)).toEqual([0, 2]);
    expect(sameForm(design, 1)).toEqual([1]);
});

test('a selection upgrades, takes back and goes together', () => {
    const design: PlacedTower[] = [{at: [3, 3], chain: ['oC19']}, {at: [6, 3], chain: ['oC19']}, {at: [9, 3], chain: ['hC02']}];
    expect(commonUpgrades(design, [0, 1], orc)).toEqual(['o00E']);
    expect(commonUpgrades(design, [0, 2], orc)).toEqual([]);
    const upgraded = upgradeAll(design, [0, 1], 'o00E');
    expect(upgraded.map((tower) => tower.chain.length)).toEqual([2, 2, 1]);
    expect(analyse(upgraded, orc).gold).toBe(50 * 4 + 8);
    expect(downgradeAll(upgraded, [0, 1, 2])).toEqual(design);
    expect(removeAll(design, [0, 2])).toEqual([design[1]]);
    // Replaced where they stand, as base towers, upgrades gone
    const replaced = replaceAll(upgraded, [1, 2], 'oC58');
    expect(replaced.map((tower) => tower.chain)).toEqual([['oC19', 'o00E'], ['oC58'], ['oC58']]);
    expect(replaced.map((tower) => tower.at)).toEqual(design.map((tower) => tower.at));
});

test('the walker follows the whole way, and starts over at the end', () => {
    const route = walkRoute(analyse([], orc).legs)!;
    // An empty lane: 40 steps from the spawn cell to the exit cell
    expect(route).toHaveLength(41);
    expect(routeLength(route)).toBe(40);
    expect(poseAt(route, 0)).toMatchObject({x: 9.5, y: 0.5});
    const end = poseAt(route, 39.999);
    expect(end.x).toBeCloseTo(12.5, 2);
    expect(end.y).toBeCloseTo(37.5, 2);
    // A full length is a full loop
    expect(poseAt(route, 40)).toEqual(poseAt(route, 0));
    expect(poseAt(route, 41)).toEqual(poseAt(route, 1));
    // A Zergling (330) walks 40 cells of 64 in about 7.8 s
    expect(walkSeconds(40)).toBeCloseTo(7.76, 2);
    expect(walkRoute(analyse(at(Array.from({length: 12}, (_, i) => [1 + 2 * i, 20] as [number, number])), orc).legs)).toBeNull();
});
