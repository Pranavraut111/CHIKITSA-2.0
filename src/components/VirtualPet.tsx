import { useState, useEffect, useRef } from "react";
import { useGamification } from "../contexts/GamificationContext";
import { motion, AnimatePresence } from "framer-motion";

const PET_UNLOCK_LEVEL = 20;

const PET_STYLES = {
    body: "w-16 h-16 rounded-[40%] relative",
    earL: "absolute -top-3 -left-1 w-5 h-6 rounded-t-full rotate-[-15deg]",
    earR: "absolute -top-3 -right-1 w-5 h-6 rounded-t-full rotate-[15deg]",
    eyeL: "absolute top-4 left-3 w-2.5 h-2.5 rounded-full bg-slate-900",
    eyeR: "absolute top-4 right-3 w-2.5 h-2.5 rounded-full bg-slate-900",
    nose: "absolute top-7 left-1/2 -translate-x-1/2 w-2 h-1.5 rounded-full bg-amber-900",
    mouth: "absolute top-9 left-1/2 -translate-x-1/2 w-3 h-1 rounded-b-full border-b-2 border-amber-900",
    tail: "absolute -right-4 top-6 w-5 h-3 rounded-r-full",
};

type Mood = "idle" | "happy" | "sleeping" | "excited";

export default function VirtualPet() {
    const { userLevel, pet } = useGamification();
    const [pos, setPos] = useState({ x: Math.random() * (window.innerWidth - 200) + 100, y: Math.random() * (window.innerHeight - 200) + 100 });
    const [mood, setMood] = useState<Mood>("idle");
    const [direction, setDirection] = useState(1); // 1 = right, -1 = left
    const [showBubble, setShowBubble] = useState(false);
    const [bubbleText, setBubbleText] = useState("");
    const intervalRef = useRef<number | undefined>(undefined);

    const isUnlocked = userLevel >= PET_UNLOCK_LEVEL;
    const petColor = pet.happiness > 70 ? "bg-amber-400" : pet.happiness > 40 ? "bg-amber-300" : "bg-amber-200";
    const earColor = pet.happiness > 70 ? "bg-amber-500" : pet.happiness > 40 ? "bg-amber-400" : "bg-amber-300";
    const tailColor = earColor;

    // Roaming movement — explores entire viewport
    useEffect(() => {
        if (!isUnlocked) return;

        // Small steps every 3 seconds
        intervalRef.current = window.setInterval(() => {
            setPos(prev => {
                const maxX = window.innerWidth - 100;
                const maxY = window.innerHeight - 100;
                const dx = (Math.random() - 0.5) * 200;
                const dy = (Math.random() - 0.5) * 100;
                const newX = Math.max(20, Math.min(maxX, prev.x + dx));
                const newY = Math.max(60, Math.min(maxY, prev.y + dy));
                setDirection(dx > 0 ? 1 : -1);
                return { x: newX, y: newY };
            });
        }, 3000);

        // Big jump every 12 seconds — teleport to a random spot
        const jumpTimer = window.setInterval(() => {
            const maxX = window.innerWidth - 100;
            const maxY = window.innerHeight - 100;
            const newX = Math.random() * maxX + 20;
            const newY = Math.random() * (maxY - 60) + 60;
            setDirection(Math.random() > 0.5 ? 1 : -1);
            setPos({ x: newX, y: newY });
        }, 12000);

        return () => {
            clearInterval(intervalRef.current);
            clearInterval(jumpTimer);
        };
    }, [isUnlocked]);

    // Mood cycling
    useEffect(() => {
        if (!isUnlocked) return;
        const moods: Mood[] = ["idle", "happy", "idle", "excited", "idle", "sleeping"];
        let idx = 0;
        const timer = setInterval(() => {
            idx = (idx + 1) % moods.length;
            setMood(moods[idx]);
        }, 8000);
        return () => clearInterval(timer);
    }, [isUnlocked]);

    function handlePetClick() {
        if (!isUnlocked) return;
        setMood("excited");
        const msgs = ["Woof! 🐾", "Feed me! 🍖", "Level up! ⭐", "You're doing great! 💪", `Lv.${pet.level} Chompy! 🎉`, "I love you! ❤️"];
        setBubbleText(msgs[Math.floor(Math.random() * msgs.length)]);
        setShowBubble(true);
        setTimeout(() => { setShowBubble(false); setMood("happy"); }, 2500);
    }

    // Teaser for locked pet
    if (!isUnlocked) {
        return (
            <div className="fixed bottom-6 right-6 z-40">
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-4 max-w-[200px] cursor-default"
                >
                    <div className="text-center">
                        <div className="text-3xl mb-2 opacity-30">🐕</div>
                        <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400">Unlock Chompy</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">Reach Level {PET_UNLOCK_LEVEL} to unlock your virtual pet!</p>
                        <div className="mt-2 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                            <div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-500 transition-all"
                                style={{ width: `${Math.min((userLevel / PET_UNLOCK_LEVEL) * 100, 100)}%` }} />
                        </div>
                        <p className="text-[9px] text-slate-400 mt-1">Lv. {userLevel} / {PET_UNLOCK_LEVEL}</p>
                    </div>
                </motion.div>
            </div>
        );
    }

    const eyeStyle = mood === "sleeping"
        ? "w-3 h-0.5 rounded-full bg-slate-900 mt-1"
        : mood === "excited"
            ? "w-3 h-3 rounded-full bg-slate-900"
            : "w-2.5 h-2.5 rounded-full bg-slate-900";

    return (
        <AnimatePresence>
            <motion.div
                className="fixed z-50 cursor-pointer select-none"
                style={{ left: pos.x, top: pos.y }}
                animate={{ left: pos.x, top: pos.y }}
                transition={{ type: "spring", stiffness: 50, damping: 20, duration: 2 }}
                onClick={handlePetClick}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
            >
                {/* Speech bubble */}
                {showBubble && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.8 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className="absolute -top-12 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 shadow-lg border border-slate-200 dark:border-slate-700 whitespace-nowrap z-10"
                    >
                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">{bubbleText}</span>
                        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-white dark:bg-slate-800 rotate-45 border-r border-b border-slate-200 dark:border-slate-700" />
                    </motion.div>
                )}

                {/* Pet body */}
                <motion.div
                    className="relative"
                    animate={{
                        scaleX: direction,
                        y: mood === "happy" || mood === "excited" ? [0, -6, 0] : mood === "sleeping" ? [0, 2, 0] : 0,
                    }}
                    transition={{
                        y: { repeat: Infinity, duration: mood === "sleeping" ? 3 : 0.5, ease: "easeInOut" },
                        scaleX: { duration: 0.3 },
                    }}
                >
                    {/* Main body */}
                    <div className={`${PET_STYLES.body} ${petColor} shadow-lg`}>
                        {/* Ears */}
                        <div className={`${PET_STYLES.earL} ${earColor}`} />
                        <div className={`${PET_STYLES.earR} ${earColor}`} />

                        {/* Eyes */}
                        <div className="absolute top-4 left-3">
                            <div className={eyeStyle}>
                                {mood !== "sleeping" && (
                                    <div className="absolute top-0.5 left-0.5 w-1 h-1 rounded-full bg-white" />
                                )}
                            </div>
                        </div>
                        <div className="absolute top-4 right-3">
                            <div className={eyeStyle}>
                                {mood !== "sleeping" && (
                                    <div className="absolute top-0.5 left-0.5 w-1 h-1 rounded-full bg-white" />
                                )}
                            </div>
                        </div>

                        {/* Nose */}
                        <div className={PET_STYLES.nose} />

                        {/* Mouth */}
                        <div className={`${PET_STYLES.mouth} ${mood === "happy" || mood === "excited" ? "border-amber-900 w-4 h-2" : ""}`} />

                        {/* Tail */}
                        <motion.div
                            className={`${PET_STYLES.tail} ${tailColor}`}
                            animate={{ rotate: mood === "happy" || mood === "excited" ? [0, 20, -10, 20, 0] : [0, 5, 0] }}
                            transition={{ repeat: Infinity, duration: mood === "happy" ? 0.5 : 2 }}
                        />

                        {/* Blush (when happy) */}
                        {(mood === "happy" || mood === "excited") && (
                            <>
                                <div className="absolute top-6 left-0.5 w-2.5 h-1.5 rounded-full bg-pink-300/50" />
                                <div className="absolute top-6 right-0.5 w-2.5 h-1.5 rounded-full bg-pink-300/50" />
                            </>
                        )}

                        {/* Sleep Z's */}
                        {mood === "sleeping" && (
                            <motion.div
                                className="absolute -top-5 -right-3 text-xs font-bold text-slate-400"
                                animate={{ opacity: [0, 1, 0], y: [0, -8, -16] }}
                                transition={{ repeat: Infinity, duration: 2 }}
                            >
                                Z
                            </motion.div>
                        )}
                    </div>

                    {/* Label */}
                    <div className="text-center mt-1">
                        <span className="text-[8px] font-bold text-amber-700/70 uppercase tracking-widest">{pet.name || "Chompy"}</span>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
