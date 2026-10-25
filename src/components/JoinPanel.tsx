import {FC, ReactNode, useEffect, useState} from 'react';
import {Link} from 'react-router-dom';
import styles from './JoinPanel.module.scss';
import {homeSection, ROUTES} from '../routes';
import {useOurLobbies} from '../lobbies/hooks';
import {ago, regionName, splitHost, versionOf} from '../lobbies/format';
import {LobbySession} from '../lobbies/types';

const MAX_SHOWN = 2;
const COPIED_MS = 1800;

const Meta: FC<{label: string; children: ReactNode}> = ({label, children}) => (
    <span className={styles.meta}>
        <span className={styles.label}>{label}</span>
        <span className={styles.metaValue}>{children}</span>
    </span>
);

const LobbyCard: FC<{lobby: LobbySession; readAt: number}> = ({lobby, readAt}) => {
    const {advert, players} = lobby;
    const name = advert.name ?? '';
    const host = splitHost(advert.host);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (!copied) {
            return;
        }
        const timer = setTimeout(() => setCopied(false), COPIED_MS);
        return () => clearTimeout(timer);
    }, [copied]);

    const copyName = () => {
        navigator.clipboard?.writeText(name).then(() => setCopied(true), () => undefined);
    };

    return (
        <div className={styles.card}>
            <div className={styles.nameRow}>
                <div className={styles.nameBlock}>
                    <span className={styles.label}>Lobby name</span>
                    <span className={styles.name}>{name}</span>
                </div>
                <button type="button" className={styles.copy} onClick={copyName}>
                    {copied ? 'Copied' : 'Copy name'}
                </button>
            </div>
            <div className={styles.players}>
                <div className={styles.playersRow}>
                    <span className={styles.label}>Players</span>
                    <span className={styles.count}>
                        <span className={styles.countValue}>{players}</span> / {advert.max_players}
                    </span>
                </div>
                <div className={styles.slots} style={{gridTemplateColumns: `repeat(${advert.max_players}, minmax(0, 1fr))`}}>
                    {Array.from({length: advert.max_players}, (_, slot) => (
                        <span key={slot} className={slot < players ? styles.slotTaken : styles.slotOpen}/>
                    ))}
                </div>
            </div>
            <div className={styles.metaRow}>
                <Meta label="Host">{host.name}<span className={styles.tag}>{host.tag}</span></Meta>
                <Meta label="Region">{regionName(advert.region)}</Meta>
                <Meta label="Open for">{ago(lobby.openedAt, readAt)}</Meta>
                <Meta label="Version">{versionOf(advert)}</Meta>
            </div>
        </div>
    );
};

/** Our map's open lobbies, so a visitor can join one now. */
const JoinPanel: FC = () => {
    const {status, lobbies, readAt} = useOurLobbies();
    const shown = lobbies.slice(0, MAX_SHOWN);

    return (
        <section id="join" className={styles.panel} aria-labelledby="join-heading">
            <div className={styles.header}>
                <h2 id="join-heading" className={styles.heading}>Join us in-game</h2>
                {shown.length > 0 && (
                    <span className={styles.live}><span className={styles.liveDot}/>Hosting now</span>
                )}
            </div>

            {shown.length > 0 && (
                <>
                    {shown.map((lobby) => (
                        <LobbyCard key={`${lobby.advert.host}\u0000${lobby.advert.name}`} lobby={lobby} readAt={readAt}/>
                    ))}
                    <p className={styles.hint}>
                        In Warcraft III: Custom Game → search the lobby name. No need to download first — the map
                        transfers in the lobby.
                    </p>
                </>
            )}
            {shown.length === 0 && status === 'loading' && (
                <p className={styles.status}>Looking for open lobbies…</p>
            )}
            {shown.length === 0 && status !== 'loading' && (
                <div className={styles.empty}>
                    <span className={styles.emptyTitle}>
                        {status === 'ready' ? 'No lobby is up right now' : 'Lobby data is unavailable right now'}
                    </span>
                    <p className={styles.emptyText}>
                        {status === 'ready'
                            ? 'Ask in the '
                            : 'The lobby tracker is catching up, so this may be missing a lobby. Ask in the '}
                        <Link to={homeSection('discord')}>Discord</Link> and someone will host. This panel updates on
                        its own.
                    </p>
                </div>
            )}

            <Link className={styles.logLink} to={ROUTES.lobbyLog}>Previously hosted lobbies →</Link>
        </section>
    );
};

export default JoinPanel;
