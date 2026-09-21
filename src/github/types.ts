export interface GithubRepo {
    owner: string;
    name: string;
}

export interface MapRelease {
    /** Display version, always prefixed with "v". */
    version: string;
    /** Direct download link for the .w3x asset. */
    downloadUrl: string;
    /** Release page on GitHub. */
    htmlUrl: string;
    publishedAt: Date;
}

export interface PatchNoteSection {
    /** Heading such as "Updates" or "Balancing"; null for untitled bullet runs. */
    title: string | null;
    items: string[];
}

export interface PatchNote {
    /** Display version, always prefixed with "v". */
    version: string;
    sections: PatchNoteSection[];
    /** Link to the source markdown file on GitHub. */
    htmlUrl: string;
}

/** A patch-note file that has been listed but not necessarily downloaded yet. */
export interface PatchNoteRef {
    version: string;
    /** Raw file URL. */
    downloadUrl: string;
    htmlUrl: string;
}
