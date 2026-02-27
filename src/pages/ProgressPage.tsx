import { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { getFoodLogs } from "../lib/firestore";
import type { FoodLog } from "../lib/types";

export default function ProgressPage() {
    const { user, profile } = useAuth();
    const [logs, setLogs] = useState<FoodLog[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => { async function l() { if (!user) return; setLogs(await getFoodLogs(user.uid)); setLoading(false); } l(); }, [user]);

    const byDate: Record<string, FoodLog[]> = {};
    logs.forEach(l => { const d = l.timestamp?.split("T")[0] || "unknown"; if (!byDate[d]) byDate[d] = []; byDate[d].push(l); });
    const dates = Object.keys(byDate).sort().slice(-14);

    const daily = dates.map(d => ({
        date: d,
        label: new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        cal: byDate[d].reduce((a, l) => a + (l.calories || 0), 0),
        protein: byDate[d].reduce((a, l) => a + (l.protein || 0), 0),
        carbs: byDate[d].reduce((a, l) => a + (l.carbs || 0), 0),
        fats: byDate[d].reduce((a, l) => a + (l.fats || 0), 0),
        count: byDate[d].length,
    }));

    const maxCal = Math.max(...daily.map(d => d.cal), 1);
    const avgCal = daily.length ? Math.round(daily.reduce((a, d) => a + d.cal, 0) / daily.length) : 0;

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">Progress</h1>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                    { label: "Weight", value: `${profile?.weight || "—"}`, sub: "kg" },
                    { label: "BMI", value: `${profile?.bmi || "—"}`, sub: profile?.bmi ? (profile.bmi < 18.5 ? "Underweight" : profile.bmi < 25 ? "Normal" : "Overweight") : "" },
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
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 p-4 sm:p-5">
                <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-4">Daily Calorie Intake</h2>
                {loading && <div className="flex justify-center py-8"><div className="w-6 h-6 rounded-full border-2 border-slate-200 dark:border-slate-700 border-t-green-600 animate-spin" /></div>}
                {!loading && daily.length === 0 && <p className="text-sm text-center py-8 text-slate-400 dark:text-slate-500">No data yet. Start logging meals.</p>}
                {daily.length > 0 && (
                    <div className="flex items-end gap-1 sm:gap-2 h-40">
                        {daily.map(d => (
                            <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
                                <span className="text-[9px] sm:text-[10px] font-bold text-slate-500 dark:text-slate-400">{d.cal}</span>
                                <div className="w-full rounded-t bg-green-500 dark:bg-green-600 transition-all hover:opacity-80" style={{ height: `${(d.cal / maxCal) * 100}%`, minHeight: 4 }} />
                                <span className="text-[8px] whitespace-nowrap text-slate-400 dark:text-slate-500">{d.label}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
            {daily.length > 0 && (
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 overflow-hidden">
                    <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200 p-4 sm:p-5 pb-0">Macro History</h2>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead><tr className="border-b border-slate-100 dark:border-slate-800">
                                {["Date", "Calories", "Protein", "Carbs", "Fats", "Entries"].map(h => (
                                    <th key={h} className={`py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 ${h === "Date" ? "text-left" : "text-right"}`}>{h}</th>
                                ))}
                            </tr></thead>
                            <tbody>{[...daily].reverse().map(d => (
                                <tr key={d.date} className="border-b border-slate-50 dark:border-slate-800/50">
                                    <td className="py-3 px-4 text-sm font-medium text-slate-800 dark:text-slate-200">{d.label}</td>
                                    <td className="py-3 px-4 text-right text-sm font-bold text-green-600 dark:text-green-400">{d.cal}</td>
                                    <td className="py-3 px-4 text-right text-sm text-slate-500 dark:text-slate-400">{d.protein}g</td>
                                    <td className="py-3 px-4 text-right text-sm text-slate-500 dark:text-slate-400">{d.carbs}g</td>
                                    <td className="py-3 px-4 text-right text-sm text-slate-500 dark:text-slate-400">{d.fats}g</td>
                                    <td className="py-3 px-4 text-right text-sm text-slate-400 dark:text-slate-500">{d.count}</td>
                                </tr>
                            ))}</tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
