'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { getDbInstance } from '@/lib/firebase';
import { useAuth } from '@/context/auth-context';
import { useTradingStore } from '@/store/trading-store';
import styles from './profile.module.css';

export default function ProfilePage() {
    const { user, signOut, loading: authLoading } = useAuth();
    const { balance, trades, positions, loadUserData, resetAccount } = useTradingStore();
    const router = useRouter();
    const [userData, setUserData] = useState<{
        resetCount: number;
        createdAt: string;
    } | null>(null);
    const [showResetModal, setShowResetModal] = useState(false);
    const [resetting, setResetting] = useState(false);
    const [dataLoading, setDataLoading] = useState(true);

    useEffect(() => {
        if (!user) {
            setDataLoading(false);
            return;
        }

        const load = async () => {
            await loadUserData(user.uid);
            const userDoc = await getDoc(doc(getDbInstance(), 'users', user.uid));
            const data = userDoc.data();
            if (data) {
                setUserData({
                    resetCount: data.resetCount || 0,
                    createdAt: data.createdAt?.toDate?.()?.toLocaleDateString() || 'Unknown',
                });
            }
            setDataLoading(false);
        };
        load();
    }, [user, loadUserData]);

    const handleReset = async () => {
        if (!user) return;
        setResetting(true);
        await resetAccount(user.uid);
        setResetting(false);
        setShowResetModal(false);
    };

    const handleSignOut = async () => {
        await signOut();
        router.push('/');
    };

    if (authLoading || dataLoading) {
        return <div className={styles.loading}>Loading...</div>;
    }

    if (!user) {
        return (
            <div className={`${styles.profilePage} ${styles.noAuth}`}>
                <h2>Sign In Required</h2>
                <p>Log in to view your profile and trading history</p>
                <Link href="/login" className="btn btn-primary">
                    Sign In
                </Link>
            </div>
        );
    }

    const totalPnL = trades.reduce((sum, t) => sum + t.pnl, 0);
    const percentReturn = ((balance - 100000) / 100000) * 100;

    return (
        <div className={styles.profilePage}>
            <div className="page-header">
                <h1>Profile</h1>
                <p>{user.displayName || user.email}</p>
            </div>

            <div className={styles.overview}>
                <div className={styles.statCard}>
                    <label>Balance</label>
                    <p>${balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                </div>
                <div className={styles.statCard}>
                    <label>Return</label>
                    <p className={percentReturn >= 0 ? 'profit' : 'loss'}>
                        {percentReturn >= 0 ? '+' : ''}{percentReturn.toFixed(2)}%
                    </p>
                </div>
                <div className={styles.statCard}>
                    <label>Total Trades</label>
                    <p>{trades.length}</p>
                </div>
                <div className={styles.statCard}>
                    <label>Open Positions</label>
                    <p>{positions.filter((p) => p.status === 'open').length}</p>
                </div>
            </div>

            <div className={styles.section}>
                <h2>Trade History</h2>
                {trades.length === 0 ? (
                    <div className="card">
                        <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px' }}>
                            No trades yet. Start trading to build your history.
                        </p>
                    </div>
                ) : (
                    <div className={styles.tradeHistoryWrap}>
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Instrument</th>
                                    <th>Side</th>
                                    <th>Entry</th>
                                    <th>Exit</th>
                                    <th>Size</th>
                                    <th>PnL</th>
                                </tr>
                            </thead>
                            <tbody>
                                {trades.slice(0, 20).map((trade, i) => (
                                    <tr key={trade.id || i}>
                                        <td>{trade.instrumentName}</td>
                                        <td>
                                            <span className={`badge ${trade.type === 'buy' ? 'badge-green' : 'badge-red'}`}>
                                                {trade.type.toUpperCase()}
                                            </span>
                                        </td>
                                        <td>${trade.entryPrice.toFixed(2)}</td>
                                        <td>${trade.exitPrice.toFixed(2)}</td>
                                        <td>${trade.size.toLocaleString()}</td>
                                        <td className={trade.pnl >= 0 ? 'profit' : 'loss'}>
                                            {trade.pnl >= 0 ? '+' : ''}${trade.pnl.toFixed(2)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <div className={styles.section}>
                <h2>Account</h2>
                <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    Member since: {userData?.createdAt || '—'}
                </p>
                <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                    Resets: {userData?.resetCount || 0}
                </p>

                <div className={styles.actions}>
                    <button className="btn btn-secondary" onClick={() => setShowResetModal(true)}>
                        Reset Account
                    </button>
                    <button className="btn btn-danger" onClick={handleSignOut}>
                        Logout
                    </button>
                </div>
            </div>

            {showResetModal && (
                <div className="modal-overlay" onClick={() => setShowResetModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <h3>Reset Account</h3>
                        <p>
                            This will reset your balance to $100,000, close all positions, and clear trade history.
                            This cannot be undone.
                        </p>
                        <div className="modal-actions">
                            <button className="btn btn-secondary" onClick={() => setShowResetModal(false)}>Cancel</button>
                            <button className="btn btn-danger" onClick={handleReset} disabled={resetting}>
                                {resetting ? 'Resetting...' : 'Reset'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
