import {createContext, useCallback, useContext, useMemo, useRef, useState} from 'react';
import {apiClient} from '@skillforge/vite/lib/api';
import type {Course, PaginatedResponse, Streak, User} from '@skillforge/vite/lib/types';

const SESSION_TTL_MS = 10000;

interface CachedValue<T> {
    value: T;
    expiresAt: number;
}

interface UserSessionContextValue {
    user: User | null;
    setUser: (user: User | null) => void;
    getProfile: (forceRefresh?: boolean) => Promise<User | null>;
    getStreak: (forceRefresh?: boolean) => Promise<Streak | null>;
    getEnrolledCourses: (forceRefresh?: boolean) => Promise<Course[]>;
    refreshSession: () => Promise<void>;
    invalidateSessionCache: () => void;
}

const UserSessionContext = createContext<UserSessionContextValue | null>(null);

export function UserSessionProvider({
    initialUser,
    children,
}: {
    initialUser: User | null;
    children: React.ReactNode;
}) {
    const [user, setUser] = useState<User | null>(initialUser);
    const profileCacheRef = useRef<CachedValue<User> | null>(
        initialUser ? {value: initialUser, expiresAt: Date.now() + SESSION_TTL_MS} : null
    );
    const streakCacheRef = useRef<CachedValue<Streak> | null>(null);
    const enrolledCacheRef = useRef<CachedValue<Course[]> | null>(null);

    const profileInFlightRef = useRef<Promise<User | null> | null>(null);
    const streakInFlightRef = useRef<Promise<Streak | null> | null>(null);
    const enrolledInFlightRef = useRef<Promise<Course[]> | null>(null);

    const invalidateSessionCache = useCallback(() => {
        profileCacheRef.current = null;
        streakCacheRef.current = null;
        enrolledCacheRef.current = null;
    }, []);

    const getProfile = useCallback(async (forceRefresh = false): Promise<User | null> => {
        const now = Date.now();
        const cached = profileCacheRef.current;
        if (!forceRefresh && cached && cached.expiresAt > now) {
            return cached.value;
        }
        if (!forceRefresh && profileInFlightRef.current) {
            return profileInFlightRef.current;
        }

        const request = (async () => {
            const profile = await apiClient.getProfile();
            setUser(profile);
            profileCacheRef.current = {value: profile, expiresAt: Date.now() + SESSION_TTL_MS};
            return profile;
        })();
        profileInFlightRef.current = request;
        try {
            return await request;
        } finally {
            profileInFlightRef.current = null;
        }
    }, []);

    const getStreak = useCallback(async (forceRefresh = false): Promise<Streak | null> => {
        const now = Date.now();
        const cached = streakCacheRef.current;
        if (!forceRefresh && cached && cached.expiresAt > now) {
            return cached.value;
        }
        if (!forceRefresh && streakInFlightRef.current) {
            return streakInFlightRef.current;
        }

        const request = (async () => {
            const streak = await apiClient.getStreak();
            streakCacheRef.current = {value: streak, expiresAt: Date.now() + SESSION_TTL_MS};
            return streak;
        })();
        streakInFlightRef.current = request;
        try {
            return await request;
        } finally {
            streakInFlightRef.current = null;
        }
    }, []);

    const getEnrolledCourses = useCallback(async (forceRefresh = false): Promise<Course[]> => {
        const now = Date.now();
        const cached = enrolledCacheRef.current;
        if (!forceRefresh && cached && cached.expiresAt > now) {
            return cached.value;
        }
        if (!forceRefresh && enrolledInFlightRef.current) {
            return enrolledInFlightRef.current;
        }

        const request = (async () => {
            const response: PaginatedResponse<Course> = await apiClient.listEnrolledCourses();
            const courses = response.data || [];
            enrolledCacheRef.current = {value: courses, expiresAt: Date.now() + SESSION_TTL_MS};
            return courses;
        })();
        enrolledInFlightRef.current = request;
        try {
            return await request;
        } finally {
            enrolledInFlightRef.current = null;
        }
    }, []);

    const refreshSession = useCallback(async () => {
        await Promise.all([
            getProfile(true),
            getStreak(true),
            getEnrolledCourses(true),
        ]);
    }, [getEnrolledCourses, getProfile, getStreak]);

    const value = useMemo<UserSessionContextValue>(() => ({
        user,
        setUser,
        getProfile,
        getStreak,
        getEnrolledCourses,
        refreshSession,
        invalidateSessionCache,
    }), [getEnrolledCourses, getProfile, getStreak, invalidateSessionCache, refreshSession, user]);

    return (
        <UserSessionContext.Provider value={value}>
            {children}
        </UserSessionContext.Provider>
    );
}

export function useUserSession(): UserSessionContextValue {
    const ctx = useContext(UserSessionContext);
    if (!ctx) {
        throw new Error('useUserSession must be used within UserSessionProvider');
    }
    return ctx;
}

