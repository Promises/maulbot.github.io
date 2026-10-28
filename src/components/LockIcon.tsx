import {FC} from 'react';
import styles from './LockIcon.module.scss';

/** A padlock beside a lobby's name: the lobby has a password. */
const LockIcon: FC = () => (
    <svg className={styles.lock} viewBox="0 0 16 16" role="img" aria-label="Password-protected">
        <title>Password-protected</title>
        <path d="M5 7.5V5.2a3 3 0 0 1 6 0v2.3" fill="none" stroke="currentColor" strokeWidth="1.7"/>
        <rect x="3" y="7.5" width="10" height="7" rx="1.2" fill="currentColor"/>
    </svg>
);

export default LockIcon;
