import Link from 'next/link';
import styles from './page.module.css';
import { INSTRUMENTS } from '@/lib/market-api';
import ContactForm from '@/components/ContactForm';
import MouseGlow from '@/components/MouseGlow';

export default function HomePage() {
  return (
    <>
      <section className={styles.hero}>
        <MouseGlow />
        <div className={styles.heroBg} />
        <div className={styles.heroContent}>
          <h1 className={styles.heroTitle}>
            Master the Markets,{' '}
            <span className={styles.heroAccent}>Risk Free</span>
          </h1>
          <p className={styles.heroSub}>
            Trade forex, crypto, and indices with $100,000 in virtual funds.
            Real prices, real charts, zero risk.
          </p>
          <div className={styles.heroCtas}>
            <Link href="/trade" className="btn btn-primary btn-lg">
              Start Trading
            </Link>
            <Link href="/academy" className="btn btn-secondary btn-lg">
              Learn Trading
            </Link>
          </div>
        </div>
      </section>

      <section className={styles.stats}>
        <div className={styles.statsGrid}>
          <div className={styles.statItem}>
            <h3>8</h3>
            <p>Instruments</p>
          </div>
          <div className={styles.statItem}>
            <h3>$100K</h3>
            <p>Starting Balance</p>
          </div>
          <div className={styles.statItem}>
            <h3>3</h3>
            <p>Asset Classes</p>
          </div>
          <div className={styles.statItem}>
            <h3>∞</h3>
            <p>Free Resets</p>
          </div>
        </div>
      </section>

      <section className={styles.instruments}>
        <h2 className={styles.instrumentsTitle}>Trade Real Markets</h2>
        <p className={styles.instrumentsSub}>Access live pricing across forex, crypto, and major indices</p>
        <div className={styles.instrumentGrid}>
          {INSTRUMENTS.map((inst) => (
            <div key={inst.id} className={styles.instrumentCard}>
              <p className={styles.instrumentLabel}>{inst.category}</p>
              <p className={styles.instrumentName}>{inst.name}</p>
              <p className={styles.instrumentSymbol}>{inst.symbol}</p>
            </div>
          ))}
        </div>
      </section>
      <section className={styles.contact}>
        <div className="container">
          <h2 className={styles.contactTitle}>Partner with ForeXA</h2>
          <p className={styles.contactSub}>
            Looking to sponsor the next generation of traders? Connect with us to explore partnership opportunities and reach a dedicated community of finance enthusiasts.
          </p>
          <ContactForm />
        </div>
      </section>
    </>
  );
}
