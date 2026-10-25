import {FC} from 'react';
import {Link} from 'react-router-dom';
import styles from './Hero.module.scss';
import {GAME_STATS, MAP_RELEASES_URL, MAP_REPO} from '../content';
import {useLatestMapRelease} from '../github/hooks';
import {ROUTES} from '../routes';
import JoinPanel from './JoinPanel';

const Hero: FC = () => {
    const {status, release} = useLatestMapRelease(MAP_REPO);
    // Without a release (still loading, none published, or GitHub unreachable) the button opens
    // the releases page rather than offering a copy of the map that would go stale.
    const downloadUrl = release?.downloadUrl ?? MAP_RELEASES_URL;
    const hint = release || status === 'loading'
        ? '.w3x · drop into your Warcraft III maps folder'
        : 'Pick the newest .w3x on GitHub';

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
                        <span className={styles.downloadHint}>{hint}</span>
                    </span>
                    {release && <span className={styles.version}>{release.version}</span>}
                </a>
                <Link className={styles.patchNotes} to={ROUTES.changelog}>Patch notes</Link>
            </div>

            <JoinPanel/>

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
