'use client';

import { useEffect, useState } from 'react';
import { fetchMarketNews, NewsArticle } from '@/lib/news-api';
import styles from './news.module.css';

const CATEGORIES = [
    { key: '', label: 'All' },
    { key: 'forex', label: 'Forex' },
    { key: 'crypto', label: 'Crypto' },
    { key: 'indices', label: 'Indices' },
];

export default function NewsPage() {
    const [articles, setArticles] = useState<NewsArticle[]>([]);
    const [category, setCategory] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let active = true;
        setLoading(true);
        fetchMarketNews(category || undefined).then((data) => {
            if (active) {
                setArticles(data);
                setLoading(false);
            }
        });
        return () => { active = false; };
    }, [category]);

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    return (
        <div className={styles.newsPage}>
            <div className="page-header">
                <h1>Market News</h1>
                <p>Stay updated with the latest market movements</p>
            </div>

            <div className={styles.filters}>
                <div className="tabs">
                    {CATEGORIES.map((cat) => (
                        <button
                            key={cat.key}
                            className={`tab ${category === cat.key ? 'active' : ''}`}
                            onClick={() => setCategory(cat.key)}
                        >
                            {cat.label}
                        </button>
                    ))}
                </div>
            </div>

            {loading ? (
                <div className={styles.loading}>Loading news...</div>
            ) : (
                <div className={styles.grid}>
                    {articles.map((article, i) => (
                        <div key={i} className={styles.newsCard}>
                            <div className={styles.newsContent}>
                                <div className={styles.newsMeta}>
                                    <span className={styles.newsSource}>{article.source}</span>
                                    <span className={styles.newsDate}>{formatDate(article.publishedAt)}</span>
                                    <span className={styles.newsCategory}>{article.category}</span>
                                </div>
                                <h3>
                                    <a href={article.url} target="_blank" rel="noopener noreferrer">
                                        {article.title}
                                    </a>
                                </h3>
                                <p>{article.description}</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
