import {act, render, screen} from '@testing-library/react';
import {createMemoryRouter, RouterProvider} from 'react-router-dom';
import {ROUTER_FUTURE, routes} from './App';
import {BUNDLED_MAP_URL, BUNDLED_MAP_VERSION} from './content';
import {ROUTES} from './routes';

async function renderAt(path: string) {
    render(<RouterProvider router={createMemoryRouter(routes, {initialEntries: [path]})} future={ROUTER_FUTURE}/>);
    // Let the GitHub fetches settle so their state updates land inside act().
    await act(async () => {});
}

beforeEach(() => {
    // GitHub is unreachable in tests; the site must degrade gracefully.
    global.fetch = jest.fn(async () => ({ok: false, status: 503} as Response));
});

test('home page renders the bundled map download link when GitHub is unavailable', async () => {
    await renderAt(ROUTES.home);
    const link = await screen.findByRole('link', {name: new RegExp(`Download the map.*${BUNDLED_MAP_VERSION}`)});
    expect(link).toHaveAttribute('href', BUNDLED_MAP_URL);
    const patchNoteLinks = screen.getAllByRole('link', {name: /^patch notes$/i});
    expect(patchNoteLinks.length).toBeGreaterThanOrEqual(2);
    patchNoteLinks.forEach((link) => expect(link).toHaveAttribute('href', ROUTES.changelog));
});

test('changelog page shows a fallback link when GitHub is unavailable', async () => {
    await renderAt(ROUTES.changelog);
    expect(screen.getByRole('heading', {name: /patch notes/i})).toBeInTheDocument();
    expect(await screen.findByText(/couldn't load the patch notes/i)).toBeInTheDocument();
});
