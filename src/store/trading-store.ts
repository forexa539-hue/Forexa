import { create } from 'zustand';
import {
    Instrument,
    INSTRUMENTS,
    PriceData,
    fetchPrice,
    fetchBatchPrices,
} from '@/lib/market-api';
import { getDbInstance } from '@/lib/firebase';
import {
    doc,
    updateDoc,
    addDoc,
    collection,
    getDocs,
    deleteDoc,
    getDoc,
    serverTimestamp,
    query,
    where,
    setDoc,
} from 'firebase/firestore';

const getDb = () => getDbInstance();

const clampPnlToIsolatedMargin = (pnl: number, margin: number) => {
    // Isolated margin model: max loss cannot exceed committed margin.
    return Math.max(pnl, -margin);
};

const ensureFinitePositive = (value: number, label: string) => {
    if (!Number.isFinite(value) || value <= 0) {
        throw new Error(`Invalid ${label}`);
    }
};

const parseFirebaseError = (error: unknown, fallback: string) => {
    const code = (error as { code?: string })?.code || '';

    if (code.includes('permission-denied')) {
        return 'Permission denied. Check Firestore rules and sign in again.';
    }
    if (code.includes('not-found')) {
        return 'Account data not found. Please re-login and try again.';
    }
    if (code.includes('unavailable') || code.includes('deadline-exceeded')) {
        return 'Network unavailable. Please retry in a moment.';
    }

    const message = (error as { message?: string })?.message;
    return message && message.trim() ? message : fallback;
};

const ensureUserAccountDoc = async (uid: string) => {
    const ref = doc(getDb(), 'users', uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
        await setDoc(ref, {
            displayName: 'Trader',
            balance: 100000,
            resetCount: 0,
            friends: [],
            portfolioValue: 100000,
            createdAt: serverTimestamp(),
        }, { merge: true });
    }
};

export interface Position {
    id?: string;
    instrument: string;
    instrumentName: string;
    type: 'buy' | 'sell';
    orderType: 'market' | 'limit';
    entryPrice: number;
    size: number; // This is the Margin (user's own money)
    leverage: number;
    positionValue: number; // Total value = size * leverage
    quantity: number; // positionValue / entryPrice
    limitPrice?: number;
    liquidationPrice: number;
    status: 'open' | 'closed' | 'pending';
    openedAt: number;
    closedAt?: number;
    pnl?: number;
}

export interface Trade {
    id?: string;
    instrument: string;
    instrumentName: string;
    type: 'buy' | 'sell';
    entryPrice: number;
    exitPrice: number;
    size: number;
    leverage: number;
    pnl: number;
    closedAt: number;
}

interface TradingState {
    selectedInstrument: Instrument;
    prices: Record<string, PriceData>;
    positions: Position[];
    trades: Trade[];
    balance: number;
    loading: boolean;

    setSelectedInstrument: (instrument: Instrument) => void;
    updatePrice: (instrumentId: string, price: PriceData) => void;
    refreshPrice: (instrument: Instrument) => Promise<void>;
    refreshPrices: (instruments: Instrument[]) => Promise<void>;
    executeMarketOrder: (uid: string, type: 'buy' | 'sell', margin: number, leverage: number) => Promise<void>;
    executeLimitOrder: (uid: string, type: 'buy' | 'sell', margin: number, leverage: number, limitPrice: number) => Promise<void>;
    closePosition: (uid: string, position: Position) => Promise<void>;
    loadUserData: (uid: string) => Promise<void>;
    resetAccount: (uid: string) => Promise<void>;
    checkLimitOrders: (uid: string) => Promise<void>;
    checkLiquidations: (uid: string) => Promise<void>;
}

