export const ARTBOARD_WIDTH = 1920;
export const ARTBOARD_HEIGHT = 1080;

export interface LoadingScreenSettings {
    titleA: string;
    titleB: string;
    url: string;
    kicker: string;
    noticeA: string;
    noticeB: string;
    /** Comma-separated names shown under "Created by". */
    credits: string;
    showCredits: boolean;
    /** Preview-only overlay marking where the game draws its loading bar. */
    showBarGuide: boolean;
    /** Fill colour of the MaulBot badge. */
    accent: string;
    titleColor: string;
}

export const DEFAULT_SETTINGS: LoadingScreenSettings = {
    titleA: 'WarCraft',
    titleB: 'Maul',
    url: 'warcraftmaul.com',
    kicker: 'Official site',
    noticeA: 'Make sure you download the latest version',
    noticeB: 'from the official site.',
    credits: 'runi95, GenoHacker, HamsterWarrior, Promises, ThaOneSmutje',
    showCredits: true,
    showBarGuide: false,
    accent: '#2aa4e8',
    titleColor: '#f0e3c0',
};

export interface LoadingScreenAssets {
    art: HTMLImageElement;
    noticeIcon: HTMLImageElement;
    /** Source of the badge SVG, recoloured per accent at draw time. */
    badgeSvg: string;
}

export type BadgeLoader = (colour: string) => Promise<HTMLImageElement>;

export function parseCredits(credits: string): string[] {
    return credits.split(',').map((name) => name.trim()).filter(Boolean);
}
