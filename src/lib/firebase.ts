import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '',
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '',
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '',
};

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;

function isConfigured(): boolean {
    return !!(firebaseConfig.apiKey && firebaseConfig.projectId);
}

function getApp(): FirebaseApp {
    if (!app) {
        if (getApps().length > 0) {
            app = getApps()[0];
        } else if (isConfigured()) {
            app = initializeApp(firebaseConfig);
        } else {
            // Return a dummy — will fail gracefully at runtime, not at build time
            app = initializeApp({ ...firebaseConfig, apiKey: 'dummy', projectId: 'dummy' });
        }
    }
    return app;
}

function getAuthInstance(): Auth {
    if (!auth) {
        auth = getAuth(getApp());
    }
    return auth;
}

function getDbInstance(): Firestore {
    if (!db) {
        db = getFirestore(getApp());
    }
    return db;
}

export { getAuthInstance as getAuthInstance, getDbInstance as getDbInstance, isConfigured };

// Lazy getters for backward compatibility
export const lazyAuth = {
    get instance() { return getAuthInstance(); }
};
export const lazyDb = {
    get instance() { return getDbInstance(); }
};
