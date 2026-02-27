import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useGamification } from "../contexts/GamificationContext";
import { generateMealPlan } from "../lib/gemini";
import { saveMealPlan, getMealPlan } from "../lib/firestore";
import type { DailyMealPlan } from "../lib/types";

const MEALS = ["breakfast", "lunch", "dinner", "snack"] as const;

export default function DashboardPage() {
    const { profile, user } = useAuth();
    const { streak, challenges } = useGamification();
    const [meals, setMeals] = useState<DailyMealPlan | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const todayStr = new Date().toISOString().split("T")[0];

    useEffect(() => {
        async function loadSaved() {
            if (!user) return;
            const saved = await getMealPlan(user.uid, todayStr);
            if (saved) setMeals(saved);
        }
        loadSaved();
    }, [user, todayStr]);

    async function generate() {
        if (!user || !profile) return;
        setLoading(true); setError("");
        try {
            const ctx = `Name:${profile.name}, Age:${profile.age}, Gender:${profile.gender}, Weight:${profile.weight}kg, Height:${profile.height}cm, BMI:${profile.bmi}, Goal:${profile.goal}, Activity:${profile.activityLevel}, Diet:${profile.dietType}, Allergies:${(profile.allergies || []).join(",") || "None"}, Dislikes:${(profile.foodDislikes || []).join(",") || "None"}, Cuisines:${(profile.cuisinePreference || []).join(",") || "Any"}, Medical:${(profile.medicalConditions || []).join(",") || "None"}, Budget:₹${profile.weeklyBudget}/week, Location:${profile.location}`;
            const raw = await generateMealPlan(ctx);
            const cleaned = raw.replace(/```json\n?|```\n?/g, "").trim();
            const parsed = JSON.parse(cleaned);
            await saveMealPlan(user.uid, todayStr, parsed);
            setMeals(parsed);
        } catch (e: any) { setError(e.message || "Could not generate meals."); }
        setLoading(false);
    }

    const totalCal = meals ? MEALS.reduce((a, t) => a + ((meals as any)[t]?.calories || 0), 0) : 0;
    const calTarget = profile?.goal === "lose" ? 1800 : profile?.goal === "gain" ? 2500 : 2100;
    const activeChallenges = challenges.filter(c => !c.completed);

    const greeting = (() => {
        const h = new Date().getHours();
        return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
    })();

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                    {greeting}, {profile?.name?.split(" ")[0] || "there"}
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                    {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
                </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                    { label: "BMI", value: profile?.bmi || "—", sub: profile?.bmi ? (profile.bmi < 18.5 ? "Underweight" : profile.bmi < 25 ? "Normal" : "Overweight") : "" },
                    { label: "Goal", value: profile?.goal === "lose" ? "Lose" : profile?.goal === "gain" ? "Gain" : "Maintain", sub: `${calTarget} kcal target` },
                    { label: "Today", value: `${totalCal}`, sub: `of ${calTarget} kcal` },
                    { label: "Streak", value: `🔥 ${streak}`, sub: streak > 0 ? `${streak} day${streak > 1 ? "s" : ""} logging` : "Start logging!" },
                ].map((s) => (
                    <div key={s.label} className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-100 dark:border-slate-800">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">{s.label}</p>
                        <p className="text-xl font-bold text-slate-900 dark:text-white">{s.value}</p>
                        <p className="text-[11px] text-slate-400 dark:text-slate-500">{s.sub}</p>
                    </div>
                ))}
            </div>

            {/* Quick actions */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button onClick={generate} disabled={loading}
                    className="bg-green-600 hover:bg-green-700 text-white rounded-xl p-4 text-left transition-colors disabled:opacity-50">
                    <svg className="w-5 h-5 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    <p className="text-sm font-semibold">{loading ? "Generating..." : "Generate Meal Plan"}</p>
                    <p className="text-xs text-green-200 mt-0.5">AI-powered daily plan with recipes</p>
                </button>
                <Link to="/log" className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl p-4 text-left hover:border-slate-200 dark:hover:border-slate-700 transition-colors">
                    <svg className="w-5 h-5 mb-2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Log a Meal</p>
                    <p className="text-xs text-slate-400 mt-0.5">Track what you ate</p>
                </Link>
                <Link to="/challenges" className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl p-4 text-left hover:border-slate-200 dark:hover:border-slate-700 transition-colors">
                    <svg className="w-5 h-5 mb-2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Challenges</p>
                    <p className="text-xs text-slate-400 mt-0.5">{activeChallenges.length} active</p>
                </Link>
            </div>

            {error && <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3 text-sm text-red-600 dark:text-red-400">{error}</div>}

            {/* Today's meals */}
            {meals && (
                <div>
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Today's Plan</h2>
                        <Link to="/meals" className="text-xs font-semibold text-green-600 dark:text-green-400 hover:underline">View full plan →</Link>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {MEALS.map((type) => {
                            const m = (meals as any)[type];
                            if (!m) return null;
                            return (
                                <div key={type} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 p-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-[10px] font-bold uppercase tracking-widest text-green-600 dark:text-green-400">{type}</span>
                                        <span className="text-xs font-bold text-slate-500 dark:text-slate-400">{m.calories} kcal</span>
                                    </div>
                                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1">{m.name}</p>
                                    <div className="flex gap-3 text-[11px] text-slate-400 dark:text-slate-500">
                                        <span>P: {m.protein}g</span><span>C: {m.carbs}g</span><span>F: {m.fats}g</span>
                                    </div>
                                    {m.prepTime && <p className="text-[10px] text-slate-400 mt-1">⏱ {m.prepTime} prep · {m.cookTime} cook</p>}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {!meals && !loading && !error && (
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 p-8 text-center">
                    <svg className="w-10 h-10 mx-auto mb-3 text-slate-300 dark:text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">No meal plan for today</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mb-4">Click "Generate Meal Plan" above to get started</p>
                </div>
            )}
        </div>
    );
}
