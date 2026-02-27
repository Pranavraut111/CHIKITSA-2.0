import { motion } from "framer-motion";
import { useGamification, CHALLENGE_TEMPLATES } from "../contexts/GamificationContext";

export default function ChallengesPage() {
    const { challenges, acceptChallenge, updateChallengeProgress, pet } = useGamification();
    const activeChallenges = challenges.filter(c => !c.completed);
    const completedChallenges = challenges.filter(c => c.completed);
    const acceptedIds = new Set(challenges.map(c => c.title));

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <div>
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">Challenges</h1>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                    Complete challenges to earn XP for {pet.name}!
                </p>
            </div>

            {/* Active challenges */}
            {activeChallenges.length > 0 && (
                <div>
                    <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3">Active Challenges</h2>
                    <div className="space-y-3">
                        {activeChallenges.map((c) => {
                            const progress = Math.min(100, Math.round((c.current / c.target) * 100));
                            return (
                                <motion.div key={c.id} layout className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 p-4 sm:p-5">
                                    <div className="flex items-start gap-3">
                                        <span className="text-2xl">{c.icon}</span>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between mb-1">
                                                <h3 className="text-sm font-bold text-slate-900 dark:text-white">{c.title}</h3>
                                                <span className="text-[11px] font-bold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/30 px-2 py-0.5 rounded-full">+{c.xpReward} XP</span>
                                            </div>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">{c.description}</p>
                                            <div className="flex items-center gap-3">
                                                <div className="flex-1 h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                                                    <motion.div
                                                        className="h-full rounded-full bg-gradient-to-r from-green-500 to-emerald-500"
                                                        animate={{ width: `${progress}%` }}
                                                        transition={{ duration: 0.5 }}
                                                    />
                                                </div>
                                                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 shrink-0">{c.current}/{c.target} {c.unit}</span>
                                            </div>
                                            <div className="flex items-center justify-between mt-2">
                                                <p className="text-[10px] text-slate-400 dark:text-slate-500">
                                                    Ends {new Date(c.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                                                </p>
                                                <button onClick={() => updateChallengeProgress(c.id, 1)}
                                                    className="px-3 py-1 rounded-lg text-[11px] font-semibold bg-green-50 dark:bg-green-950 text-green-600 dark:text-green-400 border border-green-200 dark:border-green-800 hover:bg-green-100 dark:hover:bg-green-900 transition-colors">
                                                    +1 Progress
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Available challenges */}
            <div>
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3">Available Challenges</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {CHALLENGE_TEMPLATES.map((tpl, i) => {
                        const alreadyAccepted = acceptedIds.has(tpl.title);
                        return (
                            <div key={i} className={`bg-white dark:bg-slate-900 rounded-xl border p-4 transition-all
                                ${alreadyAccepted ? "border-slate-100 dark:border-slate-800 opacity-50" : "border-slate-100 dark:border-slate-800 hover:border-green-200 dark:hover:border-green-800"}`}>
                                <div className="flex items-center gap-3">
                                    <span className="text-xl">{tpl.icon}</span>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">{tpl.title}</h3>
                                        <p className="text-[11px] text-slate-400 dark:text-slate-500">{tpl.description}</p>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <p className="text-[11px] font-bold text-purple-600 dark:text-purple-400">+{tpl.xpReward} XP</p>
                                        {!alreadyAccepted ? (
                                            <button onClick={() => acceptChallenge(i)}
                                                className="mt-1 px-3 py-1 rounded-lg text-[10px] font-bold bg-green-600 text-white hover:bg-green-700 transition-colors">
                                                Accept
                                            </button>
                                        ) : (
                                            <span className="text-[10px] text-slate-400 dark:text-slate-500">Accepted</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Completed */}
            {completedChallenges.length > 0 && (
                <div>
                    <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3">Completed</h2>
                    <div className="space-y-2">
                        {completedChallenges.map((c) => (
                            <div key={c.id} className="bg-green-50 dark:bg-green-950/20 rounded-xl border border-green-200 dark:border-green-800 p-4 flex items-center gap-3">
                                <span className="text-xl">{c.icon}</span>
                                <div className="flex-1"><p className="text-sm font-medium text-green-800 dark:text-green-300">{c.title}</p></div>
                                <span className="text-xs font-bold text-green-600 dark:text-green-400">✓ +{c.xpReward} XP</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
