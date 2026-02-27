import { createContext, useContext, useState, useEffect, useCallback } from "react";
import type { ReactNode } from "react";
import { useAuth } from "./AuthContext";
import {
    getAchievements,
    unlockAchievement,
    getChallenges,
    saveChallenge,
    getPetState,
    savePetState,
    getFoodLogs,
} from "../lib/firestore";
import type { Achievement, Challenge, PetState, FoodLog } from "../lib/types";

/* ═══════════ Achievement Definitions ═══════════ */
export const ACHIEVEMENT_DEFS: Omit<Achievement, "unlockedAt">[] = [
    { id: "iron_will", title: "Iron Will", description: "Log meals for 7 days in a row", icon: "🏆", condition: "7_day_streak" },
    { id: "veggie_voyager", title: "Veggie Voyager", description: "Eat 15 different vegetables in a month", icon: "🥬", condition: "15_veggies" },
    { id: "hydration_hero", title: "Hydration Hero", description: "Log water intake for 14 consecutive days", icon: "💧", condition: "14_day_water" },
    { id: "streak_master", title: "Streak Master", description: "30-day logging streak", icon: "🔥", condition: "30_day_streak" },
    { id: "meal_planner_pro", title: "Meal Planner Pro", description: "Generate 10 meal plans", icon: "🧠", condition: "10_plans" },
    { id: "first_log", title: "First Steps", description: "Log your first meal", icon: "👣", condition: "first_log" },
    { id: "budget_boss", title: "Budget Boss", description: "Stay under weekly budget 4 weeks in a row", icon: "💰", condition: "4_week_budget" },
    { id: "social_butterfly", title: "Social Butterfly", description: "Share your first meal plan", icon: "🦋", condition: "first_share" },
];

/* ═══════════ Challenge Templates ═══════════ */
export const CHALLENGE_TEMPLATES: Omit<Challenge, "id" | "startDate" | "endDate" | "current" | "completed">[] = [
    { title: "No artificial sugar for 2 days", description: "Avoid added sugars for 48 hours", icon: "🚫🍬", target: 2, unit: "days", xpReward: 50 },
    { title: "Eat 5 servings of fruit", description: "Log 5 fruit servings this week", icon: "🍎", target: 5, unit: "servings", xpReward: 30 },
    { title: "Log every meal for 3 days", description: "Don't miss a single meal log", icon: "📝", target: 9, unit: "meals", xpReward: 40 },
    { title: "Try a new cuisine", description: "Cook something from a new cuisine", icon: "🌍", target: 1, unit: "meal", xpReward: 25 },
    { title: "Drink 8 glasses of water", description: "Hit 8 glasses today", icon: "💧", target: 8, unit: "glasses", xpReward: 20 },
    { title: "Cook at home for 5 days", description: "Home-cooked meals for 5 days", icon: "👨‍🍳", target: 5, unit: "days", xpReward: 60 },
];

const DEFAULT_PET: PetState = {
    name: "Chompy",
    happiness: 70,
    xp: 0,
    level: 1,
    lastInteraction: new Date().toISOString(),
    mood: "neutral",
};

interface GamificationState {
    achievements: Achievement[];
    unlockedIds: Set<string>;
    challenges: Challenge[];
    pet: PetState;
    streak: number;
    checkAndUnlock: (conditionId: string) => Promise<void>;
    acceptChallenge: (templateIdx: number) => Promise<void>;
    updateChallengeProgress: (challengeId: string, increment: number) => Promise<void>;
    feedPet: () => Promise<void>;
    refreshGamification: () => Promise<void>;
}

const GamificationContext = createContext<GamificationState>({} as GamificationState);

export function useGamification() {
    return useContext(GamificationContext);
}

