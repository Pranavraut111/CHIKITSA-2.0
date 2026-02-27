import { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { generateGroceryList } from "../lib/gemini";
import { getMealPlan, saveGroceryList, getGroceryList } from "../lib/firestore";
import type { GroceryItem, DailyMealPlan } from "../lib/types";

const CATEGORIES = ["Vegetables", "Fruits", "Dairy", "Grains", "Proteins", "Spices & Condiments", "Beverages", "Snacks", "Other"];
const MEALS = ["breakfast", "lunch", "dinner", "snack"] as const;
const MEAL_ICONS: Record<string, string> = { breakfast: "🌅", lunch: "☀️", dinner: "🌙", snack: "🍿" };

const ECOMM_LINKS = [
    { id: "amazon", label: "Amazon", baseUrl: "https://www.amazon.in/s?k=", color: "text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950/30" },
    { id: "blinkit", label: "Blinkit", baseUrl: "https://blinkit.com/s/?q=", color: "text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-950/30" },
    { id: "zepto", label: "Zepto", baseUrl: "https://www.zeptonow.com/search?query=", color: "text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950/30" },
    { id: "bigbasket", label: "BB", baseUrl: "https://www.bigbasket.com/ps/?q=", color: "text-green-600 hover:bg-green-50 dark:hover:bg-green-950/30" },
];

export default function GroceryPage() {
    const { user, profile } = useAuth();
    const [items, setItems] = useState<GroceryItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [checked, setChecked] = useState<Set<number>>(new Set());
    const [plan, setPlan] = useState<DailyMealPlan | null>(null);
    const [selectedMeals, setSelectedMeals] = useState<Set<string>>(new Set(MEALS));
    const todayStr = new Date().toISOString().split("T")[0];

    useEffect(() => {
        async function load() {
            if (!user) return;
            const [saved, mealPlan] = await Promise.all([
                getGroceryList(user.uid, todayStr),
                getMealPlan(user.uid, todayStr),
            ]);
            if (saved) setItems(saved);
            if (mealPlan) setPlan(mealPlan);
        }
        load();
    }, [user, todayStr]);

    function toggleMealSelection(meal: string) {
        setSelectedMeals(prev => {
            const n = new Set(prev);
            n.has(meal) ? n.delete(meal) : n.add(meal);
            return n;
        });
    }

    async function generate() {
        if (!user || !profile || !plan) return;
        setLoading(true); setError("");
        try {
            // Build meal data only from selected meals
            const selectedPlan: Record<string, any> = {};
            selectedMeals.forEach(type => {
                const m = (plan as any)[type];
                if (m) selectedPlan[type] = m;
            });
            const raw = await generateGroceryList(JSON.stringify(selectedPlan), profile.weeklyBudget || 1500);
            const cleaned = raw.replace(/```json\n?|```\n?/g, "").trim();
            const parsed = JSON.parse(cleaned);
            setItems(parsed);
            setChecked(new Set());
            await saveGroceryList(user.uid, todayStr, parsed);
        } catch (e: any) { setError(e.message || "Could not generate list."); }
        setLoading(false);
    }

    function toggleItem(idx: number) {
        setChecked(prev => { const n = new Set(prev); n.has(idx) ? n.delete(idx) : n.add(idx); return n; });
    }

    function openSearch(service: typeof ECOMM_LINKS[number], name: string) {
        window.open(`${service.baseUrl}${encodeURIComponent(name)}`, "_blank");
    }

    const total = items.reduce((a, i) => a + (i.estimatedPrice || 0), 0);
    const grouped: Record<string, { item: GroceryItem; idx: number }[]> = {};
    items.forEach((item, idx) => {
        const cat = item.category || "Other";
        if (!grouped[cat]) grouped[cat] = [];
        grouped[cat].push({ item, idx });
    });

    return (
        <div className="space-y-6 max-w-3xl mx-auto">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">Grocery List</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{items.length} items · Est. ₹{total}</p>
                </div>
            </div>

            {error && <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3 text-sm text-red-600 dark:text-red-400">{error}</div>}

            {/* ═══════ MEAL SELECTOR ═══════ */}
            {plan ? (
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-5">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Select meals to shop for</h2>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {MEALS.map(type => {
                            const m = (plan as any)[type];
                            if (!m) return null;
                            const selected = selectedMeals.has(type);
                            return (
                                <button key={type} onClick={() => toggleMealSelection(type)}
                                    className={`text-left p-3 rounded-xl border-2 transition-all ${selected
                                        ? "border-green-400 dark:border-green-600 bg-green-50 dark:bg-green-950/20"
                                        : "border-slate-100 dark:border-slate-800 opacity-50"
                                        }`}>
                                    <div className="flex items-center gap-2 mb-1">
                                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center text-[10px] transition-all ${selected ? "bg-green-600 border-green-600 text-white" : "border-slate-300 dark:border-slate-600"}`}>
                                            {selected && <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                                        </div>
                                        <span className="text-xs">{MEAL_ICONS[type]}</span>
                                        <span className="text-[10px] font-bold uppercase tracking-widest text-green-600 dark:text-green-400">{type}</span>
                                    </div>
                                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate">{m.name}</p>
                                    <p className="text-[10px] text-slate-400 mt-0.5">{m.calories} kcal · {m.ingredients?.length || 0} ingredients</p>
                                </button>
                            );
                        })}
                    </div>
                    <div className="mt-4 flex items-center justify-between">
                        <p className="text-[10px] text-slate-400">{selectedMeals.size} meal{selectedMeals.size !== 1 ? "s" : ""} selected</p>
                        <button onClick={generate} disabled={loading || selectedMeals.size === 0}
                            className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 transition-all flex items-center gap-2">
                            {loading ? (
                                <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Generating...</>
                            ) : (
                                <><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" /></svg> Generate Grocery List</>
                            )}
                        </button>
                    </div>
                </div>
            ) : (
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-8 text-center">
                    <div className="text-3xl mb-3">🍽️</div>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">No meal plan found</p>
                    <p className="text-xs text-slate-400">Generate a meal plan first, then come back to build your grocery list</p>
                </div>
            )}

            {/* ═══════ GROUPED ITEMS WITH ECOMMERCE LINKS ═══════ */}
            {Object.keys(grouped).length > 0 && (
                <div className="space-y-3">
                    {CATEGORIES.filter(cat => grouped[cat]).map(cat => (
                        <div key={cat} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 overflow-hidden">
                            <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{cat}</h3>
                            </div>
                            <div className="divide-y divide-slate-50 dark:divide-slate-800">
                                {grouped[cat].map(({ item, idx }) => (
                                    <div key={idx} className={`flex items-center gap-3 px-4 py-3 transition-opacity ${checked.has(idx) ? "opacity-40" : ""}`}>
                                        {/* Checkbox */}
                                        <button onClick={() => toggleItem(idx)}
                                            className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-all
                                            ${checked.has(idx) ? "bg-green-600 border-green-600" : "border-slate-300 dark:border-slate-600"}`}>
                                            {checked.has(idx) && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                                        </button>
                                        {/* Item info */}
                                        <div className="flex-1 min-w-0">
                                            <p className={`text-sm font-medium text-slate-800 dark:text-slate-200 ${checked.has(idx) ? "line-through" : ""}`}>{item.name}</p>
                                            <p className="text-[11px] text-slate-400">{item.quantity}</p>
                                        </div>
                                        {/* Per-ingredient ecommerce links */}
                                        <div className="flex gap-1 shrink-0">
                                            {ECOMM_LINKS.map(link => (
                                                <button key={link.id} onClick={() => openSearch(link, item.name)}
                                                    className={`px-1.5 py-0.5 rounded text-[9px] font-semibold transition-colors ${link.color}`}
                                                    title={`Buy on ${link.label}`}>
                                                    {link.label}
                                                </button>
                                            ))}
                                        </div>
                                        {/* Price */}
                                        <span className="text-sm font-semibold text-slate-500 dark:text-slate-400 shrink-0 w-12 text-right">₹{item.estimatedPrice}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 px-4 py-3 flex justify-between">
                        <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">Total</span>
                        <span className={`text-sm font-bold ${total > (profile?.weeklyBudget || 9999) ? "text-red-500" : "text-green-600 dark:text-green-400"}`}>₹{total}</span>
                    </div>
                </div>
            )}

            {items.length === 0 && !loading && !error && plan && (
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 p-8 text-center">
                    <p className="text-sm text-slate-500 dark:text-slate-400">Select meals above and click "Generate Grocery List"</p>
                </div>
            )}

            {loading && <div className="flex justify-center py-12"><div className="w-6 h-6 rounded-full border-2 border-slate-200 dark:border-slate-700 border-t-green-600 animate-spin" /></div>}
        </div>
    );
}
