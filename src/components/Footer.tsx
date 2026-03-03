import Link from 'next/link';
import styles from './Footer.module.css';

export default function Footer() {
    return (
        <footer className={styles.footer}>
            <div className={styles.footerInner}>
                <div className={styles.footerTop}>
                    <div className={styles.footerBrand}>
                        <h3>Fore<span>XA</span></h3>
                        <p>Practice trading with real market data and zero risk. Master the markets before you invest.</p>
                    </div>
                    <div className={styles.footerLinks}>
                        <div className={styles.footerCol}>
                            <h4>Platform</h4>
                            <Link href="/trade">Trade</Link>
                            <Link href="/academy">Academy</Link>
                            <Link href="/news">Market News</Link>
                            <Link href="/leaderboard">Leaderboard</Link>
                        </div>
                        <div className={styles.footerCol}>
                            <h4>Company</h4>
                            <Link href="/about">About</Link>
                            <Link href="/contact">Contact</Link>
                            <Link href="/terms">Terms of Service</Link>
                            <Link href="/privacy">Privacy Policy</Link>
                        </div>
                    </div>
                </div>
                <div className={styles.footerBottom}>
                    <p>&copy; {new Date().getFullYear()} ForexA. All rights reserved.</p>
                    <p className={styles.disclaimer}>
                        ForexA is a simulated trading platform for educational purposes only. No real money is involved. Past simulated performance does not guarantee future results.
                    </p>
                </div>
            </div>
        </footer>
    );
}
