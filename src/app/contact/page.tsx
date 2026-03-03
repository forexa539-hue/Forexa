import styles from '../about/legal.module.css';

export default function ContactPage() {
    return (
        <div className={styles.legalPage}>
            <div className={styles.content}>
                <h1>Contact Us</h1>
                <p className={styles.intro}>
                    Have questions, feedback, or need support? We&apos;d love to hear from you.
                </p>

                <h2>Get in Touch</h2>
                <p>
                    Email us at <a href="mailto:support@forexa.app">support@forexa.app</a> and we&apos;ll get back to you within 24 hours.
                </p>

                <h2>Feedback</h2>
                <p>
                    ForexA is constantly evolving. Your feedback helps us build a better platform for traders worldwide.
                    Let us know what features you&apos;d like to see or how we can improve your experience.
                </p>

                <h2>Bug Reports</h2>
                <p>
                    Found a bug? Please email us with a description of the issue, steps to reproduce it,
                    and your browser/device information. Screenshots are always helpful.
                </p>
            </div>
        </div>
    );
}
