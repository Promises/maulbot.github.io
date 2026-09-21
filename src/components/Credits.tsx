import {FC} from 'react';
import styles from './Credits.module.scss';
import {CONTRIBUTORS, MAP_AUTHORS, Person} from '../content';

const PersonEntry: FC<{person: Person}> = ({person}) => {
    const content = (
        <>
            {person.name}
            {person.tag && <span className={styles.tag}> {person.tag}</span>}
        </>
    );
    return person.url
        ? <a className={styles.person} href={person.url}>{content}</a>
        : <span className={styles.person}>{content}</span>;
};

const Credits: FC = () => (
    <section id="credits" className={styles.section}>
        <div className={styles.inner}>
            <div className={styles.column}>
                <span className={styles.eyebrow}>Map by</span>
                <div className={styles.people}>
                    {MAP_AUTHORS.map((person) => <PersonEntry key={person.name} person={person}/>)}
                </div>
            </div>
            <div className={styles.column}>
                <span className={styles.eyebrow}>Contributors</span>
                <div className={styles.people}>
                    {CONTRIBUTORS.map((person) => <PersonEntry key={person.name} person={person}/>)}
                </div>
                <span className={styles.note}>
                    Build tooling by <a href="https://github.com/flowtsohg">flowtsohg</a> (mdx-m3-viewer)
                    and <a href="https://github.com/jejanim">jejanim</a>.
                </span>
            </div>
            <div className={styles.columnTight}>
                <span className={styles.eyebrow}>Fine print</span>
                <span className={styles.finePrint}>
                    A fan-made Warcraft III custom map. Not affiliated with Blizzard Entertainment.
                </span>
            </div>
        </div>
    </section>
);

export default Credits;
