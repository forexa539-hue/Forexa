'use client';

import { useState } from 'react';
import { useAuth } from '@/context/auth-context';
import { useTradingStore } from '@/store/trading-store';
import styles from './OrderPanel.module.css';

export default function OrderPanel() {
    const { user } = useAuth();
    const { selectedInstrument, prices, balance, executeMarketOrder, executeLimitOrder } = useTradingStore();
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

    // Estimate liquidation price
    // Long: Entry - (Margin * 0.8 / Qty)
    // Short: Entry + (Margin * 0.8 / Qty)
    // Qty = PositionSize / Entry
    // => Liq (Long) = Entry - (Margin * 0.8 * Entry / PositionSize)
    // => Liq (Long) = Entry * (1 - 0.8 / Leverage)
    let estimatedLiqPrice = 0;
    if (currentPrice) {
        if (side === 'buy') {
            estimatedLiqPrice = currentPrice * (1 - 0.8 / leverage);
        } else {
            estimatedLiqPrice = currentPrice * (1 + 0.8 / leverage);
        }
    }
    if (estimatedLiqPrice < 0) estimatedLiqPrice = 0;

    const handleSubmit = async () => {
        if (!user) {
            setMessage('Please login to trade');
            return;
        }
        if (!marginNum || marginNum <= 0) {
            setMessage('Enter a valid margin amount');
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
        } catch {
            setMessage('Order failed. Try again.');
        }
        setSubmitting(false);
    };

    const leverageOptions = [1, 2, 5, 10, 20, 50, 100];

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
                disabled={submitting}
            >
                {submitting ? 'Processing...' : `${side === 'buy' ? 'Buy' : 'Sell'} ${selectedInstrument.symbol}`}
            </button>

            {message && <p className={styles.message}>{message}</p>}
        </div>
    );
}
