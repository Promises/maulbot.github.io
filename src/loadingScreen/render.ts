import {ARTBOARD_HEIGHT as H, ARTBOARD_WIDTH as W, LoadingScreenAssets, LoadingScreenSettings, parseCredits} from './types';

interface TextOptions {
    font: string;
    color: string;
    align?: CanvasTextAlign;
    spacing?: string;
    /** Solid offset copy drawn underneath, like the site's heading shadow. */
    hardShadow?: string;
    glow?: string;
    blur?: number;
}

const TITLE_FONT = '104px lifecraft, Cinzel, Georgia, serif';
const NOTICE_BOLD = '600 30px Spectral, Georgia, serif';
const NOTICE_REGULAR = '400 30px Spectral, Georgia, serif';
const CREDIT_FONT = '600 27px Spectral, Georgia, serif';
const RIGHT_EDGE = 1864;

// Canvas letter-spacing is newer than this TypeScript's DOM typings; skip it where unsupported.
type SpacingContext = CanvasRenderingContext2D & {letterSpacing?: string};

function setLetterSpacing(ctx: CanvasRenderingContext2D, value: string): void {
    const spacing = ctx as SpacingContext;
    if ('letterSpacing' in spacing) {
        spacing.letterSpacing = value;
    }
}

function drawText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, options: TextOptions): void {
    ctx.save();
    ctx.font = options.font;
    ctx.textAlign = options.align ?? 'left';
    ctx.textBaseline = 'alphabetic';
    setLetterSpacing(ctx, options.spacing ?? '0px');
    if (options.hardShadow) {
        ctx.fillStyle = options.hardShadow;
        ctx.fillText(text, x, y + 3);
    }
    ctx.shadowColor = options.glow ?? 'rgba(2,6,14,0.95)';
    ctx.shadowBlur = options.blur ?? 12;
    ctx.shadowOffsetY = 2;
    ctx.fillStyle = options.color;
    ctx.fillText(text, x, y);
    ctx.shadowColor = 'transparent';
    ctx.fillText(text, x, y);
    ctx.restore();
}

function measure(ctx: CanvasRenderingContext2D, text: string, font: string): number {
    ctx.save();
    ctx.font = font;
    setLetterSpacing(ctx, '0px');
    const width = ctx.measureText(text).width;
    ctx.restore();
    return width;
}

function drawVignettes(ctx: CanvasRenderingContext2D): void {
    let gradient = ctx.createRadialGradient(960, 486, 300, 960, 486, 1250);
    gradient.addColorStop(0, 'rgba(4,10,22,0)');
    gradient.addColorStop(1, 'rgba(4,10,22,0.55)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, W, H);

    gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, 780);
    gradient.addColorStop(0, 'rgba(3,8,18,0.88)');
    gradient.addColorStop(0.45, 'rgba(3,8,18,0.5)');
    gradient.addColorStop(1, 'rgba(3,8,18,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 780, 780);

    gradient = ctx.createRadialGradient(W, 0, 0, W, 0, 640);
    gradient.addColorStop(0, 'rgba(3,8,18,0.82)');
    gradient.addColorStop(0.45, 'rgba(3,8,18,0.42)');
    gradient.addColorStop(1, 'rgba(3,8,18,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(W - 640, 0, 640, 640);

    gradient = ctx.createLinearGradient(0, H, 0, H - 300);
    gradient.addColorStop(0, 'rgba(3,8,18,0.92)');
    gradient.addColorStop(0.42, 'rgba(3,8,18,0.66)');
    gradient.addColorStop(1, 'rgba(3,8,18,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, H - 300, W, 300);
}

function drawCredits(ctx: CanvasRenderingContext2D, names: string[]): void {
    drawText(ctx, 'CREATED BY', RIGHT_EDGE, 890, {
        font: '500 19px Cinzel, serif', color: '#9fb2cc', align: 'right', spacing: '5px', blur: 8,
    });
    const gap = 26;
    const dot = 5;
    const widths = names.map((name) => measure(ctx, name, CREDIT_FONT));
    const total = widths.reduce((sum, width) => sum + width, 0) + (names.length - 1) * (gap * 2 + dot);

    let x = RIGHT_EDGE - total;
    names.forEach((name, index) => {
        drawText(ctx, name, x, 944, {font: CREDIT_FONT, color: '#f0e6d2', blur: 8});
        x += widths[index];
        if (index < names.length - 1) {
            x += gap;
            ctx.save();
            ctx.fillStyle = '#7d8fa8';
            ctx.translate(x + dot / 2, 936);
            ctx.rotate(Math.PI / 4);
            ctx.fillRect(-dot / 2, -dot / 2, dot, dot);
            ctx.restore();
            x += dot + gap;
        }
    });
}

function drawBarGuide(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.fillStyle = 'rgba(255,40,40,0.16)';
    ctx.fillRect(310, 985, 1310, 72);
    ctx.strokeStyle = 'rgba(255,80,80,0.9)';
    ctx.lineWidth = 2;
    ctx.setLineDash([12, 8]);
    ctx.strokeRect(311, 986, 1308, 70);
    ctx.restore();
    drawText(ctx, 'IN-GAME LOADING BAR', 965, 1029, {
        font: '500 20px Cinzel, serif', color: '#ffb3b3', align: 'center', spacing: '5px', blur: 6,
    });
}

/** Composites the full 1920x1080 loading screen into `ctx`. */
export function drawLoadingScreen(
    ctx: CanvasRenderingContext2D,
    assets: LoadingScreenAssets,
    badge: HTMLImageElement,
    settings: LoadingScreenSettings,
): void {
    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(assets.art, 0, 0, W, H);
    drawVignettes(ctx);

    ctx.save();
    ctx.shadowColor = 'rgba(2,6,14,0.95)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 2;
    ctx.drawImage(badge, 293, 40, 190, 35);
    ctx.restore();

    const title = {font: TITLE_FONT, color: settings.titleColor, align: 'center' as const, hardShadow: '#1a1208', glow: 'rgba(85,170,235,0.5)', blur: 30};
    drawText(ctx, settings.titleA, 271, 166, title);
    drawText(ctx, settings.titleB, 271, 264, title);

    drawText(ctx, settings.kicker.toUpperCase(), RIGHT_EDGE, 64, {
        font: '500 20px Cinzel, serif', color: '#cdd9ea', align: 'right', spacing: '6px',
    });
    drawText(ctx, settings.url, RIGHT_EDGE, 124, {
        font: '700 44px Cinzel, serif', color: '#ffffff', align: 'right', glow: 'rgba(120,190,255,0.6)', blur: 26,
    });
    const rule = ctx.createLinearGradient(RIGHT_EDGE, 0, RIGHT_EDGE - 340, 0);
    rule.addColorStop(0, '#8fc4ff');
    rule.addColorStop(1, 'rgba(143,196,255,0)');
    ctx.fillStyle = rule;
    ctx.fillRect(RIGHT_EDGE - 340, 140, 340, 2);

    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.85)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 2;
    ctx.drawImage(assets.noticeIcon, 56, 870, 78, 78);
    ctx.restore();
    drawText(ctx, settings.noticeA, 156, 902, {font: NOTICE_BOLD, color: '#ffffff', blur: 8});
    drawText(ctx, settings.noticeB, 156, 940, {font: NOTICE_REGULAR, color: '#c9d6e8', blur: 8});

    if (settings.showCredits) {
        drawCredits(ctx, parseCredits(settings.credits));
    }
    if (settings.showBarGuide) {
        drawBarGuide(ctx);
    }
}
