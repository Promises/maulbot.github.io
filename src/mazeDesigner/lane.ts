// The canonical Warcraft Maul lane, as the map's own anti-block check sees it. All 13 lanes are
// this lane turned, so a maze is designed once here. Source of the numbers: the map repo's
// docs/maze-designer.md (Blue's lane, creeps coming in at the top and leaving at the bottom).

export const COLS = 24;
export const ROWS = 38;

/** A grid corner [col, row]: a 2x2 tower stands centred on one. */
export type Corner = [number, number];
/** A cell [col, row], 0-based from the bottom left. */
export type Cell = [number, number];

/** A block of cells: its bottom-left cell and its size. */
export interface Area {
    col: number;
    row: number;
    cols: number;
    rows: number;
}

// Walkable but not buildable: the entry strip, the two checkpoint tiles and the exit
export const ENTRY_STRIP: Area = {col: 7, row: 37, cols: 10, rows: 1};
export const CHECKPOINT_TILES: Area[] = [{col: 11, row: 27, cols: 2, rows: 2}, {col: 11, row: 9, cols: 2, rows: 2}];
export const EXIT_CELLS: Area = {col: 11, row: 0, cols: 2, rows: 1};

const cellsOf = ({col, row, cols, rows}: Area): Cell[] =>
    Array.from({length: cols * rows}, (_, i) => [col + (i % cols), row + Math.floor(i / cols)] as Cell);

export const UNBUILDABLE: Cell[] = [ENTRY_STRIP, ...CHECKPOINT_TILES, EXIT_CELLS].flatMap(cellsOf);

/** The gaps in the wall around the lane: the way in above the top row, the way out below the bottom. */
export const WAY_IN = {col: 6, cols: 12};
export const WAY_OUT = {col: 10, cols: 4};
/** The columns the two spawns stand over (world x -160 and +160). */
export const SPAWN_COLS = [9.5, 14.5];

/** The cells the map's path check runs between: spawn, checkpoint 1, checkpoint 2, exit. */
export const ROUTE: Cell[] = [[9, 37], [12, 28], [12, 10], [12, 0]];

/** Where a tower's corner may be: its 2x2 footprint has to fit inside the lane. */
export const CORNER_MIN: Corner = [1, 1];
export const CORNER_MAX: Corner = [COLS - 1, ROWS - 1];

export const cellIndex = ([col, row]: Cell): number => col * ROWS + row;

const unbuildable = new Set(UNBUILDABLE.map(cellIndex));

export const isBuildable = (cell: Cell): boolean => !unbuildable.has(cellIndex(cell));

/** The four cells a tower at this corner covers. */
export function footprint([cx, cy]: Corner): Cell[] {
    return [[cx - 1, cy - 1], [cx, cy - 1], [cx - 1, cy], [cx, cy]];
}

export function cornerInLane([cx, cy]: Corner): boolean {
    return cx >= CORNER_MIN[0] && cx <= CORNER_MAX[0] && cy >= CORNER_MIN[1] && cy <= CORNER_MAX[1];
}

/**
 * The shortest way between two cells, stepping up, down, left or right between cells that are not
 * blocked (a diagonal gap between two towers is closed): as the map's anti-block check measures
 * it. The cells along it, both ends included, or null when there is none.
 */
export function shortestPath(blocked: Uint8Array, from: Cell, to: Cell): Cell[] | null {
    const start = cellIndex(from);
    const goal = cellIndex(to);
    if (blocked[start] || blocked[goal]) {
        return null;
    }
    const previous = new Int32Array(COLS * ROWS).fill(-2);
    previous[start] = -1;
    const queue = [start];
    for (let head = 0; head < queue.length && previous[goal] === -2; head++) {
        const index = queue[head];
        const col = Math.floor(index / ROWS);
        const row = index % ROWS;
        const neighbours: Cell[] = [[col, row - 1], [col, row + 1], [col - 1, row], [col + 1, row]];
        for (const [nextCol, nextRow] of neighbours) {
            if (nextCol < 0 || nextCol >= COLS || nextRow < 0 || nextRow >= ROWS) {
                continue;
            }
            const next = cellIndex([nextCol, nextRow]);
            if (!blocked[next] && previous[next] === -2) {
                previous[next] = index;
                queue.push(next);
            }
        }
    }
    if (previous[goal] === -2) {
        return null;
    }
    const path: Cell[] = [];
    for (let index = goal; index !== -1; index = previous[index]) {
        path.push([Math.floor(index / ROWS), index % ROWS]);
    }
    return path.reverse();
}

const corners = (list: string): Corner[] =>
    (list.match(/\[\d+,\d+\]/g) || []).map((pair) => JSON.parse(pair) as Corner);

/** The map's own example mazes (its hologram corners: the Example Maze button and -maze 1|2|3). */
export const PRESETS: Record<'Circle' | 'Simple' | 'Advanced', Corner[]> = {
    Circle: corners('[10,28] [12,26] [14,28] [13,30] [11,31] [9,31] [7,29] [7,27] [9,25] [11,23] [13,23] [15,25] '
        + '[17,27] [17,29] [16,31] [14,33] [12,34] [10,34] [8,34] [6,32]'),
    // The map lists [9,27] twice; once is enough here
    Simple: corners('[12,26] [12,24] [12,22] [12,20] [12,18] [12,16] [12,14] [14,28] [12,30] [10,29] [9,27] [12,12] '
        + '[10,10] [12,8] [14,9] [9,25] [9,23] [9,21] [9,19] [9,17] [9,15] [9,13] [15,11] [15,13] [15,15] '
        + '[15,17] [15,19] [15,21] [15,23] [15,25]'),
    Advanced: corners('[12,26] [14,28] [12,30] [10,24] [8,22] [6,20] [4,18] [2,16] [2,14] [4,12] [6,10] [8,8] '
        + '[10,6] [12,4] [14,2] [16,1] [10,29] [9,27] [7,25] [5,23] [3,21] [2,24] [4,26] [6,28] [1,26] [7,30] '
        + '[9,32] [11,33] [13,33] [15,31] [17,29] [17,27] [15,25] [13,23] [11,21] [9,19] [7,17] [5,15]'),
};

export type PresetName = keyof typeof PRESETS;
