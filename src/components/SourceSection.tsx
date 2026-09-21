import {FC} from 'react';
import styles from './SourceSection.module.scss';
import {REPOSITORIES} from '../content';

const SourceSection: FC = () => (
    <section id="source" className={styles.section}>
        <div className={styles.inner}>
            <div className={styles.headingRow}>
                <img className={styles.githubMark} src="/github-mark-white.svg" alt=""/>
                <h2 className={styles.heading}>Built in the open</h2>
                <span className={styles.rule}/>
            </div>
            <p className={styles.text}>
                The map is a TypeScript project compiled into the w3x — towers, waves, creep abilities and
                all. Pull requests, balance suggestions and new tower races are welcome.
            </p>
            <div className={styles.grid}>
                {REPOSITORIES.map((repo) => (
                    <a
                        key={repo.url}
                        href={repo.url}
                        className={repo.archived ? styles.cardArchived : styles.card}
                    >
                        <span className={styles.eyebrow}>{repo.eyebrow}</span>
                        <span className={styles.repoName}>{repo.name}</span>
                        <span className={styles.description}>{repo.description}</span>
                    </a>
                ))}
            </div>
        </div>
    </section>
);

export default SourceSection;
