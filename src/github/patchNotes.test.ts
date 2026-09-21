import {parsePatchNote} from './patchNotes';

const URL = 'https://github.com/x/y/blob/master/Quests/4.4.2.md';

describe('parsePatchNote', () => {
    it('reads the version from frontmatter and bullets from the body', () => {
        const md = [
            '---',
            "title: '4.4.2'",
            "icon: 'ReplaceableTextures\\\\CommandButtons\\\\BTNAmbush.blp'",
            "type: 'required'",
            '---',
            'Updates:',
            '- Automatically prod stuck creeps',
            '- Fix file sizes',
            '',
        ].join('\n');

        expect(parsePatchNote(md, 'v0.0.0', URL)).toEqual({
            version: 'v4.4.2',
            htmlUrl: URL,
            sections: [{title: 'Updates', items: ['Automatically prod stuck creeps', 'Fix file sizes']}],
        });
    });

    it('splits multiple headings into sections and tolerates indented bullets', () => {
        const md = [
            '---',
            "title: '4.3.1'",
            '---',
            'Updates:',
            ' - Fix a desync',
            ' ',
            'Balancing:',
            ' - New formula for armour',
            ' - [High Elven] Archer: cooldown reduced from 1.00 to 0.40',
        ].join('\n');

        const note = parsePatchNote(md, 'v4.3.1', URL);
        expect(note.sections.map((section) => section.title)).toEqual(['Updates', 'Balancing']);
        expect(note.sections[1].items).toEqual([
            'New formula for armour',
            '[High Elven] Archer: cooldown reduced from 1.00 to 0.40',
        ]);
    });

    it('uses a descriptive plain line as the section title instead of a generic heading', () => {
        const md = [
            '---',
            "title: '4.1.1'",
            '---',
            '',
            'Updates:',
            'Reworks and Overhauls',
            ' - UFF has been reworked completely into [Forsaken].',
            '',
            'Updates:',
            'Bugfixes and Adjustments',
            ' - Chimaeras now lose life properly again',
        ].join('\n');

        const note = parsePatchNote(md, 'v4.1.1', URL);
        expect(note.sections).toEqual([
            {title: 'Reworks and Overhauls', items: ['UFF has been reworked completely into [Forsaken].']},
            {title: 'Bugfixes and Adjustments', items: ['Chimaeras now lose life properly again']},
        ]);
    });

    it('falls back to the given version and an untitled section when there is no frontmatter or heading', () => {
        const note = parsePatchNote('- You can now watch replays\n', '4.2.3', URL);
        expect(note.version).toBe('v4.2.3');
        expect(note.sections).toEqual([{title: null, items: ['You can now watch replays']}]);
    });

    it('drops headings that have no bullets under them', () => {
        const note = parsePatchNote('Updates:\n\nBalancing:\n - Nerfed Spirit Bear\n', '4.0.0', URL);
        expect(note.sections).toEqual([{title: 'Balancing', items: ['Nerfed Spirit Bear']}]);
    });
});
