'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import styles from './login.module.css';

export default function LoginPage() {
    const { signIn, signUp, signInWithGoogle } = useAuth();
    const router = useRouter();

    const [isSignUp, setIsSignUp] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            if (isSignUp) {
                await signUp(email, password, displayName || 'Trader');
            } else {
                await signIn(email, password);
            }
            router.push('/trade');
        } catch (err: unknown) {
            const firebaseErr = err as { code?: string; message?: string };
            if (firebaseErr.code === 'auth/user-not-found' || firebaseErr.code === 'auth/wrong-password') {
                setError('Invalid email or password');
            } else if (firebaseErr.code === 'auth/email-already-in-use') {
                setError('Email is already registered');
            } else if (firebaseErr.code === 'auth/weak-password') {
                setError('Password must be at least 6 characters');
            } else {
                setError(firebaseErr.message || 'Authentication failed');
            }
        }
        setLoading(false);
    };

    const handleGoogle = async () => {
        setError('');
        try {
            await signInWithGoogle();
            router.push('/trade');
        } catch (err: unknown) {
            const firebaseErr = err as { message?: string };
            setError(firebaseErr.message || 'Google sign-in failed');
        }
    };

    return (
        <div className={styles.loginPage}>
            <div className={styles.loginCard}>
                <h1>{isSignUp ? 'Create Account' : 'Welcome Back'}</h1>
                <p>{isSignUp ? 'Start trading with $100,000 in virtual funds' : 'Sign in to continue trading'}</p>

                {error && <div className={styles.error}>{error}</div>}

                <form className={styles.form} onSubmit={handleSubmit}>
                    {isSignUp && (
                        <div className={styles.field}>
                            <label className="input-label">Display Name</label>
                            <input
                                type="text"
                                className="input"
                                placeholder="Your trading name"
                                value={displayName}
                                onChange={(e) => setDisplayName(e.target.value)}
                            />
                        </div>
                    )}
                    <div className={styles.field}>
                        <label className="input-label">Email</label>
                        <input
                            type="email"
                            className="input"
                            placeholder="you@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>
                    <div className={styles.field}>
                        <label className="input-label">Password</label>
                        <input
                            type="password"
                            className="input"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            minLength={6}
                        />
                    </div>
                    <button type="submit" className={`btn btn-primary ${styles.submitBtn}`} disabled={loading}>
                        {loading ? 'Processing...' : isSignUp ? 'Create Account' : 'Sign In'}
                    </button>
                </form>

                <div className={styles.divider}>or</div>

                <button className={styles.googleBtn} onClick={handleGoogle}>
                    <svg width="18" height="18" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" /><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" /><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" /><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" /></svg>
                    Continue with Google
                </button>

                <div className={styles.toggle}>
                    {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
                    <button onClick={() => { setIsSignUp(!isSignUp); setError(''); }}>
                        {isSignUp ? 'Sign In' : 'Sign Up'}
                    </button>
                </div>
            </div>
        </div>
    );
}
