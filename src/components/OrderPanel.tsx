'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/auth-context';
import { useTradingStore } from '@/store/trading-store';
import styles from './OrderPanel.module.css';

export default function OrderPanel() {
    const { user } = useAuth();
    const { selectedInstrument, prices, balance, executeMarketOrder, executeLimitOrder, refreshPrice } = useTradingStore();
    const [orderType, setOrderType] = useState<'market' | 'limit'>('market');
    const [side, setSide] = useState<'buy' | 'sell'>('buy');
    const [margin, setMargin] = useState('');
    const [leverage, setLeverage] = useState(1);
    const [limitPrice, setLimitPrice] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [message, setMessage] = useState('');

    const currentPrice = prices[selectedInstrument.id]?.price;
    const marginNum = parseFloat(margin) || 0;
    const positionSize = marginNum * leverage;
    const limitPriceNum = parseFloat(limitPrice) || 0;

    const estimatedEntryPrice = orderType === 'limit' && limitPriceNum > 0
        ? limitPriceNum
        : currentPrice;

    // Estimate liquidation price
    // Long: Entry - (Margin * 0.8 / Qty)
    // Short: Entry + (Margin * 0.8 / Qty)
    // Qty = PositionSize / Entry
    // => Liq (Long) = Entry - (Margin * 0.8 * Entry / PositionSize)
    // => Liq (Long) = Entry * (1 - 0.8 / Leverage)
    let estimatedLiqPrice = 0;
    if (estimatedEntryPrice) {
        if (side === 'buy') {
            estimatedLiqPrice = estimatedEntryPrice * (1 - 0.8 / leverage);
        } else {
            estimatedLiqPrice = estimatedEntryPrice * (1 + 0.8 / leverage);
        }
    }
    if (estimatedLiqPrice < 0) estimatedLiqPrice = 0;

    const handleSubmit = async () => {
        if (!user) {
            setMessage('Please sign in to place orders.');
            return;
        }
        if (!currentPrice || currentPrice <= 0) {
            await refreshPrice(selectedInstrument);
            const updatedPrice = useTradingStore.getState().prices[selectedInstrument.id]?.price;
            if (!updatedPrice || updatedPrice <= 0) {
                setMessage('Live price unavailable. Check API key/network and retry.');
                return;
            }
        }
        if (!marginNum || marginNum <= 0) {
            setMessage('Enter a valid margin amount');
            return;
        }
        if (!Number.isFinite(leverage) || leverage <= 0) {
            setMessage('Select a valid leverage');
            return;
        }
        if (marginNum > balance) {
            setMessage('Insufficient balance');
            return;
        }

        setSubmitting(true);
        setMessage('');

        try {
            if (orderType === 'market') {
                await executeMarketOrder(user.uid, side, marginNum, leverage);
                setMessage(`Market ${side} order executed`);
            } else {
                const lp = parseFloat(limitPrice);
                if (!lp || lp <= 0) {
                    setMessage('Enter a valid limit price');
                    setSubmitting(false);
                    return;
                }
                await executeLimitOrder(user.uid, side, marginNum, leverage, lp);
                setMessage(`Limit ${side} order placed`);
            }
            setMargin('');
            setLimitPrice('');
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Order failed. Try again.';
            setMessage(message);
        }
        setSubmitting(false);
    };

    const leverageOptions = [1, 2, 5, 10, 20, 50, 100];
    const isDisabled = submitting || !user || !currentPrice || currentPrice <= 0;

    return (
        <div className={styles.panel}>
            <div className={styles.panelHeader}>
                <h3>Place Order</h3>
                {currentPrice && (
                    <span className={styles.livePrice}>
                        ${currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 5 })}
                    </span>
                )}
            </div>

            {/* Order Type */}
            <div className={styles.field}>
                <label className={styles.label}>Order Type</label>
                <div className={styles.tabs}>
                    <button className={`${styles.tab} ${orderType === 'market' ? styles.activeTab : ''}`} onClick={() => setOrderType('market')}>
                        Market
                    </button>
                    <button className={`${styles.tab} ${orderType === 'limit' ? styles.activeTab : ''}`} onClick={() => setOrderType('limit')}>
                        Limit
                    </button>
                </div>
            </div>

            {/* Side */}
            <div className={styles.field}>
                <label className={styles.label}>Side</label>
                <div className={styles.sideButtons}>
                    <button
                        className={`${styles.sideBtn} ${side === 'buy' ? styles.buyActive : ''}`}
                        onClick={() => setSide('buy')}
                    >
                        Buy / Long
                    </button>
                    <button
                        className={`${styles.sideBtn} ${side === 'sell' ? styles.sellActive : ''}`}
                        onClick={() => setSide('sell')}
                    >
                        Sell / Short
                    </button>
                </div>
            </div>

            {/* Leverage */}
            <div className={styles.field}>
                <label className={styles.label}>Leverage: {leverage}x</label>
                <div className={styles.leverageOptions}>
                    {leverageOptions.map((l) => (
                        <button
                            key={l}
                            className={`${styles.leverageBtn} ${leverage === l ? styles.activeLeverage : ''}`}
                            onClick={() => setLeverage(l)}
                        >
                            {l}x
                        </button>
                    ))}
                </div>
            </div>

            {/* Margin (Cost) */}
            <div className={styles.field}>
                <label className={styles.label}>Margin (Cost)</label>
                <input
                    type="number"
                    className={styles.input}
                    placeholder="Amount to invest..."
                    value={margin}
                    onChange={(e) => setMargin(e.target.value)}
                    min="0"
                />
            </div>

            {/* Limit Price */}
            {orderType === 'limit' && (
                <div className={styles.field}>
                    <label className={styles.label}>Limit Price</label>
                    <input
                        type="number"
                        className={styles.input}
                        placeholder="Enter limit price"
                        value={limitPrice}
                        onChange={(e) => setLimitPrice(e.target.value)}
                        min="0"
                    />
                </div>
            )}

            {/* Info Summary */}
            <div className={styles.summary}>
                <div className={styles.summaryRow}>
                    <span>Position Size</span>
                    <span>${positionSize.toLocaleString()}</span>
                </div>
                <div className={styles.summaryRow}>
                    <span>Est. Liquidation</span>
                    <span className={styles.liqPrice}>
                        {estimatedLiqPrice > 0
                            ? `$${estimatedLiqPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
                            : '—'}
                    </span>
                </div>
                <div className={styles.summaryRow}>
                    <span>Available Balance</span>
                    <span>${balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
            </div>

            {/* Submit */}
            <button
                className={`btn ${side === 'buy' ? 'btn-primary' : 'btn-danger'} ${styles.submitBtn}`}
                onClick={handleSubmit}
                disabled={isDisabled}
            >
                {submitting ? 'Processing...' : `${side === 'buy' ? 'Buy' : 'Sell'} ${selectedInstrument.symbol}`}
            </button>

            {!user && (
                <p className={styles.message}>
                    You must <Link href="/login">sign in</Link> before trading.
                </p>
            )}
            {user && (!currentPrice || currentPrice <= 0) && (
                <p className={styles.message}>Waiting for live price feed…</p>
            )}
            {message && <p className={styles.message}>{message}</p>}
        </div>
    );
}
