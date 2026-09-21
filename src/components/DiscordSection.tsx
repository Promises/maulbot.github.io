import {FC} from 'react';
import styles from './DiscordSection.module.scss';
import DiscordButton from './DiscordButton';
import {DISCORD_INVITE_LABEL, DISCORD_INVITE_URL} from '../content';

const DiscordSection: FC = () => (
    <section id="discord" className={styles.section}>
        <div className={styles.card}>
            <div className={styles.copy}>
                <h2 className={styles.heading}>Meet the community</h2>
                <span className={styles.rule}/>
                <p className={styles.text}>
                    The Discord is where the people who built and played this map hang out. Drop in if
                    you find a bug, want to talk balance, or fancy getting a game going.
                </p>
                <a className={styles.invite} href={DISCORD_INVITE_URL}>{DISCORD_INVITE_LABEL}</a>
            </div>
            <div className={styles.artwork}>
                <a className={styles.badge} href={DISCORD_INVITE_URL} aria-label="Join our Discord">
                    <DiscordButton/>
                </a>
            </div>
        </div>
    </section>
);

export default DiscordSection;
