import {FC, useEffect, useMemo, useState} from 'react';
import styles from './Wc3Lobbies.module.scss';
import ChipGroup, {ChipOption} from '../components/ChipGroup';
import {LockIcon, ObserversIcon} from '../components/LobbyIcons';
import {useLiveLobbies} from '../lobbies/hooks';
import {ago, isOurs, mapNameOf, regionCode, splitHost} from '../lobbies/format';
import {LobbySession} from '../lobbies/types';

const ALL = 'all';

type Region = typeof ALL | 'eu' | 'usw' | 'kr';
type Sort = 'newest' | 'players' | 'full';
type Access = typeof ALL | 'open' | 'locked';
type Game = typeof ALL | 'custom' | 'melee';

const REGION_OPTIONS: ChipOption<Region>[] = [
    {value: ALL, label: 'All'},
    {value: 'eu', label: 'EU'},
    {value: 'usw', label: 'US'},
    {value: 'kr', label: 'KR'},
];

// "Open only" leaves out the lobbies known to have a password; the tracker does not know for every
// lobby, and one it does not know about is not hidden.
const ACCESS_OPTIONS: ChipOption<Access>[] = [
    {value: ALL, label: 'All'},
    {value: 'open', label: 'Open only'},
    {value: 'locked', label: 'Password-protected'},
];

const ACCESS_FILTERS: Record<Access, (locked: boolean | null | undefined) => boolean> = {
    [ALL]: () => true,
    open: (locked) => locked !== true,
    locked: (locked) => locked === true,
};

// Melee games are the few; "Custom" leaves those out, and as with access, a lobby whose game type
// the tracker did not record is not hidden.
const GAME_OPTIONS: ChipOption<Game>[] = [
    {value: ALL, label: 'All'},
    {value: 'custom', label: 'Custom'},
    {value: 'melee', label: 'Melee'},
];

const GAME_FILTERS: Record<Game, (gameType: string | null | undefined) => boolean> = {
    [ALL]: () => true,
    custom: (gameType) => gameType !== 'melee',
    melee: (gameType) => gameType === 'melee',
};

const SORT_OPTIONS: ChipOption<Sort>[] = [
    {value: 'newest', label: 'Newest'},
    {value: 'players', label: 'Most players'},
    {value: 'full', label: 'Nearly full'},
];

const fullness = ({advert}: LobbySession) => advert.final_players / (advert.max_players || 1);

const SORTERS: Record<Sort, (a: LobbySession, b: LobbySession) => number> = {
    newest: (a, b) => Date.parse(b.openedAt) - Date.parse(a.openedAt),
    players: (a, b) => b.advert.final_players - a.advert.final_players,
    full: (a, b) => fullness(b) - fullness(a),
};

/** Keeps the page out of search results for as long as it is shown. */
function useNoIndex(): void {
    useEffect(() => {
        const meta = document.createElement('meta');
        meta.name = 'robots';
        meta.content = 'noindex, nofollow';
        document.head.appendChild(meta);
        return () => meta.remove();
    }, []);
}

const LobbyRow: FC<{lobby: LobbySession; now: number}> = ({lobby, now}) => {
    const {advert} = lobby;
    const host = splitHost(advert.host);
    const ours = isOurs(advert);
    const fill = Math.min(100, Math.round(100 * fullness(lobby)));

    return (
        <li className={ours ? styles.ourRow : styles.row}>
            <span className={styles.name}>
                {advert.name}
                {advert.locked && <LockIcon/>}
                {advert.locked && advert.password && <span className={styles.password}>{advert.password}</span>}
                {advert.observers === 'full' && <ObserversIcon/>}
            </span>
            <span className={styles.map}>
                {mapNameOf(advert)}
                {advert.game_type === 'melee' && <span className={styles.mapTag}>Melee</span>}
                {advert.map_source === 'blizzard' && <span className={styles.mapTag}>Blizzard map</span>}
            </span>
            <span className={styles.host}>{host.name}<span className={styles.tag}>{host.tag}</span></span>
            <span className={styles.players}>
                <span className={styles.count}>
                    <span className={styles.countValue}>{advert.final_players}</span> / {advert.max_players}
                </span>
                <span className={styles.bar}><span className={styles.barFill} style={{width: `${fill}%`}}/></span>
            </span>
            <span className={styles.region}>{regionCode(advert.region)}</span>
            <span className={styles.age}>{ago(lobby.openedAt, now)}</span>
        </li>
    );
};

