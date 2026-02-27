import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import {
    onAuthStateChanged,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    sendPasswordResetEmail,
} from "firebase/auth";
import type { User } from "firebase/auth";
import { auth } from "../lib/firebase";
import { getUserProfile, createUserProfile } from "../lib/firestore";
import type { UserProfile } from "../lib/types";

interface AuthState {
    user: User | null;
    profile: UserProfile | null;
    loading: boolean;
    login: (email: string, password: string) => Promise<void>;
    signup: (email: string, password: string, name: string) => Promise<void>;
    logout: () => Promise<void>;
    resetPassword: (email: string) => Promise<void>;
    refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthState>({} as AuthState);

export function useAuth() {
    return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);

    /* Watch auth state */
    useEffect(() => {
        const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
            setUser(firebaseUser);
            if (firebaseUser) {
                const p = await getUserProfile(firebaseUser.uid);
                setProfile(p);
            } else {
                setProfile(null);
            }
            setLoading(false);
        });
        return unsub;
    }, []);

    async function login(email: string, password: string) {
        await signInWithEmailAndPassword(auth, email, password);
    }

    async function signup(email: string, password: string, name: string) {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        await createUserProfile(cred.user.uid, {
            email: cred.user.email || email,
            name,
        });
    }

    async function logout() {
        await signOut(auth);
        setProfile(null);
    }

    async function resetPassword(email: string) {
        await sendPasswordResetEmail(auth, email);
    }

    async function refreshProfile() {
        if (user) {
            const p = await getUserProfile(user.uid);
            setProfile(p);
        }
    }

    return (
        <AuthContext.Provider
            value={{ user, profile, loading, login, signup, logout, resetPassword, refreshProfile }}
        >
            {children}
        </AuthContext.Provider>
    );
}