export function GamificationProvider({ children }: { children: ReactNode }) {
    const { user } = useAuth();
    const [achievements, setAchievements] = useState<Achievement[]>([]);
    const [unlockedIds, setUnlockedIds] = useState<Set<string>>(new Set());
    const [challenges, setChallenges] = useState<Challenge[]>([]);
    const [pet, setPet] = useState<PetState>(DEFAULT_PET);
    const [streak, setStreak] = useState(0);

    const refreshGamification = useCallback(async () => {
        if (!user) return;
        const [achs, chs, petData] = await Promise.all([
            getAchievements(user.uid),
            getChallenges(user.uid),
            getPetState(user.uid),
        ]);
        setAchievements(achs);
        setUnlockedIds(new Set(achs.filter(a => a.unlockedAt).map(a => a.id)));
        setChallenges(chs);
        if (petData) setPet(petData);

        // Calculate streak
        const logs = await getFoodLogs(user.uid);
        setStreak(calculateStreak(logs));
    }, [user]);

    useEffect(() => {
        refreshGamification();
    }, [refreshGamification]);

    async function checkAndUnlock(conditionId: string) {
        if (!user) return;
        const def = ACHIEVEMENT_DEFS.find(a => a.condition === conditionId);
        if (!def || unlockedIds.has(def.id)) return;
        await unlockAchievement(user.uid, def as Achievement);
        setUnlockedIds(prev => new Set([...prev, def.id]));
        setAchievements(prev => [...prev, { ...def, unlockedAt: new Date().toISOString() }]);
        // Give XP to pet
        const newPet = { ...pet, xp: pet.xp + 25, happiness: Math.min(100, pet.happiness + 10), mood: "excited" as const };
        if (newPet.xp >= newPet.level * 100) { newPet.level++; newPet.xp = newPet.xp - (newPet.level - 1) * 100; }
        setPet(newPet);
        await savePetState(user.uid, newPet);
    }

    async function acceptChallenge(templateIdx: number) {
        if (!user) return;
        const tpl = CHALLENGE_TEMPLATES[templateIdx];
        const now = new Date();
        const end = new Date(now);
        end.setDate(end.getDate() + 7);
        const challenge: Challenge = {
            ...tpl,
            id: `ch_${Date.now()}`,
            startDate: now.toISOString(),
            endDate: end.toISOString(),
            current: 0,
            completed: false,
        };
        await saveChallenge(user.uid, challenge);
        setChallenges(prev => [...prev, challenge]);
    }

    async function updateChallengeProgress(challengeId: string, increment: number) {
        if (!user) return;
        const idx = challenges.findIndex(c => c.id === challengeId);
        if (idx === -1) return;
        const updated = { ...challenges[idx], current: challenges[idx].current + increment };
        if (updated.current >= updated.target) {
            updated.completed = true;
            // Give XP
            const newPet = { ...pet, xp: pet.xp + updated.xpReward, happiness: Math.min(100, pet.happiness + 15), mood: "excited" as const };
            if (newPet.xp >= newPet.level * 100) { newPet.level++; newPet.xp = newPet.xp - (newPet.level - 1) * 100; }
            setPet(newPet);
            await savePetState(user.uid, newPet);
        }
        await saveChallenge(user.uid, updated);
        setChallenges(prev => prev.map((c, i) => i === idx ? updated : c));
    }

    async function feedPet() {
        if (!user) return;
        const newPet = {
            ...pet,
            happiness: Math.min(100, pet.happiness + 5),
            lastInteraction: new Date().toISOString(),
            mood: "happy" as const,
        };
        setPet(newPet);
        await savePetState(user.uid, newPet);
    }

    return (
        <GamificationContext.Provider value={{
            achievements, unlockedIds, challenges, pet, streak,
            checkAndUnlock, acceptChallenge, updateChallengeProgress, feedPet, refreshGamification,
        }}>
            {children}
        </GamificationContext.Provider>
    );
}

/* ═══════════ Helper ═══════════ */

function calculateStreak(logs: FoodLog[]): number {
    if (logs.length === 0) return 0;
    const dates = [...new Set(logs.map(l => l.timestamp?.split("T")[0]).filter(Boolean))].sort().reverse();
    let streak = 0;
    const today = new Date().toISOString().split("T")[0];
    let expected = today;
    for (const d of dates) {
        if (d === expected) {
            streak++;
            const prev = new Date(expected);
            prev.setDate(prev.getDate() - 1);
            expected = prev.toISOString().split("T")[0];
        } else if (d < expected) {
            break;
        }
    }
    return streak;
}
