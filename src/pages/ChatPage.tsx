import { useEffect, useState, useRef } from "react";
import { useAuth } from "../contexts/AuthContext";
import { chatWithAI } from "../lib/gemini";
import { addChatMessage, getChatHistory } from "../lib/firestore";
import type { ChatMessage } from "../lib/types";

const SUGGESTIONS = ["What should I eat for dinner?", "High-protein snack ideas", "How to reduce sugar cravings?", "Am I on track with my goals?"];

export default function ChatPage() {
    const { user, profile } = useAuth();
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState("");
    const [sending, setSending] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

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

    return (
        <div className="max-w-3xl mx-auto flex flex-col" style={{ height: "calc(100vh - 7rem)" }}>
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
                <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center text-[11px] font-bold text-white">AI</div>
                <div>
                    <h1 className="text-sm font-bold text-slate-900 dark:text-white">CHIKITSA AI</h1>
                    <p className="text-[11px] text-green-600 dark:text-green-400 font-medium">Nutrition companion</p>
                </div>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto py-4 space-y-3">
                {messages.length === 0 && (
                    <div className="text-center py-10">
                        <p className="text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Start a conversation</p>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mb-4">Ask anything about nutrition or your diet goals.</p>
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
                            {msg.content}
                        </div>
                    </div>
                ))}

                {sending && (
                    <div className="flex justify-start">
                        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl rounded-bl-sm px-4 py-3">
                            <div className="flex gap-1.5">{[0, 150, 300].map(d => <div key={d} className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-600 animate-bounce" style={{ animationDelay: `${d}ms` }} />)}</div>
                        </div>
                    </div>
                )}
            </div>

            <form onSubmit={e => { e.preventDefault(); send(input); }} className="flex items-center gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <input value={input} onChange={e => setInput(e.target.value)} placeholder="Type your message..."
                    className="flex-1 px-4 py-3 rounded-xl text-sm bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-slate-900 dark:text-slate-200 outline-none focus:border-green-500 placeholder:text-slate-400" />
                <button type="submit" disabled={sending || !input.trim()}
                    className="w-10 h-10 rounded-xl bg-green-600 text-white flex items-center justify-center disabled:opacity-30 shrink-0 hover:bg-green-700 transition-colors">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" /></svg>
                </button>
            </form>
        </div>
    );
}
