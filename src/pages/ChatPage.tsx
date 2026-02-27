import { useEffect, useState, useRef } from "react";
import { useAuth } from "../contexts/AuthContext";
import { chatWithAI, analyzeImageNutrition } from "../lib/gemini";
import { addChatMessage, getChatHistory } from "../lib/firestore";
import type { ChatMessage } from "../lib/types";

const SUGGESTIONS = [
    "What should I eat for dinner?",
    "High-protein snack ideas",
    "How to reduce sugar cravings?",
    "Am I on track with my goals?",
    "Best foods for muscle recovery",
];

export default function ChatPage() {
    const { user, profile } = useAuth();
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState("");
    const [sending, setSending] = useState(false);
    const [analyzing, setAnalyzing] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => { async function l() { if (!user) return; setMessages(await getChatHistory(user.uid)); } l(); }, [user]);
    useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }); }, [messages]);

    async function send(text: string) {
        if (!text.trim() || !user || !profile) return;
        const userMsg: ChatMessage = { id: Date.now().toString(), role: "user", content: text.trim(), timestamp: new Date().toISOString() };
        setMessages(prev => [...prev, userMsg]);
        setInput(""); setSending(true);
        await addChatMessage(user.uid, { role: "user", content: userMsg.content, timestamp: userMsg.timestamp });
        try {
            const hist = messages.slice(-10).map(m => `${m.role}: ${m.content}`).join("\n");
            const ctx = `Name:${profile.name}, Age:${profile.age}, Goal:${profile.goal}, Diet:${profile.dietType}, Medical:${(profile.medicalConditions || []).join(",") || "None"}`;
            const reply = await chatWithAI(userMsg.content, hist, ctx);
            const aiMsg: ChatMessage = { id: (Date.now() + 1).toString(), role: "assistant", content: reply, timestamp: new Date().toISOString() };
            setMessages(prev => [...prev, aiMsg]);
            await addChatMessage(user.uid, { role: "assistant", content: reply, timestamp: aiMsg.timestamp });
        } catch {
            setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: "assistant", content: "Sorry, I'm currently unavailable. Please try again later.", timestamp: new Date().toISOString() }]);
        }
        setSending(false);
    }

    async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file || !user) return;

        setAnalyzing(true);
        // Show user's image as a message
        const imageUrl = URL.createObjectURL(file);
        const userMsg: ChatMessage = { id: Date.now().toString(), role: "user", content: `📸 Analyzing food image...`, timestamp: new Date().toISOString(), imageUrl };
        setMessages(prev => [...prev, userMsg]);

        try {
            // Convert to base64
            const reader = new FileReader();
            const base64 = await new Promise<string>((resolve) => {
                reader.onload = () => resolve((reader.result as string).split(",")[1]);
                reader.readAsDataURL(file);
            });

            const raw = await analyzeImageNutrition(base64, file.type);
            const cleaned = raw.replace(/```json\n?|```\n?/g, "").trim();
            const nutrition = JSON.parse(cleaned);

            // Build a readable response
            let response = `## 🍽 Food Analysis\n\n`;
            if (nutrition.items && nutrition.items.length > 0) {
                nutrition.items.forEach((item: any) => {
                    response += `**${item.item}** (${item.serving || "1 serving"})\n`;
                    response += `• Calories: ${item.calories} kcal\n`;
                    response += `• Protein: ${item.protein}g | Carbs: ${item.carbs}g | Fats: ${item.fats}g\n`;
                    if (item.fiber) response += `• Fiber: ${item.fiber}g`;
                    if (item.sugar) response += ` | Sugar: ${item.sugar}g`;
                    response += "\n\n";
                });
            }
            response += `---\n**Total: ${nutrition.totalCalories} kcal** (P: ${nutrition.totalProtein}g | C: ${nutrition.totalCarbs}g | F: ${nutrition.totalFats}g)\n`;
            response += `**Health Score: ${"⭐".repeat(Math.min(nutrition.healthScore || 5, 10))}** (${nutrition.healthScore}/10)\n\n`;
            response += nutrition.summary || "";

            const aiMsg: ChatMessage = {
                id: (Date.now() + 1).toString(), role: "assistant", content: response, timestamp: new Date().toISOString(),
                nutritionData: nutrition.items?.[0] ? {
                    item: nutrition.items[0].item,
                    calories: nutrition.totalCalories,
                    protein: nutrition.totalProtein,
                    carbs: nutrition.totalCarbs,
                    fats: nutrition.totalFats,
                } : undefined,
            };
            setMessages(prev => [...prev, aiMsg]);
            await addChatMessage(user.uid, { role: "user", content: "Uploaded food image for analysis", timestamp: userMsg.timestamp });
            await addChatMessage(user.uid, { role: "assistant", content: response, timestamp: aiMsg.timestamp });
        } catch (err: any) {
            setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: "assistant", content: `Failed to analyze image: ${err.message}`, timestamp: new Date().toISOString() }]);
        }
        setAnalyzing(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
    }

    function NutritionCard({ data }: { data: NonNullable<ChatMessage["nutritionData"]> }) {
        const total = data.protein + data.carbs + data.fats;
        return (
            <div className="mt-3 bg-slate-50 dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-300">{data.item}</span>
                    <span className="text-sm font-black text-slate-900 dark:text-white">{data.calories} kcal</span>
                </div>
                <div className="flex gap-1 h-3 rounded-full overflow-hidden bg-slate-200 dark:bg-slate-700 mb-2">
                    {total > 0 && (
                        <>
                            <div className="h-full rounded-l-full" style={{ width: `${(data.protein / total) * 100}%`, background: "#22c55e" }} />
                            <div className="h-full" style={{ width: `${(data.carbs / total) * 100}%`, background: "#3b82f6" }} />
                            <div className="h-full rounded-r-full" style={{ width: `${(data.fats / total) * 100}%`, background: "#f59e0b" }} />
                        </>
                    )}
                </div>
                <div className="flex justify-between text-[10px] font-semibold">
                    <span className="text-green-600">Protein {data.protein}g</span>
                    <span className="text-blue-600">Carbs {data.carbs}g</span>
                    <span className="text-amber-600">Fats {data.fats}g</span>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto flex flex-col" style={{ height: "calc(100vh - 7rem)" }}>
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-600 to-emerald-500 flex items-center justify-center text-xs font-black text-white shadow-md shadow-green-600/20">AI</div>
                <div>
                    <h1 className="text-sm font-bold text-slate-900 dark:text-white">CHIKITSA AI</h1>
                    <p className="text-[11px] text-green-600 dark:text-green-400 font-medium">Nutrition companion · Image analysis</p>
                </div>
                <div className="flex-1" />
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-[10px] font-semibold text-green-600 dark:text-green-400">Online</span>
                </div>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto py-4 space-y-3">
                {messages.length === 0 && (
                    <div className="text-center py-10">
                        <div className="text-4xl mb-3">🤖</div>
                        <p className="text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Hi! I'm your nutrition AI</p>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mb-2">Ask me anything or upload a food photo for instant analysis</p>
                        <div className="flex items-center justify-center gap-2 text-[11px] text-slate-400 mb-5">
                            <span className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-800">📸 Upload food photo</span>
                            <span className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-800">💬 Ask nutrition questions</span>
                        </div>
                        <div className="flex flex-wrap gap-2 justify-center">
                            {SUGGESTIONS.map(q => (
                                <button key={q} onClick={() => { setInput(q); send(q); }}
                                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-green-200 dark:hover:border-green-800 transition-colors">
                                    {q}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {messages.map(msg => (
                    <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[80%] px-4 py-3 text-sm leading-relaxed rounded-2xl
                            ${msg.role === "user"
                                ? "bg-green-600 text-white rounded-br-sm"
                                : "bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border border-slate-100 dark:border-slate-800 rounded-bl-sm"
                            }`}>
                            {msg.imageUrl && (
                                <img src={msg.imageUrl} alt="Food" className="rounded-xl mb-2 max-h-48 object-cover w-full" />
                            )}
                            <div className="whitespace-pre-wrap">{msg.content}</div>
                            {msg.nutritionData && <NutritionCard data={msg.nutritionData} />}
                        </div>
                    </div>
                ))}

                {(sending || analyzing) && (
                    <div className="flex justify-start">
                        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl rounded-bl-sm px-4 py-3">
                            <div className="flex items-center gap-2">
                                <div className="flex gap-1.5">{[0, 150, 300].map(d => <div key={d} className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-600 animate-bounce" style={{ animationDelay: `${d}ms` }} />)}</div>
                                {analyzing && <span className="text-[10px] text-slate-400 ml-2">Analyzing image...</span>}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <form onSubmit={e => { e.preventDefault(); send(input); }} className="flex items-center gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                {/* Image upload */}
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" id="food-image-upload" />
                <button type="button" onClick={() => fileInputRef.current?.click()} disabled={analyzing}
                    className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center hover:bg-green-50 hover:text-green-600 dark:hover:bg-green-950 dark:hover:text-green-400 transition-colors disabled:opacity-40 shrink-0"
                    title="Upload food image for analysis">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
                    </svg>
                </button>
                <input value={input} onChange={e => setInput(e.target.value)} placeholder="Ask anything or upload a food photo..."
                    className="flex-1 px-4 py-3 rounded-xl text-sm bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-slate-900 dark:text-slate-200 outline-none focus:border-green-500 placeholder:text-slate-400" />
                <button type="submit" disabled={sending || analyzing || !input.trim()}
                    className="w-10 h-10 rounded-xl bg-green-600 text-white flex items-center justify-center disabled:opacity-30 shrink-0 hover:bg-green-700 transition-colors">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" /></svg>
                </button>
            </form>
        </div>
    );
}
