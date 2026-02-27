import { useState, useEffect } from "react";
import type { ReactNode } from "react";
import { useAuth } from "../contexts/AuthContext";
import { updateUserProfile } from "../lib/firestore";

const MEDICAL = ["Diabetes", "Hypertension", "PCOS", "Thyroid", "High Cholesterol", "Kidney Issues", "Heart Disease", "Anemia"];

export default function ProfilePage() {
    const { user, profile, refreshProfile } = useAuth();
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [name, setName] = useState(""); const [age, setAge] = useState(""); const [gender, setGender] = useState("");
    const [height, setHeight] = useState(""); const [weight, setWeight] = useState(""); const [goal, setGoal] = useState("");
    const [activityLevel, setActivityLevel] = useState(""); const [dietType, setDietType] = useState("");
    const [allergies, setAllergies] = useState(""); const [conditions, setConditions] = useState<string[]>([]);
    const [weeklyBudget, setWeeklyBudget] = useState(""); const [monthlyBudget, setMonthlyBudget] = useState(""); const [location, setLocation] = useState("");

    useEffect(() => {
        if (profile) {
            setName(profile.name || ""); setAge(String(profile.age || "")); setGender(profile.gender || "");
            setHeight(String(profile.height || "")); setWeight(String(profile.weight || "")); setGoal(profile.goal || "");
            setActivityLevel(profile.activityLevel || ""); setDietType(profile.dietType || "");
            setAllergies((profile.allergies || []).join(", ")); setConditions(profile.medicalConditions || []);
            setWeeklyBudget(String(profile.weeklyBudget || "")); setMonthlyBudget(String(profile.monthlyBudget || "")); setLocation(profile.location || "");
        }
    }, [profile]);

    function toggleCondition(c: string) { setConditions(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]); }

    async function handleSave() {
        if (!user) return; setSaving(true);
        const h = parseFloat(height) || 170; const w = parseFloat(weight) || 70;
        const bmi = +(w / ((h / 100) ** 2)).toFixed(1);
        await updateUserProfile(user.uid, { name, age: parseInt(age) || 25, gender: gender as any, height: h, weight: w, bmi, goal: goal as any, activityLevel: activityLevel as any, dietType: dietType as any, allergies: allergies ? allergies.split(",").map(s => s.trim()) : [], medicalConditions: conditions, weeklyBudget: parseFloat(weeklyBudget) || 1500, monthlyBudget: parseFloat(monthlyBudget) || 6000, location });
        await refreshProfile(); setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 3000);
    }

    const inputCls = "w-full px-3 py-2.5 rounded-lg text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-200 outline-none focus:border-green-500";

    return (
        <div className="max-w-2xl mx-auto space-y-6 pb-8">
            <div className="flex items-center justify-between">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">Profile</h1>
                <span className="text-xs text-slate-400 dark:text-slate-500">{user?.email}</span>
            </div>
            {saved && <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-xl px-4 py-2.5 text-xs font-medium text-green-600 dark:text-green-400">Profile updated successfully.</div>}
            <Section title="Personal Information">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2"><Label>Name</Label><input value={name} onChange={e => setName(e.target.value)} className={inputCls} /></div>
                    <div><Label>Age</Label><input type="number" value={age} onChange={e => setAge(e.target.value)} className={inputCls} /></div>
                    <div><Label>Gender</Label><select value={gender} onChange={e => setGender(e.target.value)} className={inputCls}><option value="male">Male</option><option value="female">Female</option><option value="other">Other</option></select></div>
                    <div><Label>Height (cm)</Label><input type="number" value={height} onChange={e => setHeight(e.target.value)} className={inputCls} /></div>
                    <div><Label>Weight (kg)</Label><input type="number" value={weight} onChange={e => setWeight(e.target.value)} className={inputCls} /></div>
                </div>
            </Section>
            <Section title="Goal & Activity">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div><Label>Goal</Label><select value={goal} onChange={e => setGoal(e.target.value)} className={inputCls}><option value="lose">Lose Weight</option><option value="maintain">Maintain</option><option value="gain">Gain Muscle</option></select></div>
                    <div><Label>Activity Level</Label><select value={activityLevel} onChange={e => setActivityLevel(e.target.value)} className={inputCls}><option value="sedentary">Sedentary</option><option value="light">Light</option><option value="moderate">Moderate</option><option value="active">Active</option><option value="very_active">Very Active</option></select></div>
                </div>
            </Section>
            <Section title="Diet Preferences">
                <div><Label>Diet Type</Label><select value={dietType} onChange={e => setDietType(e.target.value)} className={inputCls}><option value="vegetarian">Vegetarian</option><option value="non_vegetarian">Non-Vegetarian</option><option value="vegan">Vegan</option><option value="eggetarian">Eggetarian</option></select></div>
                <div className="mt-4"><Label>Allergies</Label><input value={allergies} onChange={e => setAllergies(e.target.value)} placeholder="Peanuts, Shellfish" className={inputCls} /></div>
            </Section>
            <Section title="Medical Conditions">
                <div className="flex flex-wrap gap-2">
                    {MEDICAL.map(c => (
                        <button key={c} onClick={() => toggleCondition(c)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors
                            ${conditions.includes(c) ? "bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800" : "bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700"}`}>
                            {c}
                        </button>
                    ))}
                </div>
            </Section>
            <Section title="Budget & Location">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div><Label>Weekly Budget (₹)</Label><input type="number" value={weeklyBudget} onChange={e => setWeeklyBudget(e.target.value)} className={inputCls} /></div>
                    <div><Label>Monthly Budget (₹)</Label><input type="number" value={monthlyBudget} onChange={e => setMonthlyBudget(e.target.value)} className={inputCls} /></div>
                </div>
                <div className="mt-4"><Label>Location</Label><input value={location} onChange={e => setLocation(e.target.value)} className={inputCls} /></div>
            </Section>
            <button onClick={handleSave} disabled={saving} className="w-full py-3.5 rounded-xl text-sm font-semibold bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 transition-colors">{saving ? "Saving..." : "Save Changes"}</button>
        </div>
    );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
    return (<div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 p-4 sm:p-5 space-y-4"><h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">{title}</h2>{children}</div>);
}
function Label({ children }: { children: ReactNode }) {
    return <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">{children}</label>;
}
