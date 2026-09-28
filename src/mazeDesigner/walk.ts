import {Cell, ROWS} from './lane';

// A walker for the maze: it follows the way the path check found, spawn → 1 → 2 → exit, and
// starts again at the spawn. Points are in board units (one per cell, y down, as the board's SVG).

/** Speed of wave 34's Zerglings, in world units a second. */
export const CREEP_SPEED = 330;
/** World units in a cell. */
export const CELL_SIZE = 64;

export interface Point {
    x: number;
    y: number;
}

export interface Pose extends Point {
    /** Heading in degrees, 0 = right, 90 = down (SVG). */
    angle: number;
}

const toPoint = ([col, row]: Cell): Point => ({x: col + 0.5, y: ROWS - row - 0.5});

/** The whole way as one line of points, or null while any leg is closed. */
export function walkRoute(legs: (Cell[] | null)[]): Point[] | null {
    if (!legs.length || legs.some((leg) => !leg)) {
        return null;
    }
    const cells: Cell[] = [];
    (legs as Cell[][]).forEach((leg) => {
        // Each leg starts where the one before ended
        cells.push(...(cells.length ? leg.slice(1) : leg));
    });
    return cells.map(toPoint);
}

/** Length of the line, in cells. */
export function routeLength(points: Point[]): number {
    let length = 0;
    for (let i = 1; i < points.length; i++) {
        length += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
    }
    return length;
}

/** Seconds a creep of this speed takes along that many cells. */
export const walkSeconds = (cells: number, speed = CREEP_SPEED): number => (cells * CELL_SIZE) / speed;

/** Where a walker is after `distance` cells along the line, starting over at the end. */
export function poseAt(points: Point[], distance: number): Pose {
    const total = routeLength(points);
    if (points.length < 2 || total === 0) {
        return {...points[0], angle: 90};
    }
    let left = ((distance % total) + total) % total;
    for (let i = 1; i < points.length; i++) {
        const from = points[i - 1];
        const to = points[i];
        const step = Math.hypot(to.x - from.x, to.y - from.y);
        if (left <= step) {
            const t = step ? left / step : 0;
            return {
                x: from.x + (to.x - from.x) * t,
                y: from.y + (to.y - from.y) * t,
                angle: (Math.atan2(to.y - from.y, to.x - from.x) * 180) / Math.PI,
            };
        }
        left -= step;
    }
    const last = points[points.length - 1];
    return {...last, angle: 90};
}
