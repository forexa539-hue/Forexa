'use client';

import { useState } from 'react';
import { useAuth } from '@/context/auth-context';
import { useTradingStore, Position } from '@/store/trading-store';
import styles from './PositionsTable.module.css';

export default function PositionsTable() {
    const { user } = useAuth();
    const { positions, prices, closePosition } = useTradingStore();
    const [closingId, setClosingId] = useState<string | null>(null);
    const [errorMessage, setErrorMessage] = useState('');

    const openPositions = positions.filter((p) => p.status === 'open');
    const pendingPositions = positions.filter((p) => p.status === 'pending');



    const handleClose = async (pos: Position) => {
        if (!user) {
            setErrorMessage('Please login to close positions');
            return;
        }

        try {
            setClosingId(pos.id || null);
            setErrorMessage('');
            await closePosition(user.uid, pos);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to close position';
            setErrorMessage(message);
        } finally {
            setClosingId(null);
        }
    };

    if (openPositions.length === 0 && pendingPositions.length === 0) {
        return (
            <div className={styles.empty}>
                <p>No open positions</p>
                <span>Place an order to start trading</span>
            </div>
        );
    }

    return (
        <div className={styles.wrapper}>
            {errorMessage && (
                <div className={styles.empty}>
                    <p>{errorMessage}</p>
                </div>
            )}
            {openPositions.length > 0 && (
                <>
                    <h4 className={styles.sectionTitle}>Open Positions</h4>
                    <div className={styles.tableScroll}>
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Instrument</th>
                                    <th>Side</th>
                                    <th>Lev.</th>
                                    <th>Size (Val)</th>
                                    <th>Entry</th>
                                    <th>Liq. Price</th>
                                    <th>Current</th>
                                    <th>PnL</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {openPositions.map((pos) => {
                                    const currentPrice = prices[pos.instrument]?.price || 0;
                                    let pnl = 0;
                                    if (currentPrice) {
                                        if (pos.type === 'buy') {
                                            pnl = (currentPrice - pos.entryPrice) * pos.quantity;
                                        } else {
                                            pnl = (pos.entryPrice - currentPrice) * pos.quantity;
                                        }
                                    }

                                    const isProfit = pnl >= 0;
                                    const roe = pos.size > 0 ? (pnl / pos.size) * 100 : 0;

                                    return (
                                        <tr key={pos.id}>
                                            <td>{pos.instrumentName}</td>
                                            <td>
                                                <span className={`badge ${pos.type === 'buy' ? 'badge-green' : 'badge-red'}`}>
                                                    {pos.type.toUpperCase()}
                                                </span>
                                            </td>
                                            <td>{pos.leverage}x</td>
                                            <td>
                                                <div>${pos.positionValue?.toLocaleString()}</div>
                                                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Margin: ${pos.size.toLocaleString()}</div>
                                            </td>
                                            <td>${pos.entryPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 5 })}</td>
                                            <td style={{ color: 'var(--danger)' }}>${pos.liquidationPrice?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 5 })}</td>
                                            <td>${currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 5 })}</td>
                                            <td className={isProfit ? 'profit' : 'loss'}>
                                                <div>{isProfit ? '+' : ''}{pnl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                                                <div style={{ fontSize: '11px' }}>({isProfit ? '+' : ''}{roe.toFixed(2)}%)</div>
                                            </td>
                                            <td>
                                                <button
                                                    className="btn btn-ghost btn-sm"
                                                    onClick={() => handleClose(pos)}
                                                    disabled={closingId === pos.id}
                                                >
                                                    {closingId === pos.id ? 'Closing...' : 'Close'}
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </>
            )}

            {pendingPositions.length > 0 && (
                <>
                    <h4 className={styles.sectionTitle}>Pending Orders</h4>
                    <div className={styles.tableScroll}>
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Instrument</th>
                                    <th>Side</th>
                                    <th>Lev.</th>
                                    <th>Size (Val)</th>
                                    <th>Limit Price</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {pendingPositions.map((pos) => (
                                    <tr key={pos.id}>
                                        <td>{pos.instrumentName}</td>
                                        <td>
                                            <span className={`badge ${pos.type === 'buy' ? 'badge-green' : 'badge-red'}`}>
                                                {pos.type.toUpperCase()}
                                            </span>
                                        </td>
                                        <td>{pos.leverage}x</td>
                                        <td>
                                            <div>${pos.positionValue?.toLocaleString()}</div>
                                            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Margin: ${pos.size.toLocaleString()}</div>
                                        </td>
                                        <td>${pos.limitPrice?.toFixed(2)}</td>
                                        <td><span className="badge badge-green">Pending</span></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            )}
        </div>
    );
}
