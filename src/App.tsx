import {createBrowserRouter, RouteObject, RouterProvider} from 'react-router-dom';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import ChangelogPage from './pages/ChangelogPage';
import LoadingScreenStudioPage from './pages/LoadingScreenStudioPage';
import {ROUTES} from './routes';

/** Opt in to v7 behaviour now so the upgrade is a no-op later. */
export const ROUTER_FUTURE = {v7_startTransition: true};

export const routes: RouteObject[] = [
    {
        element: <Layout/>,
        children: [
            {path: ROUTES.home, element: <HomePage/>},
            {path: ROUTES.changelog, element: <ChangelogPage/>},
        ],
    },
    // The studio is a full-screen tool and does not use the site layout.
    {path: ROUTES.loadingScreenStudio, element: <LoadingScreenStudioPage/>},
];

const router = createBrowserRouter(routes);

function App() {
    return <RouterProvider router={router} future={ROUTER_FUTURE}/>;
}

export default App;
