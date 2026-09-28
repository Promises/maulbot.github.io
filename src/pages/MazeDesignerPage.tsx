import {ChangeEvent, FC, ReactNode, useCallback, useEffect, useMemo, useState} from 'react';
import styles from './MazeDesigner.module.scss';
import {downloadBlob} from '../loadingScreen/download';
import {analyse, fmt, mazeLength, overBudget, overFood, PlacedTower, refusals} from '../mazeDesigner/analysis';
import {buildFileName, parseBuild, toBuild} from '../mazeDesigner/build';
import classNames from '../mazeDesigner/classNames';
import {Corner, PresetName, PRESETS} from '../mazeDesigner/lane';
import MazeBoard, {Ring, TowerView} from '../mazeDesigner/MazeBoard';
import {BUNDLED_RACES, BUNDLED_SOURCE, indexRaces, normaliseRaces, Race, racesByTier, Tower, upgradeDepth} from '../mazeDesigner/races';
import {clickSelection, commonUpgrades, downgradeAll, formOf, removeAll, replaceAll, sameForm, upgradeAll} from '../mazeDesigner/selection';
import {CELL_SIZE, CREEP_SPEED, routeLength, walkRoute, walkSeconds} from '../mazeDesigner/walk';

const STORE = 'maul-maze-designer/v1';
const STORE_DATA = 'maul-maze-designer/race-data';
/** Gold by wave 34: 100 start + 1,617 wave pay + ~4,020 bounty from one full lane. */
const DEFAULT_BUDGET = 5700;
const DEFAULT_RACE = 'Orc Stronghold';
const DEFAULT_NAME = 'New maze';
const CELL = 64;

interface Status {
    text: string;
    bad: boolean;
}

const readStored = <T, >(key: string, parse: (data: unknown) => T): T | null => {
    try {
        const text = localStorage.getItem(key);
        return text ? parse(JSON.parse(text)) : null;
    } catch {
        return null;
    }
};

const store = (key: string, value: unknown): void => {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch {
        // Private windows and full storage: the design just isn't kept
    }
};

/** "Chaos Grunt" -> "CG", "Grunt" -> "GRU": a tower's label on the board. */
function abbreviate(name: string): string {
    const words = name.replace(/[^A-Za-z ]/g, ' ').split(/\s+/).filter(Boolean);
    if (words.length > 1) {
        return words.slice(0, 3).map((word) => word[0]).join('').toUpperCase();
    }
    return (words[0] || '?').slice(0, 3).toUpperCase();
}

const goldText = (tower: Tower): string => (tower.gold === null ? '— g' : `${fmt(tower.gold)} g`);

/** What a tower does, in a line: attack type, range and damage, or the food it makes. */
function towerMeta(tower: Tower): string {
    const attack = tower.attacks;
    if (!attack) {
        return tower.foodMade ? `Makes ${tower.foodMade} food` : 'No attack';
    }
    const damage = attack.damageMax !== attack.damageMin
        ? `${fmt(attack.damageMin)}–${fmt(attack.damageMax)}` : fmt(attack.damageMin);
    return [attack.type, attack.range ? `${attack.range} range` : null, `${damage} dmg`].filter(Boolean).join(' · ');
}

const Group: FC<{title: string; children: ReactNode}> = ({title, children}) => (
    <section className={styles.group}>
        <h2 className={styles.groupTitle}>{title}</h2>
        {children}
    </section>
);

const Panel: FC<{title: string; aside?: ReactNode; highlight?: boolean; children: ReactNode}> = ({title, aside, highlight, children}) => (
    <section className={classNames(styles.panel, highlight && styles.panelHighlight)}>
        <div className={styles.panelHead}>
            <span className={styles.panelTitle}>{title}</span>
            {aside}
        </div>
        {children}
    </section>
);

const FileButton: FC<{label: string; name: string; className: string; onFile: (data: unknown, name: string) => void; onError: (message: string) => void}> = (
    {label, name, className, onFile, onError},
) => {
    const read = (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (!file) {
            return;
        }
        file.text()
            .then((text) => onFile(JSON.parse(text), file.name))
            .catch((error: Error) => onError(`Could not read ${file.name}: ${error.message}`));
    };
    return (
        <label className={className}>
            {label}
            <input type="file" name={name} accept=".json,application/json" onChange={read}/>
        </label>
    );
};

