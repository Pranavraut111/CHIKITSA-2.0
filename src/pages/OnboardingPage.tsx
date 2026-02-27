import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../contexts/AuthContext";
import { updateUserProfile } from "../lib/firestore";
import { generateFoodiePersonality } from "../lib/gemini";
import type { FoodieProfile } from "../lib/types";

const STEPS = ["Personal Info", "Lifestyle", "Diet Preferences", "Medical", "Budget", "Foodie Quiz"];
const ACTIVITY_LEVELS = [
    { value: "sedentary", label: "Sedentary", desc: "Little or no exercise" },
    { value: "light", label: "Lightly Active", desc: "Light exercise 1-3 days/week" },
    { value: "moderate", label: "Moderately Active", desc: "Exercise 3-5 days/week" },
    { value: "active", label: "Active", desc: "Hard exercise 6-7 days/week" },
    { value: "very_active", label: "Very Active", desc: "Intense exercise + physical job" },
];
const MEDICAL_CONDITIONS = ["Diabetes", "Hypertension", "PCOS", "Thyroid", "High Cholesterol", "Kidney Issues", "Heart Disease", "Anemia", "None"];
const CUISINES = ["Indian", "Chinese", "Italian", "Mexican", "Japanese", "Mediterranean", "Thai", "American", "Korean", "Middle Eastern"];

const FOODIE_QUESTIONS = [
    { q: "It's 2 AM and you're hungry. What do you reach for?", opts: ["Maggi / instant noodles", "Leftover dal-rice", "Fruit or nuts", "Order a burger online"] },
    { q: "Your ideal weekend meal involves:", opts: ["A big elaborate home-cooked thali", "Trying a new restaurant", "Meal prepping for the week", "Skipping cooking — street food!"] },
    { q: "If you could only eat ONE cuisine forever:", opts: ["Indian comfort food", "Italian pasta & pizza", "Japanese sushi & ramen", "Mexican tacos & burritos"] },
    { q: "Your food philosophy is:", opts: ["Eat to live — fuel > flavor", "Live to eat — life's too short!", "Balance is key — 80/20 rule", "I eat whatever's available 🤷"] },
];

