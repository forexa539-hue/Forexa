'use client';

import { useEffect, useState } from 'react';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { getDbInstance } from '@/lib/firebase';
import { useAuth } from '@/context/auth-context';
import styles from './leaderboard.module.css';

interface LeaderboardEntry {
    uid: string;
    displayName: string;
    portfolioValue: number;
    percentReturn: number;
}

type Period = 'today' | 'weekly' | 'global' | 'friends';

export default function LeaderboardPage() {
    const { user } = useAuth();
    const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
    const [period, setPeriod] = useState<Period>('global');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let active = true;
        setLoading(true);

        const fetchLeaderboard = async () => {
            try {
                const q = query(
                    collection(getDbInstance(), 'leaderboard'),
                    orderBy('percentReturn', 'desc'),
                    limit(50)
                );
                const snap = await getDocs(q);
                const data: LeaderboardEntry[] = snap.docs.map((d) => ({
                    uid: d.id,
                    ...d.data(),
                })) as LeaderboardEntry[];

                if (active) {
                    // Filter based on period
                    if (period === 'friends' && user) {
                        // For friends filter, we'd need the user's friends list
                        // For now show all (friends feature is social — requires follow logic)
                        setEntries(data);
                    } else {
                        setEntries(data);
                    }
                    setLoading(false);
                }
            } catch (err) {
                console.error('Failed to fetch leaderboard:', err);
                if (active) setLoading(false);
            }
        };

        fetchLeaderboard();
        return () => { active = false; };
    }, [period, user]);

    const PERIODS: { key: Period; label: string }[] = [
        { key: 'today', label: 'Today' },
        { key: 'weekly', label: 'Weekly' },
        { key: 'global', label: 'Global' },
        { key: 'friends', label: 'Friends' },
    ];

    return (
        <div className={styles.leaderboardPage}>
            <div className="page-header">
                <h1>Leaderboard</h1>
                <p>Top traders ranked by portfolio return</p>
            </div>

            <div className={styles.filters}>
                <div className="tabs">
                    {PERIODS.map((p) => (
                        <button
                            key={p.key}
                            className={`tab ${period === p.key ? 'active' : ''}`}
                            onClick={() => setPeriod(p.key)}
                        >
                            {p.label}
                        </button>
                    ))}
                </div>
            </div>

            {loading ? (
                <div className={styles.loading}>Loading leaderboard...</div>
            ) : entries.length === 0 ? (
                <div className={styles.empty}>
                    <p>No rankings yet. Start trading to appear on the leaderboard!</p>
                </div>
            ) : (
                <div className={styles.tableWrapper}>
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Rank</th>
                                <th>Trader</th>
                                <th>Portfolio</th>
                                <th>Return</th>
                            </tr>
                        </thead>
                        <tbody>
                            {entries.map((entry, i) => (
                                <tr key={entry.uid}>
                                    <td>
                                        <span className={`${styles.rank} ${i === 0 ? styles.rank1 : i === 1 ? styles.rank2 : i === 2 ? styles.rank3 : ''}`}>
                                            #{i + 1}
                                        </span>
                                    </td>
                                    <td className={styles.userName}>
                                        {entry.displayName}
                                        {entry.uid === user?.uid && ' (You)'}
                                    </td>
                                    <td>${entry.portfolioValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                    <td className={entry.percentReturn >= 0 ? 'profit' : 'loss'}>
                                        {entry.percentReturn >= 0 ? '+' : ''}{entry.percentReturn.toFixed(2)}%
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
