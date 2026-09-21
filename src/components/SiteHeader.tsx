import {FC, useEffect, useState} from 'react';
import {Link} from 'react-router-dom';
import styles from './SiteHeader.module.scss';
import {homeSection, ROUTES} from '../routes';
import {useMediaQuery} from '../hooks/useMediaQuery';

// Every entry goes through the router, even the home-page anchors, so scroll
// restoration sees a fresh location and jumps to the hash instead of restoring
// a stale position.
const NAV_ENTRIES = [
    {label: 'Download', to: homeSection('download')},
    {label: 'Patch notes', to: ROUTES.changelog},
    {label: 'Discord', to: homeSection('discord')},
    {label: 'Source', to: homeSection('source')},
    {label: 'Credits', to: homeSection('credits')},
];

const NARROW_VIEWPORT = '(max-width: 760px)';

const NavLinks: FC<{onNavigate?: () => void}> = ({onNavigate}) => (
    <>
        {NAV_ENTRIES.map(({label, to}) => (
            <Link key={label} to={to} onClick={onNavigate}>{label}</Link>
        ))}
    </>
);

const SiteHeader: FC = () => {
    const narrow = useMediaQuery(NARROW_VIEWPORT);
    const [menuOpen, setMenuOpen] = useState(false);
    const closeMenu = () => setMenuOpen(false);

    useEffect(() => {
        if (!narrow) {
            setMenuOpen(false);
        }
    }, [narrow]);

    return (
        <header className={styles.header}>
            <Link className={styles.brand} to={ROUTES.home} onClick={closeMenu}>
                <img className={styles.crest} src="/undead.png" alt=""/>
                <span className={styles.brandName}>WarCraft Maul</span>
            </Link>
            {narrow ? (
                <button
                    type="button"
                    className={styles.menuButton}
                    aria-label="Menu"
                    aria-expanded={menuOpen}
                    onClick={() => setMenuOpen((open) => !open)}
                >
                    <span className={styles.menuBar}/>
                    <span className={styles.menuBar}/>
                    <span className={styles.menuBar}/>
                </button>
            ) : (
                <nav className={styles.nav}>
                    <NavLinks/>
                </nav>
            )}
            {narrow && menuOpen && (
                <nav className={styles.menu}>
                    <NavLinks onNavigate={closeMenu}/>
                </nav>
            )}
        </header>
    );
};

export default SiteHeader;
