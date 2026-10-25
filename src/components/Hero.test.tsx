import {act, render, screen} from '@testing-library/react';
import {createMemoryRouter, RouterProvider} from 'react-router-dom';
import Hero from './Hero';
import {ROUTER_FUTURE} from '../App';
import {MAP_RELEASES_URL} from '../content';
import {ROUTES} from '../routes';

const ASSET_URL = 'https://github.com/x/releases/download/v5.0.0-beta7/map.w3x';

function renderHero() {
    const router = createMemoryRouter([{path: '*', element: <Hero/>}], {initialEntries: [ROUTES.home]});
    render(<RouterProvider router={router} future={ROUTER_FUTURE}/>);
}

function downloadLink(): HTMLElement {
    return screen.getByRole('link', {name: /download the map/i});
}

afterEach(() => {
    // @ts-ignore
    delete global.fetch;
});

test('offers the newest release with its version once GitHub answers', async () => {
    global.fetch = jest.fn(async () => ({
        ok: true,
        json: async () => [{
            tag_name: 'v5.0.0-beta7',
            html_url: 'https://github.com/x/releases/tag/v5.0.0-beta7',
            published_at: '2026-10-15T21:43:56Z',
            draft: false,
            assets: [{name: 'map.w3x', browser_download_url: ASSET_URL}],
        }],
    } as Response));
    renderHero();
    await act(async () => {});
    expect(downloadLink()).toHaveAttribute('href', ASSET_URL);
    expect(downloadLink()).toHaveTextContent('v5.0.0-beta7');
});

test('shows no version while the release is loading', () => {
    global.fetch = jest.fn(() => new Promise<Response>(() => {}));
    renderHero();
    expect(downloadLink()).toHaveAttribute('href', MAP_RELEASES_URL);
    expect(downloadLink()).not.toHaveTextContent(/v\d/);
});

test('points at the releases page when GitHub is unreachable', async () => {
    global.fetch = jest.fn(async () => ({ok: false, status: 403} as Response));
    renderHero();
    await act(async () => {});
    expect(downloadLink()).toHaveAttribute('href', MAP_RELEASES_URL);
    expect(downloadLink()).toHaveTextContent(/newest \.w3x on github/i);
    expect(downloadLink()).not.toHaveTextContent(/v\d/);
});
