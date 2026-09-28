import {FC, useEffect, useRef} from 'react';
import styles from './MazeBoard.module.scss';
import {Point, poseAt} from './walk';

interface WalkerProps {
    route: Point[];
    /** Speed along the route, in cells a second. */
    cellsPerSecond: number;
}

const RADIUS = 0.8;
const MOUTH_OPEN = 45;
const CHOMPS_PER_SECOND = 4;

/** A circle with a wedge cut out towards +x, the wedge `mouth` degrees wide. */
function pacman(mouth: number): string {
    const half = ((mouth / 2) * Math.PI) / 180;
    const x = RADIUS * Math.cos(half);
    const y = RADIUS * Math.sin(half);
    return `M 0 0 L ${x} ${-y} A ${RADIUS} ${RADIUS} 0 1 0 ${x} ${y} Z`;
}

/**
 * Walks the maze's way in a loop, on the board's SVG. It moves itself frame by frame (no React
 * render per frame); a changed route is taken up from the distance it has walked.
 */
const Walker: FC<WalkerProps> = ({route, cellsPerSecond}) => {
    const group = useRef<SVGGElement>(null);
    const body = useRef<SVGPathElement>(null);
    const routeRef = useRef(route);
    routeRef.current = route;

    useEffect(() => {
        let frame = 0;
        const start = performance.now();
        const step = (now: number) => {
            const seconds = (now - start) / 1000;
            const pose = poseAt(routeRef.current, seconds * cellsPerSecond);
            group.current?.setAttribute('transform', `translate(${pose.x} ${pose.y}) rotate(${pose.angle})`);
            const mouth = MOUTH_OPEN * Math.abs(Math.sin(seconds * CHOMPS_PER_SECOND * Math.PI));
            body.current?.setAttribute('d', pacman(Math.max(1, mouth)));
            frame = requestAnimationFrame(step);
        };
        frame = requestAnimationFrame(step);
        return () => cancelAnimationFrame(frame);
    }, [cellsPerSecond]);

    // Where it starts, before the first frame moves it
    const first = poseAt(route, 0);
    return (
        <g ref={group} className={styles.walker} transform={`translate(${first.x} ${first.y}) rotate(${first.angle})`}>
            <path ref={body} d={pacman(MOUTH_OPEN)}/>
        </g>
    );
};

export default Walker;
