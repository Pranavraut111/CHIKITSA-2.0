import { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useGamification } from "../contexts/GamificationContext";
import { generateMealPlan, regenerateSingleMeal } from "../lib/gemini";
import { saveMealPlan, getMealPlan, getMealPlanHistory, logMealFromPlan, getFoodLogs } from "../lib/firestore";
import type { DailyMealPlan, Meal } from "../lib/types";
import { motion, AnimatePresence } from "framer-motion";

const COOK_TIME = [
    { value: "quick", label: "⚡ Under 15 min" },
    { value: "moderate", label: "🍳 15-30 min" },
    { value: "elaborate", label: "👨‍🍳 45+ min" },
];
const SPICE = ["Mild", "Medium", "🌶 Spicy"];
const CUISINES = [
    { value: "indian", label: "🇮🇳 Indian" },
    { value: "south-indian", label: "🥥 South Indian" },
    { value: "chinese", label: "🥡 Chinese" },
    { value: "continental", label: "🍝 Continental" },
    { value: "mexican", label: "🌮 Mexican" },
    { value: "thai", label: "🍜 Thai" },
    { value: "mixed", label: "🌍 Mixed" },
];
const MEALS = ["breakfast", "lunch", "dinner", "snack"] as const;
const MEAL_ICONS: Record<string, string> = { breakfast: "🌅", lunch: "☀️", dinner: "🌙", snack: "🍿" };
const MACRO_COLORS = ["#22c55e", "#3b82f6", "#f59e0b"];

