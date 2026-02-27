/* ═══════════ Shared TypeScript Interfaces ═══════════ */

export interface UserProfile {
    uid: string;
    email: string;
    name: string;
    age: number;
    gender: "male" | "female" | "other";
    height: number; // cm
    weight: number; // kg
    bmi: number;
    goal: "lose" | "gain" | "maintain";
    activityLevel: "sedentary" | "light" | "moderate" | "active" | "very_active";
    sleepSchedule: string;
    workRoutine: string;
    mealFrequency: number;
    dietType: "vegetarian" | "non_vegetarian" | "vegan" | "eggetarian";
    allergies: string[];
    foodDislikes: string[];
    cuisinePreference: string[];
    medicalConditions: string[];
    weeklyBudget: number;
    monthlyBudget: number;
    location: string;
    onboardingComplete: boolean;
    foodieProfile?: FoodieProfile;
    createdAt: string;
    updatedAt: string;
}

export interface Ingredient {
    item: string;
    quantity: string;
}

export interface Meal {
    name: string;
    ingredients: Ingredient[];
    recipe: string[];           // step-by-step instructions
    prepTime: string;
    cookTime: string;
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
    imageQuery: string;         // search query for dish image
    explanation?: string;
}

export interface DailyMealPlan {
    date: string;
    breakfast: Meal;
    lunch: Meal;
    dinner: Meal;
    snack: Meal;
    totalCalories: number;
}

export interface GroceryItem {
    name: string;
    quantity: string;
    estimatedPrice: number;
    category: string;
    purchased: boolean;
}

export interface FoodLog {
    id: string;
    meal: string;
    description: string;
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
    timestamp: string;
    imageUrl?: string;
}

export interface ChatMessage {
    id: string;
    role: "user" | "assistant";
    content: string;
    timestamp: string;
}

/* ═══════════ Gamification Types ═══════════ */

export interface Achievement {
    id: string;
    title: string;
    description: string;
    icon: string;
    condition: string;
    unlockedAt?: string;
}

export interface Challenge {
    id: string;
    title: string;
    description: string;
    icon: string;
    target: number;
    current: number;
    unit: string;
    startDate: string;
    endDate: string;
    completed: boolean;
    xpReward: number;
}

export interface PetState {
    name: string;
    happiness: number;     // 0-100
    xp: number;
    level: number;
    lastInteraction: string;
    mood: "happy" | "neutral" | "sleepy" | "excited";
}

export interface FoodieProfile {
    type: string;
    emoji: string;
    description: string;
    traits: string[];
    completedAt: string;
}

export interface SharedPlan {
    id: string;
    plan: DailyMealPlan;
    sharedByName: string;
    sharedByUid: string;
    sharedAt: string;
    likes: number;
}
