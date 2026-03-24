'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import {
    createChart,
    CandlestickSeries,
    LineSeries,
    AreaSeries,
    HistogramSeries,
} from 'lightweight-charts';
import type { IChartApi, ISeriesApi, CandlestickData, LineData, Time } from 'lightweight-charts';
import { Instrument, fetchOHLCV, OHLCVData } from '@/lib/market-api';
import styles from './TradingChart.module.css';

type ChartType = 'candlestick' | 'line' | 'area';
type Timeframe = '1m' | '5m' | '15m' | '1h' | '1d';
type IndicatorType = 'SMA' | 'EMA' | 'RSI';

interface TradingChartProps {
    instrument: Instrument;
    currentPrice?: number;
}

// Indicator Calculation Helpers
function calculateSMA(data: OHLCVData[], period: number): LineData[] {
    const result: LineData[] = [];
    for (let i = 0; i < data.length; i++) {
        if (i < period - 1) continue;
        let sum = 0;
        for (let j = 0; j < period; j++) {
            sum += data[i - j].close;
        }
        result.push({
            time: data[i].time as Time,
            value: sum / period,
        });
    }
    return result;
}

function calculateEMA(data: OHLCVData[], period: number): LineData[] {
    const result: LineData[] = [];
    const k = 2 / (period + 1);
    let ema = data[0].close;

    // Initial SMA for first EMA point? Or just start from 0? 
    // Standard is usually SMA of first 'period' elements, then EMA.
    // Simplifying: Start EMA from first close (approx) or properly calculate first SMA.
    // Proper way:
    if (data.length < period) return [];

    let sum = 0;
    for (let i = 0; i < period; i++) sum += data[i].close;
    ema = sum / period;

    result.push({ time: data[period - 1].time as Time, value: ema });

    for (let i = period; i < data.length; i++) {
        ema = data[i].close * k + ema * (1 - k);
        result.push({
            time: data[i].time as Time,
            value: ema,
        });
    }
    return result;
}

function calculateRSI(data: OHLCVData[], period: number = 14): LineData[] {
    const result: LineData[] = [];
    if (data.length <= period) return result;

    let gains = 0;
    let losses = 0;

    // First RSI
    for (let i = 1; i <= period; i++) {
        const change = data[i].close - data[i - 1].close;
        if (change > 0) gains += change;
        else losses += Math.abs(change);
    }

    let avgGain = gains / period;
    let avgLoss = losses / period;

    for (let i = period + 1; i < data.length; i++) {
        const change = data[i].close - data[i - 1].close;
        let gain = 0;
        let loss = 0;
        if (change > 0) gain = change;
        else loss = Math.abs(change);

        avgGain = (avgGain * (period - 1) + gain) / period;
        avgLoss = (avgLoss * (period - 1) + loss) / period;

        const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
        const rsi = 100 - (100 / (1 + rs));

        result.push({
            time: data[i].time as Time,
            value: rsi,
        });
    }
    return result;
}

