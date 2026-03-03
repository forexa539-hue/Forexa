import styles from './legal.module.css';

export default function AboutPage() {
    return (
        <div className={styles.legalPage}>
            <div className={styles.content}>
                <h1>About ForexA</h1>
                <p className={styles.intro}>
                    ForexA is a trading simulator designed to help aspiring traders learn and practice in a risk-free environment using real market data.
                </p>

                <h2>Our Mission</h2>
                <p>
                    We believe everyone should have the opportunity to learn financial markets without risking their savings.
                    ForexA provides a realistic trading experience with live prices from forex, crypto, and major indices markets,
                    all with virtual funds.
                </p>

                <h2>How It Works</h2>
                <ul>
                    <li>Sign up and receive $100,000 in virtual trading funds</li>
                    <li>Trade across 8 instruments with real-time market data</li>
                    <li>Practice market and limit orders in a safe environment</li>
                    <li>Track your performance and compete on the leaderboard</li>
                    <li>Reset your account anytime to start fresh</li>
                </ul>

                <h2>What ForexA Is NOT</h2>
                <p>
                    ForexA is not a brokerage, investment platform, or financial advisor. No real money is involved in any transactions.
                    We do not provide investment advice or recommendations. ForexA is purely an educational and practice tool.
                </p>
            </div>
        </div>
    );
}
