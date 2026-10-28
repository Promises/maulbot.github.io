import {FC, useEffect, useMemo, useState} from 'react';
import styles from './LobbyLog.module.scss';
import ChipGroup, {ChipOption} from '../components/ChipGroup';
import LockIcon from '../components/LockIcon';
import {useLobbyLog} from '../lobbies/hooks';
import {clock, dayLabel, regionName, span, splitHost, versionOf} from '../lobbies/format';
import {isOpen} from '../lobbies/sessions';
import {LobbySession} from '../lobbies/types';

const PAGE_SIZE = 20;
const ALL = 'all';

type Region = typeof ALL | 'eu' | 'usw';

const REGION_OPTIONS: ChipOption<Region>[] = [
    {value: ALL, label: 'All'},
    {value: 'eu', label: 'EU'},
    {value: 'usw', label: 'US'},
];

type Status = 'open' | 'started' | 'closed';

const STATUS_LABELS: Record<Status, string> = {open: 'Open now', started: 'Started', closed: 'Closed'};

// Whether a game started is not visible in Battle.net's list, so a lobby that left it reads as
// closed; one with a start time (none yet) reads as started.
function statusOf(lobby: LobbySession, now: number): Status {
    if (isOpen(lobby, now)) {
        return 'open';
    }
    return lobby.advert.created_time ? 'started' : 'closed';
}

const LobbyRow: FC<{lobby: LobbySession; now: number}> = ({lobby, now}) => {
    const {advert, players} = lobby;
    const host = splitHost(advert.host);
    const status = statusOf(lobby, now);
    const end = status === 'open' || !lobby.closedAt ? new Date(now).toISOString() : lobby.closedAt;
    const fill = Math.min(100, Math.round((100 * players) / (advert.max_players || 1)));

    return (
        <li className={styles.row}>
            <span className={styles.time}>{clock(lobby.openedAt)}</span>
            <div className={styles.what}>
                <span className={styles.name}>{advert.name}{advert.locked && <LockIcon/>}</span>
                <span className={styles.detail}>
                    {host.name}<span className={styles.tag}>{host.tag}</span> · {versionOf(advert)} · {regionName(advert.region)}
                </span>
            </div>
            <div className={styles.players}>
                <span className={styles.count}>
                    <span className={styles.countValue}>{players}</span> / {advert.max_players} players
                </span>
                <span className={styles.bar}><span className={styles.barFill} style={{width: `${fill}%`}}/></span>
            </div>
            <div className={styles.outcome}>
                <span className={styles[status]}>{STATUS_LABELS[status]}</span>
                <span className={styles.duration}>{span(lobby.openedAt, end)} in lobby</span>
            </div>
        </li>
    );
};

// "Beta11 5.0.0" before "Beta9 5.0.0" before "4.4.3"; names without a version number go last.
function newestVersionFirst(a: string, b: string): number {
    const numbered = (version: string) => /\d/.test(version);
    if (numbered(a) !== numbered(b)) {
        return numbered(a) ? -1 : 1;
    }
    const release = (version: string) => version.match(/\d+(\.\d+)+/)?.[0] ?? '';
    return release(b).localeCompare(release(a), undefined, {numeric: true})
        || b.localeCompare(a, undefined, {numeric: true});
}

interface Day {
    label: string;
    lobbies: LobbySession[];
}

function byDay(lobbies: LobbySession[], now: number): Day[] {
    const days: Day[] = [];
    for (const lobby of lobbies) {
        const label = dayLabel(lobby.openedAt, now);
        const day = days[days.length - 1];
        if (day && day.label === label) {
            day.lobbies.push(lobby);
        } else {
            days.push({label, lobbies: [lobby]});
        }
    }
    return days;
}

/** Every lobby on our map the tracker has seen, newest first. */
const LobbyLogPage: FC = () => {
    const {status, lobbies, hasOlder, loadingOlder, loadOlder} = useLobbyLog();
    const [version, setVersion] = useState<string>(ALL);
    const [region, setRegion] = useState<Region>(ALL);
    const [limit, setLimit] = useState(PAGE_SIZE);
    const now = Date.now();

    const versionOptions = useMemo<ChipOption<string>[]>(() => {
        const versions = Array.from(new Set(lobbies.map((lobby) => versionOf(lobby.advert)))).sort(newestVersionFirst);
        return [{value: ALL, label: 'All'}, ...versions.map((v) => ({value: v, label: v}))];
    }, [lobbies]);

    const filtered = useMemo(() => lobbies.filter((lobby) =>
        (version === ALL || versionOf(lobby.advert) === version)
        && (region === ALL || lobby.advert.region === region)), [lobbies, version, region]);

    // Reads further back while the filters leave fewer lobbies than the list should show.
    useEffect(() => {
        if (filtered.length < limit && hasOlder && !loadingOlder) {
            loadOlder();
        }
    }, [filtered.length, limit, hasOlder, loadingOlder, loadOlder]);

    const pickVersion = (value: string) => {
        setVersion(value);
        setLimit(PAGE_SIZE);
    };
    const pickRegion = (value: Region) => {
        setRegion(value);
        setLimit(PAGE_SIZE);
    };

    const days = byDay(filtered.slice(0, limit), now);
    const more = filtered.length > limit || hasOlder;

    return (
        <section className={styles.section}>
            <div className={styles.inner}>
                <div className={styles.intro}>
                    <h1 className={styles.heading}>Lobby log</h1>
                    <span className={styles.rule}/>
                    <p className={styles.text}>
                        Every WarCraft Maul lobby seen on Battle.net, newest first — who hosted it, which version,
                        and how full it got.
                    </p>
                </div>

                <div className={styles.filters}>
                    <ChipGroup label="Version" options={versionOptions} value={version} onChange={pickVersion}/>
                    <ChipGroup label="Region" options={REGION_OPTIONS} value={region} onChange={pickRegion}/>
                    {status === 'ready' && (
                        <span className={styles.total}>{filtered.length}{hasOlder ? '+' : ''} lobbies</span>
                    )}
                </div>

                {status === 'loading' && <p className={styles.status}>Reading the lobby log…</p>}
                {status === 'unavailable' && (
                    <p className={styles.status}>Couldn't load the lobby log right now. Try again in a minute.</p>
                )}

                {days.map((day) => (
                    <section key={day.label} className={styles.day}>
                        <div className={styles.dayHeading}>
                            <h2 className={styles.dayLabel}>{day.label}</h2>
                            <span className={styles.dayRule}/>
                        </div>
                        <ul className={styles.rows}>
                            {day.lobbies.map((lobby) => <LobbyRow key={lobby.advert.instance_id} lobby={lobby} now={now}/>)}
                        </ul>
                    </section>
                ))}

                {status === 'ready' && filtered.length === 0 && !hasOlder && (
                    <div className={styles.empty}>No lobbies match these filters.</div>
                )}

                {status === 'ready' && more && (
                    <button
                        type="button"
                        className={styles.more}
                        onClick={() => setLimit((current) => current + PAGE_SIZE)}
                        disabled={loadingOlder && filtered.length <= limit}
                    >
                        {loadingOlder && filtered.length <= limit ? 'Loading…' : 'Show older lobbies'}
                    </button>
                )}
            </div>
        </section>
    );
};

export default LobbyLogPage;
