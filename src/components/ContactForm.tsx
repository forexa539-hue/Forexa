'use client';

import { useState } from 'react';
import { getDbInstance } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import styles from './ContactForm.module.css';

export default function ContactForm() {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        subject: '',
        message: ''
    });
    const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
    const [errorMessage, setErrorMessage] = useState('');

    const validate = () => {
        const name = formData.name.trim();
        const email = formData.email.trim();
        const subject = formData.subject.trim();
        const message = formData.message.trim();

        if (name.length < 2 || name.length > 80) return 'Name must be 2-80 characters';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Enter a valid email address';
        if (subject.length < 3 || subject.length > 120) return 'Subject must be 3-120 characters';
        if (message.length < 10 || message.length > 2000) return 'Message must be 10-2000 characters';
        return '';
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const validationError = validate();
        if (validationError) {
            setStatus('error');
            setErrorMessage(validationError);
            return;
        }

        setStatus('submitting');
        setErrorMessage('');

        try {
            await addDoc(collection(getDbInstance(), 'inquiries'), {
                name: formData.name.trim(),
                email: formData.email.trim(),
                subject: formData.subject.trim(),
                message: formData.message.trim(),
                submittedAt: serverTimestamp(),
                status: 'new'
            });
            setStatus('success');
            setFormData({ name: '', email: '', subject: '', message: '' });
        } catch (error) {
            console.error('Error submitting form:', error);
            setStatus('error');
            setErrorMessage('Something went wrong. Please try again later.');
        }
    };

    return (
        <div className={styles.formContainer}>
            {status === 'success' && (
                <div className={`${styles.message} ${styles.success}`}>
                    Thank you! Your message has been received. We&apos;ll be in touch shortly.
                </div>
            )}
            {status === 'error' && (
                <div className={`${styles.message} ${styles.error}`}>
                    {errorMessage}
                </div>
            )}

            <form onSubmit={handleSubmit}>
                <div className={styles.field}>
                    <label htmlFor="name" className={styles.label}>Name</label>
                    <input
                        type="text"
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        required
                        className={styles.input}
                        placeholder="Your full name"
                    />
                </div>

                <div className={styles.field}>
                    <label htmlFor="email" className={styles.label}>Email Request</label>
                    <input
                        type="email"
                        id="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        required
                        className={styles.input}
                        placeholder="name@company.com"
                    />
                </div>

                <div className={styles.field}>
                    <label htmlFor="subject" className={styles.label}>Subject</label>
                    <input
                        type="text"
                        id="subject"
                        name="subject"
                        value={formData.subject}
                        onChange={handleChange}
                        required
                        className={styles.input}
                        placeholder="Sponsorship / Support / General"
                    />
                </div>

                <div className={styles.field}>
                    <label htmlFor="message" className={styles.label}>Message</label>
                    <textarea
                        id="message"
                        name="message"
                        value={formData.message}
                        onChange={handleChange}
                        required
                        className={styles.textarea}
                        placeholder="How can we help you?"
                    />
                </div>

                <button
                    type="submit"
                    disabled={status === 'submitting'}
                    className={`btn btn-primary ${styles.submitBtn}`}
                >
                    {status === 'submitting' ? 'Sending...' : 'Send Message'}
                </button>
            </form>
        </div>
    );
}
