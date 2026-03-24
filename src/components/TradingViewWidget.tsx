'use client';

import { useEffect, useRef, memo } from 'react';
import { Instrument } from '@/lib/market-api';

interface TradingViewWidgetProps {
    instrument: Instrument;
}

// Maps our instrument IDs to TradingView symbol format
function getTradingViewSymbol(instrument: Instrument): string {
    const symbolMap: Record<string, string> = {
        // Forex
        eurusd: 'FX:EURUSD',
        gbpusd: 'FX:GBPUSD',
        usdjpy: 'FX:USDJPY',
        usdchf: 'FX:USDCHF',
        audusd: 'FX:AUDUSD',
        usdcad: 'FX:USDCAD',
        nzdusd: 'FX:NZDUSD',
        usdinr: 'FX:USDINR',
        eurgbp: 'FX:EURGBP',
        eurjpy: 'FX:EURJPY',
        euraud: 'FX:EURAUD',
        gbpjpy: 'FX:GBPJPY',
        audnzd: 'FX:AUDNZD',
        audcad: 'FX:AUDCAD',
        // Crypto
        btcusd: 'BINANCE:BTCUSDT',
        ethusd: 'BINANCE:ETHUSDT',
        solanausd: 'BINANCE:SOLUSDT',
        // Indices
        sp500: 'AMEX:SPY',
        nasdaq: 'NASDAQ:QQQ',
        dowjones: 'AMEX:DIA',
        nifty50: 'NSE:NIFTY_50',
    };
    return symbolMap[instrument.id] || `FX:${instrument.apiSymbol.replace('/', '')}`;
}

function TradingViewWidget({ instrument }: TradingViewWidgetProps) {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        // Clear previous widget
        container.innerHTML = '';

        const script = document.createElement('script');
        script.src = 'https://s3.tradingview.com/tv.js';
        script.async = true;
        script.onload = () => {
            if (!container) return;

            // Create inner container
            const chartDiv = document.createElement('div');
            chartDiv.id = `tradingview_${instrument.id}_${Date.now()}`;
            chartDiv.style.height = '100%';
            container.appendChild(chartDiv);

            // @ts-expect-error TradingView widget loaded via script tag
            new window.TradingView.widget({
                autosize: true,
                symbol: getTradingViewSymbol(instrument),
                interval: 'D',
                timezone: 'exchange',
                theme: 'dark',
                style: '1',
                locale: 'en',
                toolbar_bg: '#141414',
                enable_publishing: false,
                allow_symbol_change: false,
                hide_top_toolbar: false,
                hide_legend: false,
                save_image: false,
                container_id: chartDiv.id,
                backgroundColor: '#141414',
                gridColor: 'rgba(255, 255, 255, 0.04)',
            });
        };

        container.appendChild(script);

        return () => {
            container.innerHTML = '';
        };
    }, [instrument]);

    return (
        <div
            ref={containerRef}
            style={{
                width: '100%',
                height: '450px',
                background: '#141414',
                borderRadius: '8px',
                overflow: 'hidden',
            }}
        />
    );
}

export default memo(TradingViewWidget);
