import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useGamification } from "../contexts/GamificationContext";
import { getFoodLogs } from "../lib/firestore";
import type { FoodLog } from "../lib/types";

/* ═══════════════════ SVG HELPERS ═══════════════════ */

function CalorieRing({ consumed, target }: { consumed: number; target: number }) {
    const pct = Math.min(consumed / target, 1.2);
    const R = 60, C = 2 * Math.PI * R;
    const over = consumed > target;
    return (
        <div className="relative w-40 h-40 mx-auto">
            <svg viewBox="0 0 140 140" className="w-full h-full -rotate-90">
                <circle cx="70" cy="70" r={R} fill="none" stroke="currentColor" strokeWidth="10"
                    className="text-slate-100 dark:text-slate-800" />
                <circle cx="70" cy="70" r={R} fill="none" strokeWidth="10"
                    strokeDasharray={`${pct * C} ${C}`}
                    strokeLinecap="round"
                    className={over ? "text-red-500" : "text-green-500"}
                    stroke="currentColor"
                    style={{ transition: "stroke-dasharray 0.8s ease" }} />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`text-2xl font-black ${over ? "text-red-600 dark:text-red-400" : "text-slate-900 dark:text-white"}`}>{consumed}</span>
                <span className="text-[10px] text-slate-400 font-medium">of {target} kcal</span>
            </div>
        </div>
    );
}

function MacroBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
    const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
    return (
        <div className="flex items-center gap-3">
            <span className="w-14 text-[11px] font-semibold text-slate-500 dark:text-slate-400 text-right">{label}</span>
            <div className="flex-1 h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: color }} />
            </div>
            <span className="w-10 text-[11px] font-bold text-slate-700 dark:text-slate-300 text-right">{value}g</span>
        </div>
    );
}

function WeekChart({ data }: { data: { day: string; count: number }[] }) {
    const max = Math.max(...data.map(d => d.count), 4);
    return (
        <div className="flex items-end justify-between gap-1.5 h-20">
            {data.map((d, i) => (
                <div key={i} className="flex flex-col items-center gap-1 flex-1">
                    <div className="w-full rounded-t-md transition-all duration-500"
                        style={{
                            height: `${Math.max((d.count / max) * 100, 4)}%`,
                            background: d.count > 0 ? (d.count >= 3 ? "#22c55e" : "#f59e0b") : "#e2e8f0",
                        }} />
                    <span className="text-[9px] font-medium text-slate-400">{d.day}</span>
                </div>
            ))}
        </div>
    );
}

function CalorieChart({ data }: { data: { label: string; cal: number }[] }) {
    const max = Math.max(...data.map(d => d.cal), 1);
    return (
        <div className="flex items-end gap-1 sm:gap-2 h-32">
            {data.map((d, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-[8px] sm:text-[9px] font-bold text-slate-500 dark:text-slate-400">{d.cal}</span>
                    <div className="w-full rounded-t bg-green-500 dark:bg-green-600 transition-all hover:opacity-80"
                        style={{ height: `${(d.cal / max) * 100}%`, minHeight: 4 }} />
                    <span className="text-[7px] sm:text-[8px] whitespace-nowrap text-slate-400 dark:text-slate-500">{d.label}</span>
                </div>
            ))}
        </div>
    );
}

/* ═══════════════════ MAIN ═══════════════════ */

