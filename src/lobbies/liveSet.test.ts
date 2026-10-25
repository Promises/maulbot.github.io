import {applyEvent, fromSnapshot, openLobbies, prune} from './liveSet';
import {advert} from './testing';

const at = (iso: string) => Date.parse(iso);

test('an event updates the advert and its count, and keeps the count when it has none', () => {
    const lobby = advert({final_players: 3});
    let set = fromSnapshot([lobby]);
    set = applyEvent(set, 'players', {...lobby, players: 6});
    expect(set.get(lobby.instance_id)?.final_players).toBe(6);
    set = applyEvent(set, 'meta', {...lobby, name: 'Renamed'});
    expect(set.get(lobby.instance_id)).toMatchObject({name: 'Renamed', final_players: 6});
});

test('a re-list keeps one lobby, counted from its first advert, with the new advert\'s details', () => {
    const first = advert({first_seen: '2026-10-25T10:00:00Z', session_first_seen: '2026-10-25T10:00:00Z', final_players: 4});
    let set = fromSnapshot([first]);
    set = applyEvent(set, 'ended', {...first, ended_at: '2026-10-25T10:01:30Z'});
    const relist = advert({first_seen: '2026-10-25T10:01:33Z', session_first_seen: '2026-10-25T10:00:00Z'});
    set = applyEvent(set, 'appeared', {...relist, players: 5});

    const lobbies = openLobbies(set, at('2026-10-25T10:01:35Z'));
    expect(lobbies).toHaveLength(1);
    expect(lobbies[0]).toMatchObject({openedAt: '2026-10-25T10:00:00Z', players: 5, closedAt: null});
    expect(lobbies[0].advert.instance_id).toBe(relist.instance_id);
});

test('an ended advert stays open for a moment, then goes', () => {
    const lobby = advert({first_seen: '2026-10-25T10:00:00Z'});
    const set = applyEvent(fromSnapshot([lobby]), 'ended', {...lobby, ended_at: '2026-10-25T10:05:00Z'});
    expect(openLobbies(set, at('2026-10-25T10:05:02Z'))).toHaveLength(1);
    expect(openLobbies(set, at('2026-10-25T10:05:04Z'))).toHaveLength(0);
    expect(prune(set, at('2026-10-25T10:05:04Z')).size).toBe(0);
});

test('prune hands back the same set when nothing has ended', () => {
    const set = fromSnapshot([advert()]);
    expect(prune(set, Date.now())).toBe(set);
});

test('adverts without a name or host are left out', () => {
    expect(openLobbies(fromSnapshot([advert({name: null, host: null})]), Date.now())).toHaveLength(0);
});
