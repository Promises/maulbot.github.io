import {groupSessions, isOpen} from './sessions';
import {LobbyAdvert} from './types';

let nextId = 0;

function advert(fields: Partial<LobbyAdvert> & Pick<LobbyAdvert, 'first_seen' | 'ended_at'>): LobbyAdvert {
    nextId += 1;
    return {
        instance_id: `id-${nextId}`,
        name: 'Warcraft Maul Reim beta #4',
        host: 'MaulBot#2824',
        map_name: 'Warcraft Maul: Reimagined Beta11 5.0.0',
        map_file: 'Maps/Warcraft Maul Reimagined Beta11 5.0.0.w3x',
        region: 'eu',
        final_players: 1,
        max_players: 14,
        last_seen: fields.ended_at ?? fields.first_seen,
        created_time: null,
        ...fields,
    };
}

describe('groupSessions', () => {
    it('joins re-adverts into one lobby that opened with the first and peaked at the most players', () => {
        const sessions = groupSessions([
            advert({first_seen: '2026-10-25T10:00:00Z', ended_at: '2026-10-25T10:01:30Z', final_players: 3}),
            advert({first_seen: '2026-10-25T10:01:33Z', ended_at: '2026-10-25T10:03:00Z', final_players: 9}),
            advert({first_seen: '2026-10-25T10:03:02Z', ended_at: '2026-10-25T10:04:30Z', final_players: 2}),
        ]);
        expect(sessions).toHaveLength(1);
        expect(sessions[0]).toMatchObject({
            openedAt: '2026-10-25T10:00:00Z',
            closedAt: '2026-10-25T10:04:30Z',
            players: 9,
        });
    });

    it('shows the current count of a lobby that is still open', () => {
        const [session] = groupSessions([
            advert({first_seen: '2026-10-25T10:00:00Z', ended_at: '2026-10-25T10:01:30Z', final_players: 6}),
            advert({first_seen: '2026-10-25T10:01:33Z', ended_at: null, final_players: 4}),
        ], Date.parse('2026-10-25T10:02:00Z'));
        expect(session).toMatchObject({openedAt: '2026-10-25T10:00:00Z', closedAt: null, players: 4});
    });

    it('bridges a tracker restart of a few minutes but not a long break', () => {
        const sessions = groupSessions([
            advert({first_seen: '2026-10-25T10:00:00Z', ended_at: '2026-10-25T10:01:00Z'}),
            advert({first_seen: '2026-10-25T10:04:00Z', ended_at: '2026-10-25T10:05:00Z'}),
            advert({first_seen: '2026-10-25T11:00:00Z', ended_at: '2026-10-25T11:05:00Z'}),
        ]);
        expect(sessions.map((s) => s.openedAt)).toEqual(['2026-10-25T11:00:00Z', '2026-10-25T10:00:00Z']);
    });

    it('keeps apart lobbies that differ in host, name or region', () => {
        const sessions = groupSessions([
            advert({first_seen: '2026-10-25T10:00:00Z', ended_at: '2026-10-25T10:01:00Z'}),
            advert({first_seen: '2026-10-25T10:01:02Z', ended_at: null, host: 'Zohido#1344'}),
            advert({first_seen: '2026-10-25T10:01:02Z', ended_at: null, name: 'Warcraft Maul Reim beta #5'}),
            advert({first_seen: '2026-10-25T10:01:02Z', ended_at: null, region: 'usw'}),
        ]);
        expect(sessions).toHaveLength(4);
    });

    it('drops adverts without details and counts a repeated advert once', () => {
        const repeated = advert({first_seen: '2026-10-25T10:00:00Z', ended_at: null});
        const sessions = groupSessions([
            repeated,
            {...repeated},
            advert({first_seen: '2026-10-25T10:00:00Z', ended_at: null, name: null, host: null}),
        ]);
        expect(sessions).toHaveLength(1);
    });
});

test('an advert the tracker never saw end counts as closed once it has gone stale', () => {
    const now = Date.parse('2026-10-25T12:00:00Z');
    const [stale] = groupSessions([advert({first_seen: '2026-10-23T19:35:38Z', ended_at: null, final_players: 2})], now);
    expect(stale).toMatchObject({closedAt: '2026-10-23T19:35:38Z', players: 2});
    const [fresh] = groupSessions([advert({first_seen: '2026-10-25T11:50:00Z', ended_at: null})], now);
    expect(fresh.closedAt).toBeNull();
});

test('isOpen covers the moment between two adverts', () => {
    const [session] = groupSessions([advert({first_seen: '2026-10-25T10:00:00Z', ended_at: '2026-10-25T10:01:30Z'})]);
    expect(isOpen(session, Date.parse('2026-10-25T10:01:40Z'))).toBe(true);
    expect(isOpen(session, Date.parse('2026-10-25T10:02:30Z'))).toBe(false);
});
