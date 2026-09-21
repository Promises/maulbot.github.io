import {useCallback, useEffect, useState} from 'react';
import {fetchLatestMapRelease, fetchPatchNote, listPatchNotes} from './api';
import {GithubRepo, MapRelease, PatchNote, PatchNoteRef} from './types';

export type LoadStatus = 'loading' | 'ready' | 'error';

export interface LatestReleaseState {
    status: LoadStatus;
    release: MapRelease | null;
}

/** Newest map release on GitHub; `release` stays null while loading or when there is none. */
export function useLatestMapRelease(repo: GithubRepo): LatestReleaseState {
    const [state, setState] = useState<LatestReleaseState>({status: 'loading', release: null});

    useEffect(() => {
        let cancelled = false;
        fetchLatestMapRelease(repo)
            .then((release) => !cancelled && setState({status: 'ready', release}))
            .catch(() => !cancelled && setState({status: 'error', release: null}));
        return () => {
            cancelled = true;
        };
    }, [repo]);

    return state;
}

export interface PatchNotesState {
    status: LoadStatus;
    notes: PatchNote[];
    /** True while a `loadMore` batch is in flight. */
    loadingMore: boolean;
    /** Number of versions that exist but have not been fetched yet. */
    remaining: number;
    loadMore: () => void;
}

async function fetchBatch(refs: PatchNoteRef[]): Promise<PatchNote[]> {
    return Promise.all(refs.map(fetchPatchNote));
}

/**
 * Loads the newest `initialCount` patch notes from the repo up front and the
 * rest on demand through `loadMore`.
 */
export function usePatchNotes(repo: GithubRepo, initialCount: number): PatchNotesState {
    const [status, setStatus] = useState<LoadStatus>('loading');
    const [refs, setRefs] = useState<PatchNoteRef[]>([]);
    const [notes, setNotes] = useState<PatchNote[]>([]);
    const [loadingMore, setLoadingMore] = useState(false);

    useEffect(() => {
        let cancelled = false;
        setStatus('loading');
        setNotes([]);
        listPatchNotes(repo)
            .then(async (allRefs) => {
                const firstBatch = await fetchBatch(allRefs.slice(0, initialCount));
                if (cancelled) {
                    return;
                }
                setRefs(allRefs);
                setNotes(firstBatch);
                setStatus('ready');
            })
            .catch(() => !cancelled && setStatus('error'));
        return () => {
            cancelled = true;
        };
    }, [repo, initialCount]);

    const loadMore = useCallback(() => {
        const pending = refs.slice(notes.length);
        if (pending.length === 0 || loadingMore) {
            return;
        }
        setLoadingMore(true);
        fetchBatch(pending)
            .then((more) => setNotes((current) => [...current, ...more]))
            .catch(() => setStatus('error'))
            .finally(() => setLoadingMore(false));
    }, [refs, notes.length, loadingMore]);

    return {status, notes, loadingMore, remaining: refs.length - notes.length, loadMore};
}