export default function DashboardPage() {
    const { profile, user } = useAuth();
    const { streak } = useGamification();
    const [logs, setLogs] = useState<FoodLog[]>([]);
    const [error, setError] = useState("");
    const todayStr = new Date().toISOString().split("T")[0];

    useEffect(() => {
        async function load() {
            if (!user) return;
            try {
                const allLogs = await getFoodLogs(user.uid);
                setLogs(allLogs);
            } catch (e: any) { setError(e.message); }
        }
        load();
    }, [user]);

    const calTarget = profile?.goal === "lose" ? 1800 : profile?.goal === "gain" ? 2500 : 2100;

    // Today's logged calories
    const todayLogs = logs.filter(l => l.timestamp.startsWith(todayStr));
    const loggedCal = todayLogs.reduce((a, l) => a + (l.calories || 0), 0);
    const loggedP = todayLogs.reduce((a, l) => a + (l.protein || 0), 0);
    const loggedC = todayLogs.reduce((a, l) => a + (l.carbs || 0), 0);
    const loggedF = todayLogs.reduce((a, l) => a + (l.fats || 0), 0);

    // Weekly data for activity chart
    const weekData = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(); d.setDate(d.getDate() - (6 - i));
        const ds = d.toISOString().split("T")[0];
        const dayLogs = logs.filter(l => l.timestamp.startsWith(ds));
        return { day: d.toLocaleDateString("en", { weekday: "short" }).slice(0, 2), count: dayLogs.length };
    });

    // 14-day calorie history (from ProgressPage)
    const byDate: Record<string, FoodLog[]> = {};
    logs.forEach(l => { const d = l.timestamp?.split("T")[0] || "unknown"; if (!byDate[d]) byDate[d] = []; byDate[d].push(l); });
    const dates = Object.keys(byDate).sort().slice(-14);
    const daily = dates.map(d => ({
        label: new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        cal: byDate[d].reduce((a, l) => a + (l.calories || 0), 0),
    }));
    const avgCal = daily.length ? Math.round(daily.reduce((a, d) => a + d.cal, 0) / daily.length) : 0;

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

            {error && <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3 text-sm text-red-600 dark:text-red-400">{error}</div>}

            {/* ═══════ QUICK STATS ROW (from Progress) ═══════ */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                    { label: "Weight", value: `${profile?.weight || "—"}`, sub: "kg" },
                    { label: "BMI", value: `${profile?.bmi?.toFixed(1) || "—"}`, sub: profile?.bmi ? (profile.bmi < 18.5 ? "Underweight" : profile.bmi < 25 ? "Normal" : "Overweight") : "" },
                    { label: "Avg Calories", value: `${avgCal}`, sub: "kcal/day" },
                    { label: "Total Entries", value: `${logs.length}`, sub: "food logs" },
                ].map(s => (
                    <div key={s.label} className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-100 dark:border-slate-800">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">{s.label}</p>
                        <p className="text-xl font-bold text-slate-900 dark:text-white">{s.value}</p>
                        <p className="text-[11px] text-slate-400 dark:text-slate-500">{s.sub}</p>
                    </div>
                ))}
            </div>

            {/* ═══════ ANALYTICS GRID ═══════ */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Calorie Ring */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-6">
                    <div className="flex items-baseline justify-between mb-4">
                        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">Today's Calories</h2>
                        <span className="text-[10px] font-semibold text-slate-400">🔥 {streak} day streak</span>
                    </div>
                    <CalorieRing consumed={loggedCal} target={calTarget} />
                    <div className="grid grid-cols-3 gap-2 mt-4">
                        {[
                            { label: "BMI", value: profile?.bmi?.toFixed(1) || "—" },
                            { label: "Goal", value: profile?.goal === "lose" ? "Lose" : profile?.goal === "gain" ? "Gain" : "Maintain" },
                            { label: "Target", value: `${calTarget}` },
                        ].map(s => (
                            <div key={s.label} className="text-center">
                                <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{s.value}</p>
                                <p className="text-[9px] text-slate-400 font-medium uppercase tracking-wider">{s.label}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Macro Breakdown */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-6">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-5">Today's Macros</h2>
                    <div className="space-y-4">
                        <MacroBar label="Protein" value={loggedP} max={calTarget * 0.3 / 4} color="#22c55e" />
                        <MacroBar label="Carbs" value={loggedC} max={calTarget * 0.5 / 4} color="#3b82f6" />
                        <MacroBar label="Fats" value={loggedF} max={calTarget * 0.2 / 9} color="#f59e0b" />
                    </div>
                    <div className="mt-5 grid grid-cols-3 gap-2">
                        <div className="text-center bg-green-50 dark:bg-green-950/30 rounded-lg py-2">
                            <p className="text-sm font-bold text-green-600">{loggedP}g</p>
                            <p className="text-[9px] text-green-500 font-medium">PROTEIN</p>
                        </div>
                        <div className="text-center bg-blue-50 dark:bg-blue-950/30 rounded-lg py-2">
                            <p className="text-sm font-bold text-blue-600">{loggedC}g</p>
                            <p className="text-[9px] text-blue-500 font-medium">CARBS</p>
                        </div>
                        <div className="text-center bg-amber-50 dark:bg-amber-950/30 rounded-lg py-2">
                            <p className="text-sm font-bold text-amber-600">{loggedF}g</p>
                            <p className="text-[9px] text-amber-500 font-medium">FATS</p>
                        </div>
                    </div>
                </div>

                {/* Weekly Activity */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-6">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Weekly Activity</h2>
                    <WeekChart data={weekData} />
                    <div className="mt-4 grid grid-cols-2 gap-3">
                        <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3">
                            <p className="text-lg font-bold text-slate-800 dark:text-white">{logs.length}</p>
                            <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Total Logs</p>
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3">
                            <p className="text-lg font-bold text-slate-800 dark:text-white">{todayLogs.length}</p>
                            <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Today</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* ═══════ 14-DAY CALORIE HISTORY (from Progress) ═══════ */}
            {daily.length > 0 && (
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-5">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">14-Day Calorie History</h2>
                        <span className="text-[10px] text-slate-400">Avg: {avgCal} kcal/day</span>
                    </div>
                    <CalorieChart data={daily} />
                </div>
            )}

            {/* ═══════ CTA ═══════ */}
            {logs.length === 0 && (
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 p-8 text-center">
                    <svg className="w-10 h-10 mx-auto mb-3 text-slate-300 dark:text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Start tracking your meals</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mb-4">Generate a meal plan and tick meals as you eat them</p>
                    <Link to="/meals" className="inline-block px-5 py-2.5 rounded-lg text-sm font-semibold bg-green-600 text-white hover:bg-green-700 transition-colors">
                        Generate Meal Plan →
                    </Link>
                </div>
            )}
        </div>
    );
}
