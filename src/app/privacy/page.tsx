import styles from '../about/legal.module.css';

export default function PrivacyPage() {
    return (
        <div className={styles.legalPage}>
            <div className={styles.content}>
                <h1>Privacy Policy</h1>
                <p className={styles.intro}>Last updated: February 2026</p>

                <h2>Information We Collect</h2>
                <p>
                    We collect the minimum information necessary to provide the service:
                </p>
                <ul>
                    <li>Email address and display name (for account creation)</li>
                    <li>Trading activity data (positions, trades, balances — all virtual)</li>
                    <li>Basic usage analytics</li>
                </ul>

                <h2>How We Use Your Data</h2>
                <ul>
                    <li>To provide and maintain the trading simulator</li>
                    <li>To display leaderboard rankings</li>
                    <li>To improve the platform experience</li>
                </ul>

                <h2>Data Storage</h2>
                <p>
                    Your data is stored securely using Google Firebase infrastructure. We do not sell, share, or
                    distribute your personal information to third parties.
                </p>

                <h2>Data Deletion</h2>
                <p>
                    You can reset your trading data at any time using the account reset feature.
                    To delete your account entirely, contact us at support@forexa.app.
                </p>

                <h2>Cookies</h2>
                <p>
                    We use essential cookies for authentication. No tracking or advertising cookies are used.
                </p>
            </div>
        </div>
    );
}