/** Every open WC3 lobby on every map. Linked from nowhere and kept out of search. */
const Wc3LobbiesPage: FC = () => {
    useNoIndex();
    const {status, lobbies, updatedAt, now, refresh} = useLiveLobbies();
    const [query, setQuery] = useState('');
    const [region, setRegion] = useState<Region>(ALL);
    const [sort, setSort] = useState<Sort>('newest');
    const [access, setAccess] = useState<Access>(ALL);
    const [game, setGame] = useState<Game>(ALL);

    const shown = useMemo(() => {
        const needle = query.trim().toLowerCase();
        return lobbies
            .filter(({advert}) => (region === ALL || advert.region === region)
                && ACCESS_FILTERS[access](advert.locked)
                && GAME_FILTERS[game](advert.game_type)
                && (!needle || [advert.name, mapNameOf(advert), advert.host].some((text) => (text ?? '').toLowerCase().includes(needle))))
            .sort((a, b) => Number(isOurs(b.advert)) - Number(isOurs(a.advert)) || SORTERS[sort](a, b));
    }, [lobbies, query, region, access, game, sort]);

    const waiting = shown.reduce((total, {advert}) => total + advert.final_players, 0);
    const secondsAgo = updatedAt === null ? null : Math.max(0, Math.round((now - updatedAt) / 1000));

    return (
        <section className={styles.section}>
            <div className={styles.inner}>
                <div className={styles.top}>
                    <div className={styles.titleBlock}>
                        <h1 className={styles.heading}>Open lobbies</h1>
                        <span className={styles.summary}>
                            {status === 'loading' ? 'Loading…' : `${shown.length} lobbies · ${waiting} players waiting`}
                        </span>
                    </div>
                    <div className={styles.refreshBlock}>
                        {secondsAgo !== null && (
                            <span className={styles.updated}>
                                {secondsAgo < 5 ? 'Updated just now' : `Updated ${secondsAgo}s ago`}
                            </span>
                        )}
                        <button type="button" className={styles.refresh} onClick={refresh}>Refresh</button>
                    </div>
                </div>

                <div className={styles.controls}>
                    <input
                        className={styles.search}
                        type="search"
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="Search lobby, map or host"
                        aria-label="Search lobby, map or host"
                    />
                    <ChipGroup label="Region" options={REGION_OPTIONS} value={region} onChange={setRegion}/>
                    <ChipGroup label="Access" options={ACCESS_OPTIONS} value={access} onChange={setAccess}/>
                    <ChipGroup label="Game" options={GAME_OPTIONS} value={game} onChange={setGame}/>
                    <ChipGroup label="Sort" options={SORT_OPTIONS} value={sort} onChange={setSort}/>
                </div>

                <div className={styles.table}>
                    <div className={styles.columns} aria-hidden="true">
                        <span>Lobby</span><span>Map</span><span>Host</span><span>Players</span><span>Region</span><span>Open</span>
                    </div>
                    {status === 'unavailable' && (
                        <span className={styles.empty}>Lobby data is unavailable right now. The tracker is catching up.</span>
                    )}
                    {status === 'ready' && shown.length === 0 && <span className={styles.empty}>No open lobbies match.</span>}
                    {shown.length > 0 && (
                        <ul className={styles.rows}>
                            {shown.map((lobby) => <LobbyRow key={lobby.advert.instance_id} lobby={lobby} now={now}/>)}
                        </ul>
                    )}
                </div>
            </div>
        </section>
    );
};

export default Wc3LobbiesPage;
