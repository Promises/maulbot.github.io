import {COLS, ROWS} from './lane';

// The way a creep walks, as against the way the map's anti-block measures. The game paths on a
// finer grid than the maze (32 world units, the pathing map's own cells: a 2x2 tower blocks 4x4 of
// them) and moves in both directions at once. This is A* over that grid, with the neighbour rule
// of RuneScape's client pathfinder (RuneJS, refactored-client-435 Pathfinding.doWalkTo): all eight
// directions, a diagonal step only when the cell it enters and both cells beside it are free, so a
// creep never cuts the corner of a tower and two towers touching at a corner close the gap. Unlike
// RuneScape, a diagonal step is as long as it is (√2): a creep walks at a constant speed.

/** Pathing cells per maze cell along each side. */
export const FINE = 2;
const WIDTH = COLS * FINE;
const HEIGHT = ROWS * FINE;
const DIAGONAL = Math.SQRT2;

/** A point in the lane, in maze cells (64 world units) from its bottom-left corner, y up. */
export interface LanePoint {
    x: number;
    y: number;
}

// Where creeps start (above the two spawn columns, at the top of the lane) and where they head:
// the centres of checkpoints 1 and 2, and the exit
export const SPAWN_POINTS: LanePoint[] = [{x: 9.5, y: 37.5}, {x: 14.5, y: 37.5}];
export const TARGET_POINTS: LanePoint[] = [{x: 12, y: 28}, {x: 12, y: 10}, {x: 12, y: 0}];

// Neighbours in the client's order: W, E, S, N, SW, SE, NW, NE
const STEPS: [number, number][] = [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, -1], [-1, 1], [1, 1]];

const index = (x: number, y: number): number => x * HEIGHT + y;

/** The pathing cell a point lies in, kept inside the lane. */
const cellOf = ({x, y}: LanePoint): [number, number] => [
    Math.min(WIDTH - 1, Math.max(0, Math.floor(x * FINE))),
    Math.min(HEIGHT - 1, Math.max(0, Math.floor(y * FINE))),
];

/** The fine grid's blocked cells from the maze's (both indexed col * rows + row). */
export function fineBlocked(blocked: Uint8Array): Uint8Array {
    const fine = new Uint8Array(WIDTH * HEIGHT);
    for (let col = 0; col < COLS; col++) {
        for (let row = 0; row < ROWS; row++) {
            if (blocked[col * ROWS + row]) {
                for (let dx = 0; dx < FINE; dx++) {
                    for (let dy = 0; dy < FINE; dy++) {
                        fine[index(col * FINE + dx, row * FINE + dy)] = 1;
                    }
                }
            }
        }
    }
    return fine;
}

/** A binary heap of cell indices by cost. */
class Heap {
    private items: number[] = [];

    constructor(private readonly cost: Float64Array) {
    }

    get size(): number {
        return this.items.length;
    }

    push(item: number): void {
        const items = this.items;
        items.push(item);
        let i = items.length - 1;
        while (i > 0) {
            const parent = (i - 1) >> 1;
            if (this.cost[items[parent]] <= this.cost[items[i]]) {
                break;
            }
            [items[parent], items[i]] = [items[i], items[parent]];
            i = parent;
        }
    }

    pop(): number {
        const items = this.items;
        const top = items[0];
        const last = items.pop()!;
        if (items.length) {
            items[0] = last;
            let i = 0;
            for (;;) {
                const left = 2 * i + 1;
                const right = left + 1;
                let smallest = i;
                if (left < items.length && this.cost[items[left]] < this.cost[items[smallest]]) {
                    smallest = left;
                }
                if (right < items.length && this.cost[items[right]] < this.cost[items[smallest]]) {
                    smallest = right;
                }
                if (smallest === i) {
                    break;
                }
                [items[smallest], items[i]] = [items[i], items[smallest]];
                i = smallest;
            }
        }
        return top;
    }
}

/**
 * The shortest walk between two points over the fine grid, as the points where it turns (the
 * client keeps only those), starting and ending on the points themselves; null when there is none.
 */
export function walk(fine: Uint8Array, from: LanePoint, to: LanePoint): LanePoint[] | null {
    const [sx, sy] = cellOf(from);
    const [gx, gy] = cellOf(to);
    const start = index(sx, sy);
    const goal = index(gx, gy);
    if (fine[start] || fine[goal]) {
        return null;
    }
    const free = (x: number, y: number) => x >= 0 && x < WIDTH && y >= 0 && y < HEIGHT && !fine[index(x, y)];
    // Octile distance: never more than the way left, so A* finds the shortest
    const estimate = (x: number, y: number) => {
        const dx = Math.abs(x - gx);
        const dy = Math.abs(y - gy);
        return Math.max(dx, dy) + (DIAGONAL - 1) * Math.min(dx, dy);
    };
    const spent = new Float64Array(WIDTH * HEIGHT).fill(Infinity);
    const priority = new Float64Array(WIDTH * HEIGHT);
    const previous = new Int32Array(WIDTH * HEIGHT).fill(-1);
    const done = new Uint8Array(WIDTH * HEIGHT);
    const open = new Heap(priority);
    spent[start] = 0;
    priority[start] = estimate(sx, sy);
    open.push(start);
    while (open.size) {
        const current = open.pop();
        if (current === goal) {
            break;
        }
        if (done[current]) {
            continue;
        }
        done[current] = 1;
        const x = Math.floor(current / HEIGHT);
        const y = current % HEIGHT;
        for (const [dx, dy] of STEPS) {
            const nx = x + dx;
            const ny = y + dy;
            if (!free(nx, ny) || (dx && dy && (!free(x + dx, y) || !free(x, y + dy)))) {
                continue;
            }
            const next = index(nx, ny);
            const cost = spent[current] + (dx && dy ? DIAGONAL : 1);
            if (cost < spent[next]) {
                spent[next] = cost;
                previous[next] = current;
                priority[next] = cost + estimate(nx, ny);
                open.push(next);
            }
        }
    }
    if (spent[goal] === Infinity) {
        return null;
    }
    const cells: [number, number][] = [];
    for (let at = goal; at !== -1; at = previous[at]) {
        cells.push([Math.floor(at / HEIGHT), at % HEIGHT]);
    }
    cells.reverse();
    // The turning points, at cell centres, with the exact start and end
    const points: LanePoint[] = [from];
    for (let i = 1; i < cells.length - 1; i++) {
        const [ax, ay] = cells[i - 1];
        const [bx, by] = cells[i];
        const [cx, cy] = cells[i + 1];
        if (bx - ax !== cx - bx || by - ay !== cy - by) {
            points.push({x: (bx + 0.5) / FINE, y: (by + 0.5) / FINE});
        }
    }
    points.push(to);
    return points;
}

/** Length of a walk, in maze cells. */
export function walkLength(points: LanePoint[]): number {
    let length = 0;
    for (let i = 1; i < points.length; i++) {
        length += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
    }
    return length;
}

/** The creeps' way from each spawn, as three legs (to 1, to 2, to the exit); a leg is null when closed. */
export function creepWays(blocked: Uint8Array): (LanePoint[] | null)[][] {
    const fine = fineBlocked(blocked);
    const shared = [walk(fine, TARGET_POINTS[0], TARGET_POINTS[1]), walk(fine, TARGET_POINTS[1], TARGET_POINTS[2])];
    return SPAWN_POINTS.map((spawn) => [walk(fine, spawn, TARGET_POINTS[0]), ...shared]);
}
