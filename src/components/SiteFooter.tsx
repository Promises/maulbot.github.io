import {FC} from 'react';
import styles from './SiteFooter.module.scss';
import {DISCORD_INVITE_URL, MAP_REPO_URL} from '../content';

const SiteFooter: FC = () => (
    <footer className={styles.footer}>
        <span>maulbot.com / warcraftmaul.com</span>
        <img className={styles.murloc} src="/Murlocdance1.gif" alt=""/>
        <span className={styles.links}>
            <a href={DISCORD_INVITE_URL}>Discord</a>
            <a href={MAP_REPO_URL}>GitHub</a>
        </span>
    </footer>
);

export default SiteFooter;