export default function MealsPage() {
    const { user, profile } = useAuth();
    const { addXP } = useGamification();
    const [plan, setPlan] = useState<DailyMealPlan | null>(null);
    const [loading, setLoading] = useState(false);
    const [regenerating, setRegenerating] = useState<string | null>(null);
    const [loggedMeals, setLoggedMeals] = useState<Set<string>>(new Set());
    const [error, setError] = useState("");
    const [expandedMeal, setExpandedMeal] = useState<string | null>(null);
    const [dayOffset, setDayOffset] = useState(0);
    const [history, setHistory] = useState<{ date: string; plan: DailyMealPlan }[]>([]);
    const [tab, setTab] = useState<"today" | "history">("today");
    const [cookTime, setCookTime] = useState("moderate");
    const [spiceLevel, setSpiceLevel] = useState("Medium");
    const [cuisine, setCuisine] = useState("indian");

    function getDateStr(offset: number) {
        const d = new Date(); d.setDate(d.getDate() + offset);
        return d.toISOString().split("T")[0];
    }

    function getDayLabel(offset: number) {
        if (offset === 0) return "Today";
        if (offset === -1) return "Yesterday";
        if (offset === 1) return "Tomorrow";
        const d = new Date(); d.setDate(d.getDate() + offset);
        return d.toLocaleDateString("en", { weekday: "short", month: "short", day: "numeric" });
    }

    // Load plan and sync logged meals from Firestore
    useEffect(() => {
        async function load() {
            if (!user) return;
            const dateStr = getDateStr(dayOffset);
            const [saved, allLogs] = await Promise.all([
                getMealPlan(user.uid, dateStr),
                getFoodLogs(user.uid),
            ]);
            setPlan(saved);

            // Check which meals are already logged today by matching meal descriptions
            if (saved) {
                const todayLogs = allLogs.filter(l => l.timestamp?.startsWith(dateStr));
                const logged = new Set<string>();
                MEALS.forEach(type => {
                    const m = (saved as any)[type];
                    if (m && todayLogs.some(l => l.description === m.name)) {
                        logged.add(type);
                    }
                });
                setLoggedMeals(logged);
            } else {
                setLoggedMeals(new Set());
            }
        }
        load();
    }, [user, dayOffset]);

    useEffect(() => {
        async function loadHistory() {
            if (!user || tab !== "history") return;
            const h = await getMealPlanHistory(user.uid, 14);
            setHistory(h);
        }
        loadHistory();
    }, [user, tab]);

    function getContext() {
        if (!profile) return "";
        return `Name:${profile.name}, Age:${profile.age}, Gender:${profile.gender}, Weight:${profile.weight}kg, Height:${profile.height}cm, BMI:${profile.bmi}, Goal:${profile.goal}, Activity:${profile.activityLevel}, Diet:${profile.dietType}, Allergies:${(profile.allergies || []).join(",") || "None"}, Dislikes:${(profile.foodDislikes || []).join(",") || "None"}, Cuisines:${cuisine === "mixed" ? "Any" : cuisine}, Medical:${(profile.medicalConditions || []).join(",") || "None"}, Budget:₹${profile.weeklyBudget}/week, CookTime:${cookTime}, Spice:${spiceLevel}, CookingSkill:${(profile as any).cookingSkill || "intermediate"}`;
    }

    async function generate() {
        if (!user || !profile) return;
        setLoading(true); setError("");
        try {
            const raw = await generateMealPlan(getContext());
            let cleaned = raw.replace(/```json\n?|```\n?/g, "").trim();
            // Fix common Gemini JSON issues: trailing commas, extra text
            cleaned = cleaned.replace(/,\s*([\]}])/g, "$1"); // trailing commas
            const firstBrace = cleaned.indexOf("{");
            const lastBrace = cleaned.lastIndexOf("}");
            if (firstBrace !== -1 && lastBrace !== -1) cleaned = cleaned.slice(firstBrace, lastBrace + 1);
            const parsed = JSON.parse(cleaned);
            const dateStr = getDateStr(dayOffset);
            parsed.date = dateStr;
            await saveMealPlan(user.uid, dateStr, parsed);
            setPlan(parsed);
            setLoggedMeals(new Set());
            addXP(15);
        } catch (e: any) { setError(e.message || "Could not generate meals."); }
        setLoading(false);
    }

    async function handleRegenerate(mealType: typeof MEALS[number]) {
        if (!user || !profile || !plan) return;
        setRegenerating(mealType);
        try {
            const raw = await regenerateSingleMeal(mealType, getContext(), JSON.stringify(plan));
            let cleaned = raw.replace(/```json\n?|```\n?/g, "").trim();
            cleaned = cleaned.replace(/,\s*([\]}])/g, "$1");
            const firstBrace = cleaned.indexOf("{");
            const lastBrace = cleaned.lastIndexOf("}");
            if (firstBrace !== -1 && lastBrace !== -1) cleaned = cleaned.slice(firstBrace, lastBrace + 1);
            const newMeal = JSON.parse(cleaned);
            const updated = { ...plan, [mealType]: newMeal };
            updated.totalCalories = MEALS.reduce((a, t) => a + ((updated as any)[t]?.calories || 0), 0);
            await saveMealPlan(user.uid, getDateStr(dayOffset), updated);
            setPlan(updated);
            setLoggedMeals(prev => { const n = new Set(prev); n.delete(mealType); return n; });
        } catch (e: any) { setError(`Failed to regenerate ${mealType}: ${e.message}`); }
        setRegenerating(null);
    }

    async function toggleLogMeal(mealType: string, meal: Meal) {
        if (!user) return;
        const alreadyLogged = loggedMeals.has(mealType);
        if (alreadyLogged) return; // once logged, stay logged
        try {
            await logMealFromPlan(user.uid, mealType, meal);
            setLoggedMeals(prev => new Set(prev).add(mealType));
            addXP(10);
        } catch (e: any) { setError(`Failed to log ${mealType}: ${e.message}`); }
    }

    function MacroDonut({ meal }: { meal: Meal }) {
        const total = meal.protein + meal.carbs + meal.fats;
        if (total === 0) return null;
        const pPct = (meal.protein / total) * 100;
        const cPct = (meal.carbs / total) * 100;
        const R = 24, C = 2 * Math.PI * R;
        return (
            <svg viewBox="0 0 60 60" className="w-14 h-14 shrink-0">
                <circle cx="30" cy="30" r={R} fill="none" stroke="#e2e8f0" strokeWidth="6" className="dark:stroke-slate-700" />
                <circle cx="30" cy="30" r={R} fill="none" stroke={MACRO_COLORS[0]} strokeWidth="6"
                    strokeDasharray={`${(pPct / 100) * C} ${C}`} strokeDashoffset="0" className="-rotate-90 origin-center" />
                <circle cx="30" cy="30" r={R} fill="none" stroke={MACRO_COLORS[1]} strokeWidth="6"
                    strokeDasharray={`${(cPct / 100) * C} ${C}`} strokeDashoffset={`${-(pPct / 100) * C}`} className="-rotate-90 origin-center" />
                <text x="30" y="32" textAnchor="middle" className="text-[9px] fill-slate-600 dark:fill-slate-400 font-bold">{meal.calories}</text>
            </svg>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold text-slate-900 dark:text-white">Meal Plan</h1>
                    <p className="text-xs text-slate-400 mt-0.5">AI-powered personalized nutrition</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => setTab("today")}
                        className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${tab === "today" ? "bg-green-600 text-white shadow-sm" : "bg-slate-100 dark:bg-slate-800 text-slate-500"}`}>
                        Plan
                    </button>
                    <button onClick={() => setTab("history")}
                        className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${tab === "history" ? "bg-green-600 text-white shadow-sm" : "bg-slate-100 dark:bg-slate-800 text-slate-500"}`}>
                        History
                    </button>
                </div>
            </div>

            {tab === "today" && (
                <>
                    {/* Day selector */}
                    <div className="flex items-center justify-between bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 p-3">
                        <button onClick={() => setDayOffset(d => d - 1)} className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors">←</button>
                        <span className="text-sm font-semibold text-slate-800 dark:text-white">{getDayLabel(dayOffset)} · {getDateStr(dayOffset)}</span>
                        <button onClick={() => setDayOffset(d => d + 1)} className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors">→</button>
                    </div>

                    {/* Cuisine selector */}
                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 p-4">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2.5">Cuisine</p>
                        <div className="flex flex-wrap gap-2">
                            {CUISINES.map(c => (
                                <button key={c.value} onClick={() => setCuisine(c.value)}
                                    className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all ${cuisine === c.value
                                        ? "bg-green-600 text-white shadow-sm shadow-green-600/20"
                                        : "bg-slate-50 dark:bg-slate-800 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700"
                                        }`}>
                                    {c.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Preferences row */}
                    <div className="flex flex-wrap gap-3 items-center">
                        <div className="flex gap-1.5">
                            {COOK_TIME.map(t => (
                                <button key={t.value} onClick={() => setCookTime(t.value)}
                                    className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all ${cookTime === t.value ? "bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-400 border border-green-300 dark:border-green-700" : "bg-slate-50 dark:bg-slate-800 text-slate-400 border border-transparent"}`}>
                                    {t.label}
                                </button>
                            ))}
                        </div>
                        <div className="w-px h-5 bg-slate-200 dark:bg-slate-700" />
                        <div className="flex gap-1.5">
                            {SPICE.map(s => (
                                <button key={s} onClick={() => setSpiceLevel(s)}
                                    className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all ${spiceLevel === s ? "bg-orange-100 dark:bg-orange-950 text-orange-700 dark:text-orange-400 border border-orange-300 dark:border-orange-700" : "bg-slate-50 dark:bg-slate-800 text-slate-400 border border-transparent"}`}>
                                    {s}
                                </button>
                            ))}
                        </div>
                        <div className="flex-1" />
                        <button onClick={generate} disabled={loading}
                            className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-green-600 text-white hover:bg-green-700 transition-all shadow-md shadow-green-600/20 disabled:opacity-50 flex items-center gap-2">
                            {loading ? (
                                <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Generating...</>
                            ) : (
                                <><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg> Generate Plan</>
                            )}
                        </button>
                    </div>

                    {error && <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3 text-sm text-red-600 dark:text-red-400">{error}</div>}

                    {/* Meal Cards */}
                    {plan && (
                        <div className="space-y-4">
                            {/* Total summary bar */}
                            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 p-4 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div>
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Calories</p>
                                        <p className="text-xl font-black text-slate-900 dark:text-white">{plan.totalCalories || MEALS.reduce((a, t) => a + ((plan as any)[t]?.calories || 0), 0)} kcal</p>
                                    </div>
                                    <div className="w-px h-8 bg-slate-200 dark:bg-slate-700" />
                                    <div className="flex gap-4">
                                        {[
                                            { label: "Protein", value: MEALS.reduce((a, t) => a + ((plan as any)[t]?.protein || 0), 0), color: MACRO_COLORS[0] },
                                            { label: "Carbs", value: MEALS.reduce((a, t) => a + ((plan as any)[t]?.carbs || 0), 0), color: MACRO_COLORS[1] },
                                            { label: "Fats", value: MEALS.reduce((a, t) => a + ((plan as any)[t]?.fats || 0), 0), color: MACRO_COLORS[2] },
                                        ].map(m => (
                                            <div key={m.label} className="text-center">
                                                <p className="text-sm font-bold" style={{ color: m.color }}>{m.value}g</p>
                                                <p className="text-[9px] text-slate-400 uppercase font-semibold">{m.label}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="text-[10px] text-slate-400">{loggedMeals.size}/{MEALS.length} eaten</div>
                                    <button
                                        onClick={() => {
                                            if (!plan) return;
                                            const totalP = MEALS.reduce((a, t) => a + ((plan as any)[t]?.protein || 0), 0);
                                            const totalC = MEALS.reduce((a, t) => a + ((plan as any)[t]?.carbs || 0), 0);
                                            const totalF = MEALS.reduce((a, t) => a + ((plan as any)[t]?.fats || 0), 0);
                                            const totalCal = plan.totalCalories || MEALS.reduce((a, t) => a + ((plan as any)[t]?.calories || 0), 0);
                                            let text = `CHIKITSA — Meal Plan for ${plan.date || getDateStr(dayOffset)}\n`;
                                            text += `Total: ${totalCal} kcal  |  Protein: ${totalP}g  Carbs: ${totalC}g  Fats: ${totalF}g\n`;
                                            for (const m of MEALS) {
                                                const meal = (plan as any)[m];
                                                if (!meal) continue;
                                                text += `\n${m}\n---${meal.name}\n`;
                                                text += `${meal.calories} kcal  |  Protein: ${meal.protein}g  Carbs: ${meal.carbs}g  Fats: ${meal.fats}g\n`;
                                                text += `Prep: ${meal.prepTime}  Cook: ${meal.cookTime}\n`;
                                            }
                                            navigator.clipboard.writeText(text.trim());
                                            const btn = document.getElementById("copy-plan-btn");
                                            if (btn) { btn.textContent = "Copied!"; setTimeout(() => { btn.textContent = "📋 Copy"; }, 1500); }
                                        }}
                                        id="copy-plan-btn"
                                        className="px-3 py-1.5 text-[10px] font-bold rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                                    >
                                        📋 Copy
                                    </button>
                                </div>
                            </div>

                            {/* Individual meal cards */}
                            <AnimatePresence>
                                {MEALS.map((type) => {
                                    const m = (plan as any)[type] as Meal | undefined;
                                    if (!m) return null;
                                    const isExpanded = expandedMeal === type;
                                    const isLogged = loggedMeals.has(type);
                                    return (
                                        <motion.div key={type} layout
                                            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                                            className={`bg-white dark:bg-slate-900 rounded-2xl border transition-all overflow-hidden ${isLogged ? "border-green-300 dark:border-green-700" : "border-slate-100 dark:border-slate-800"}`}>
                                            {/* Main card */}
                                            <div className="p-5 flex items-start gap-4">
                                                {/* ✅ Tick checkbox */}
                                                <button
                                                    onClick={() => toggleLogMeal(type, m)}
                                                    disabled={isLogged}
                                                    className={`w-7 h-7 rounded-lg border-2 flex items-center justify-center shrink-0 mt-1 transition-all ${isLogged
                                                        ? "bg-green-600 border-green-600 text-white"
                                                        : "border-slate-300 dark:border-slate-600 hover:border-green-500 text-transparent hover:text-green-400"
                                                        }`}
                                                    title={isLogged ? "Logged ✓" : "Tick to log this meal & earn 10 XP"}>
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                                                </button>
                                                <MacroDonut meal={m} />
                                                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setExpandedMeal(isExpanded ? null : type)}>
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="text-sm">{MEAL_ICONS[type]}</span>
                                                        <span className="text-[10px] font-bold uppercase tracking-widest text-green-600 dark:text-green-400">{type}</span>
                                                        {isLogged && <span className="text-[9px] px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-400 font-semibold">✓ Eaten · +10 XP</span>}
                                                    </div>
                                                    <h3 className="text-base font-bold text-slate-800 dark:text-white truncate">{m.name}</h3>
                                                    <div className="flex items-center gap-3 mt-1.5 text-[11px] text-slate-400">
                                                        <span className="font-semibold">{m.calories} kcal</span>
                                                        <span>P: {m.protein}g</span><span>C: {m.carbs}g</span><span>F: {m.fats}g</span>
                                                        {m.prepTime && <span className="ml-2">⏱ {m.prepTime}</span>}
                                                    </div>
                                                </div>
                                                {/* Small swap icon */}
                                                <button onClick={() => handleRegenerate(type)}
                                                    disabled={!!regenerating}
                                                    className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-all disabled:opacity-40 shrink-0"
                                                    title="Swap this meal">
                                                    {regenerating === type
                                                        ? <span className="w-3 h-3 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                                                        : <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                                                    }
                                                </button>
                                            </div>

                                            {/* Expanded details */}
                                            {isExpanded && (
                                                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                                                    className="border-t border-slate-100 dark:border-slate-800 px-5 pb-5">
                                                    {m.explanation && (
                                                        <div className="mt-4 px-4 py-3 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-100 dark:border-green-900">
                                                            <p className="text-xs text-green-700 dark:text-green-400">💡 {m.explanation}</p>
                                                        </div>
                                                    )}
                                                    <div className="mt-4 grid grid-cols-2 gap-4">
                                                        <div>
                                                            <h4 className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">Ingredients</h4>
                                                            <ul className="space-y-1">
                                                                {m.ingredients.map((ing, i) => (
                                                                    <li key={i} className="text-xs text-slate-600 dark:text-slate-300 flex justify-between">
                                                                        <span>{ing.item}</span>
                                                                        <span className="text-slate-400 font-medium">{ing.quantity}</span>
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        </div>
                                                        <div>
                                                            <h4 className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">Recipe</h4>
                                                            <ol className="space-y-2">
                                                                {m.recipe.map((step, i) => (
                                                                    <li key={i} className="text-xs text-slate-600 dark:text-slate-300 flex gap-2">
                                                                        <span className="text-green-600 font-bold shrink-0">{i + 1}.</span>
                                                                        <span>{step.replace(/^Step \d+:\s*/i, "")}</span>
                                                                    </li>
                                                                ))}
                                                            </ol>
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </motion.div>
                                    );
                                })}
                            </AnimatePresence>
                        </div>
                    )}

                    {!plan && !loading && (
                        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-12 text-center">
                            <div className="text-4xl mb-4">🍽</div>
                            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">No meal plan for {getDayLabel(dayOffset).toLowerCase()}</p>
                            <p className="text-xs text-slate-400 dark:text-slate-500 mb-5">Select a cuisine above and click "Generate Plan"</p>
                        </div>
                    )}
                </>
            )}

            {/* ═══════ HISTORY TAB ═══════ */}
            {tab === "history" && (
                <div className="space-y-4">
                    {history.length === 0 ? (
                        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-12 text-center">
                            <p className="text-sm text-slate-400">No meal plan history yet. Generate your first plan!</p>
                        </div>
                    ) : (
                        history.map(({ date, plan: hp }) => (
                            <div key={date} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-5">
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="text-sm font-bold text-slate-800 dark:text-white">
                                        {new Date(date + "T00:00:00").toLocaleDateString("en", { weekday: "long", month: "short", day: "numeric" })}
                                    </h3>
                                    <span className="text-xs font-semibold text-slate-400">{hp.totalCalories || 0} kcal</span>
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                    {MEALS.map(type => {
                                        const m = (hp as any)[type];
                                        if (!m) return null;
                                        return (
                                            <div key={type} className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3">
                                                <span className="text-[9px] font-bold uppercase tracking-widest text-green-600">{type}</span>
                                                <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 mt-1 truncate">{m.name}</p>
                                                <p className="text-[10px] text-slate-400 mt-0.5">{m.calories} kcal</p>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
}
