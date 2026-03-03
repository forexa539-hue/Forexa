'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/context/auth-context';
import { useTradingStore } from '@/store/trading-store';
import { INSTRUMENTS, Instrument } from '@/lib/market-api';
import TradingChart from '@/components/TradingChart';
import TradingViewWidget from '@/components/TradingViewWidget';
import OrderPanel from '@/components/OrderPanel';
import PositionsTable from '@/components/PositionsTable';
import styles from './trade.module.css';

export default function TradePage() {
    const { user } = useAuth();
    const {
        selectedInstrument,
        setSelectedInstrument,
        prices,
        balance,
        refreshPrice,
        refreshPrices,
        loadUserData,
        resetAccount,
        checkLimitOrders,
    } = useTradingStore();

    const [showResetModal, setShowResetModal] = useState(false);
    const [resetting, setResetting] = useState(false);
    const [chartSource, setChartSource] = useState<'tradingview' | 'custom'>('tradingview');

    // Load user data on mount
    useEffect(() => {
        if (user) {
            loadUserData(user.uid);
        }
    }, [user, loadUserData]);

    // Optimized Polling: Only fetch Selected Instrument + Instruments with Open Positions
    useEffect(() => {
        const pollSmart = async () => {
            const instrumentsToFetch = new Map<string, Instrument>();

            // 1. Always fetch selected instrument
            instrumentsToFetch.set(selectedInstrument.id, selectedInstrument);

            // 2. Fetch instruments for open/pending positions (for PnL/Limit checks)
            // accessing state directly from store to ensure freshness inside interval if needed, 
            // but here we depend on 'positions' from the hook which updates on change.
            const { positions } = useTradingStore.getState();

            positions.forEach(p => {
                if (p.status === 'open' || p.status === 'pending') {
                    // Find the instrument object
                    // We need a helper or just iterate INSTRUMENTS
                    const inst = INSTRUMENTS.find(i => i.id === p.instrument);
                    if (inst) {
                        instrumentsToFetch.set(inst.id, inst);
                    }
                }
            });

            // Convert to array
            const targets = Array.from(instrumentsToFetch.values());

            if (targets.length > 0) {
                await refreshPrices(targets);
            }

            if (user) {
                await checkLimitOrders(user.uid);
            }
        };

        pollSmart();
        const interval = setInterval(pollSmart, 15000); // 15s interval
        return () => clearInterval(interval);
    }, [selectedInstrument, refreshPrices, checkLimitOrders, user]);

    const handleInstrumentChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const inst = INSTRUMENTS.find((i) => i.id === e.target.value);
        if (inst) setSelectedInstrument(inst);
    };

    const handleReset = async () => {
        if (!user) return;
        setResetting(true);
        await resetAccount(user.uid);
        setResetting(false);
        setShowResetModal(false);
    };

    const currentPrice = prices[selectedInstrument.id]?.price;
    const priceChange = prices[selectedInstrument.id]?.changePercent24h;

    return (
        <div className={styles.tradePage}>
            {/* Header */}
            <div className={styles.tradeHeader}>
                <div className={styles.instrumentSelect}>
                    <select onChange={handleInstrumentChange} value={selectedInstrument.id}>
                        <optgroup label="Indices">
                            {INSTRUMENTS.filter((i) => i.category === 'indices').map((i) => (
                                <option key={i.id} value={i.id}>{i.name} ({i.symbol})</option>
                            ))}
                        </optgroup>
                        <optgroup label="Crypto">
                            {INSTRUMENTS.filter((i) => i.category === 'crypto').map((i) => (
                                <option key={i.id} value={i.id}>{i.name} ({i.symbol})</option>
                            ))}
                        </optgroup>
                        <optgroup label="Forex">
                            {INSTRUMENTS.filter((i) => i.category === 'forex').map((i) => (
                                <option key={i.id} value={i.id}>{i.name} ({i.symbol})</option>
                            ))}
                        </optgroup>
                    </select>
                </div>

                <div className={styles.priceDisplay}>
                    <span className={styles.currentPrice}>
                        {currentPrice
                            ? `$${currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 5 })}`
                            : '—'}
                    </span>
                    {priceChange !== undefined && priceChange !== 0 && (
                        <span className={`${styles.priceChange} ${priceChange >= 0 ? 'profit' : 'loss'}`}>
                            {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)}%
                        </span>
                    )}
                </div>
            </div>

            {/* Main Grid */}
            <div className={styles.tradeGrid}>
                <div className={styles.chartSection}>
                    <div className={styles.chartSourceToggle}>
                        <button
                            className={`tab ${chartSource === 'tradingview' ? 'active' : ''}`}
                            onClick={() => setChartSource('tradingview')}
                        >
                            TradingView
                        </button>
                        <button
                            className={`tab ${chartSource === 'custom' ? 'active' : ''}`}
                            onClick={() => setChartSource('custom')}
                        >
                            Custom Chart
                        </button>
                    </div>
                    {chartSource === 'tradingview' ? (
                        <TradingViewWidget instrument={selectedInstrument} />
                    ) : (
                        <TradingChart instrument={selectedInstrument} currentPrice={currentPrice} />
                    )}
                </div>

                <div className={styles.sidebar}>
                    <div className={styles.balanceCard}>
                        <p className={styles.balanceLabel}>Account Balance</p>
                        <p className={styles.balanceAmount}>
                            ${balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </p>
                        <button
                            className={`btn btn-secondary btn-sm ${styles.resetBtn}`}
                            onClick={() => setShowResetModal(true)}
                        >
                            Reset Account
                        </button>
                    </div>
                    <OrderPanel />
                </div>
            </div>

            {/* Positions */}
            <div className={styles.positionsSection}>
                <PositionsTable />
            </div>

            {/* Reset Modal */}
            {showResetModal && (
                <div className="modal-overlay" onClick={() => setShowResetModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <h3>Reset Account</h3>
                        <p>
                            This will reset your balance to $100,000, close all positions, and clear your trade history.
                            This action cannot be undone.
                        </p>
                        <div className="modal-actions">
                            <button className="btn btn-secondary" onClick={() => setShowResetModal(false)}>
                                Cancel
                            </button>
                            <button className="btn btn-danger" onClick={handleReset} disabled={resetting}>
                                {resetting ? 'Resetting...' : 'Reset Account'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
