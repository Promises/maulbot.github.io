import {FC} from 'react';
import styles from './LobbyIcons.module.scss';

// Small marks beside a lobby's name, in the muted gold of the lobby pages.

/** A padlock: the lobby has a password. */
export const LockIcon: FC = () => (
    <svg className={styles.icon} viewBox="0 0 16 16" role="img" aria-label="Password-protected">
        <title>Password-protected</title>
        <path d="M5 7.5V5.2a3 3 0 0 1 6 0v2.3" fill="none" stroke="currentColor" strokeWidth="1.7"/>
        <rect x="3" y="7.5" width="10" height="7" rx="1.2" fill="currentColor"/>
    </svg>
);

/** An eye: the lobby takes observers. */
export const ObserversIcon: FC = () => (
    <svg className={styles.icon} viewBox="0 0 16 16" role="img" aria-label="Observers allowed">
        <title>Observers allowed</title>
        <path d="M1 8s2.6-4.6 7-4.6S15 8 15 8s-2.6 4.6-7 4.6S1 8 1 8z" fill="none" stroke="currentColor" strokeWidth="1.5"/>
        <circle cx="8" cy="8" r="2.1" fill="currentColor"/>
    </svg>
);
