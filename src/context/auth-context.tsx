'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import {
    User,
    onAuthStateChanged,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut as firebaseSignOut,
    GoogleAuthProvider,
    signInWithPopup,
    updateProfile,
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { getAuthInstance, getDbInstance, isConfigured } from '@/lib/firebase';

interface AuthContextType {
    user: User | null;
    loading: boolean;
    signIn: (email: string, password: string) => Promise<void>;
    signUp: (email: string, password: string, displayName: string) => Promise<void>;
    signInWithGoogle: () => Promise<void>;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const useAuth = () => useContext(AuthContext);

async function createUserDocument(user: User) {
    if (!isConfigured()) return;
    const db = getDbInstance();
    const userRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
        await setDoc(userRef, {
            displayName: user.displayName || 'Trader',
            email: user.email,
            balance: 100000,
            resetCount: 0,
            friends: [],
            portfolioValue: 100000,
            createdAt: serverTimestamp(),
        });
    }
}

async function ensureUserDocument(user: User) {
    try {
        await createUserDocument(user);
    } catch (error) {
        console.warn('User document sync failed (auth will continue):', error);
    }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!isConfigured()) {
            setLoading(false);
            return;
        }
        const auth = getAuthInstance();
        return onAuthStateChanged(auth, async (user) => {
            setUser(user);
            if (user) {
                await ensureUserDocument(user);
            }
            setLoading(false);
        });
    }, []);

    const signIn = async (email: string, password: string) => {
        const auth = getAuthInstance();
        await signInWithEmailAndPassword(auth, email, password);
    };

    const signUp = async (email: string, password: string, displayName: string) => {
        const auth = getAuthInstance();
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(cred.user, { displayName });
        await ensureUserDocument(cred.user);
    };

    const signInWithGoogle = async () => {
        const auth = getAuthInstance();
        const provider = new GoogleAuthProvider();
        const cred = await signInWithPopup(auth, provider);
        await ensureUserDocument(cred.user);
    };

    const signOut = async () => {
        try {
            const auth = getAuthInstance();
            await firebaseSignOut(auth);
        } catch (error) {
            console.error('Error signing out:', error);
            // Even if network fails, we can consider the user signed out locally for UI purposes
            setUser(null);
        }
    };

    return (
        <AuthContext.Provider value={{ user, loading, signIn, signUp, signInWithGoogle, signOut }}>
            {children}
        </AuthContext.Provider>
    );
}
