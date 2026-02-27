import {
    doc,
    getDoc,
    setDoc,
    updateDoc,
    collection,
    addDoc,
    getDocs,
    query,
    orderBy,
    limit,
} from "firebase/firestore";
import { db } from "./firebase";
import type {
    UserProfile,
    DailyMealPlan,
    FoodLog,
    GroceryItem,
    ChatMessage,
    Achievement,
    Challenge,
    PetState,
    SharedPlan,
} from "./types";

/* ═══════════════════ USER PROFILE ═══════════════════ */

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
    const snap = await getDoc(doc(db, "users", uid));
    return snap.exists() ? (snap.data() as UserProfile) : null;
}

export async function createUserProfile(uid: string, data: Partial<UserProfile>) {
    await setDoc(doc(db, "users", uid), {
        ...data,
        uid,
        onboardingComplete: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    });
}

export async function updateUserProfile(uid: string, data: Partial<UserProfile>) {
    await updateDoc(doc(db, "users", uid), {
        ...data,
        updatedAt: new Date().toISOString(),
    });
}

/* ═══════════════════ MEAL PLANS ═══════════════════ */

export async function saveMealPlan(uid: string, date: string, plan: DailyMealPlan) {
    await setDoc(doc(db, "users", uid, "mealPlans", date), plan);
}

export async function getMealPlan(uid: string, date: string): Promise<DailyMealPlan | null> {
    const snap = await getDoc(doc(db, "users", uid, "mealPlans", date));
    return snap.exists() ? (snap.data() as DailyMealPlan) : null;
}

export async function getMealPlanHistory(uid: string, days: number = 7): Promise<{ date: string; plan: DailyMealPlan }[]> {
    const results: { date: string; plan: DailyMealPlan }[] = [];
    for (let i = 0; i < days; i++) {
        const d = new Date(); d.setDate(d.getDate() - i);
        const ds = d.toISOString().split("T")[0];
        const plan = await getMealPlan(uid, ds);
        if (plan) results.push({ date: ds, plan });
    }
    return results;
}

export async function logMealFromPlan(uid: string, mealType: string, meal: any) {
    await addDoc(collection(db, "users", uid, "foodLogs"), {
        meal: mealType,
        description: meal.name,
        calories: meal.calories || 0,
        protein: meal.protein || 0,
        carbs: meal.carbs || 0,
        fats: meal.fats || 0,
        timestamp: new Date().toISOString(),
    });
}

/* ═══════════════════ FOOD LOGS ═══════════════════ */

export async function addFoodLog(uid: string, log: Omit<FoodLog, "id">) {
    const ref = await addDoc(collection(db, "users", uid, "foodLogs"), log);
    return ref.id;
}

export async function getFoodLogs(uid: string): Promise<FoodLog[]> {
    const q = query(collection(db, "users", uid, "foodLogs"), orderBy("timestamp", "desc"));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as FoodLog));
}

/* ═══════════════════ GROCERY LISTS ═══════════════════ */

export async function saveGroceryList(uid: string, weekId: string, items: GroceryItem[]) {
    await setDoc(doc(db, "users", uid, "groceryLists", weekId), { items, updatedAt: new Date().toISOString() });
}

export async function getGroceryList(uid: string, weekId: string): Promise<GroceryItem[] | null> {
    const snap = await getDoc(doc(db, "users", uid, "groceryLists", weekId));
    return snap.exists() ? (snap.data().items as GroceryItem[]) : null;
}

/* ═══════════════════ CHAT HISTORY ═══════════════════ */

export async function addChatMessage(uid: string, msg: Omit<ChatMessage, "id">) {
    const ref = await addDoc(collection(db, "users", uid, "chatHistory"), msg);
    return ref.id;
}

export async function getChatHistory(uid: string): Promise<ChatMessage[]> {
    const q = query(collection(db, "users", uid, "chatHistory"), orderBy("timestamp", "asc"));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as ChatMessage));
}

/* ═══════════════════ ACHIEVEMENTS ═══════════════════ */

