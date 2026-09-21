import {fireEvent, render, screen} from '@testing-library/react';
import {createMemoryRouter, RouterProvider} from 'react-router-dom';
import SiteHeader from './SiteHeader';
import {ROUTER_FUTURE} from '../App';
import {ROUTES} from '../routes';

function mockViewport(narrow: boolean) {
    window.matchMedia = (query: string): MediaQueryList => ({
        matches: narrow,
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
    });
}

function renderHeader() {
    const router = createMemoryRouter([{path: '*', element: <SiteHeader/>}], {initialEntries: [ROUTES.home]});
    render(<RouterProvider router={router} future={ROUTER_FUTURE}/>);
}

test('wide viewports show the nav links inline with no menu button', () => {
    mockViewport(false);
    renderHeader();
    expect(screen.queryByRole('button', {name: /menu/i})).not.toBeInTheDocument();
    expect(screen.getByRole('link', {name: /patch notes/i})).toHaveAttribute('href', ROUTES.changelog);
});

test('narrow viewports collapse the nav behind a menu button that toggles it', () => {
    mockViewport(true);
    renderHeader();
    const button = screen.getByRole('button', {name: /menu/i});
    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('link', {name: /discord/i})).not.toBeInTheDocument();

    fireEvent.click(button);
    expect(button).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('link', {name: /discord/i})).toBeInTheDocument();

    fireEvent.click(screen.getByRole('link', {name: /patch notes/i}));
    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('link', {name: /discord/i})).not.toBeInTheDocument();
});