const MazeDesignerPage: FC = () => {
    const [custom, setCustom] = useState<Race[] | null>(() => readStored(STORE_DATA, normaliseRaces));
    const races = useMemo(() => custom || normaliseRaces(BUNDLED_RACES), [custom]);
    const [saved] = useState(() => readStored(STORE, (data) => parseBuild(data, DEFAULT_BUDGET)));
    const [name, setName] = useState(saved?.name || DEFAULT_NAME);
    const [raceA, setRaceA] = useState(saved?.races[0] || DEFAULT_RACE);
    const [raceB, setRaceB] = useState(saved?.races[1] || '');
    const [budget, setBudget] = useState(saved?.budget ?? DEFAULT_BUDGET);
    const [notes, setNotes] = useState(saved?.notes || '');
    const [towers, setTowers] = useState<PlacedTower[]>(saved?.towers || []);
    const [armed, setArmed] = useState<string | null>(null);
    const [selected, setSelected] = useState<number[]>([]);
    const [walking, setWalking] = useState(false);
    const [hover, setHover] = useState<Corner | null>(null);
    const [status, setStatus] = useState<Status>({text: 'Ready', bad: false});
    const [showRanges, setShowRanges] = useState(false);

    const say = (text: string, bad = false) => setStatus({text, bad});
    const chosen = useMemo(() => [raceA, raceB].filter(Boolean), [raceA, raceB]);
    const index = useMemo(() => indexRaces(races, chosen), [races, chosen]);
    const analysis = useMemo(() => analyse(towers, index), [towers, index]);
    const {lengths, total} = mazeLength(analysis.legs);

    useEffect(() => {
        store(STORE, toBuild(name, [raceA, raceB], budget, towers, notes));
    }, [name, raceA, raceB, budget, towers, notes]);

    // A kept or imported design may name a race the data doesn't have (or no longer offers)
    useEffect(() => {
        const known = (raceName: string) => races.some((race) => race.name === raceName);
        if (!known(raceA)) {
            setRaceA(known(DEFAULT_RACE) ? DEFAULT_RACE : races[0]?.name || '');
        }
        if (raceB && !known(raceB)) {
            setRaceB('');
        }
    }, [races, raceA, raceB]);

    const remove = useCallback((indices: number[]) => {
        setTowers((current) => removeAll(current, indices));
        setSelected([]);
        say(indices.length === 1 ? 'Tower removed' : `${indices.length} towers removed`);
    }, []);

    useEffect(() => {
        const onKey = (event: KeyboardEvent) => {
            const tag = (event.target as HTMLElement | null)?.tagName || '';
            if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) {
                return;
            }
            if (event.key === 'Escape') {
                setArmed(null);
                setSelected([]);
            }
            if ((event.key === 'Delete' || event.key === 'Backspace') && selected.length) {
                event.preventDefault();
                remove(selected);
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [selected, remove]);

    const place = (at: Corner) => {
        const entry = armed ? index.byId.get(armed) : undefined;
        if (!armed || !entry) {
            return;
        }
        const candidate = {at, chain: [armed]};
        const why = refusals(towers, candidate, index, budget);
        if (why.length) {
            say(`Refused at ${at.join(', ')} — ${why[0]}`, true);
            return;
        }
        setTowers([...towers, candidate]);
        setSelected([towers.length]);
        say(`Placed ${entry.tower.name} at ${at.join(', ')}`);
    };

    /** Takes a changed design if it keeps the budget and the food; says why not otherwise. */
    const change = (next: PlacedTower[], done: string): boolean => {
        const after = analyse(next, index);
        if (overBudget(after, budget)) {
            say(`Refused — Rule 4: ${fmt(after.gold)} gold is over the budget`, true);
            return false;
        }
        if (overFood(after)) {
            say(`Refused — Rule 6: needs ${after.foodUsed} food, farms make ${after.foodMade}`, true);
            return false;
        }
        setTowers(next);
        say(done);
        return true;
    };

    const nameOf = (id: string) => index.byId.get(id)?.tower.name ?? id;
    const towersText = (indices: number[]) => (indices.length === 1 ? 'Tower' : `${indices.length} towers`);

    const upgrade = (indices: number[], id: string) =>
        change(upgradeAll(towers, indices, id), `${towersText(indices)} upgraded to ${nameOf(id)}`);

    const replace = (indices: number[], id: string) =>
        change(replaceAll(towers, indices, id), `${towersText(indices)} replaced with ${nameOf(id)}`);

    const loadPreset = (preset: PresetName) => {
        // Built as the picked tower, else the first race's first base tower that attacks
        const race = races.find((candidate) => candidate.name === raceA);
        const baseTowers = race ? race.base.map((id) => race.towers.find((tower) => tower.id === id)) : [];
        const id = armed || (baseTowers.find((tower) => tower?.attacks) || baseTowers[0])?.id;
        if (!id) {
            return;
        }
        setTowers(PRESETS[preset].map((at) => ({at, chain: [id]})));
        setSelected([]);
        if (name === DEFAULT_NAME) {
            setName(`${preset} maze, ${raceA}`);
        }
        say(`${preset} example loaded as ${index.byId.get(id)?.tower.name ?? id}`);
    };

    const exportBuild = () => {
        const build = toBuild(name, [raceA, raceB], budget, towers, notes);
        downloadBlob(new Blob([JSON.stringify(build, null, 2) + '\n'], {type: 'application/json'}), buildFileName(name));
        say('Build exported');
    };

    const importBuild = (data: unknown) => {
        const build = parseBuild(data, budget);
        setName(build.name);
        setRaceA(build.races[0] || raceA);
        setRaceB(build.races[1] || '');
        setBudget(build.budget);
        setNotes(build.notes);
        setTowers(build.towers);
        setSelected([]);
        setArmed(null);
        say(`Imported ${build.name}`);
    };

    const loadRaceData = (data: unknown) => {
        const loaded = normaliseRaces(data);
        store(STORE_DATA, data);
        setCustom(loaded);
        say('Race data loaded');
    };

    const restoreBundled = () => {
        try {
            localStorage.removeItem(STORE_DATA);
        } catch {
            // Nothing kept to remove
        }
        setCustom(null);
        say('Using the bundled race data');
    };

    // What the board shows
    const towerViews: TowerView[] = towers.map((placed, i) => {
        const entries = placed.chain.map((id) => index.byId.get(id));
        const last = entries[entries.length - 1];
        const problems = analysis.problems[i];
        return {
            at: placed.at,
            label: last ? abbreviate(last.tower.name) : '??',
            level: placed.chain.length - 1,
            race: entries[0] && entries[0].raceIndex > 0 ? 1 : 0,
            bad: problems.length > 0,
            selected: selected.includes(i),
            title: `${last ? last.tower.name : placed.chain.join(' → ')} · ${placed.at.join(', ')}${problems.length ? ' · ' + problems.join('; ') : ''}`,
        };
    });

    const rings: Ring[] = [];
    const ringFor = (at: Corner, id: string, strong: boolean) => {
        const range = index.byId.get(id)?.tower.attacks?.range;
        if (range) {
            rings.push({at, radius: range / CELL, strong});
        }
    };
    towers.forEach((placed, i) => {
        if (showRanges || selected.includes(i)) {
            ringFor(placed.at, formOf(placed), selected.includes(i));
        }
    });
    const current = selected.length === 1 ? towers[selected[0]] : undefined;
    const route = walkRoute(analysis.legs);
    const walkCells = route ? routeLength(route) : 0;

    const ghostWhy = armed && hover ? refusals(towers, {at: hover, chain: [armed]}, index, budget) : null;
    if (armed && hover) {
        ringFor(hover, armed, true);
    }

    // The side panels
    const closed = total === null;
    const goldKnown = analysis.unknownGold === 0;
    const over = overBudget(analysis, budget);
    const foodBad = overFood(analysis);
    const rules = [
        {n: 1, label: 'On buildable cells', bad: analysis.outside},
        {n: 2, label: 'No overlaps', bad: analysis.overlaps},
        {n: 3, label: 'The way stays open', bad: closed ? 1 : 0},
        {n: 4, label: 'Within the gold budget', bad: over ? 1 : 0, unknown: !goldKnown && !over},
        {n: 5, label: 'Towers from chosen races', bad: analysis.wrongRace},
        {n: 6, label: 'Food within food made', bad: foodBad ? 1 : 0, na: !analysis.usesFood},
    ];
    const problems: string[] = [];
    if (closed) {
        problems.push(`The way is closed on leg ${lengths.findIndex((length) => length === null) + 1}`);
    }
    analysis.problems.forEach((list, i) => list.forEach((problem) => problems.push(`Tower #${i + 1}: ${problem}`)));

    const selectedEntries = current ? current.chain.map((id) => index.byId.get(id)) : [];
    const selectedLast = selectedEntries[selectedEntries.length - 1];
    // A selection of several: how many of each form, and what their chains cost
    const selectionKinds = Array.from(new Set(selected.map((i) => formOf(towers[i]))))
        .map((form) => ({form, count: selected.filter((i) => formOf(towers[i]) === form).length}));
    const selectionSteps = selected.flatMap((i) => towers[i].chain.map((id) => index.byId.get(id)?.tower.gold ?? null));
    const selectionGold = selectionSteps.some((gold) => gold === null) ? null
        : selectionSteps.reduce((sum: number, gold) => sum + (gold as number), 0);
    const selectionUpgrades = commonUpgrades(towers, selected, index);
    const tiers = racesByTier(races);
    const raceOptions = (skip = '') => tiers.map(({tier, names}) => (
        <optgroup key={tier} label={tier}>
            {names.filter((raceName) => raceName !== skip).map((raceName) => <option key={raceName} value={raceName}>{raceName}</option>)}
        </optgroup>
    ));
    const towerCount = races.reduce((n, race) => n + race.towers.length, 0);

    const statusText = hover && ghostWhy ? (ghostWhy.length ? `${hover.join(', ')} — ${ghostWhy[0]}` : `Corner ${hover.join(', ')}`) : status.text;
    const statusClass = hover && ghostWhy ? (ghostWhy.length ? styles.statusBad : styles.statusOk) : (status.bad ? styles.statusBad : undefined);

    return (
        <div className={styles.designer}>
            <aside className={styles.sidebar}>
                <header className={styles.brand}>
                    <span className={styles.brandKicker}>Warcraft Maul</span>
                    <h1 className={styles.brandTitle}>Maze Designer</h1>
                </header>

                <Group title="Build">
                    <label className={styles.field}>
                        Name
                        <input type="text" name="name" value={name} onChange={(event) => setName(event.target.value)}/>
                    </label>
                    <label className={styles.field}>
                        Gold budget
                        <input type="number" name="budget" min={0} step={50} value={budget}
                               onChange={(event) => setBudget(Math.max(0, parseInt(event.target.value, 10) || 0))}/>
                    </label>
                    <p className={styles.hint}>Wave 34 default: 100 start + 1,617 wave pay + ~4,020 bounty from one full lane ≈ 5,737.</p>
                </Group>

                <Group title="Races">
                    <label className={styles.field}>
                        First race
                        <select name="raceA" value={raceA} onChange={(event) => {
                            setRaceA(event.target.value);
                            if (raceB === event.target.value) {
                                setRaceB('');
                            }
                            setArmed(null);
                        }}>
                            {raceOptions()}
                        </select>
                    </label>
                    <label className={styles.field}>
                        <span>Second race <span className={styles.fieldNote}>— from wave 15, a second lumber</span></span>
                        <select name="raceB" value={raceB} onChange={(event) => {
                            setRaceB(event.target.value);
                            setArmed(null);
                        }}>
                            <option value="">None</option>
                            {raceOptions(raceA)}
                        </select>
                    </label>
                </Group>

                <Group title="Base towers">
                    {chosen.map((raceName, raceIndex) => {
                        const race = races.find((candidate) => candidate.name === raceName);
                        if (!race) {
                            return null;
                        }
                        return (
                            <div key={raceName} className={styles.palette}>
                                <div className={styles.paletteRace}>
                                    <span className={classNames(styles.swatch, raceIndex ? styles.raceSecond : styles.raceFirst)}/>
                                    {raceName}
                                </div>
                                {race.base.map((id) => race.towers.find((tower) => tower.id === id)).filter((tower): tower is Tower => !!tower).map((tower) => {
                                    const depth = upgradeDepth(tower, index.byId);
                                    const isArmed = armed === tower.id;
                                    return (
                                        <button
                                            key={tower.id}
                                            type="button"
                                            className={classNames(styles.towerButton, isArmed && styles.towerButtonArmed)}
                                            aria-pressed={isArmed}
                                            onClick={() => {
                                                setArmed(isArmed ? null : tower.id);
                                                say(isArmed ? 'Ready' : `Placing ${tower.name} — click a corner`);
                                            }}
                                        >
                                            <span className={styles.towerName}>{tower.name}</span>
                                            <span className={styles.towerGold}>{goldText(tower)}</span>
                                            <span className={styles.towerMeta}>{towerMeta(tower)}</span>
                                            <span className={styles.towerMeta}>{depth ? `+${depth} upgrade${depth > 1 ? 's' : ''}` : ''}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        );
                    })}
                    <p className={styles.hint}>Pick a tower, then click a grid corner. Click a placed tower to select it, shift-click to add one, double-click for every tower of its kind. Right-click or Delete removes. Esc drops the pick.</p>
                </Group>

                <Group title="Map examples">
                    <div className={styles.presets}>
                        {(Object.keys(PRESETS) as PresetName[]).map((preset) => (
                            <button key={preset} type="button" className={styles.presetButton} onClick={() => loadPreset(preset)}>{preset}</button>
                        ))}
                    </div>
                    <p className={styles.hint}>Loads the map's hologram corners, each built as the picked tower (or the first race's first attacking base tower).</p>
                </Group>

                <Group title="Tower data">
                    <div className={styles.dataSource}>
                        <span className={styles.dataSourceName}>
                            {custom ? 'race-data.js output' : `Bundled from the map (${BUNDLED_SOURCE.commit}, ${BUNDLED_SOURCE.generated})`}
                        </span>
                        <span className={styles.hint}>
                            {towerCount} towers in {races.length} races, with gold and food.
                            {custom ? '' : ' Load newer node scripts/race-data.js output from the map repo to use that instead.'}
                        </span>
                    </div>
                    <FileButton label="Load race-data.json" name="raceData" className={styles.presetButton} onFile={(data) => {
                        try {
                            loadRaceData(data);
                        } catch (error) {
                            say(`Could not use it: ${(error as Error).message}`, true);
                        }
                    }} onError={(message) => say(message, true)}/>
                    {custom && <button type="button" className={styles.linkButton} onClick={restoreBundled}>Use the bundled data again</button>}
                </Group>

                <Group title="Notes">
                    <textarea className={styles.notes} name="notes" rows={3} value={notes} placeholder="What this maze is testing"
                              onChange={(event) => setNotes(event.target.value)}/>
                </Group>

                <div className={styles.actions}>
                    <button type="button" className={styles.exportButton} onClick={exportBuild}>Export build</button>
                    <FileButton label="Import build" name="build" className={styles.importButton} onFile={(data, fileName) => {
                        try {
                            importBuild(data);
                        } catch (error) {
                            say(`Could not read ${fileName}: ${(error as Error).message}`, true);
                        }
                    }} onError={(message) => say(message, true)}/>
                    <button type="button" className={styles.clearButton} onClick={() => {
                        setTowers([]);
                        setSelected([]);
                        say('Lane cleared');
                    }}>Clear lane</button>
                    <p className={styles.hint}>Writes maul-build/1: corners in the canonical lane, one chain of ids per tower, in build order.</p>
                </div>
            </aside>

            <main className={styles.stage}>
                <div className={styles.stageHeader}>
                    <span className={styles.stageTitle}>Lane · 24 × 38 cells · Wave 34 · 20 Zerglings · 82,500 hp · 9 armour</span>
                    <span role="status" title={statusText} className={classNames(styles.status, statusClass)}>{statusText}</span>
                </div>

                <div className={styles.workspace}>
                    <MazeBoard
                        towers={towerViews}
                        legs={analysis.legs}
                        rings={rings}
                        ghost={hover && ghostWhy ? {at: hover, ok: !ghostWhy.length} : null}
                        placing={!!armed}
                        onHover={(corner) => {
                            if (!corner || !hover || corner[0] !== hover[0] || corner[1] !== hover[1]) {
                                setHover(corner);
                            }
                        }}
                        onCornerClick={(corner) => {
                            if (armed) {
                                place(corner);
                            } else if (selected.length) {
                                setSelected([]);
                            }
                        }}
                        onTowerClick={(i, additive) => setSelected(clickSelection(selected, i, additive))}
                        onTowerDoubleClick={(i) => {
                            const kind = sameForm(towers, i);
                            setSelected(kind);
                            say(`${kind.length} × ${index.byId.get(formOf(towers[i]))?.tower.name ?? formOf(towers[i])} selected`);
                        }}
                        onTowerRemove={(i) => remove([i])}
                        walker={walking && route ? {route, cellsPerSecond: CREEP_SPEED / CELL_SIZE} : null}
                    />

                    <div className={styles.panels}>
                        <Panel title="Maze length">
                            <span className={classNames(styles.length, closed && styles.lengthClosed)}>{closed ? 'Closed' : total}</span>
                            <div className={styles.legs}>
                                {lengths.map((length, i) => (
                                    <span key={i} className={styles.leg}>
                                        <span className={classNames(styles.legSwatch, [styles.legOne, styles.legTwo, styles.legThree][i])}/>
                                        {length ?? '—'}
                                    </span>
                                ))}
                            </div>
                            <span className={styles.hint}>Spawn → 1 → 2 → exit, 4-neighbour cells, as the map's anti-block measures it. Empty lane: 40.</span>
                            <div className={styles.walk}>
                                <button type="button" className={styles.smallButton} disabled={!route} aria-pressed={walking && !!route}
                                        onClick={() => setWalking(!walking)}>
                                    {walking && route ? 'Stop walking' : 'Walk the maze'}
                                </button>
                                <span className={styles.hintSmall}>
                                    {route ? `≈ ${walkSeconds(walkCells).toFixed(1)} s at speed ${CREEP_SPEED}` : 'The way is closed'}
                                </span>
                            </div>
                            <span className={styles.hint}>A wave 34 Zergling's time along this way, start to exit. Real creeps cut corners, so they are a little quicker.</span>
                        </Panel>

                        <Panel title="Gold" aside={
                            <span className={classNames(styles.goldText, over && styles.textBad)}>
                                {fmt(analysis.gold)}{goldKnown ? '' : '+'} / {fmt(budget)}
                            </span>
                        }>
                            <div className={styles.meter}>
                                <div className={classNames(styles.meterFill, over && styles.meterOver)}
                                     style={{width: `${Math.min(100, budget ? (analysis.gold / budget) * 100 : 0)}%`}}/>
                            </div>
                            <span className={styles.hint}>
                                {goldKnown
                                    ? (over ? `${fmt(analysis.gold - budget)} over` : `${fmt(budget - analysis.gold)} left`)
                                    : `${analysis.unknownGold} tower step${analysis.unknownGold === 1 ? '' : 's'} with no cost data`}
                            </span>
                            {analysis.usesFood && (
                                <div className={styles.panelRow}>
                                    <span className={styles.panelTitle}>Food</span>
                                    <span className={classNames(styles.foodText, foodBad && styles.textBad)}>{analysis.foodUsed} / {analysis.foodMade}</span>
                                </div>
                            )}
                            <div className={styles.panelRow}>
                                <span>Towers</span>
                                <span className={styles.count}>{towers.length}</span>
                            </div>
                        </Panel>

                        {selected.length > 0 && (
                            <Panel
                                title={current ? `Tower #${selected[0] + 1}` : `${selected.length} towers`}
                                highlight
                                aside={<span className={styles.hintSmall}>{current ? `corner ${current.at.join(', ')}` : 'shift-click adds or drops one'}</span>}
                            >
                                {current ? (
                                    <>
                                        <span className={styles.selectedName}>{selectedLast ? selectedLast.tower.name : '?'}</span>
                                        <span className={styles.selectedLine}>
                                            {selectedEntries[0] ? selectedEntries[0].race : '?'} · {selectedLast ? towerMeta(selectedLast.tower) : ''}
                                        </span>
                                        <span className={styles.selectedLine}>
                                            {selectedEntries.map((entry, k) => (entry ? entry.tower.name : current.chain[k])).join(' → ')}
                                        </span>
                                    </>
                                ) : (
                                    selectionKinds.map(({form, count}) => (
                                        <span key={form} className={styles.selectedLine}>{count} × {index.byId.get(form)?.tower.name ?? form}</span>
                                    ))
                                )}
                                <span className={styles.selectedCost}>
                                    {selectionGold === null
                                        ? 'Cost unknown — load race-data.json'
                                        : `${fmt(selectionGold)} gold for ${current ? 'the chain' : 'their chains'}`}
                                </span>
                                {selectionUpgrades.map((id) => index.byId.get(id)).map((entry) => entry && (
                                    <button key={entry.tower.id} type="button" className={styles.upgradeButton} onClick={() => upgrade(selected, entry.tower.id)}>
                                        <span>Upgrade {current ? '' : 'all '}→ {entry.tower.name}</span>
                                        <span className={styles.towerGold}>
                                            {current || entry.tower.gold === null ? goldText(entry.tower) : `${selected.length} × ${fmt(entry.tower.gold)} g`}
                                        </span>
                                    </button>
                                ))}
                                <label className={styles.field}>
                                    Replace with
                                    <select name="replace" value="" onChange={(event) => event.target.value && replace(selected, event.target.value)}>
                                        <option value="">A base tower of your races…</option>
                                        {chosen.map((raceName) => {
                                            const race = races.find((candidate) => candidate.name === raceName);
                                            return race && (
                                                <optgroup key={raceName} label={raceName}>
                                                    {race.base.map((id) => race.towers.find((tower) => tower.id === id)).filter((tower): tower is Tower => !!tower)
                                                        .map((tower) => <option key={tower.id} value={tower.id}>{tower.name} · {goldText(tower)}</option>)}
                                                </optgroup>
                                            );
                                        })}
                                    </select>
                                </label>
                                <div className={styles.selectedActions}>
                                    {selected.some((i) => towers[i].chain.length > 1) && (
                                        <button type="button" className={styles.smallButton}
                                                onClick={() => change(downgradeAll(towers, selected), `${towersText(selected)} downgraded`)}>
                                            Downgrade
                                        </button>
                                    )}
                                    <button type="button" className={classNames(styles.smallButton, styles.removeButton)} onClick={() => remove(selected)}>
                                        {current ? 'Remove' : 'Remove all'}
                                    </button>
                                </div>
                                {selected.map((i) => analysis.problems[i].map((problem) => (
                                    <span key={`${i} ${problem}`} className={styles.problem}>{current ? problem : `Tower #${i + 1}: ${problem}`}</span>
                                )))}
                            </Panel>
                        )}

                        <Panel title="Rules">
                            {rules.map((rule) => (
                                <div key={rule.n} className={styles.rule}>
                                    <span className={styles.ruleNumber}>{rule.n}</span>
                                    <span className={styles.ruleLabel}>{rule.label}</span>
                                    <span className={classNames(styles.ruleState,
                                        rule.na || (!rule.bad && rule.unknown) ? styles.stateUnknown : rule.bad ? styles.stateBad : styles.stateOk)}>
                                        {rule.na ? 'n/a' : rule.bad ? (rule.bad > 1 ? `${rule.bad} fail` : 'fail') : rule.unknown ? 'unknown' : 'ok'}
                                    </span>
                                </div>
                            ))}
                            <div className={styles.problems}>
                                {problems.length === 0 && <span className={styles.hint}>No problems.</span>}
                                {problems.map((problem, i) => <span key={i} className={styles.problem}>{problem}</span>)}
                            </div>
                        </Panel>

                        <label className={styles.checkboxField}>
                            <input type="checkbox" name="showRanges" checked={showRanges} onChange={(event) => setShowRanges(event.target.checked)}/>
                            Range circles for every tower
                        </label>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default MazeDesignerPage;