export default function TradingChart({ instrument, currentPrice }: TradingChartProps) {
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<IChartApi | null>(null);
    const mainSeriesRef = useRef<ISeriesApi<'Candlestick' | 'Line' | 'Area'> | null>(null);
    const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);
    // Refs for indicator series to update them with live data if needed (skipping live update for simplicity for now)
    const indicatorsRef = useRef<Map<string, ISeriesApi<'Line'>>>(new Map());
    const lastCandleRef = useRef<CandlestickData | null>(null);

    const [chartType, setChartType] = useState<ChartType>('candlestick');
    const [timeframe, setTimeframe] = useState<Timeframe>('1h');
    const [activeIndicators, setActiveIndicators] = useState<Set<IndicatorType>>(new Set());
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const toggleIndicator = (ind: IndicatorType) => {
        const next = new Set(activeIndicators);
        if (next.has(ind)) next.delete(ind);
        else next.add(ind);
        setActiveIndicators(next);
    };

    const buildChart = useCallback(async () => {
        if (!chartContainerRef.current) return;

        // Cleanup previous chart
        if (chartRef.current) {
            chartRef.current.remove();
            chartRef.current = null;
            mainSeriesRef.current = null;
            volumeSeriesRef.current = null;
            indicatorsRef.current.clear();
        }

        setLoading(true);
        setError(null);

        const chart = createChart(chartContainerRef.current, {
            layout: {
                background: { color: '#141414' },
                textColor: '#a3a3a3',
                fontSize: 12,
            },
            grid: {
                vertLines: { color: '#1e1e1e' },
                horzLines: { color: '#1e1e1e' },
            },
            crosshair: {
                vertLine: { color: '#333', width: 1, style: 2 },
                horzLine: { color: '#333', width: 1, style: 2 },
            },
            rightPriceScale: {
                borderColor: '#262626',
                visible: true,
            },
            timeScale: {
                borderColor: '#262626',
                timeVisible: true,
                secondsVisible: false,
            },
            width: chartContainerRef.current.clientWidth,
            height: 450,
        });

        chartRef.current = chart;

        // Fetch data
        let data: OHLCVData[] = [];
        try {
            data = await fetchOHLCV(instrument, timeframe);
        } catch (err: unknown) {
            console.error('Failed to fetch chart data:', err);
            setError(err instanceof Error ? err.message : 'Failed to load chart data');
            setLoading(false);
            return;
        }

        if (chartRef.current !== chart) return;

        if (data.length === 0) {
            setLoading(false);
            return;
        }

        // Layout Config based on indicators
        // If RSI is active, we need a separate pane logic or just overlay with scale margins
        // Lightweight charts supports multiple panes if we use multiple charts or tricky scaling.
        // Easiest "pane" emulation:
        // Main Series: scaleMargins { top: 0.05, bottom: 0.3 }
        // Volume: { top: 0.8, bottom: 0 }
        // RSI: { top: 0.75, bottom: 0 } with a separate scaleId

        const hasRSI = activeIndicators.has('RSI');

        // --- Main Series ---
        // Basic configuration
        let mainSeries: ISeriesApi<'Candlestick' | 'Line' | 'Area'>;

        if (chartType === 'candlestick') {
            mainSeries = chart.addSeries(CandlestickSeries, {
                upColor: '#10b981',
                downColor: '#ef4444',
                borderUpColor: '#10b981',
                borderDownColor: '#ef4444',
                wickUpColor: '#10b981',
                wickDownColor: '#ef4444',
            });
            mainSeries.setData(data.map((d) => ({
                time: d.time as Time,
                open: d.open,
                high: d.high,
                low: d.low,
                close: d.close,
            })));
            if (data.length > 0) {
                lastCandleRef.current = {
                    time: data[data.length - 1].time as Time,
                    open: data[data.length - 1].open,
                    high: data[data.length - 1].high,
                    low: data[data.length - 1].low,
                    close: data[data.length - 1].close,
                };
            }
        } else if (chartType === 'line') {
            mainSeries = chart.addSeries(LineSeries, { color: '#10b981', lineWidth: 2 });
            mainSeries.setData(data.map((d) => ({ time: d.time as Time, value: d.close })));
        } else {
            mainSeries = chart.addSeries(AreaSeries, {
                lineColor: '#10b981',
                topColor: 'rgba(16, 185, 129, 0.3)',
                bottomColor: 'rgba(16, 185, 129, 0.01)',
                lineWidth: 2,
            });
            mainSeries.setData(data.map((d) => ({ time: d.time as Time, value: d.close })));
        }

        // Adjust main series margins to make room for RSI if needed
        mainSeries.priceScale().applyOptions({
            scaleMargins: {
                top: 0.05,
                bottom: hasRSI ? 0.30 : 0.15, // Leave room at bottom
            },
        });

        mainSeriesRef.current = mainSeries;

        // --- Volume ---
        const volumeSeries = chart.addSeries(HistogramSeries, {
            color: '#26a69a',
            priceFormat: { type: 'volume' },
            priceScaleId: 'volume', // Overlay
        });
        volumeSeries.priceScale().applyOptions({
            scaleMargins: { top: hasRSI ? 0.75 : 0.85, bottom: 0 },
        });
        volumeSeries.setData(data.map((d) => ({
            time: d.time as Time,
            value: d.volume,
            color: d.close >= d.open ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)',
        })));
        volumeSeriesRef.current = volumeSeries;

        // --- Indicators ---

        // SMA (20)
        if (activeIndicators.has('SMA')) {
            const smaData = calculateSMA(data, 20);
            const smaSeries = chart.addSeries(LineSeries, {
                color: '#3b82f6', // Blue
                lineWidth: 2,
                title: 'SMA 20',
                priceScaleId: 'right', // Same scale as price
            });
            smaSeries.setData(smaData);
            indicatorsRef.current.set('SMA', smaSeries);
        }

        // EMA (20)
        if (activeIndicators.has('EMA')) {
            const emaData = calculateEMA(data, 20);
            const emaSeries = chart.addSeries(LineSeries, {
                color: '#f59e0b', // Yellow/Orange
                lineWidth: 2,
                title: 'EMA 20',
                priceScaleId: 'right', // Same scale as price
            });
            emaSeries.setData(emaData);
            indicatorsRef.current.set('EMA', emaSeries);
        }

        // RSI (14)
        if (hasRSI) {
            const rsiData = calculateRSI(data, 14);
            const rsiSeries = chart.addSeries(LineSeries, {
                color: '#bfdbfe', // Light Blue
                lineWidth: 2,
                priceScaleId: 'rsi',
                title: 'RSI 14',
            });

            // Configure RSI Scale
            chart.priceScale('rsi').applyOptions({
                scaleMargins: {
                    top: 0.75, // Start at 75% down
                    bottom: 0,
                },
                visible: true,
            });

            // Add RSI bounds (70/30 lines) - lightweight charts doesn't have horizontal lines distinct from grid easily
            // We can add a baseline series or just trust the scale user.

            rsiSeries.setData(rsiData);
            indicatorsRef.current.set('RSI', rsiSeries);
        }

        chart.timeScale().fitContent();
        setLoading(false);
    }, [instrument, chartType, timeframe, activeIndicators]);

    useEffect(() => {
        const indicators = indicatorsRef.current;
        const buildTimer = window.setTimeout(() => {
            void buildChart();
        }, 0);

        const handleResize = () => {
            if (chartContainerRef.current && chartRef.current) {
                chartRef.current.applyOptions({ width: chartContainerRef.current.clientWidth });
            }
        };

        window.addEventListener('resize', handleResize);

        return () => {
            window.clearTimeout(buildTimer);
            window.removeEventListener('resize', handleResize);
            if (chartRef.current) {
                chartRef.current.remove();
                chartRef.current = null;
                mainSeriesRef.current = null;
                volumeSeriesRef.current = null;
                indicators.clear();
            }
        };
    }, [buildChart]);

    // Track last candle to correctly update High/Low/Close
    // lastCandleRef is already defined at top of component

    // Update lastCandleRef when data is loaded
    useEffect(() => {
        // We can't easily extract data from chart, so we need to capture it when we build the chart.
        // But buildChart is async. 
        // Let's rely on the buildChart to set it? 
        // Better: logic inside buildChart sets it.
    }, []);

    // ... inside buildChart ... 
    // After setData:
    // if (data.length > 0) lastCandleRef.current = data[data.length - 1] as CandlestickData;

    // Helper to snap time
    const getSnappedTime = (timeframe: Timeframe): number => {
        const now = Math.floor(Date.now() / 1000);
        const map: Record<Timeframe, number> = {
            '1m': 60,
            '5m': 300,
            '15m': 900,
            '1h': 3600,
            '1d': 86400,
        };
        const interval = map[timeframe] || 3600;
        return Math.floor(now / interval) * interval;
    };

    // Live price update
    useEffect(() => {
        if (!currentPrice || !mainSeriesRef.current || !volumeSeriesRef.current) return;

        const now = getSnappedTime(timeframe) as Time;

        if (chartType === 'candlestick') {
            const candle = lastCandleRef.current;

            if (candle && (candle.time as number) === (now as number)) {
                // Update existing candle
                const newCandle = {
                    ...candle,
                    close: currentPrice,
                    high: Math.max(candle.high, currentPrice),
                    low: Math.min(candle.low, currentPrice),
                };
                mainSeriesRef.current.update(newCandle);
                lastCandleRef.current = newCandle;
            } else {
                // New candle
                const newCandle = {
                    time: now,
                    open: currentPrice,
                    high: currentPrice,
                    low: currentPrice,
                    close: currentPrice,
                };
                mainSeriesRef.current.update(newCandle);
                lastCandleRef.current = newCandle;
            }
        } else {
            // For line/area, we can just update. 
            // IMPORTANT: LineSeries update also replaces if time is same.
            mainSeriesRef.current.update({
                time: now,
                value: currentPrice,
            });
        }
    }, [currentPrice, chartType, timeframe]);

    const TIMEFRAMES: Timeframe[] = ['1m', '5m', '15m', '1h', '1d'];
    const CHART_TYPES: { key: ChartType; label: string }[] = [
        { key: 'candlestick', label: 'Candle' },
        { key: 'line', label: 'Line' },
        { key: 'area', label: 'Area' },
    ];
    const INDICATORS: IndicatorType[] = ['SMA', 'EMA', 'RSI'];

    return (
        <div className={styles.chartWrapper}>
            <div className={styles.chartHeader}>
                <div className={styles.chartControls}>
                    <div className="tabs">
                        {TIMEFRAMES.map((tf) => (
                            <button
                                key={tf}
                                className={`tab ${timeframe === tf ? 'active' : ''}`}
                                onClick={() => setTimeframe(tf)}
                            >
                                {tf}
                            </button>
                        ))}
                    </div>
                    <div className="tabs">
                        {CHART_TYPES.map((ct) => (
                            <button
                                key={ct.key}
                                className={`tab ${chartType === ct.key ? 'active' : ''}`}
                                onClick={() => setChartType(ct.key)}
                            >
                                {ct.label}
                            </button>
                        ))}
                    </div>
                    <div className="tabs">
                        {INDICATORS.map((ind) => (
                            <button
                                key={ind}
                                className={`tab ${activeIndicators.has(ind) ? 'active' : ''}`}
                                onClick={() => toggleIndicator(ind)}
                                title={`Toggle ${ind}`}
                            >
                                {ind}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
            <div className={styles.chartContainer} ref={chartContainerRef}>
                {loading && (
                    <div className={styles.chartLoading}>
                        <div className={styles.spinner} />
                        <p>Loading chart data...</p>
                    </div>
                )}
                {error && (
                    <div className={styles.chartError}>
                        <p>{error}</p>
                    </div>
                )}
            </div>
        </div>
    );
}
