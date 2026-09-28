import bundled from './races.json';

// Tower data as the map repo's scripts/race-data.js prints it (the bundled races.json is that,
// trimmed by scripts/maze-designer-data.js). A file loaded by hand may be either.

export interface Attack {
    type: string;
    range: number;
    damageMin: number;
    damageMax: number;
}

export interface RaceDataTower {
    id: string;
    name?: string;
    gold?: number | null;
    food?: number | null;
    foodMade?: number | null;
    attacks?: Attack | null;
    upgradesTo?: string[];
}

export interface RaceDataRace {
    name: string;
    tier?: string;
    enabled?: boolean;
    towers: RaceDataTower[];
}

export interface Tower {
    id: string;
    name: string;
    /** What this step costs (a base tower to build, an upgrade to upgrade to it); null: unknown. */
    gold: number | null;
    food: number;
    foodMade: number;
    attacks: Attack | null;
    upgradesTo: string[];
}

export interface Race {
    name: string;
    tier: string;
    towers: Tower[];
    /** The towers its builder builds: those no other tower of the race upgrades to. */
    base: string[];
}

/** Races a player cannot build from: disabled ones, random-only ones, and the secondary race. */
const EXCLUDED = ['Aviaries', 'Heros Altar', 'Dark Troll Hut', 'Loot Boxer', 'Shrine of Buffs'];

export const BUNDLED_SOURCE: {commit: string; generated: string} = bundled.source;
export const BUNDLED_RACES: RaceDataRace[] = bundled.races;

/** The races a design can use, from race-data.js output. Throws when it is not that. */
export function normaliseRaces(data: unknown): Race[] {
    if (!Array.isArray(data) || !data.some((race) => race && Array.isArray(race.towers))) {
        throw new Error('not race-data.js output');
    }
    return (data as RaceDataRace[])
        .filter((race) => race && Array.isArray(race.towers) && race.enabled !== false
            && race.tier !== 'Secondary' && !EXCLUDED.includes(race.name))
        .map((race) => {
            const towers: Tower[] = race.towers.filter((tower) => tower && tower.id).map((tower) => ({
                id: tower.id,
                name: String(tower.name || tower.id).replace(/^\[[^\]]*\]\s*-\s*/, ''),
                gold: typeof tower.gold === 'number' ? tower.gold : null,
                food: tower.food || 0,
                foodMade: tower.foodMade || 0,
                attacks: tower.attacks || null,
                upgradesTo: tower.upgradesTo || [],
            }));
            const upgrades = new Set<string>();
            towers.forEach((tower) => tower.upgradesTo.forEach((id) => upgrades.add(id)));
            return {
                name: race.name,
                tier: race.tier || 'Other',
                towers,
                base: towers.filter((tower) => !upgrades.has(tower.id)).map((tower) => tower.id),
            };
        });
}

export interface TowerEntry {
    tower: Tower;
    race: string;
    /** 0 or 1 for the design's first or second race, -1 for any other race. */
    raceIndex: number;
}

export interface RaceIndex {
    byId: Map<string, TowerEntry>;
    chosen: string[];
    /** Base towers of the chosen races: what a design may start a tower with. */
    baseIds: Set<string>;
}

/** Every tower by id (a chosen race's entry wins when races share a tower). */
export function indexRaces(races: Race[], chosen: string[]): RaceIndex {
    const byId = new Map<string, TowerEntry>();
    const baseIds = new Set<string>();
    races.forEach((race) => {
        const raceIndex = chosen.indexOf(race.name);
        race.towers.forEach((tower) => {
            if (!byId.has(tower.id) || raceIndex >= 0) {
                byId.set(tower.id, {tower, race: race.name, raceIndex});
            }
        });
        if (raceIndex >= 0) {
            race.base.forEach((id) => baseIds.add(id));
        }
    });
    return {byId, chosen, baseIds};
}

/** How many upgrades follow a tower, along the first choice at each step. */
export function upgradeDepth(tower: Tower, byId: Map<string, TowerEntry>): number {
    const seen = new Set<string>();
    let depth = 0;
    let current: Tower | undefined = tower;
    while (current && current.upgradesTo.length && !seen.has(current.id)) {
        seen.add(current.id);
        depth++;
        current = byId.get(current.upgradesTo[0])?.tower;
    }
    return depth;
}
