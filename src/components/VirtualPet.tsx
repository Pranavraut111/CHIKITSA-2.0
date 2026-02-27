import { useState } from "react";
import { useGamification } from "../contexts/GamificationContext";
import { motion, AnimatePresence } from "framer-motion";

const MOODS: Record<string, { emoji: string; anim: string }> = {
    happy: { emoji: "😊", anim: "animate-bounce" },
    excited: { emoji: "🤩", anim: "animate-bounce" },
    neutral: { emoji: "🙂", anim: "" },
    sleepy: { emoji: "😴", anim: "" },
};

export default function VirtualPet() {
    const { pet, feedPet } = useGamification();
    const [open, setOpen] = useState(false);
    const [sparkle, setSparkle] = useState(false);
    const mood = MOODS[pet.mood] || MOODS.neutral;

    async function handleFeed() {
        setSparkle(true);
        await feedPet();
        setTimeout(() => setSparkle(false), 1000);
    }

    return (
        <div className="fixed bottom-6 right-6 z-50">
            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.9 }}
                        className="absolute bottom-20 right-0 w-64 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-5 mb-2"
                    >
                        <div className="text-center">
                            <div className={`text-5xl mb-2 ${mood.anim}`}>{mood.emoji}</div>
                            <h3 className="text-sm font-bold text-slate-900 dark:text-white">{pet.name}</h3>
                            <p className="text-[11px] text-slate-400 dark:text-slate-500">Level {pet.level} • {pet.xp} / {pet.level * 100} XP</p>

                            {/* XP Bar */}
                            <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 mt-2 overflow-hidden">
                                <motion.div
                                    className="h-full rounded-full bg-gradient-to-r from-purple-500 to-pink-500"
                                    initial={{ width: 0 }}
                                    animate={{ width: `${(pet.xp / (pet.level * 100)) * 100}%` }}
                                />
                            </div>

                            {/* Happiness */}
                            <div className="mt-3 flex items-center justify-center gap-2">
                                <span className="text-[11px] text-slate-500 dark:text-slate-400">Happiness</span>
                                <div className="flex-1 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                                    <div
                                        className="h-full rounded-full transition-all"
                                        style={{
                                            width: `${pet.happiness}%`,
                                            background: pet.happiness > 70 ? "#22c55e" : pet.happiness > 40 ? "#f59e0b" : "#ef4444",
                                        }}
                                    />
                                </div>
                                <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400">{pet.happiness}%</span>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-2 mt-4">
                                <button
                                    onClick={handleFeed}
                                    className="flex-1 py-2 rounded-lg text-xs font-semibold bg-green-50 dark:bg-green-950 text-green-600 dark:text-green-400 border border-green-200 dark:border-green-800 hover:bg-green-100 dark:hover:bg-green-900 transition-colors"
                                >
                                    🍎 Feed
                                </button>
                                <button
                                    onClick={handleFeed}
                                    className="flex-1 py-2 rounded-lg text-xs font-semibold bg-purple-50 dark:bg-purple-950 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800 hover:bg-purple-100 dark:hover:bg-purple-900 transition-colors"
                                >
                                    🎾 Play
                                </button>
                            </div>

                            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-3">
                                Complete challenges & log meals to earn XP!
                            </p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Floating pet button */}
            <motion.button
                onClick={() => setOpen(!open)}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                className="relative w-14 h-14 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 shadow-lg shadow-purple-500/25 flex items-center justify-center text-2xl border-2 border-white dark:border-slate-800"
            >
                {sparkle && (
                    <motion.div
                        initial={{ scale: 0, opacity: 1 }}
                        animate={{ scale: 2, opacity: 0 }}
                        className="absolute inset-0 rounded-full border-2 border-yellow-400"
                    />
                )}
                {mood.emoji}
                {pet.happiness < 30 && (
                    <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-red-500 border-2 border-white dark:border-slate-800 animate-pulse" />
                )}
            </motion.button>
        </div>
    );
}
