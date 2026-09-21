import {GithubRepo} from './github/types';

/** Where releases and Quests/*.md patch notes are read from at runtime. */
export const MAP_REPO: GithubRepo = {owner: 'Promises', name: 'Warcraft-Maul-Reimagined'};
export const MAP_REPO_URL = `https://github.com/${MAP_REPO.owner}/${MAP_REPO.name}`;

/** Copy of the map shipped with the site, used until GitHub has a newer release. */
export const BUNDLED_MAP_VERSION = 'v4.4.3';
export const BUNDLED_MAP_URL = `/Warcraft_Maul_Reimagined_${BUNDLED_MAP_VERSION}.w3x`;

/** How many versions of patch notes to fetch before offering "show older". */
export const INITIAL_PATCH_NOTE_COUNT = 5;

export const DISCORD_INVITE_URL = 'https://discord.gg/4Ng3VgE';
export const DISCORD_INVITE_LABEL = 'discord.gg/4Ng3VgE';

export interface Repository {
    eyebrow: string;
    name: string;
    description: string;
    url: string;
    archived?: boolean;
}

export const REPOSITORIES: Repository[] = [
    {
        eyebrow: 'The map',
        name: 'Promises/Warcraft-Maul-Reimagined',
        description: 'Rebuilt from scratch. Towers, waves, game modes, anti-juggle, versioned patch quests.',
        url: MAP_REPO_URL,
    },
    {
        eyebrow: 'This site',
        name: 'Promises/maulbot.github.io',
        description: 'One page, one download button. Kept deliberately small.',
        url: 'https://github.com/Promises/maulbot.github.io',
    },
    {
        eyebrow: 'Archived',
        name: 'Promises/Warcraft-Maul-Buildtools',
        description: 'The old buildtools repo the map used to live in.',
        url: 'https://github.com/Promises/Warcraft-Maul-Buildtools',
        archived: true,
    },
];

export interface Person {
    name: string;
    /** Battle.net tag or other suffix, rendered dimmed after the name. */
    tag?: string;
    url?: string;
}

export const MAP_AUTHORS: Person[] = [
    {name: 'Runi95', tag: '#2202', url: 'https://github.com/runi95'},
    {name: 'Promises', tag: '#2725', url: 'https://github.com/Promises'},
    {name: 'Arcano', tag: '#1610'},
    {name: 'GenoHacker', tag: '#2987', url: 'https://github.com/GenoHacker'},
    {name: 'ThaOneSmutje', tag: '#2560', url: 'https://github.com/tkoopmann'},
];

export const CONTRIBUTORS: Person[] = [
    {name: 'cipherxof', tag: '— TriggerHappy', url: 'https://github.com/cipherxof'},
    {name: 'DillonGeier', url: 'https://github.com/DillonGeier'},
];

export interface Stat {
    value: string;
    label: string;
}

export const GAME_STATS: Stat[] = [
    {value: '28', label: 'Tower races'},
    {value: '2', label: 'Modes - Classic & Blitz'},
    {value: '4', label: 'Difficulties'},
    {value: '13', label: 'Players'},
];
