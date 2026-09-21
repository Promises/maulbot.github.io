import {PatchNote, PatchNoteSection} from './types';
import {formatVersion} from './version';

const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;
const BULLET = /^\s*[-*]\s+(.*\S)\s*$/;
const HEADING = /^\s*([^-*\s].*?):\s*$/;

function frontmatterTitle(frontmatter: string): string | null {
    const match = /^title:\s*['"]?([^'"\n]+?)['"]?\s*$/m.exec(frontmatter);
    return match ? match[1] : null;
}

/**
 * Parses one Quests/*.md file from the map repo. The files are a YAML
 * frontmatter block followed by headings ending in ":" and "-" bullets.
 * A plain line directly after a heading (e.g. "Reworks and Overhauls")
 * replaces the generic heading so the section gets the descriptive name.
 */
export function parsePatchNote(markdown: string, fallbackVersion: string, htmlUrl: string): PatchNote {
    const frontmatter = FRONTMATTER.exec(markdown);
    const body = frontmatter ? markdown.slice(frontmatter[0].length) : markdown;
    const title = frontmatter ? frontmatterTitle(frontmatter[1]) : null;

    const sections: PatchNoteSection[] = [];
    let current: PatchNoteSection | null = null;

    const startSection = (sectionTitle: string) => {
        if (current && current.items.length === 0) {
            current.title = sectionTitle;
            return;
        }
        current = {title: sectionTitle, items: []};
        sections.push(current);
    };

    for (const line of body.split(/\r?\n/)) {
        if (!line.trim()) {
            continue;
        }
        const bullet = BULLET.exec(line);
        if (bullet) {
            if (!current) {
                current = {title: null, items: []};
                sections.push(current);
            }
            current.items.push(bullet[1]);
            continue;
        }
        const heading = HEADING.exec(line);
        startSection(heading ? heading[1] : line.trim());
    }

    return {
        version: formatVersion(title ?? fallbackVersion),
        sections: sections.filter((section) => section.items.length > 0),
        htmlUrl,
    };
}
