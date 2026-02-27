import { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { generateGroceryList } from "../lib/gemini";
import { getMealPlan, saveGroceryList, getGroceryList } from "../lib/firestore";
import type { GroceryItem } from "../lib/types";

const CATEGORIES = ["Vegetables", "Fruits", "Dairy", "Grains", "Proteins", "Spices & Condiments", "Beverages", "Snacks", "Other"];

export default function GroceryPage() {
    const { user, profile } = useAuth();
    const [items, setItems] = useState<GroceryItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [checked, setChecked] = useState<Set<number>>(new Set());
    const todayStr = new Date().toISOString().split("T")[0];

    useEffect(() => {
        async function load() {
            if (!user) return;
            const saved = await getGroceryList(user.uid, todayStr);
            if (saved) setItems(saved);
        }
        load();
    }, [user, todayStr]);

    async function generate() {
        if (!user || !profile) return;
        setLoading(true); setError("");
        try {
            const meals = await getMealPlan(user.uid, todayStr);
            if (!meals) { setError("Generate a meal plan first from the Meal Plan page."); setLoading(false); return; }
            const raw = await generateGroceryList(JSON.stringify(meals), profile.weeklyBudget || 1500);
            const cleaned = raw.replace(/```json\n?|```\n?/g, "").trim();
            const parsed = JSON.parse(cleaned);
            setItems(parsed);
            await saveGroceryList(user.uid, todayStr, parsed);
        } catch (e: any) { setError(e.message || "Could not generate list."); }
        setLoading(false);
    }

    function toggleItem(idx: number) {
        setChecked(prev => { const n = new Set(prev); n.has(idx) ? n.delete(idx) : n.add(idx); return n; });
    }

    function openDelivery(service: string) {
        const names = items.filter((_, i) => !checked.has(i)).map(i => i.name).join(", ");
        if (service === "amazon") {
            window.open(`https://www.amazon.in/s?k=${encodeURIComponent(names)}`, "_blank");
        } else if (service === "instacart") {
            window.open(`https://www.instacart.com/store/search/${encodeURIComponent(names)}`, "_blank");
        } else if (service === "blinkit") {
            window.open(`https://blinkit.com/s/?q=${encodeURIComponent(names)}`, "_blank");
        } else if (service === "zepto") {
            window.open(`https://www.zeptonow.com/search?query=${encodeURIComponent(names)}`, "_blank");
        }
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
                <button onClick={generate} disabled={loading}
                    className="px-4 py-2 rounded-lg text-xs font-semibold bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 transition-colors">
                    {loading ? "Generating..." : items.length ? "Regenerate" : "Generate from Plan"}
                </button>
            </div>

            {error && <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3 text-sm text-red-600 dark:text-red-400">{error}</div>}

            {/* Delivery buttons */}
            {items.length > 0 && (
                <div>
                    <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">Order Ingredients Online</h2>
                    <div className="flex flex-wrap gap-2">
                        {[
                            { id: "amazon", label: "Amazon Fresh", icon: "📦", color: "bg-orange-50 dark:bg-orange-950 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-800" },
                            { id: "blinkit", label: "Blinkit", icon: "⚡", color: "bg-yellow-50 dark:bg-yellow-950 text-yellow-600 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800" },
                            { id: "zepto", label: "Zepto", icon: "🚀", color: "bg-purple-50 dark:bg-purple-950 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800" },
                            { id: "instacart", label: "Instacart", icon: "🥕", color: "bg-green-50 dark:bg-green-950 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800" },
                        ].map(s => (
                            <button key={s.id} onClick={() => openDelivery(s.id)}
                                className={`px-4 py-2.5 rounded-lg text-xs font-semibold border transition-all hover:scale-[1.02] ${s.color}`}>
                                {s.icon} {s.label}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Grouped items */}
            {Object.keys(grouped).length > 0 && (
                <div className="space-y-3">
                    {CATEGORIES.filter(cat => grouped[cat]).map(cat => (
                        <div key={cat} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 overflow-hidden">
                            <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{cat}</h3>
                            </div>
                            <div className="divide-y divide-slate-50 dark:divide-slate-800">
                                {grouped[cat].map(({ item, idx }) => (
                                    <div key={idx} onClick={() => toggleItem(idx)}
                                        className={`flex items-center gap-4 px-4 py-3 cursor-pointer transition-opacity ${checked.has(idx) ? "opacity-40" : ""}`}>
                                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-all
                                            ${checked.has(idx) ? "bg-green-600 border-green-600" : "border-slate-300 dark:border-slate-600"}`}>
                                            {checked.has(idx) && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className={`text-sm font-medium text-slate-800 dark:text-slate-200 ${checked.has(idx) ? "line-through" : ""}`}>{item.name}</p>
                                            <p className="text-[11px] text-slate-400">{item.quantity}</p>
                                        </div>
                                        <span className="text-sm font-semibold text-slate-500 dark:text-slate-400 shrink-0">₹{item.estimatedPrice}</span>
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

            {items.length === 0 && !loading && !error && (
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 p-8 text-center">
                    <p className="text-sm text-slate-500 dark:text-slate-400">No grocery list yet. Generate one from your meal plan.</p>
                </div>
            )}

            {loading && <div className="flex justify-center py-12"><div className="w-6 h-6 rounded-full border-2 border-slate-200 dark:border-slate-700 border-t-green-600 animate-spin" /></div>}
        </div>
    );
}
