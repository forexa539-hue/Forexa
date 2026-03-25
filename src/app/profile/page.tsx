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
    const [dataLoading, setDataLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    const parseProfileLoadError = (error: unknown) => {
        const code = (error as { code?: string })?.code || '';

        if (code.includes('permission-denied')) {
            return 'Permission denied loading profile. Check Firestore rules and login state.';
        }
        if (code.includes('unauthenticated')) {
            return 'Session expired. Please sign in again.';
        }
        if (code.includes('unavailable') || code.includes('deadline-exceeded')) {
            return 'Network issue while loading profile. Please retry.';
        }

        const message = (error as { message?: string })?.message;
        return message && message.trim() ? message : 'Could not load profile data. Please refresh.';
    };

    useEffect(() => {
        if (!user) return;

        const load = async () => {
            setDataLoading(true);
            setErrorMessage('');
            try {
                const [_, userDoc] = await Promise.all([
                    loadUserData(user.uid),
                    getDoc(doc(getDbInstance(), 'users', user.uid)),
                ]);
                const data = userDoc.data();
                if (data) {
                    setUserData({
                        resetCount: data.resetCount || 0,
                        createdAt: data.createdAt?.toDate?.()?.toLocaleDateString() || 'Unknown',
                    });
                }
            } catch (error) {
                console.error('Profile data load failed:', error);
                setErrorMessage(parseProfileLoadError(error));
            } finally {
                setDataLoading(false);
            }
        };
        void load();
    }, [user, loadUserData]);

    const handleReset = async () => {
        if (!user) return;
        setResetting(true);
        setErrorMessage('');
        try {
            await resetAccount(user.uid);
            setShowResetModal(false);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to reset account';
            setErrorMessage(message);
        } finally {
            setResetting(false);
        }
    };

    const handleSignOut = async () => {
        try {
            await signOut();
            router.push('/');
        } catch (error) {
            console.error('Sign out failed:', error);
            setErrorMessage('Failed to logout. Please try again.');
        }
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

            {errorMessage && (
                <p style={{ marginBottom: '16px', color: 'var(--danger)' }}>{errorMessage}</p>
            )}

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
                <div className={styles.statCard}>
                    <label>Total PnL</label>
                    <p className={totalPnL >= 0 ? 'profit' : 'loss'}>
                        {totalPnL >= 0 ? '+' : ''}${totalPnL.toFixed(2)}
                    </p>
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
