import {FC} from 'react';
import {Link} from 'react-router-dom';
import styles from './Hero.module.scss';
import {BUNDLED_MAP_URL, BUNDLED_MAP_VERSION, GAME_STATS, MAP_REPO} from '../content';
import {useLatestMapRelease} from '../github/hooks';
import {ROUTES} from '../routes';

const Hero: FC = () => {
    const {release} = useLatestMapRelease(MAP_REPO);
    const version = release?.version ?? BUNDLED_MAP_VERSION;
    const downloadUrl = release?.downloadUrl ?? BUNDLED_MAP_URL;

    return (
        <section id="download" className={styles.hero}>
            <div className={styles.crestWrap}>
                <div className={styles.crestGlow}/>
                <img className={styles.crest} src="/undead.png" alt="Warcraft Maul crest"/>
            </div>

            <h1 className={styles.title}>WarCraft Maul</h1>
            <div className={styles.subtitle}>
                <span className={styles.rule}/>
                <span className={styles.diamond}/>
                <span className={styles.subtitleText}>Reimagined</span>
                <span className={styles.diamond}/>
                <span className={styles.rule}/>
            </div>

            <p className={styles.lede}>
                The co-op maze tower defense that has outlived every host bot that tried to run it.
                Rebuilt from scratch in TypeScript — same mazes, same rage, cleaner code.
            </p>

            <div className={styles.actions}>
                <a className={styles.download} href={downloadUrl}>
                    <span className={styles.downloadText}>
                        <span className={styles.downloadTitle}>Download the map</span>
                        <span className={styles.downloadHint}>.w3x · drop into your Warcraft III maps folder</span>
                    </span>
                    <span className={styles.version}>{version}</span>
                </a>
                <Link className={styles.patchNotes} to={ROUTES.changelog}>Patch notes</Link>
            </div>

            <div className={styles.stats}>
                {GAME_STATS.map(({value, label}) => (
                    <span key={label} className={styles.stat}>
                        <span className={styles.statValue}>{value}</span>
                        <span className={styles.statLabel}>{label}</span>
                    </span>
                ))}
            </div>
        </section>
    );
};

export default Hero;
