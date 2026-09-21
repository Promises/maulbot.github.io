export const ROUTES = {
    home: '/',
    changelog: '/changelog',
} as const;

/** Anchor on the home page, usable from any route (`/#discord`). */
export function homeSection(id: string): string {
    return `${ROUTES.home}#${id}`;
}