export default function OnboardingPage() {
    const { user, refreshProfile } = useAuth();
    const navigate = useNavigate();
    const [step, setStep] = useState(0);
    const [saving, setSaving] = useState(false);

    const [name, setName] = useState(""); const [age, setAge] = useState(""); const [gender, setGender] = useState("");
    const [height, setHeight] = useState(""); const [weight, setWeight] = useState(""); const [goal, setGoal] = useState("");
    const [activityLevel, setActivityLevel] = useState(""); const [sleepSchedule, setSleepSchedule] = useState("");
    const [workRoutine, setWorkRoutine] = useState(""); const [mealFrequency] = useState("3");
    const [dietType, setDietType] = useState(""); const [allergies, setAllergies] = useState("");
    const [foodDislikes, setFoodDislikes] = useState(""); const [selectedCuisines, setSelectedCuisines] = useState<string[]>([]);
    const [selectedConditions, setSelectedConditions] = useState<string[]>([]);
    const [weeklyBudget, setWeeklyBudget] = useState(""); const [monthlyBudget, setMonthlyBudget] = useState("");
    const [location, setLocation] = useState("");

    // Foodie quiz
    const [quizAnswers, setQuizAnswers] = useState<Record<string, string>>({});
    const [foodieResult, setFoodieResult] = useState<FoodieProfile | null>(null);
    const [quizLoading, setQuizLoading] = useState(false);

    function toggleCuisine(c: string) { setSelectedCuisines(p => p.includes(c) ? p.filter(x => x !== c) : [...p, c]); }
    function toggleCondition(c: string) {
        if (c === "None") { setSelectedConditions(["None"]); return; }
        setSelectedConditions(p => { const w = p.filter(x => x !== "None"); return w.includes(c) ? w.filter(x => x !== c) : [...w, c]; });
    }

    async function runFoodieQuiz() {
        setQuizLoading(true);
        try {
            const raw = await generateFoodiePersonality(quizAnswers);
            const cleaned = raw.replace(/```json\n?|```\n?/g, "").trim();
            setFoodieResult(JSON.parse(cleaned));
        } catch { setFoodieResult({ type: "The Adventurous Foodie", emoji: "🍽", description: "You love trying new things!", traits: ["Curious", "Bold", "Experimental", "Fun"], completedAt: new Date().toISOString() }); }
        setQuizLoading(false);
    }

    async function handleFinish() {
        if (!user) return; setSaving(true);
        const h = parseFloat(height) || 170; const w = parseFloat(weight) || 70;
        const bmi = +(w / ((h / 100) ** 2)).toFixed(1);
        await updateUserProfile(user.uid, {
            name: name || "User", age: parseInt(age) || 25, gender: (gender as any) || "other",
            height: h, weight: w, bmi, goal: (goal as any) || "maintain",
            activityLevel: (activityLevel as any) || "moderate",
            sleepSchedule: sleepSchedule || "11 PM - 7 AM", workRoutine: workRoutine || "9 AM - 6 PM",
            mealFrequency: parseInt(mealFrequency) || 3, dietType: (dietType as any) || "vegetarian",
            allergies: allergies ? allergies.split(",").map(s => s.trim()) : [],
            foodDislikes: foodDislikes ? foodDislikes.split(",").map(s => s.trim()) : [],
            cuisinePreference: selectedCuisines,
            medicalConditions: selectedConditions.includes("None") ? [] : selectedConditions,
            weeklyBudget: parseFloat(weeklyBudget) || 1500, monthlyBudget: parseFloat(monthlyBudget) || 6000,
            location: location || "India", onboardingComplete: true,
            ...(foodieResult ? { foodieProfile: { ...foodieResult, completedAt: new Date().toISOString() } } : {}),
        });
        await refreshProfile(); navigate("/dashboard");
    }

    const canNext = () => {
        if (step === 0) return name && age && gender && height && weight && goal;
        if (step === 1) return activityLevel;
        if (step === 2) return dietType;
        if (step === 3) return selectedConditions.length > 0;
        if (step === 4) return weeklyBudget;
        return true;
    };

    const inputCls = "w-full px-4 py-3 rounded-lg border border-slate-200 focus:border-green-500 focus:ring-4 focus:ring-green-500/10 outline-none text-sm dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200";

    return (
        <main className="min-h-screen flex items-center justify-center p-4 sm:p-6 bg-slate-50 dark:bg-slate-950">
            <div className="w-full max-w-2xl rounded-2xl shadow-xl overflow-hidden border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                <div className="px-8 pt-8">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Step {step + 1} of {STEPS.length}</span>
                        <span className="text-xs font-medium text-green-600">{STEPS[step]}</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800">
                        <motion.div className="h-full rounded-full bg-green-600" animate={{ width: `${((step + 1) / STEPS.length) * 100}%` }} transition={{ duration: 0.4 }} />
                    </div>
                </div>

                <div className="px-8 py-8">
                    <AnimatePresence mode="wait">
                        <motion.div key={step} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.25 }} className="space-y-5">
                            {step === 0 && (
                                <>
                                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Tell us about yourself</h2>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="col-span-2"><label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1 uppercase tracking-wide">Full Name</label><input value={name} onChange={e => setName(e.target.value)} placeholder="John Doe" className={inputCls} /></div>
                                        <div><label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1 uppercase tracking-wide">Age</label><input type="number" value={age} onChange={e => setAge(e.target.value)} placeholder="25" className={inputCls} /></div>
                                        <div><label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1 uppercase tracking-wide">Gender</label><select value={gender} onChange={e => setGender(e.target.value)} className={inputCls}><option value="">Select</option><option value="male">Male</option><option value="female">Female</option><option value="other">Other</option></select></div>
                                        <div><label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1 uppercase tracking-wide">Height (cm)</label><input type="number" value={height} onChange={e => setHeight(e.target.value)} placeholder="170" className={inputCls} /></div>
                                        <div><label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1 uppercase tracking-wide">Weight (kg)</label><input type="number" value={weight} onChange={e => setWeight(e.target.value)} placeholder="70" className={inputCls} /></div>
                                        <div className="col-span-2">
                                            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1 uppercase tracking-wide">Goal</label>
                                            <div className="grid grid-cols-3 gap-3">
                                                {[{ v: "lose", label: "Lose Weight" }, { v: "maintain", label: "Maintain" }, { v: "gain", label: "Gain Muscle" }].map(g => (
                                                    <button key={g.v} type="button" onClick={() => setGoal(g.v)}
                                                        className={`p-3 rounded-lg border text-sm font-medium text-center transition-all ${goal === g.v ? "border-green-500 bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-400" : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400"}`}>{g.label}</button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}
                            {step === 1 && (
                                <>
                                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Your Lifestyle</h2>
                                    <div className="space-y-2">
                                        {ACTIVITY_LEVELS.map(a => (
                                            <button key={a.value} type="button" onClick={() => setActivityLevel(a.value)}
                                                className={`w-full p-3 rounded-lg border text-left transition-all ${activityLevel === a.value ? "border-green-500 bg-green-50 dark:bg-green-950" : "border-slate-200 dark:border-slate-700"}`}>
                                                <span className="text-sm font-medium text-slate-900 dark:text-white">{a.label}</span>
                                                <span className="text-xs text-slate-400 ml-2">{a.desc}</span>
                                            </button>
                                        ))}
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div><label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Sleep Schedule</label><input value={sleepSchedule} onChange={e => setSleepSchedule(e.target.value)} placeholder="11 PM - 7 AM" className={inputCls} /></div>
                                        <div><label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Work Routine</label><input value={workRoutine} onChange={e => setWorkRoutine(e.target.value)} placeholder="9 AM - 6 PM" className={inputCls} /></div>
                                    </div>
                                </>
                            )}
                            {step === 2 && (
                                <>
                                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Diet Preferences</h2>
                                    <div className="grid grid-cols-2 gap-3">
                                        {[{ v: "vegetarian", label: "Vegetarian" }, { v: "non_vegetarian", label: "Non-Vegetarian" }, { v: "vegan", label: "Vegan" }, { v: "eggetarian", label: "Eggetarian" }].map(d => (
                                            <button key={d.v} type="button" onClick={() => setDietType(d.v)}
                                                className={`p-3 rounded-lg border text-sm font-medium transition-all ${dietType === d.v ? "border-green-500 bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-400" : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400"}`}>{d.label}</button>
                                        ))}
                                    </div>
                                    <div><label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Allergies (comma separated)</label><input value={allergies} onChange={e => setAllergies(e.target.value)} placeholder="Peanuts, Shellfish" className={inputCls} /></div>
                                    <div><label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Food Dislikes (comma separated)</label><input value={foodDislikes} onChange={e => setFoodDislikes(e.target.value)} placeholder="Bitter gourd, Broccoli" className={inputCls} /></div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2">Preferred Cuisines</label>
                                        <div className="flex flex-wrap gap-2">{CUISINES.map(c => (
                                            <button key={c} type="button" onClick={() => toggleCuisine(c)}
                                                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${selectedCuisines.includes(c) ? "bg-green-600 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"}`}>{c}</button>
                                        ))}</div>
                                    </div>
                                </>
                            )}
                            {step === 3 && (
                                <>
                                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Medical Conditions</h2>
                                    <div className="grid grid-cols-2 gap-3">{MEDICAL_CONDITIONS.map(c => (
                                        <button key={c} type="button" onClick={() => toggleCondition(c)}
                                            className={`p-3 rounded-lg border text-sm font-medium text-left transition-all ${selectedConditions.includes(c)
                                                ? c === "None" ? "border-blue-500 bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-400" : "border-orange-400 bg-orange-50 dark:bg-orange-950 text-orange-700 dark:text-orange-400"
                                                : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400"}`}>{c}</button>
                                    ))}</div>
                                </>
                            )}
                            {step === 4 && (
                                <>
                                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Budget & Location</h2>
                                    <div><label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Weekly Budget (₹)</label><input type="number" value={weeklyBudget} onChange={e => setWeeklyBudget(e.target.value)} placeholder="1500" className={inputCls} /></div>
                                    <div><label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Monthly Budget (₹)</label><input type="number" value={monthlyBudget} onChange={e => setMonthlyBudget(e.target.value)} placeholder="6000" className={inputCls} /></div>
                                    <div><label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">City / Region</label><input value={location} onChange={e => setLocation(e.target.value)} placeholder="Mumbai, India" className={inputCls} /></div>
                                </>
                            )}
                            {step === 5 && (
                                <>
                                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">🎮 Foodie Personality Quiz</h2>
                                    <p className="text-slate-500 dark:text-slate-400 text-sm">Fun & optional! Discover your food personality.</p>
                                    {!foodieResult ? (
                                        <div className="space-y-4">
                                            {FOODIE_QUESTIONS.map((fq, i) => (
                                                <div key={i}>
                                                    <p className="text-sm font-medium text-slate-800 dark:text-slate-200 mb-2">{fq.q}</p>
                                                    <div className="grid grid-cols-2 gap-2">
                                                        {fq.opts.map(opt => (
                                                            <button key={opt} type="button" onClick={() => setQuizAnswers(p => ({ ...p, [fq.q]: opt }))}
                                                                className={`p-2.5 rounded-lg border text-xs font-medium text-left transition-all ${quizAnswers[fq.q] === opt ? "border-purple-500 bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-400" : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400"}`}>
                                                                {opt}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                            <button onClick={runFoodieQuiz} disabled={Object.keys(quizAnswers).length < FOODIE_QUESTIONS.length || quizLoading}
                                                className="w-full py-2.5 rounded-lg text-sm font-semibold bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50 transition-colors">
                                                {quizLoading ? "Analyzing your taste..." : "🔮 Reveal My Personality"}
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="text-center bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30 rounded-xl p-6 border border-purple-200 dark:border-purple-800">
                                            <div className="text-5xl mb-3">{foodieResult.emoji}</div>
                                            <h3 className="text-xl font-bold text-purple-800 dark:text-purple-300">{foodieResult.type}</h3>
                                            <p className="text-sm text-purple-600 dark:text-purple-400 mt-2">{foodieResult.description}</p>
                                            <div className="flex flex-wrap gap-2 justify-center mt-3">
                                                {foodieResult.traits.map(t => (
                                                    <span key={t} className="px-3 py-1 rounded-full text-xs font-medium bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-400">{t}</span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </motion.div>
                    </AnimatePresence>
                </div>

                <div className="px-8 pb-8 flex justify-between">
                    <button type="button" onClick={() => setStep(s => Math.max(0, s - 1))} disabled={step === 0}
                        className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-colors ${step === 0 ? "text-slate-300 cursor-not-allowed" : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"}`}>
                        ← Back
                    </button>
                    {step < STEPS.length - 1 ? (
                        <button type="button" onClick={() => setStep(s => s + 1)} disabled={!canNext()}
                            className="px-6 py-2.5 rounded-lg text-sm font-semibold bg-green-600 text-white hover:bg-green-700 transition-colors shadow-md shadow-green-600/20 disabled:opacity-40">
                            Continue →
                        </button>
                    ) : (
                        <button type="button" onClick={handleFinish} disabled={saving}
                            className="px-6 py-2.5 rounded-lg text-sm font-semibold bg-green-600 text-white hover:bg-green-700 transition-colors shadow-md shadow-green-600/20 disabled:opacity-60">
                            {saving ? "Saving..." : "Complete Setup 🎉"}
                        </button>
                    )}
                </div>
            </div>
        </main>
    );
}
