import {CSSProperties, FC, MouseEvent} from 'react';
import classNames from './classNames';
import {Area, Cell, CHECKPOINT_TILES, COLS, Corner, CORNER_MAX, CORNER_MIN, ENTRY_STRIP, EXIT_CELLS, ROWS, SPAWN_COLS, WAY_IN, WAY_OUT} from './lane';
import styles from './MazeBoard.module.scss';
import Walker from './Walker';
import {Point} from './walk';

export interface TowerView {
    at: Corner;
    label: string;
    /** Upgrades so far, drawn as pips. */
    level: number;
    /** 0 or 1: the design's first or second race. */
    race: number;
    bad: boolean;
    selected: boolean;
    title: string;
}

export interface Ring {
    at: Corner;
    /** In cells. */
    radius: number;
    strong: boolean;
}

interface MazeBoardProps {
    towers: TowerView[];
    legs: (Cell[] | null)[];
    rings: Ring[];
    /** The tower being placed, where it would go, and whether it may. */
    ghost: {at: Corner; ok: boolean} | null;
    placing: boolean;
    /** The walker's route and speed, when it walks. */
    walker: {route: Point[]; cellsPerSecond: number} | null;
    onHover: (corner: Corner | null) => void;
    onCornerClick: (corner: Corner) => void;
    /** A click on a tower; `additive` with shift held. */
    onTowerClick: (index: number, additive: boolean) => void;
    onTowerDoubleClick: (index: number) => void;
    onTowerRemove: (index: number) => void;
}

const percent = (value: number, of: number): string => `${(value / of) * 100}%`;

/** An area of the lane as a box on the board, in percent. */
const areaBox = ({col, row, cols, rows}: Area): CSSProperties => ({
    left: percent(col, COLS),
    top: percent(ROWS - row - rows, ROWS),
    width: percent(cols, COLS),
    height: percent(rows, ROWS),
});

/** A tower's 2x2 footprint around its corner. */
const towerBox = ([cx, cy]: Corner): CSSProperties => areaBox({col: cx - 1, row: cy - 1, cols: 2, rows: 2});

/** SVG points along a path of cells (the board's viewBox is one unit per cell, y down). */
const pathPoints = (path: Cell[] | null): string =>
    (path ? path.map(([col, row]) => `${col + 0.5},${ROWS - row - 0.5}`).join(' ') : '');

const ENTRY = areaBox(ENTRY_STRIP);
const CHECKPOINTS = CHECKPOINT_TILES.map(areaBox);
const EXIT = areaBox(EXIT_CELLS);
const MOUTH_IN = {left: percent(WAY_IN.col, COLS), width: percent(WAY_IN.cols, COLS)};
const MOUTH_OUT = {left: percent(WAY_OUT.col, COLS), width: percent(WAY_OUT.cols, COLS)};
const SPAWNS = SPAWN_COLS.map((col) => ({left: percent(col, COLS)}));
const LEG_CLASSES = [styles.legOne, styles.legTwo, styles.legThree];

const MazeBoard: FC<MazeBoardProps> = (
    {towers, legs, rings, ghost, placing, walker, onHover, onCornerClick, onTowerClick, onTowerDoubleClick, onTowerRemove},
) => {
    // The corner nearest the pointer, kept to where a tower's footprint fits
    const cornerAt = (event: MouseEvent<HTMLDivElement>): Corner => {
        const box = event.currentTarget.getBoundingClientRect();
        const x = ((event.clientX - box.left) / box.width) * COLS;
        const y = ROWS - ((event.clientY - box.top) / box.height) * ROWS;
        return [
            Math.min(CORNER_MAX[0], Math.max(CORNER_MIN[0], Math.round(x))),
            Math.min(CORNER_MAX[1], Math.max(CORNER_MIN[1], Math.round(y))),
        ];
    };

    return (
        <div className={styles.frame}>
            <div className={styles.lane}>
                <div className={styles.mouthIn} style={MOUTH_IN}/>
                <div className={styles.mouthOut} style={MOUTH_OUT}/>
                {SPAWNS.map((style, i) => <div key={i} className={styles.spawn} style={style}>▼</div>)}
                <div
                    className={classNames(styles.board, placing && styles.placing)}
                    data-testid="maze-board"
                    onMouseMove={(event) => onHover(cornerAt(event))}
                    onMouseLeave={() => onHover(null)}
                    onClick={(event) => onCornerClick(cornerAt(event))}
                >
                    <div className={styles.unbuildable} style={ENTRY}/>
                    {CHECKPOINTS.map((style, i) => (
                        <div key={i} className={classNames(styles.unbuildable, styles.checkpoint, i ? styles.checkpointTwo : styles.checkpointOne)} style={style}>
                            {i + 1}
                        </div>
                    ))}
                    <div className={classNames(styles.unbuildable, styles.exit)} style={EXIT}/>

                    <svg className={styles.overlay} viewBox={`0 0 ${COLS} ${ROWS}`} preserveAspectRatio="none">
                        {legs.map((leg, i) => (
                            <polyline key={i} className={classNames(styles.leg, LEG_CLASSES[i])} points={pathPoints(leg)}/>
                        ))}
                        {rings.map((ring, i) => (
                            <circle key={i} className={classNames(styles.ring, ring.strong && styles.ringStrong)}
                                    cx={ring.at[0]} cy={ROWS - ring.at[1]} r={ring.radius}/>
                        ))}
                        {walker && <Walker route={walker.route} cellsPerSecond={walker.cellsPerSecond}/>}
                    </svg>

                    {towers.map((tower, i) => (
                        <div
                            key={i}
                            className={styles.towerSlot}
                            style={towerBox(tower.at)}
                            title={tower.title}
                            onClick={(event) => {
                                event.stopPropagation();
                                onTowerClick(i, event.shiftKey);
                            }}
                            onDoubleClick={(event) => {
                                event.stopPropagation();
                                onTowerDoubleClick(i);
                            }}
                            onContextMenu={(event) => {
                                event.preventDefault();
                                event.stopPropagation();
                                onTowerRemove(i);
                            }}
                        >
                            <div className={classNames(styles.tower, tower.race ? styles.raceSecond : styles.raceFirst,
                                tower.bad && styles.towerBad, tower.selected && styles.towerSelected)}>
                                <span>{tower.label}</span>
                                <span className={styles.towerLevel}>{'◆'.repeat(Math.min(4, tower.level))}</span>
                            </div>
                        </div>
                    ))}

                    {ghost && (
                        <>
                            <div className={classNames(styles.ghost, ghost.ok ? styles.ghostOk : styles.ghostBad)} style={towerBox(ghost.at)}/>
                            <div
                                className={classNames(styles.ghostCorner, ghost.ok ? styles.ghostOk : styles.ghostBad)}
                                style={{left: percent(ghost.at[0], COLS), top: percent(ROWS - ghost.at[1], ROWS)}}
                            />
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MazeBoard;
