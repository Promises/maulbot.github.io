export const ROUTES = {
    home: '/',
    changelog: '/changelog',
    loadingScreenStudio: '/loading-screen',
    mazeDesigner: '/maze-designer',
    lobbyLog: '/lobbies',
    /** Every open lobby on every map; deliberately linked from nowhere and kept out of search. */
    wc3Lobbies: '/wc3-lobbies',
} as const;

/** Anchor on the home page, usable from any route (`/#discord`). */
export function homeSection(id: string): string {
    return `${ROUTES.home}#${id}`;
}
