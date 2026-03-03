import styles from '../about/legal.module.css';

export default function TermsPage() {
    return (
        <div className={styles.legalPage}>
            <div className={styles.content}>
                <h1>Terms of Service</h1>
                <p className={styles.intro}>Last updated: February 2026</p>

                <h2>1. Acceptance of Terms</h2>
                <p>
                    By accessing or using ForexA, you agree to be bound by these Terms of Service.
                    If you do not agree, do not use the platform.
                </p>

                <h2>2. Service Description</h2>
                <p>
                    ForexA is a simulated trading platform for educational purposes only. All trading is done
                    with virtual currency. No real money, securities, or financial instruments are traded on this platform.
                </p>

                <h2>3. User Accounts</h2>
                <p>
                    You are responsible for maintaining the security of your account credentials.
                    Each user is entitled to one account with a starting balance of $100,000 in virtual funds.
                </p>

                <h2>4. Prohibited Conduct</h2>
                <ul>
                    <li>Attempting to exploit or manipulate the platform</li>
                    <li>Creating multiple accounts</li>
                    <li>Using automated trading bots without permission</li>
                    <li>Any activity that disrupts the service for others</li>
                </ul>

                <h2>5. No Financial Advice</h2>
                <p>
                    ForexA does not provide financial, investment, or trading advice. Performance on this simulator
                    does not indicate or guarantee results in real trading. Always consult a qualified financial advisor
                    before making investment decisions.
                </p>

                <h2>6. Limitation of Liability</h2>
                <p>
                    ForexA is provided &quot;as is&quot; without warranties. We are not liable for any losses, damages, or
                    decisions made based on your use of this platform.
                </p>
            </div>
        </div>
    );
}
