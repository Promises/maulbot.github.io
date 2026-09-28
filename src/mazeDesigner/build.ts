import {PlacedTower} from './analysis';

// The file a design is handed over as (docs/maze-designer.md in the map repo, section 4): corners
// in the canonical lane and one chain of tower ids per tower, in build order.

export const BUILD_FORMAT = 'maul-build/1';

export interface MaulBuild {
    format: typeof BUILD_FORMAT;
    name: string;
    races: string[];
    budget: number;
    towers: PlacedTower[];
    notes: string;
}

export function toBuild(name: string, races: string[], budget: number, towers: PlacedTower[], notes: string): MaulBuild {
    return {
        format: BUILD_FORMAT,
        name,
        races: races.filter(Boolean),
        budget,
        towers: towers.map((tower) => ({at: tower.at, chain: tower.chain})),
        notes,
    };
}

const isCorner = (value: unknown): value is [number, number] =>
    Array.isArray(value) && value.length === 2 && value.every((n) => Number.isInteger(n));

const isChain = (value: unknown): value is string[] =>
    Array.isArray(value) && value.length > 0 && value.every((id) => typeof id === 'string');

/**
 * A build file's contents, checked for shape (the rules are checked by the designer). A file
 * without a budget keeps `budget`.
 */
export function parseBuild(data: unknown, budget: number): MaulBuild {
    const build = data as Partial<MaulBuild> | null;
    if (!build || build.format !== BUILD_FORMAT) {
        throw new Error(`format is not ${BUILD_FORMAT}`);
    }
    const towers = Array.isArray(build.towers) ? build.towers : [];
    towers.forEach((tower, i) => {
        if (!tower || !isCorner(tower.at) || !isChain(tower.chain)) {
            throw new Error(`tower ${i + 1} needs "at": [col, row] and a "chain" of tower ids`);
        }
    });
    const races = Array.isArray(build.races) ? build.races.filter((race) => typeof race === 'string') : [];
    return {
        format: BUILD_FORMAT,
        name: typeof build.name === 'string' ? build.name : 'Imported maze',
        races: races.slice(0, 2),
        budget: typeof build.budget === 'number' && build.budget >= 0 ? build.budget : budget,
        towers: towers.map((tower) => ({at: [tower.at[0], tower.at[1]], chain: [...tower.chain]})),
        notes: typeof build.notes === 'string' ? build.notes : '',
    };
}

/** "Advanced maze, Orc Stronghold" -> "advanced-maze-orc-stronghold.maul-build.json" */
export function buildFileName(name: string): string {
    const slug = name.replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '-').toLowerCase();
    return `${slug || 'maze'}.maul-build.json`;
}
