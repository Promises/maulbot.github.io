import {act, fireEvent, render, screen} from '@testing-library/react';
import {createMemoryRouter, RouterProvider} from 'react-router-dom';
import JoinPanel from './JoinPanel';
import {ROUTER_FUTURE} from '../App';
import {ROUTES} from '../routes';
import {advert, mockTracker} from '../lobbies/testing';

async function renderPanel() {
    const router = createMemoryRouter([{path: '*', element: <JoinPanel/>}], {initialEntries: [ROUTES.home]});
    render(<RouterProvider router={router} future={ROUTER_FUTURE}/>);
    await act(async () => {});
}

afterEach(() => {
    // @ts-ignore
    delete global.fetch;
});

test('shows our open lobbies, fullest first, at most two', async () => {
    mockTracker({history: [
        advert({name: 'Lobby one', final_players: 2}),
        advert({name: 'Lobby two', final_players: 9, host: 'Zohido#1344', region: 'usw'}),
        advert({name: 'Lobby three', final_players: 1}),
        advert({name: 'Long gone', ended_at: new Date(Date.now() - 10 * 60 * 1000).toISOString()}),
    ]});
    await renderPanel();
    expect(screen.getByText('Hosting now')).toBeInTheDocument();
    expect(screen.getAllByText(/^Lobby (one|two|three)$/).map((el) => el.textContent)).toEqual(['Lobby two', 'Lobby one']);
    expect(screen.getByText('Americas')).toBeInTheDocument();
    expect(screen.queryByText('Long gone')).not.toBeInTheDocument();
    expect(screen.getByRole('link', {name: /previously hosted lobbies/i})).toHaveAttribute('href', ROUTES.lobbyLog);
});

test('copying a name says so for a moment', async () => {
    jest.useFakeTimers();
    const writeText = jest.fn(async () => undefined);
    Object.assign(navigator, {clipboard: {writeText}});
    mockTracker({history: [advert({name: 'Warcraft Maul Reim beta #4'})]});
    await renderPanel();
    await act(async () => {
        fireEvent.click(screen.getByRole('button', {name: 'Copy name'}));
    });
    expect(writeText).toHaveBeenCalledWith('Warcraft Maul Reim beta #4');
    expect(screen.getByRole('button', {name: 'Copied'})).toBeInTheDocument();
    act(() => {
        jest.advanceTimersByTime(1800);
    });
    expect(screen.getByRole('button', {name: 'Copy name'})).toBeInTheDocument();
    jest.useRealTimers();
});

test('says no lobby is up when the tracker is fine but none is open', async () => {
    mockTracker({history: []});
    await renderPanel();
    expect(screen.getByText('No lobby is up right now')).toBeInTheDocument();
    expect(screen.queryByText('Hosting now')).not.toBeInTheDocument();
});

test('says the data is unavailable instead of "no lobby" while the tracker is down', async () => {
    mockTracker({history: [], health: {status: 'stale', current_live_lobbies: 0}});
    await renderPanel();
    expect(screen.getByText('Lobby data is unavailable right now')).toBeInTheDocument();
    expect(screen.queryByText('No lobby is up right now')).not.toBeInTheDocument();
});
