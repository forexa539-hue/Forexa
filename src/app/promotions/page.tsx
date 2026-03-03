'use client';

import { useState } from 'react';
import { useAuth } from '@/context/auth-context';
import styles from './promotions.module.css';

export default function PromotionsPage() {
    const { user } = useAuth();
    const [copied, setCopied] = useState(false);

    const referralLink = user
        ? `https://forexa.app/ref/${user.uid.slice(0, 8)}`
        : 'https://forexa.app/ref/demo';

    const copyLink = () => {
        navigator.clipboard.writeText(referralLink);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className={styles.promoPage}>
            <div className="page-header">
                <h1>Promotions</h1>
                <p>Invite friends to trade together</p>
            </div>

            <div className={styles.referralCard}>
                <div className={styles.referralIcon}>🎁</div>
                <h2>Invite Friends to ForexA</h2>
                <p>Share your referral link and compete on the leaderboard together. The more friends you invite, the more fun trading gets.</p>

                <div className={styles.linkBox}>
                    <input className="input" value={referralLink} readOnly />
                    <button className="btn btn-primary" onClick={copyLink}>
                        {copied ? 'Copied!' : 'Copy'}
                    </button>
                </div>

                <div className={styles.steps}>
                    <div className={styles.step}>
                        <div className={styles.stepNum}>1</div>
                        <h4>Share Link</h4>
                        <p>Send your unique link to friends</p>
                    </div>
                    <div className={styles.step}>
                        <div className={styles.stepNum}>2</div>
                        <h4>They Join</h4>
                        <p>Friends sign up and start trading</p>
                    </div>
                    <div className={styles.step}>
                        <div className={styles.stepNum}>3</div>
                        <h4>Compete</h4>
                        <p>See who tops the leaderboard</p>
                    </div>
                </div>

                <div className={styles.disclaimer}>
                    This is a demo referral system. No real rewards or incentives are offered.
                </div>
            </div>
        </div>
    );
}