export async function getAchievements(uid: string): Promise<Achievement[]> {
    const snap = await getDocs(collection(db, "users", uid, "achievements"));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Achievement));
}

export async function unlockAchievement(uid: string, achievement: Achievement) {
    await setDoc(doc(db, "users", uid, "achievements", achievement.id), {
        ...achievement,
        unlockedAt: new Date().toISOString(),
    });
}

/* ═══════════════════ CHALLENGES ═══════════════════ */

export async function getChallenges(uid: string): Promise<Challenge[]> {
    const snap = await getDocs(collection(db, "users", uid, "challenges"));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Challenge));
}

export async function saveChallenge(uid: string, challenge: Challenge) {
    await setDoc(doc(db, "users", uid, "challenges", challenge.id), challenge);
}

/* ═══════════════════ PET STATE ═══════════════════ */

export async function getPetState(uid: string): Promise<PetState | null> {
    const snap = await getDoc(doc(db, "users", uid, "gameState", "pet"));
    return snap.exists() ? (snap.data() as PetState) : null;
}

export async function savePetState(uid: string, pet: PetState) {
    await setDoc(doc(db, "users", uid, "gameState", "pet"), pet);
}

/* ═══════════════════ USER LEVEL PERSISTENCE ═══════════════════ */

export async function saveUserLevel(uid: string, level: number, xp: number) {
    await setDoc(doc(db, "users", uid, "gameState", "userLevel"), { level, xp, updatedAt: new Date().toISOString() });
}

export async function getUserLevel(uid: string): Promise<{ level: number; xp: number } | null> {
    const snap = await getDoc(doc(db, "users", uid, "gameState", "userLevel"));
    return snap.exists() ? (snap.data() as { level: number; xp: number }) : null;
}

/* ═══════════════════ SHARED PLANS ═══════════════════ */

export async function sharePublicPlan(plan: SharedPlan) {
    await setDoc(doc(db, "sharedPlans", plan.id), plan);
}

export async function getSharedPlans(): Promise<SharedPlan[]> {
    const q = query(collection(db, "sharedPlans"), orderBy("sharedAt", "desc"), limit(20));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as SharedPlan));
}

/* ═══════════════════ COMMUNITY POSTS ═══════════════════ */

export interface CommunityPost {
    id: string;
    author: string;
    authorAvatar: string;
    authorUid: string;
    content: string;
    type: "text" | "meal_plan" | "achievement" | "photo";
    imageUrl?: string;
    mealPlan?: { date: string; meals: { type: string; name: string; calories: number }[] };
    achievement?: { title: string; icon: string };
    likes: number;
    likedBy: string[];
    comments: { id: string; author: string; content: string; timestamp: string }[];
    timestamp: string;
}

export async function saveCommunityPost(post: CommunityPost) {
    try {
        // Firestore rejects undefined values — strip them before write
        const cleanPost = JSON.parse(JSON.stringify(post));
        await setDoc(doc(db, "communityPosts", post.id), cleanPost);
        console.log("Community post saved:", post.id);
    } catch (err) {
        console.error("Failed to save community post:", err);
        throw err;
    }
}

export async function getCommunityPosts(): Promise<CommunityPost[]> {
    try {
        // Try ordered query first (requires Firestore index)
        const q = query(collection(db, "communityPosts"), orderBy("timestamp", "desc"), limit(50));
        const snap = await getDocs(q);
        return snap.docs.map((d) => ({ id: d.id, ...d.data() } as CommunityPost));
    } catch (err) {
        console.warn("Community orderBy query failed (index may be missing), falling back:", err);
        // Fallback: fetch without ordering, sort client-side
        const snap = await getDocs(collection(db, "communityPosts"));
        const posts = snap.docs.map((d) => ({ id: d.id, ...d.data() } as CommunityPost));
        return posts.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }
}

export async function updateCommunityPost(postId: string, updates: Partial<CommunityPost>) {
    await updateDoc(doc(db, "communityPosts", postId), updates as Record<string, unknown>);
}
