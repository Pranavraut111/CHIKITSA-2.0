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

/* ═══════════════════ SHARED PLANS ═══════════════════ */

export async function sharePublicPlan(plan: SharedPlan) {
    await setDoc(doc(db, "sharedPlans", plan.id), plan);
}

export async function getSharedPlans(): Promise<SharedPlan[]> {
    const q = query(collection(db, "sharedPlans"), orderBy("sharedAt", "desc"), limit(20));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as SharedPlan));
}
