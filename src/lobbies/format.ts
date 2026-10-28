import {LobbyAdvert} from './types';

type MapRef = Pick<LobbyAdvert, 'map_name' | 'map_file'>;

// Our map under every spelling seen in the list: "Warcraft Maul: Reimagined Beta11 5.0.0",
// "Warcraft Maul Reimagined Beta11 5.0.0.w3x" and "WarcraftMaulReimagined-Beta7-5.0.0.w3x".
// Older maps that are only called "WarCraft Maul" are not ours.
const OUR_MAP = /warcraft[\s_]*maul[\s:_-]*reimagined/i;

// Modified copies going round under our map's name, which the operator ruled are not ours to
// point players at.
const UNOFFICIAL_COPY = /warcraft[\s_]*maul[\s:_-]*reimagined[\s_-]*fixed/i;

/** Whether the lobby is on our map, and not on an unofficial copy of it. */
export function isOurs(lobby: MapRef): boolean {
    const names = [lobby.map_name ?? '', lobby.map_file ?? ''];
    return names.some((name) => OUR_MAP.test(name)) && !names.some((name) => UNOFFICIAL_COPY.test(name));
}

// .w3x and .w3m maps, and .w3z, which some realm lobbies list.
const MAP_EXTENSION = /\.w3[xmz]$/i;

// The player count melee maps carry in front of their name, "(6)Gnollwood": the lobby's slot
// count says it already.
const PLAYER_COUNT = /^\(\d+\)\s*/;

// The map's name, or its file's; either can come with the map folder in front ("Maps/…"), which goes.
function mapLabel(lobby: MapRef): string {
    return (lobby.map_name || lobby.map_file || '').split('/').pop() || '';
}

/** The map's version, e.g. "Beta11 5.0.0", from its name with our map's title taken off. */
export function versionOf(lobby: MapRef): string {
    const label = mapLabel(lobby);
    const version = label
        .replace(MAP_EXTENSION, '')
        .replace(/^warcraft[\s_]*maul[\s:_-]*reimagined/i, '')
        .replace(/[_-]+/g, ' ')
        .trim();
    return version || label;
}

/**
 * The map's name as listed, or its file's when WC3 gave no name, without its folder, extension or
 * melee player count: "Maps/(6)gnollwood.w3m" reads "gnollwood".
 */
export function mapNameOf(lobby: MapRef): string {
    return mapLabel(lobby).replace(MAP_EXTENSION, '').replace(PLAYER_COUNT, '');
}

const REGION_NAMES: Record<string, string> = {eu: 'Europe', usw: 'Americas', kr: 'Asia'};
const REGION_CODES: Record<string, string> = {eu: 'EU', usw: 'US', kr: 'KR'};

/** "Europe", "Americas" or "Asia". */
export function regionName(region: string | null): string {
    return region ? REGION_NAMES[region] ?? region.toUpperCase() : 'Unknown';
}

/** "EU", "US" or "KR". */
export function regionCode(region: string | null): string {
    return region ? REGION_CODES[region] ?? region.toUpperCase() : '—';
}

/** "MaulBot#2824" as its name and its "#2824" tag, which the pages show muted. */
export function splitHost(host: string | null): {name: string; tag: string} {
    const [name, tag] = (host ?? '').split('#');
    return {name: name || 'Unknown', tag: tag ? `#${tag}` : ''};
}

/** How long ago, compactly: "45s", "12m", "2h 5m", "3d". */
export function ago(iso: string, now: number = Date.now()): string {
    const seconds = Math.max(0, Math.round((now - Date.parse(iso)) / 1000));
    if (seconds < 60) {
        return `${seconds}s`;
    }
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) {
        return `${minutes}m`;
    }
    const hours = Math.floor(minutes / 60);
    return hours < 24 ? `${hours}h ${minutes % 60}m` : `${Math.floor(hours / 24)}d`;
}

/** How long from one time to another: "7 min", "1h 12m". Never less than a minute. */
export function span(from: string, to: string): string {
    const minutes = Math.max(1, Math.round((Date.parse(to) - Date.parse(from)) / 60000));
    return minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

/** Local time of day, "21:43". */
export function clock(iso: string): string {
    return new Date(iso).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
}

/** The local day: "Today · Sun 25 Oct", "Yesterday · Sat 24 Oct", or just the date. */
export function dayLabel(iso: string, now: number = Date.now()): string {
    const day = new Date(iso);
    const today = new Date(now);
    const startOf = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
    const daysAgo = Math.round((startOf(today) - startOf(day)) / 86400000);
    const date = day.toLocaleDateString([], {weekday: 'short', day: 'numeric', month: 'short'});
    if (daysAgo === 0) {
        return `Today · ${date}`;
    }
    return daysAgo === 1 ? `Yesterday · ${date}` : date;
}
