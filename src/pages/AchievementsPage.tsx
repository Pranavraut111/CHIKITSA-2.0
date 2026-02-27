import { motion } from "framer-motion";
import { useGamification, ACHIEVEMENT_DEFS } from "../contexts/GamificationContext";

export default function AchievementsPage() {
    const { unlockedIds, achievements } = useGamification();
    const unlocked = achievements.filter(a => a.unlockedAt);
    const totalXp = unlocked.length * 25;

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <div>
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">Achievements</h1>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                    {unlocked.length} of {ACHIEVEMENT_DEFS.length} unlocked · {totalXp} XP earned
                </p>
            </div>

            {/* Progress overview */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 p-5">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Overall Progress</span>
                    <span className="text-sm font-bold text-green-600 dark:text-green-400">{Math.round((unlocked.length / ACHIEVEMENT_DEFS.length) * 100)}%</span>
                </div>
                <div className="w-full h-3 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <motion.div
                        className="h-full rounded-full bg-gradient-to-r from-green-500 to-emerald-500"
                        initial={{ width: 0 }}
                        animate={{ width: `${(unlocked.length / ACHIEVEMENT_DEFS.length) * 100}%` }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                    />
                </div>
            </div>

            {/* Badge grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {ACHIEVEMENT_DEFS.map((def) => {
                    const isUnlocked = unlockedIds.has(def.id);
                    const ach = achievements.find(a => a.id === def.id);
                    return (
                        <motion.div
                            key={def.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`rounded-xl border p-5 transition-all
                            ${isUnlocked
                                    ? "bg-white dark:bg-slate-900 border-green-200 dark:border-green-800 shadow-sm"
                                    : "bg-slate-50 dark:bg-slate-900/60 border-slate-100 dark:border-slate-800 opacity-60"
                                }`}
                        >
                            <div className="flex items-start gap-4">
                                <div className={`text-3xl ${isUnlocked ? "" : "grayscale"}`}>
                                    {def.icon}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <h3 className={`text-sm font-bold ${isUnlocked ? "text-slate-900 dark:text-white" : "text-slate-400 dark:text-slate-500"}`}>
                                            {def.title}
                                        </h3>
                                        {isUnlocked && (
                                            <span className="text-[10px] font-bold bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-400 px-2 py-0.5 rounded-full">
                                                ✓ Unlocked
                                            </span>
                                        )}
                                    </div>
                                    <p className={`text-xs mt-0.5 ${isUnlocked ? "text-slate-500 dark:text-slate-400" : "text-slate-400 dark:text-slate-600"}`}>
                                        {def.description}
                                    </p>
                                    {isUnlocked && ach?.unlockedAt && (
                                        <p className="text-[10px] text-green-600 dark:text-green-500 mt-1 font-medium">
                                            🎉 {new Date(ach.unlockedAt).toLocaleDateString()}
                                        </p>
                                    )}
                                    {!isUnlocked && (
                                        <div className="mt-2">
                                            <div className="w-full h-1 rounded-full bg-slate-200 dark:bg-slate-800">
                                                <div className="h-full rounded-full bg-slate-300 dark:bg-slate-700" style={{ width: "0%" }} />
                                            </div>
                                            <span className="text-[10px] text-slate-400 dark:text-slate-600 mt-0.5">Not started</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    );
                })}
            </div>
        </div>
    );
}
