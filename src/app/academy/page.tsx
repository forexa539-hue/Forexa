'use client';

import { useState } from 'react';
import Link from 'next/link';
import styles from './academy.module.css';

const TOPICS = [
    {
        id: 'basics',
        icon: '📊',
        title: 'Trading Basics',
        description: 'Learn the fundamentals of financial markets, how trades work, and key terminology every trader should know.',
        content: [
            'Understanding bid/ask spreads',
            'Market vs. limit orders explained',
            'Reading price charts and candles',
            'Volume and what it tells you',
            'Position sizing fundamentals',
            'Understanding leverage and margin',
        ],
    },
    {
        id: 'forex',
        icon: '💱',
        title: 'Forex Trading',
        description: 'Dive into the world\'s largest financial market. Learn about currency pairs, pips, and forex-specific strategies.',
        content: [
            'Major, minor, and exotic pairs',
            'What moves currency markets',
            'Understanding pips and lots',
            'Forex session times and overlaps',
            'Central bank policy impacts',
            'Common forex trading strategies',
        ],
    },
    {
        id: 'crypto',
        icon: '₿',
        title: 'Crypto Trading',
        description: 'Navigate the cryptocurrency markets. Understand blockchain basics, volatility, and digital asset trading.',
        content: [
            'Blockchain and crypto fundamentals',
            'How crypto exchanges work',
            'Understanding crypto volatility',
            'BTC vs altcoin dynamics',
            'DeFi and its impact on trading',
            'Crypto market cycle analysis',
        ],
    },
    {
        id: 'risk',
        icon: '🛡️',
        title: 'Risk Management',
        description: 'The most important skill in trading. Learn to protect your capital with proven risk management techniques.',
        content: [
            'The 1% and 2% rules',
            'Setting stop-losses effectively',
            'Risk-reward ratio explained',
            'Diversification strategies',
            'Emotional discipline in trading',
            'Building a trading journal',
        ],
    },
];

export default function AcademyPage() {
    const [expanded, setExpanded] = useState<string | null>(null);

    return (
        <div className={styles.academyPage}>
            <div className="page-header">
                <h1>Trading Academy</h1>
                <p>Build your trading knowledge from the ground up</p>
            </div>

            <div className={styles.grid}>
                {TOPICS.map((topic) => (
                    <div
                        key={topic.id}
                        className={styles.topicCard}
                        onClick={() => setExpanded(expanded === topic.id ? null : topic.id)}
                    >
                        <div className={styles.topicIcon}>{topic.icon}</div>
                        <h3>{topic.title}</h3>
                        <p>{topic.description}</p>
                        <Link href="/trade" className="btn btn-primary btn-sm">
                            Try in Simulator →
                        </Link>

                        {expanded === topic.id && (
                            <div className={styles.topicContent}>
                                <ul>
                                    {topic.content.map((item, i) => (
                                        <li key={i}>{item}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
