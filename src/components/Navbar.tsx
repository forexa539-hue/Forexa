'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { useAuth } from '@/context/auth-context';
import styles from './Navbar.module.css';

const NAV_ITEMS = [
    { href: '/', label: 'Home' },
    { href: '/trade', label: 'Trade' },
    { href: '/academy', label: 'Academy' },
    { href: '/news', label: 'News' },
    { href: '/leaderboard', label: 'Leaderboard' },
    { href: '/promotions', label: 'Promotions' },
    { href: '/profile', label: 'Profile' },
];

export default function Navbar() {
    const { user, signOut } = useAuth();
    const pathname = usePathname();
    const [mobileOpen, setMobileOpen] = useState(false);

    return (
        <>
            <nav className={styles.navbar}>
                <div className={styles.navInner}>
                    <Link href="/" className={styles.logo}>
                        Fore<span className={styles.logoAccent}>XA</span>
                    </Link>

                    <div className={styles.navLinks}>
                        {NAV_ITEMS.map((item) => (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`${styles.navLink} ${pathname === item.href ? styles.active : ''}`}
                            >
                                {item.label}
                            </Link>
                        ))}
                        {user ? (
                            <button onClick={signOut} className={`btn btn-ghost btn-sm ${styles.authBtn}`}>
                                Logout
                            </button>
                        ) : (
                            <Link href="/login" className={`btn btn-primary btn-sm ${styles.authBtn}`}>
                                Login
                            </Link>
                        )}
                    </div>

                    <button
                        className={styles.burger}
                        onClick={() => setMobileOpen(!mobileOpen)}
                        aria-label="Menu"
                    >
                        <span className={styles.burgerLine} />
                        <span className={styles.burgerLine} />
                        <span className={styles.burgerLine} />
                    </button>
                </div>
            </nav>

            <div className={`${styles.mobileMenu} ${mobileOpen ? styles.open : ''}`}>
                {NAV_ITEMS.map((item) => (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={`${styles.mobileLink} ${pathname === item.href ? styles.active : ''}`}
                        onClick={() => setMobileOpen(false)}
                    >
                        {item.label}
                    </Link>
                ))}
                {user ? (
                    <button
                        onClick={() => { signOut(); setMobileOpen(false); }}
                        className={styles.mobileLink}
                    >
                        Logout
                    </button>
                ) : (
                    <Link
                        href="/login"
                        className={styles.mobileLink}
                        onClick={() => setMobileOpen(false)}
                    >
                        Login
                    </Link>
                )}
            </div>
        </>
    );
}