export const useTradingStore = create<TradingState>((set, get) => ({
    selectedInstrument: INSTRUMENTS[0],
    prices: {},
    positions: [],
    trades: [],
    balance: 100000,
    loading: false,

    setSelectedInstrument: (instrument) => set({ selectedInstrument: instrument }),

    updatePrice: (instrumentId, price) =>
        set((state) => ({
            prices: { ...state.prices, [instrumentId]: price },
        })),

    refreshPrice: async (instrument) => {
        try {
            const price = await fetchPrice(instrument);
            get().updatePrice(instrument.id, price);
        } catch (err) {
            console.error('Failed to fetch price:', err);
        }
    },
    refreshPrices: async (instruments) => {
        try {
            const newPrices = await fetchBatchPrices(instruments);
            set((state) => ({
                prices: { ...state.prices, ...newPrices }
            }));
        } catch (err) {
            console.error('Failed to batch refresh prices', err);
        }
    },

    executeMarketOrder: async (uid, type, margin, leverage) => {
        const { selectedInstrument, prices, balance } = get();
        const priceData = prices[selectedInstrument.id];
        if (!priceData) throw new Error('Live price unavailable. Please try again.');

        ensureFinitePositive(margin, 'margin');
        ensureFinitePositive(leverage, 'leverage');
        ensureFinitePositive(priceData.price, 'market price');
        if (margin > balance) throw new Error('Insufficient balance');

        const currentPrice = priceData.price;
        const positionValue = margin * leverage;
        const quantity = positionValue / currentPrice;

        // Liquidation Logic:
        // Long: LiqPrice = EntryPrice * (1 - 1/Leverage + 0.05) // 5% maintenance margin buffer (simplified)
        // Short: LiqPrice = EntryPrice * (1 + 1/Leverage - 0.05)
        // More precise simplified model: Liq when Loss = Margin * 0.8 (80% loss)
        // Long Loss: (Entry - Current) * Qty = Margin * 0.8
        // Entry - Current = (Margin * 0.8) / Qty
        // Current = Entry - (Margin * 0.8) / Qty

        let liquidationPrice = 0;
        const maintenanceMarginRatio = 0.8; // Liquidation at 80% loss of margin

        if (type === 'buy') {
            const maxLossPerUnit = (margin * maintenanceMarginRatio) / quantity;
            liquidationPrice = currentPrice - maxLossPerUnit;
        } else {
            const maxLossPerUnit = (margin * maintenanceMarginRatio) / quantity;
            liquidationPrice = currentPrice + maxLossPerUnit;
        }

        if (liquidationPrice < 0) liquidationPrice = 0;

        const position: Position = {
            instrument: selectedInstrument.id,
            instrumentName: selectedInstrument.name,
            type,
            orderType: 'market',
            entryPrice: currentPrice,
            size: margin,
            leverage,
            positionValue,
            quantity,
            limitPrice: 0,
            liquidationPrice,
            status: 'open',
            openedAt: Date.now(),
        };

        try {
            await ensureUserAccountDoc(uid);

            // Save to Firestore
            const posRef = await addDoc(collection(getDb(), 'users', uid, 'positions'), position);
            position.id = posRef.id;

            // Update balance
            const newBalance = balance - margin;
            await updateDoc(doc(getDb(), 'users', uid), { balance: newBalance });

            set((state) => ({
                positions: [...state.positions, position],
                balance: newBalance,
            }));
        } catch (error) {
            console.error('Failed to execute market order:', error);
            throw new Error(parseFirebaseError(error, 'Could not place market order. Please try again.'));
        }
    },

    executeLimitOrder: async (uid, type, margin, leverage, limitPrice) => {
        const { selectedInstrument, balance } = get();

        ensureFinitePositive(margin, 'margin');
        ensureFinitePositive(leverage, 'leverage');
        ensureFinitePositive(limitPrice, 'limit price');
        if (margin > balance) throw new Error('Insufficient balance');

        const positionValue = margin * leverage;
        // precise quantity will be calculated on fill, executed at limit price
        const quantityEstimate = positionValue / limitPrice;

        // Estimated Liq Price (will be recalculated on fill)
        let liquidationPrice = 0;
        const maintenanceMarginRatio = 0.8;

        if (type === 'buy') {
            const maxLossPerUnit = (margin * maintenanceMarginRatio) / quantityEstimate;
            liquidationPrice = limitPrice - maxLossPerUnit;
        } else {
            const maxLossPerUnit = (margin * maintenanceMarginRatio) / quantityEstimate;
            liquidationPrice = limitPrice + maxLossPerUnit;
        }

        const position: Position = {
            instrument: selectedInstrument.id,
            instrumentName: selectedInstrument.name,
            type,
            orderType: 'limit',
            entryPrice: 0,
            size: margin,
            leverage,
            positionValue,
            quantity: 0, // Pending
            limitPrice,
            liquidationPrice,
            status: 'pending',
            openedAt: Date.now(),
        };

        try {
            await ensureUserAccountDoc(uid);

            const posRef = await addDoc(collection(getDb(), 'users', uid, 'positions'), position);
            position.id = posRef.id;

            const newBalance = balance - margin;
            await updateDoc(doc(getDb(), 'users', uid), { balance: newBalance });

            set((state) => ({
                positions: [...state.positions, position],
                balance: newBalance,
            }));
        } catch (error) {
            console.error('Failed to place limit order:', error);
            throw new Error(parseFirebaseError(error, 'Could not place limit order. Please try again.'));
        }
    },

    checkLimitOrders: async (uid) => {
        const { positions, prices } = get();
        const pendingOrders = positions.filter((p) => p.status === 'pending');

        for (const pos of pendingOrders) {
            try {
                const priceData = prices[pos.instrument];
                if (!priceData || !pos.limitPrice) continue;

                const currentPrice = priceData.price;
                const shouldFill =
                    (pos.type === 'buy' && currentPrice <= pos.limitPrice) ||
                    (pos.type === 'sell' && currentPrice >= pos.limitPrice);

                if (shouldFill) {
                    // Execute at Limit Price (guaranteed for limit orders usually, or better)
                    // For simplicity simulation, we fill at limit price exactly
                    const fillPrice = pos.limitPrice;
                    const quantity = pos.positionValue / fillPrice;

                    // Recalculate Liquidation
                    let liquidationPrice = 0;
                    const maintenanceMarginRatio = 0.8;

                    if (pos.type === 'buy') {
                        const maxLossPerUnit = (pos.size * maintenanceMarginRatio) / quantity;
                        liquidationPrice = fillPrice - maxLossPerUnit;
                    } else {
                        const maxLossPerUnit = (pos.size * maintenanceMarginRatio) / quantity;
                        liquidationPrice = fillPrice + maxLossPerUnit;
                    }
                    if (liquidationPrice < 0) liquidationPrice = 0;

                    const updatedPosition = {
                        ...pos,
                        status: 'open' as const,
                        entryPrice: fillPrice,
                        quantity,
                        liquidationPrice
                    };

                    if (pos.id) {
                        await updateDoc(doc(getDb(), 'users', uid, 'positions', pos.id), {
                            status: 'open',
                            entryPrice: fillPrice,
                            quantity,
                            liquidationPrice
                        });
                    }

                    set((state) => ({
                        positions: state.positions.map((p) =>
                            p.id === pos.id ? updatedPosition : p
                        ),
                    }));
                }
            } catch (error) {
                console.error(`Failed to process pending order ${pos.id}:`, error);
            }
        }
    },

    checkLiquidations: async (uid) => {
        const { positions, prices, closePosition } = get();
        const openPositions = positions.filter(p => p.status === 'open');

        for (const pos of openPositions) {
            const priceData = prices[pos.instrument];
            if (!priceData) continue;

            const currentPrice = priceData.price;
            let shouldLiquidate = false;

            if (pos.type === 'buy' && currentPrice <= pos.liquidationPrice) {
                shouldLiquidate = true;
            } else if (pos.type === 'sell' && currentPrice >= pos.liquidationPrice) {
                shouldLiquidate = true;
            }

            if (shouldLiquidate) {
                console.log(`Liquidating position ${pos.id} for ${pos.instrumentName}`);
                // Force close
                try {
                    await closePosition(uid, pos);
                } catch (error) {
                    console.error(`Liquidation failed for position ${pos.id}:`, error);
                }
                // Note: closePosition currently returns margin+pnl. 
                // If liquidated, PnL is approx -margin (loss of collateral).
                // The implementation of closePosition needs to handle this naturally.
                // Or we can create a specific liquidatePosition function.
            }
        }
    },

    closePosition: async (uid, position) => {
        const { prices } = get();
        if (position.status !== 'open') throw new Error('Only open positions can be closed');
        const priceData = prices[position.instrument];
        if (!priceData) throw new Error('Live price unavailable. Please try again.');
        ensureFinitePositive(position.entryPrice, 'entry price');
        ensureFinitePositive(position.quantity, 'quantity');

        const exitPrice = priceData.price;
        ensureFinitePositive(exitPrice, 'exit price');

        let rawPnl: number;

        // PnL = (Exit - Entry) * Quantity * (1 if Buy else -1)
        // Quantity = (Margin * Leverage) / Entry

        if (position.type === 'buy') {
            rawPnl = (exitPrice - position.entryPrice) * position.quantity;
        } else {
            rawPnl = (position.entryPrice - exitPrice) * position.quantity;
        }
        const pnl = clampPnlToIsolatedMargin(rawPnl, position.size);

        const trade: Trade = {
            instrument: position.instrument,
            instrumentName: position.instrumentName,
            type: position.type,
            entryPrice: position.entryPrice,
            exitPrice,
            size: position.size,
            leverage: position.leverage,
            pnl,
            closedAt: Date.now(),
        };

        try {
            // Save trade to Firestore
            const tradeRef = await addDoc(collection(getDb(), 'users', uid, 'trades'), trade);
            trade.id = tradeRef.id;

            // Remove position from Firestore
            if (position.id) {
                await deleteDoc(doc(getDb(), 'users', uid, 'positions', position.id));
            }

            // Update balance
            // New Balance = Old Balance + Returned Margin + PnL
            // (Margin was deducted on entry)
            const currentBalance = get().balance;
            const newBalance = currentBalance + position.size + pnl;

            await updateDoc(doc(getDb(), 'users', uid), {
                balance: newBalance,
                portfolioValue: newBalance, // Simplified, should strictly be Balance + Unrealized PnL of other pos
            });

            // Update leaderboard
            const userDoc = await getDoc(doc(getDb(), 'users', uid));
            const userData = userDoc.data();
            if (userData) {
                const percentReturn = ((newBalance - 100000) / 100000) * 100;
                // re-update portfolio value just in case
                await updateDoc(doc(getDb(), 'users', uid), { portfolioValue: newBalance });
                try {
                    const leaderRef = doc(getDb(), 'leaderboard', uid);
                    const leaderSnap = await getDoc(leaderRef);
                    const leaderData = {
                        displayName: userData.displayName || 'Trader',
                        portfolioValue: newBalance,
                        percentReturn,
                        lastUpdated: serverTimestamp(),
                    };
                    if (leaderSnap.exists()) {
                        await updateDoc(leaderRef, leaderData);
                    } else {
                        await setDoc(leaderRef, leaderData);
                    }
                } catch (err) {
                    console.error('Leaderboard update failed:', err);
                }
            }

            set((state) => ({
                positions: state.positions.filter((p) => p.id !== position.id),
                trades: [...state.trades, trade],
                balance: newBalance,
            }));
        } catch (error) {
            console.error('Failed to close position:', error);
            throw new Error(parseFirebaseError(error, 'Could not close position. Please try again.'));
        }
    },

    loadUserData: async (uid) => {
        set({ loading: true });
        try {
            await ensureUserAccountDoc(uid);

            // Load user balance
            const userDoc = await getDoc(doc(getDb(), 'users', uid));
            const userData = userDoc.data();

            // Load positions
            const posSnap = await getDocs(
                query(collection(getDb(), 'users', uid, 'positions'), where('status', 'in', ['open', 'pending']))
            );
            const positions: Position[] = posSnap.docs.map((d) => ({
                id: d.id,
                ...d.data(),
            })) as Position[];

            // Load trades
            const tradeSnap = await getDocs(collection(getDb(), 'users', uid, 'trades'));
            const trades: Trade[] = tradeSnap.docs.map((d) => ({
                id: d.id,
                ...d.data(),
            })) as Trade[];

            set({
                balance: userData?.balance || 100000,
                positions,
                trades: trades.sort((a, b) => b.closedAt - a.closedAt),
                loading: false,
            });
        } catch (err) {
            console.error('Failed to load user data:', err);
            set({ loading: false });
        }
    },

    resetAccount: async (uid) => {
        const { positions } = get();

        try {
            await ensureUserAccountDoc(uid);

            // Delete all positions
            for (const pos of positions) {
                if (pos.id) {
                    await deleteDoc(doc(getDb(), 'users', uid, 'positions', pos.id));
                }
            }

            // Delete all trades
            const tradeSnap = await getDocs(collection(getDb(), 'users', uid, 'trades'));
            for (const d of tradeSnap.docs) {
                await deleteDoc(d.ref);
            }

            // Reset user data
            const userDoc = await getDoc(doc(getDb(), 'users', uid));
            const resetCount = (userDoc.data()?.resetCount || 0) + 1;

            await updateDoc(doc(getDb(), 'users', uid), {
                balance: 100000,
                portfolioValue: 100000,
                resetCount,
            });

            set({
                positions: [],
                trades: [],
                balance: 100000,
            });
        } catch (error) {
            console.error('Failed to reset account:', error);
            throw new Error(parseFirebaseError(error, 'Could not reset account. Please try again.'));
        }
    },
}));
