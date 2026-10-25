import {act, fireEvent, render, screen} from '@testing-library/react';
import {createMemoryRouter, RouterProvider} from 'react-router-dom';
import JoinPanel from './JoinPanel';
import {ROUTER_FUTURE} from '../App';
import {ROUTES} from '../routes';
import {advert, feedChannel, feedSocket, mockTracker} from '../lobbies/testing';
import {LobbyAdvert, TrackerHealth} from '../lobbies/types';

const OK: TrackerHealth = {status: 'ok', current_live_lobbies: 100};
const minutesAgo = (minutes: number) => new Date(Date.now() - minutes * 60 * 1000).toISOString();

async function renderPanel() {
    const router = createMemoryRouter([{path: '*', element: <JoinPanel/>}], {initialEntries: [ROUTES.home]});
    render(<RouterProvider router={router} future={ROUTER_FUTURE}/>);
    await act(async () => {});
}

function snapshot(lobbies: LobbyAdvert[], health: TrackerHealth = OK) {
    act(() => feedChannel().deliver('snapshot', {as_of: new Date().toISOString(), health, lobbies}));
}

afterEach(() => {
    jest.useRealTimers();
    // @ts-ignore
    delete global.fetch;
});

test('joins our map\'s live feed and shows its open lobbies, fullest first, at most two', async () => {
    await renderPanel();
    expect(feedChannel().topic).toBe('lobbies:our_map');
    snapshot([
        advert({name: 'Lobby one', final_players: 2}),
        advert({name: 'Lobby two', final_players: 9, host: 'Zohido#1344', region: 'usw'}),
        advert({name: 'Lobby three', final_players: 1}),
    ]);
    expect(screen.getByText('Hosting now')).toBeInTheDocument();
    expect(screen.getAllByText(/^Lobby (one|two|three)$/).map((el) => el.textContent)).toEqual(['Lobby two', 'Lobby one']);
    expect(screen.getByText('Americas')).toBeInTheDocument();
    expect(screen.getByRole('link', {name: /previously hosted lobbies/i})).toHaveAttribute('href', ROUTES.lobbyLog);
});

test('counts a lobby as open since its first advert, across re-lists', async () => {
    await renderPanel();
    snapshot([advert({first_seen: minutesAgo(1), session_first_seen: minutesAgo(25)})]);
    expect(screen.getByText('25m')).toBeInTheDocument();
});

test('follows the feed: a lobby appears, fills, and goes once it is not re-listed', async () => {
    jest.useFakeTimers();
    await renderPanel();
    snapshot([]);
    expect(screen.getByText('No lobby is up right now')).toBeInTheDocument();

    const lobby = advert({name: 'Warcraft Maul Reim beta #7'});
    const {final_players, ...fields} = lobby;
    act(() => feedChannel().deliver('appeared', {event: {instance_id: lobby.instance_id, ts: new Date().toISOString(), kind: 'appeared'}, lobby: {...fields, players: 1}}));
    expect(screen.getByText('Warcraft Maul Reim beta #7')).toBeInTheDocument();

    act(() => feedChannel().deliver('players', {event: {instance_id: lobby.instance_id, ts: new Date().toISOString(), kind: 'players'}, lobby: {...fields, players: 5}}));
    expect(screen.getByText('5')).toBeInTheDocument();

    const endedAt = new Date().toISOString();
    act(() => feedChannel().deliver('ended', {event: {instance_id: lobby.instance_id, ts: endedAt, kind: 'ended'}, lobby: {...fields, ended_at: endedAt}}));
    // Still listed for the moment WC3 takes to re-list it…
    expect(screen.getByText('Warcraft Maul Reim beta #7')).toBeInTheDocument();
    // …and gone when no new advert came.
    act(() => {
        jest.advanceTimersByTime(25 * 1000);
    });
    expect(screen.queryByText('Warcraft Maul Reim beta #7')).not.toBeInTheDocument();
});

test('copying a name says so for a moment', async () => {
    jest.useFakeTimers();
    const writeText = jest.fn(async () => undefined);
    Object.assign(navigator, {clipboard: {writeText}});
    await renderPanel();
    snapshot([advert({name: 'Warcraft Maul Reim beta #4'})]);
    await act(async () => {
        fireEvent.click(screen.getByRole('button', {name: 'Copy name'}));
    });
    expect(writeText).toHaveBeenCalledWith('Warcraft Maul Reim beta #4');
    expect(screen.getByRole('button', {name: 'Copied'})).toBeInTheDocument();
    act(() => {
        jest.advanceTimersByTime(1800);
    });
    expect(screen.getByRole('button', {name: 'Copy name'})).toBeInTheDocument();
});

test('says the data is unavailable instead of "no lobby" while the tracker is down', async () => {
    await renderPanel();
    snapshot([], {status: 'stale'});
    expect(screen.getByText('Lobby data is unavailable right now')).toBeInTheDocument();
    expect(screen.queryByText('No lobby is up right now')).not.toBeInTheDocument();
});

test('reads the open lobbies over REST while the feed cannot be reached', async () => {
    const fetchMock = mockTracker({live: [
        advert({name: 'Over REST'}),
        advert({name: 'Other map', map_name: 'Legion TD Mega 4.6', map_file: 'Maps/Legion TD Mega 4.6.w3x'}),
    ]});
    await renderPanel();
    await act(async () => {
        feedSocket().fail();
    });
    expect(fetchMock).toHaveBeenCalledWith('https://wc3.henning.tech/v1/lobbies?live=true');
    expect(screen.getByText('Over REST')).toBeInTheDocument();
    expect(screen.queryByText('Other map')).not.toBeInTheDocument();
});
