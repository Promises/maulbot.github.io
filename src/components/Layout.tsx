import {FC} from 'react';
import {Outlet, ScrollRestoration} from 'react-router-dom';
import styles from './Layout.module.scss';
import SiteHeader from './SiteHeader';
import SiteFooter from './SiteFooter';

const Layout: FC = () => (
    <div className={styles.page}>
        <div className={styles.haze}/>
        <SiteHeader/>
        <main>
            <Outlet/>
        </main>
        <SiteFooter/>
        <ScrollRestoration/>
    </div>
);

export default Layout;
