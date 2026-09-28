import {Cell, COLS, cornerInLane, Corner, cellIndex, footprint, isBuildable, ROUTE, ROWS, shortestPath} from './lane';
import {RaceIndex} from './races';

/** A tower in a design: where it stands and its forms, base first. */
export interface PlacedTower {
    at: Corner;
    chain: string[];
}

export interface Analysis {
    /** Each tower's problems, by rule. */
    problems: string[][];
    /** The three legs of the way (spawn → 1 → 2 → exit); null where it is closed. */
    legs: (Cell[] | null)[];
    /** How many towers break rules 1, 2 and 5. */
    outside: number;
    overlaps: number;
    wrongRace: number;
    gold: number;
    /** Tower steps whose cost the data does not have. */
    unknownGold: number;
    foodUsed: number;
    foodMade: number;
    usesFood: boolean;
}

export const fmt = (n: number): string => n.toLocaleString('en-US');

/** Checks a design against the rules the map holds a real build to (docs/maze-designer.md). */
export function analyse(towers: PlacedTower[], index: RaceIndex): Analysis {
    const blocked = new Uint8Array(COLS * ROWS);
    const owner = new Int32Array(COLS * ROWS).fill(-1);
    const problems: string[][] = towers.map(() => []);
    const overlapping = new Set<number>();
    const result: Analysis = {
        problems, legs: [], outside: 0, overlaps: 0, wrongRace: 0,
        gold: 0, unknownGold: 0, foodUsed: 0, foodMade: 0, usesFood: false,
    };

    towers.forEach((placed, i) => {
        if (!cornerInLane(placed.at)) {
            problems[i].push('Rule 1: outside the lane');
            result.outside++;
        } else {
            let onUnbuildable = false;
            footprint(placed.at).forEach((cell) => {
                const k = cellIndex(cell);
                if (!isBuildable(cell)) {
                    onUnbuildable = true;
                }
                if (owner[k] >= 0) {
                    overlapping.add(i);
                    overlapping.add(owner[k]);
                }
                owner[k] = i;
                blocked[k] = 1;
            });
            if (onUnbuildable) {
                problems[i].push('Rule 1: stands on an unbuildable cell');
                result.outside++;
            }
        }

        const entries = placed.chain.map((id) => index.byId.get(id));
        if (!placed.chain.length || entries.some((entry) => !entry)) {
            problems[i].push('Rule 5: unknown tower id in chain');
            result.wrongRace++;
            return;
        }
        const forms = entries.map((entry) => entry!.tower);
        if (!index.baseIds.has(placed.chain[0])) {
            problems[i].push(`Rule 5: ${forms[0].name} is not a base tower of the chosen races`);
            result.wrongRace++;
        }
        for (let k = 1; k < forms.length; k++) {
            if (!forms[k - 1].upgradesTo.includes(forms[k].id)) {
                problems[i].push(`Rule 5: ${forms[k - 1].name} does not upgrade to ${forms[k].name}`);
                result.wrongRace++;
                break;
            }
        }
        forms.forEach((form) => {
            if (form.gold === null) {
                result.unknownGold++;
            } else {
                result.gold += form.gold;
            }
        });
        // A tower eats or makes food as the form it ends as (an upgraded farm replaces the farm)
        const last = forms[forms.length - 1];
        result.foodUsed += last.food;
        result.foodMade += last.foodMade;
        if (forms.some((form) => form.food || form.foodMade)) {
            result.usesFood = true;
        }
    });

    overlapping.forEach((i) => problems[i].push('Rule 2: overlaps another tower'));
    result.overlaps = overlapping.size;
    result.legs = [0, 1, 2].map((k) => shortestPath(blocked, ROUTE[k], ROUTE[k + 1]));
    return result;
}

/** Leg lengths in steps, null where closed; and the maze length, null when any leg is closed. */
export function mazeLength(legs: (Cell[] | null)[]): {lengths: (number | null)[]; total: number | null} {
    const lengths = legs.map((leg) => (leg ? leg.length - 1 : null));
    const total = lengths.some((length) => length === null) ? null
        : lengths.reduce((sum: number, length) => sum + (length as number), 0);
    return {lengths, total};
}

export const overBudget = (analysis: Analysis, budget: number): boolean => analysis.gold > budget;

export const overFood = (analysis: Analysis): boolean => analysis.usesFood && analysis.foodUsed > analysis.foodMade;

/** Why this tower may not go into the design, if anything: its own problems, then the design's. */
export function refusals(towers: PlacedTower[], candidate: PlacedTower, index: RaceIndex, budget: number): string[] {
    const analysis = analyse([...towers, candidate], index);
    const out = [...analysis.problems[analysis.problems.length - 1]];
    if (analysis.legs.some((leg) => !leg)) {
        out.push('Rule 3: closes the way');
    }
    if (overBudget(analysis, budget)) {
        out.push(`Rule 4: ${fmt(analysis.gold)} gold is over the budget`);
    }
    if (overFood(analysis)) {
        out.push(`Rule 6: needs ${analysis.foodUsed} food, farms make ${analysis.foodMade}`);
    }
    return out;
}
