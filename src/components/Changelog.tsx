import {FC} from 'react';
import styles from './Changelog.module.scss';
import {INITIAL_PATCH_NOTE_COUNT, MAP_REPO} from '../content';
import {usePatchNotes} from '../github/hooks';
import {patchNotesFolderUrl} from '../github/api';
import {PatchNote} from '../github/types';

const PatchNoteEntry: FC<{note: PatchNote}> = ({note}) => (
    <article className={styles.entry}>
        <a className={styles.version} href={note.htmlUrl}>{note.version}</a>
        <div className={styles.sections}>
            {note.sections.map((section, index) => (
                <div key={index} className={styles.group}>
                    {section.title && <span className={styles.groupTitle}>{section.title}</span>}
                    <ul className={styles.items}>
                        {section.items.map((item, itemIndex) => <li key={itemIndex}>{item}</li>)}
                    </ul>
                </div>
            ))}
        </div>
    </article>
);

const Changelog: FC = () => {
    const {status, notes, loadingMore, remaining, loadMore} = usePatchNotes(MAP_REPO, INITIAL_PATCH_NOTE_COUNT);
    const sourceUrl = patchNotesFolderUrl(MAP_REPO);

    return (
        <section className={styles.section}>
            <div className={styles.inner}>
                <div className={styles.headingRow}>
                    <h1 className={styles.heading}>Patch notes</h1>
                    <span className={styles.rule}/>
                    <a className={styles.sourceLink} href={sourceUrl}>View on GitHub</a>
                </div>
                <p className={styles.text}>
                    Every version ships its notes as an in-game quest. This list is read straight from the
                    map repository, so it is as current as the last commit.
                </p>

                {status === 'loading' && (
                    <p className={styles.status}>Fetching patch notes from GitHub…</p>
                )}
                {status === 'error' && (
                    <p className={styles.status}>
                        Couldn't load the patch notes right now. <a href={sourceUrl}>Read them on GitHub</a> instead.
                    </p>
                )}
                {notes.length > 0 && (
                    <div className={styles.list}>
                        {notes.map((note) => <PatchNoteEntry key={note.version} note={note}/>)}
                    </div>
                )}
                {status === 'ready' && remaining > 0 && (
                    <button type="button" className={styles.more} onClick={loadMore} disabled={loadingMore}>
                        {loadingMore ? 'Loading…' : `Show ${remaining} older ${remaining === 1 ? 'version' : 'versions'}`}
                    </button>
                )}
            </div>
        </section>
    );
};

export default Changelog;
