import {BadgeLoader, LoadingScreenAssets} from './types';

const ART_URL = '/loading/art.png';
const NOTICE_ICON_URL = '/loading/ts-crop.png';
const BADGE_URL = '/loading/maulbot.svg';

/** Fonts the renderer draws with; loaded up front so the first frame is correct. */
export const CANVAS_FONTS = [
    '104px lifecraft',
    '700 44px Cinzel',
    '500 20px Cinzel',
    '600 30px Spectral',
    '400 30px Spectral',
];

export function loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.crossOrigin = 'anonymous';
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error(`Could not load ${src}`));
        image.src = src;
    });
}

async function fetchText(url: string): Promise<string> {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Could not load ${url} (${response.status})`);
    }
    return response.text();
}

const STYLESHEET_TIMEOUT_MS = 5000;

/** Waits for stylesheets still in flight, since web fonts only exist once their CSS has arrived. */
function stylesheetsReady(): Promise<void> {
    const pending = Array.from(document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]'))
        .filter((link) => !link.sheet);
    return Promise.all(pending.map((link) => new Promise<void>((resolve) => {
        link.addEventListener('load', () => resolve(), {once: true});
        link.addEventListener('error', () => resolve(), {once: true});
        setTimeout(resolve, STYLESHEET_TIMEOUT_MS);
    }))).then(() => undefined);
}

async function loadFonts(): Promise<void> {
    if (!document.fonts?.load) {
        return;
    }
    await stylesheetsReady();
    await Promise.all(CANVAS_FONTS.map((font) => document.fonts.load(font))).catch(() => undefined);
    await document.fonts.ready;
}

export async function loadLoadingScreenAssets(): Promise<LoadingScreenAssets> {
    const [art, noticeIcon, badgeSvg] = await Promise.all([
        loadImage(ART_URL),
        loadImage(NOTICE_ICON_URL),
        fetchText(BADGE_URL),
        loadFonts(),
    ]);
    return {art, noticeIcon, badgeSvg};
}

/** Recolours the badge SVG by appending a style rule, cached per colour. */
export function createBadgeLoader(badgeSvg: string): BadgeLoader {
    const cache = new Map<string, Promise<HTMLImageElement>>();
    return (colour) => {
        let pending = cache.get(colour);
        if (!pending) {
            const styled = badgeSvg.replace(/<\/svg>\s*$/, `<style>.cls-1{fill:${colour}}</style></svg>`);
            pending = loadImage(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(styled)}`);
            cache.set(colour, pending);
        }
        return pending;
    };
}
