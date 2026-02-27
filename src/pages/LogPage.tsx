import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useGamification } from "../contexts/GamificationContext";
import { addFoodLog, getFoodLogs } from "../lib/firestore";
import type { FoodLog } from "../lib/types";

const QUICK_FOODS = [
    { desc: "Roti with Dal", cal: 320, p: 12, c: 48, f: 8, meal: "lunch" },
    { desc: "Rice with Sabji", cal: 400, p: 10, c: 60, f: 12, meal: "lunch" },
    { desc: "Poha", cal: 250, p: 6, c: 40, f: 8, meal: "breakfast" },
    { desc: "Idli Sambar", cal: 280, p: 8, c: 45, f: 6, meal: "breakfast" },
    { desc: "Egg Omelette", cal: 180, p: 14, c: 2, f: 12, meal: "breakfast" },
    { desc: "Chicken Curry + Rice", cal: 550, p: 30, c: 50, f: 18, meal: "dinner" },
    { desc: "Fruit Bowl", cal: 150, p: 2, c: 35, f: 1, meal: "snack" },
    { desc: "Chai + Biscuit", cal: 120, p: 3, c: 18, f: 4, meal: "snack" },
];

export default function LogPage() {
    const { user } = useAuth();
    const { checkAndUnlock, refreshGamification } = useGamification();
    const [logs, setLogs] = useState<FoodLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [meal, setMeal] = useState("breakfast");
    const [desc, setDesc] = useState(""); const [cal, setCal] = useState(""); const [p, setP] = useState(""); const [c, setC] = useState(""); const [f, setF] = useState("");
    const [saving, setSaving] = useState(false);

    useEffect(() => { async function l() { if (!user) return; setLogs(await getFoodLogs(user.uid)); setLoading(false); } l(); }, [user]);

    async function quickAdd(food: typeof QUICK_FOODS[0]) {
        if (!user) return;
        await addFoodLog(user.uid, { meal: food.meal, description: food.desc, calories: food.cal, protein: food.p, carbs: food.c, fats: food.f, timestamp: new Date().toISOString() });
        setLogs(await getFoodLogs(user.uid));
        checkAndUnlock("first_log");
        refreshGamification();
    }

    async function handleAdd(e: FormEvent) {
        e.preventDefault(); if (!user || !desc) return; setSaving(true);
        await addFoodLog(user.uid, { meal, description: desc, calories: parseInt(cal) || 0, protein: parseInt(p) || 0, carbs: parseInt(c) || 0, fats: parseInt(f) || 0, timestamp: new Date().toISOString() });
        setLogs(await getFoodLogs(user.uid));
        setDesc(""); setCal(""); setP(""); setC(""); setF(""); setShowForm(false); setSaving(false);
        checkAndUnlock("first_log");
        refreshGamification();
    }

    const todayLogs = logs.filter(l => l.timestamp?.startsWith(new Date().toISOString().split("T")[0]));
    const todayCal = todayLogs.reduce((a, l) => a + (l.calories || 0), 0);

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">Food Log</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Today: {todayCal} kcal from {todayLogs.length} entries</p>
                </div>
                <button onClick={() => setShowForm(!showForm)}
                    className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${showForm ? "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300" : "bg-green-600 text-white hover:bg-green-700"}`}>
                    {showForm ? "Cancel" : "+ Log Meal"}
                </button>
            </div>

            {!showForm && (
                <div>
                    <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">Quick Add</h2>
                    <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
                        {QUICK_FOODS.map((food, i) => (
                            <button key={i} onClick={() => quickAdd(food)}
                                className="shrink-0 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-lg px-3 py-2 text-left hover:border-green-200 dark:hover:border-green-800 transition-colors">
                                <p className="text-xs font-medium text-slate-800 dark:text-slate-200 whitespace-nowrap">{food.desc}</p>
                                <p className="text-[10px] text-slate-400">{food.cal} kcal</p>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {showForm && (
                <form onSubmit={handleAdd} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 p-4 sm:p-5 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">Meal</label>
                            <select value={meal} onChange={e => setMeal(e.target.value)} className="w-full px-3 py-2.5 rounded-lg text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-200 outline-none">
                                <option value="breakfast">Breakfast</option><option value="lunch">Lunch</option><option value="dinner">Dinner</option><option value="snack">Snack</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">Calories</label>
                            <input type="number" value={cal} onChange={e => setCal(e.target.value)} placeholder="350" className="w-full px-3 py-2.5 rounded-lg text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-200 outline-none" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">Description</label>
                        <input value={desc} onChange={e => setDesc(e.target.value)} placeholder="Oats with banana" required className="w-full px-3 py-2.5 rounded-lg text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-200 outline-none" />
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                        <div><label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">Protein (g)</label><input type="number" value={p} onChange={e => setP(e.target.value)} placeholder="15" className="w-full px-3 py-2.5 rounded-lg text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-200 outline-none" /></div>
                        <div><label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">Carbs (g)</label><input type="number" value={c} onChange={e => setC(e.target.value)} placeholder="45" className="w-full px-3 py-2.5 rounded-lg text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-200 outline-none" /></div>
                        <div><label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">Fats (g)</label><input type="number" value={f} onChange={e => setF(e.target.value)} placeholder="10" className="w-full px-3 py-2.5 rounded-lg text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-200 outline-none" /></div>
                    </div>
                    <button type="submit" disabled={saving} className="w-full py-3 rounded-lg text-sm font-semibold bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 transition-colors">{saving ? "Saving..." : "Add Entry"}</button>
                </form>
            )}

            {loading && <div className="flex justify-center py-12"><div className="w-6 h-6 rounded-full border-2 border-slate-200 dark:border-slate-700 border-t-green-600 animate-spin" /></div>}
            {!loading && logs.length === 0 && <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 p-8 text-center"><p className="text-sm text-slate-500 dark:text-slate-400">No food logs yet. Start tracking above.</p></div>}

            {logs.length > 0 && (
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 divide-y divide-slate-50 dark:divide-slate-800">
                    {logs.slice(0, 30).map((log, i) => (
                        <div key={log.id || i} className="px-4 py-3 flex items-center justify-between">
                            <div><p className="text-sm font-medium text-slate-800 dark:text-slate-200">{log.description}</p><p className="text-[11px] text-slate-400">{log.meal} · {new Date(log.timestamp).toLocaleDateString()}</p></div>
                            <div className="text-right shrink-0 ml-4"><p className="text-sm font-bold text-green-600 dark:text-green-400">{log.calories} kcal</p><p className="text-[10px] text-slate-400">P:{log.protein}g C:{log.carbs}g F:{log.fats}g</p></div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
