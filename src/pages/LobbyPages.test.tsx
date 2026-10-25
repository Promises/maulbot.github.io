import {act, fireEvent, render, screen, within} from '@testing-library/react';
import {createMemoryRouter, RouterProvider} from 'react-router-dom';
import {ROUTER_FUTURE} from '../App';
import LobbyLogPage from './LobbyLogPage';
import Wc3LobbiesPage from './Wc3LobbiesPage';
import {advert, mockTracker} from '../lobbies/testing';

async function renderPage(element: JSX.Element) {
    render(<RouterProvider router={createMemoryRouter([{path: '*', element}])} future={ROUTER_FUTURE}/>);
    await act(async () => {});
}

const minutesAgo = (minutes: number) => new Date(Date.now() - minutes * 60 * 1000).toISOString();

afterEach(() => {
    // @ts-ignore
    delete global.fetch;
});

describe('lobby log', () => {
    it('lists our lobbies newest first with their status and how long they were up', async () => {
        mockTracker({history: [
            advert({name: 'Still open', first_seen: minutesAgo(3)}),
            advert({name: 'Gone', first_seen: minutesAgo(60), ended_at: minutesAgo(48), final_players: 8}),
        ]});
        await renderPage(<LobbyLogPage/>);
        const rows = screen.getAllByRole('listitem');
        expect(within(rows[0]).getByText('Still open')).toBeInTheDocument();
        expect(within(rows[0]).getByText('Open now')).toBeInTheDocument();
        expect(within(rows[1]).getByText('Closed')).toBeInTheDocument();
        expect(within(rows[1]).getByText('12 min in lobby')).toBeInTheDocument();
        expect(within(rows[1]).getByText('8')).toBeInTheDocument();
        expect(screen.getByText('2 lobbies')).toBeInTheDocument();
    });

    it('filters by version and region', async () => {
        mockTracker({history: [
            advert({name: 'New EU', first_seen: minutesAgo(5)}),
            advert({name: 'Old US', first_seen: minutesAgo(90), ended_at: minutesAgo(80), region: 'usw',
                map_name: 'WarcraftMaulReimagined-Beta7-5.0.0.w3x', map_file: 'Maps/Download/WarcraftMaulReimagined-Beta7-5.0.0.w3x'}),
        ]});
        await renderPage(<LobbyLogPage/>);
        fireEvent.click(screen.getByRole('button', {name: 'Beta7 5.0.0'}));
        expect(screen.queryByText('New EU')).not.toBeInTheDocument();
        expect(screen.getByText('Old US')).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', {name: 'EU'}));
        expect(screen.getByText('No lobbies match these filters.')).toBeInTheDocument();
    });

    it('shows twenty lobbies, then twenty more', async () => {
        mockTracker({history: Array.from({length: 30}, (_, i) =>
            advert({name: `Lobby ${i}`, first_seen: minutesAgo(30 * (i + 1)), ended_at: minutesAgo(30 * (i + 1) - 10)}))});
        await renderPage(<LobbyLogPage/>);
        expect(screen.getAllByRole('listitem')).toHaveLength(20);
        await act(async () => {
            fireEvent.click(screen.getByRole('button', {name: 'Show older lobbies'}));
        });
        expect(screen.getAllByRole('listitem')).toHaveLength(30);
    });
});

describe('every open lobby', () => {
    it('puts our map first and keeps the page out of search', async () => {
        mockTracker({live: [
            advert({name: 'LTD 4v4', map_name: 'Legion TD Mega 4.6', map_file: 'Maps/Legion TD Mega 4.6.w3x',
                host: 'Ranger#1123', final_players: 7, max_players: 8}),
            advert({name: 'Warcraft Maul Reim beta #5', final_players: 1}),
        ]});
        await renderPage(<Wc3LobbiesPage/>);
        const rows = screen.getAllByRole('listitem');
        expect(within(rows[0]).getByText('Warcraft Maul Reim beta #5')).toBeInTheDocument();
        expect(screen.getByText('2 lobbies · 8 players waiting')).toBeInTheDocument();
        expect(document.querySelector('meta[name="robots"]')).toHaveAttribute('content', 'noindex, nofollow');

        fireEvent.change(screen.getByRole('searchbox'), {target: {value: 'legion'}});
        expect(screen.getAllByRole('listitem')).toHaveLength(1);
        expect(screen.getByText('1 lobbies · 7 players waiting')).toBeInTheDocument();
    });
});
