import {ChangeEvent, FC, ReactNode, useEffect, useMemo, useRef, useState} from 'react';
import styles from './LoadingScreenStudio.module.scss';
import {createBadgeLoader, loadLoadingScreenAssets} from '../loadingScreen/assets';
import {drawLoadingScreen} from '../loadingScreen/render';
import {encodeDds} from '../loadingScreen/dds';
import {downloadBlob} from '../loadingScreen/download';
import {
    ARTBOARD_HEIGHT,
    ARTBOARD_WIDTH,
    DEFAULT_SETTINGS,
    LoadingScreenAssets,
    LoadingScreenSettings,
} from '../loadingScreen/types';

type Status = 'loading assets' | 'ready' | 'asset error' | 'png exported' | 'dds exported';

const Group: FC<{title: string; children: ReactNode}> = ({title, children}) => (
    <section className={styles.group}>
        <h2 className={styles.groupTitle}>{title}</h2>
        {children}
    </section>
);

const TextField: FC<{label: string; value: string; onChange: (value: string) => void}> = ({label, value, onChange}) => (
    <label className={styles.field}>
        {label}
        <input type="text" value={value} onChange={(event) => onChange(event.target.value)}/>
    </label>
);

const ColorField: FC<{label: string; value: string; onChange: (value: string) => void}> = ({label, value, onChange}) => (
    <label className={styles.colorField}>
        {label}
        <input type="color" value={value} onChange={(event) => onChange(event.target.value)}/>
    </label>
);

const CheckboxField: FC<{label: string; checked: boolean; accent: string; onChange: (value: boolean) => void}> = (
    {label, checked, accent, onChange},
) => (
    <label className={styles.checkboxField}>
        <input
            type="checkbox"
            checked={checked}
            style={{accentColor: accent}}
            onChange={(event: ChangeEvent<HTMLInputElement>) => onChange(event.target.checked)}
        />
        {label}
    </label>
);

const LoadingScreenStudioPage: FC = () => {
    const [settings, setSettings] = useState<LoadingScreenSettings>(DEFAULT_SETTINGS);
    const [assets, setAssets] = useState<LoadingScreenAssets | null>(null);
    const [status, setStatus] = useState<Status>('loading assets');
    // Bumped when the browser finishes loading fonts, so a late-arriving face triggers a redraw.
    const [fontsVersion, setFontsVersion] = useState(0);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const loadBadge = useMemo(() => (assets ? createBadgeLoader(assets.badgeSvg) : null), [assets]);

    useEffect(() => {
        let cancelled = false;
        loadLoadingScreenAssets()
            .then((loaded) => {
                if (!cancelled) {
                    setAssets(loaded);
                    setStatus('ready');
                }
            })
            .catch(() => !cancelled && setStatus('asset error'));
        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        if (!document.fonts?.addEventListener) {
            return;
        }
        const onLoadingDone = () => setFontsVersion((version) => version + 1);
        document.fonts.addEventListener('loadingdone', onLoadingDone);
        return () => document.fonts.removeEventListener('loadingdone', onLoadingDone);
    }, []);

    // Redraw the preview whenever the settings or fonts change; a newer edit cancels an older pending draw.
    useEffect(() => {
        if (!assets || !loadBadge) {
            return;
        }
        let cancelled = false;
        loadBadge(settings.accent).then((badge) => {
            const ctx = canvasRef.current?.getContext('2d');
            if (!cancelled && ctx) {
                drawLoadingScreen(ctx, assets, badge, settings);
            }
        });
        return () => {
            cancelled = true;
        };
    }, [assets, loadBadge, settings, fontsVersion]);

    const update = <K extends keyof LoadingScreenSettings>(key: K) => (value: LoadingScreenSettings[K]) =>
        setSettings((current) => ({...current, [key]: value}));

    /** Renders a clean copy for export: guides are preview-only and never written out. */
    const renderForExport = async (): Promise<HTMLCanvasElement | null> => {
        if (!assets || !loadBadge) {
            return null;
        }
        const badge = await loadBadge(settings.accent);
        const canvas = document.createElement('canvas');
        canvas.width = ARTBOARD_WIDTH;
        canvas.height = ARTBOARD_HEIGHT;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            return null;
        }
        drawLoadingScreen(ctx, assets, badge, {...settings, showBarGuide: false});
        return canvas;
    };

    const exportPng = async () => {
        const canvas = await renderForExport();
        canvas?.toBlob((blob) => {
            if (blob) {
                downloadBlob(blob, 'wcmloading.png');
                setStatus('png exported');
            }
        }, 'image/png');
    };

    const exportDds = async () => {
        const canvas = await renderForExport();
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) {
            return;
        }
        const {data} = ctx.getImageData(0, 0, canvas.width, canvas.height);
        downloadBlob(new Blob([encodeDds(canvas.width, canvas.height, data)], {type: 'image/vnd-ms.dds'}), 'wcmloading.dds');
        setStatus('dds exported');
    };

    const ready = status !== 'loading assets' && status !== 'asset error';

    return (
        <div className={styles.studio}>
            <aside className={styles.sidebar}>
                <header className={styles.brand}>
                    <span className={styles.brandKicker}>Warcraft Maul</span>
                    <h1 className={styles.brandTitle}>Loading Screen Studio</h1>
                </header>

                <Group title="Title">
                    <TextField label="Line one" value={settings.titleA} onChange={update('titleA')}/>
                    <TextField label="Line two" value={settings.titleB} onChange={update('titleB')}/>
                </Group>

                <Group title="Site">
                    <TextField label="URL" value={settings.url} onChange={update('url')}/>
                    <TextField label="Kicker" value={settings.kicker} onChange={update('kicker')}/>
                </Group>

                <Group title="Notice">
                    <TextField label="Line one" value={settings.noticeA} onChange={update('noticeA')}/>
                    <TextField label="Line two" value={settings.noticeB} onChange={update('noticeB')}/>
                </Group>

                <Group title="Credits">
                    <CheckboxField label="Show credits" checked={settings.showCredits} accent="#2aa4e8" onChange={update('showCredits')}/>
                    <TextField label="Names, comma separated" value={settings.credits} onChange={update('credits')}/>
                </Group>

                <Group title="Colour">
                    <ColorField label="MaulBot badge" value={settings.accent} onChange={update('accent')}/>
                    <ColorField label="Title ink" value={settings.titleColor} onChange={update('titleColor')}/>
                </Group>

                <Group title="Guides">
                    <CheckboxField label="In-game loading bar" checked={settings.showBarGuide} accent="#e05a5a" onChange={update('showBarGuide')}/>
                    <p className={styles.hint}>Guides are preview only — they are never exported.</p>
                </Group>

                <div className={styles.actions}>
                    <button type="button" className={styles.exportPng} onClick={exportPng} disabled={!ready}>Export PNG</button>
                    <button type="button" className={styles.exportDds} onClick={exportDds} disabled={!ready}>Export DDS</button>
                    <p className={styles.hint}>DDS is written uncompressed 32-bit BGRA, 1920 × 1080, top-down.</p>
                </div>
            </aside>

            <main className={styles.stage}>
                <div className={styles.stageHeader}>
                    <span>Artboard · {ARTBOARD_WIDTH} × {ARTBOARD_HEIGHT}</span>
                    <span role="status">{status}</span>
                </div>
                <div className={styles.artboard}>
                    <canvas ref={canvasRef} width={ARTBOARD_WIDTH} height={ARTBOARD_HEIGHT}/>
                </div>
            </main>
        </div>
    );
};

export default LoadingScreenStudioPage;
