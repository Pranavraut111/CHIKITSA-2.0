import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../contexts/AuthContext";
import type { FormEvent } from "react";

export default function AuthPage() {
    const [isLogin, setIsLogin] = useState(true);
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [resetSent, setResetSent] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const { login, signup, resetPassword } = useAuth();
    const navigate = useNavigate();

    async function handleSubmit(e: FormEvent) {
        e.preventDefault();
        setError("");
        setLoading(true);
        try {
            if (isLogin) {
                await login(email, password);
            } else {
                if (!name.trim()) { setError("Please enter your name."); setLoading(false); return; }
                if (password.length < 6) { setError("Password must be at least 6 characters."); setLoading(false); return; }
                await signup(email, password, name);
            }
            navigate("/dashboard");
        } catch (err: unknown) {
            const code = (err as { code?: string })?.code || "";
            if (code === "auth/user-not-found" || code === "auth/invalid-credential") setError("Invalid email or password.");
            else if (code === "auth/email-already-in-use") setError("This email is already registered.");
            else if (code === "auth/weak-password") setError("Password must be at least 6 characters.");
            else if (code === "auth/invalid-email") setError("Please enter a valid email.");
            else if (code === "auth/configuration-not-found") setError("Firebase Auth is not configured. Please enable Email/Password sign-in in your Firebase Console → Authentication → Sign-in method.");
            else if (code === "auth/network-request-failed") setError("Network error. Please check your connection.");
            else setError((err as Error).message || "Something went wrong.");
        }
        setLoading(false);
    }

    async function handleReset() {
        if (!email) { setError("Enter your email first, then click Forgot Password."); return; }
        try {
            await resetPassword(email);
            setResetSent(true);
            setError("");
        } catch {
            setError("Could not send reset email. Check the address.");
        }
    }

    return (
        <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-green-50/30 flex items-center justify-center p-4 md:p-6 antialiased relative overflow-hidden">
            {/* Subtle background orbs */}
            <div className="absolute top-[-200px] right-[-100px] w-[600px] h-[600px] bg-green-100/40 rounded-full blur-[100px] pointer-events-none" />
            <div className="absolute bottom-[-200px] left-[-100px] w-[500px] h-[500px] bg-emerald-100/30 rounded-full blur-[80px] pointer-events-none" />

            {/* Back to Home */}
            <Link
                to="/"
                className="absolute top-6 left-6 md:top-8 md:left-8 flex items-center gap-2 text-sm font-medium text-slate-400 hover:text-slate-800 transition-colors z-10 group"
            >
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to Home
            </Link>

            <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.5 }}
                className="w-full max-w-[920px] bg-white rounded-2xl md:rounded-3xl shadow-2xl shadow-slate-900/[0.08] flex overflow-hidden border border-slate-200/60 min-h-[580px] relative"
            >
                {/* Left: Form */}
                <div className="w-full lg:w-[55%] p-8 md:p-12 lg:p-14 flex flex-col justify-center relative">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={isLogin ? "login" : "signup"}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.3 }}
                            className="w-full max-w-[360px] mx-auto"
                        >
                            {/* Logo */}
                            <div className="flex items-center gap-2 mb-8">
                                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-600 to-emerald-500 flex items-center justify-center shadow-md shadow-green-600/20">
                                    <span className="text-white text-xs font-black">C</span>
                                </div>
                                <span className="text-sm font-bold text-slate-800 tracking-tight">CHIKITSA</span>
                            </div>

                            <div className="mb-6">
                                <h1 className="text-2xl md:text-[28px] font-extrabold text-slate-900 mb-1.5 tracking-tight">
                                    {isLogin ? "Welcome back" : "Create your account"}
                                </h1>
                                <p className="text-slate-400 text-sm">
                                    {isLogin
                                        ? "Sign in to access your personalized nutrition plan."
                                        : "Join 50K+ people improving their health with AI."}
                                </p>
                            </div>

                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, y: -8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="mb-4 px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-xs font-medium leading-relaxed"
                                >
                                    ⚠️ {error}
                                </motion.div>
                            )}

                            {resetSent && (
                                <motion.div
                                    initial={{ opacity: 0, y: -8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="mb-4 px-4 py-3 rounded-xl bg-green-50 border border-green-100 text-green-700 text-xs font-medium"
                                >
                                    ✅ Password reset email sent! Check your inbox.
                                </motion.div>
                            )}

                            <form className="space-y-4" onSubmit={handleSubmit}>
                                {!isLogin && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: "auto" }}
                                        exit={{ opacity: 0, height: 0 }}
                                        transition={{ duration: 0.3 }}
                                    >
                                        <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">
                                            Full Name
                                        </label>
                                        <input
                                            type="text"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            placeholder="Your full name"
                                            className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-green-500 focus:ring-4 focus:ring-green-500/10 outline-none transition-all placeholder:text-slate-300 text-sm"
                                        />
                                    </motion.div>
                                )}

                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">
                                        Email Address
                                    </label>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="name@example.com"
                                        required
                                        className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-green-500 focus:ring-4 focus:ring-green-500/10 outline-none transition-all placeholder:text-slate-300 text-sm"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">
                                        Password
                                    </label>
                                    <div className="relative">
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            placeholder="••••••••"
                                            required
                                            className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-green-500 focus:ring-4 focus:ring-green-500/10 outline-none transition-all placeholder:text-slate-300 text-sm pr-11"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                                        >
                                            {showPassword ? (
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                                                </svg>
                                            ) : (
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                </svg>
                                            )}
                                        </button>
                                    </div>
                                </div>

                                {isLogin && (
                                    <div className="flex justify-end">
                                        <button
                                            type="button"
                                            onClick={handleReset}
                                            className="text-xs font-semibold text-green-600 hover:text-green-700 transition-colors"
                                        >
                                            Forgot password?
                                        </button>
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full py-3.5 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 text-white font-semibold text-sm hover:from-green-700 hover:to-emerald-700 transition-all shadow-lg shadow-green-600/25 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                    {loading ? (
                                        <span className="flex items-center justify-center gap-2">
                                            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            {isLogin ? "Signing in..." : "Creating account..."}
                                        </span>
                                    ) : (
                                        isLogin ? "Sign In →" : "Get Started →"
                                    )}
                                </button>
                            </form>

                            <div className="mt-8 pt-6 border-t border-slate-100 text-center">
                                <p className="text-sm text-slate-500">
                                    {isLogin ? "Don't have an account?" : "Already have an account?"}
                                    <button
                                        onClick={() => { setIsLogin(!isLogin); setError(""); setResetSent(false); }}
                                        className="ml-1.5 font-bold text-green-600 hover:text-green-700 transition-colors"
                                    >
                                        {isLogin ? "Sign up free" : "Log in"}
                                    </button>
                                </p>
                            </div>
                        </motion.div>
                    </AnimatePresence>
                </div>

                {/* Right: Premium Visual Panel */}
                <div className="hidden lg:flex w-[45%] relative flex-col justify-between overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
                    {/* Animated glow orbs */}
                    <div className="absolute top-[-80px] right-[-60px] w-[300px] h-[300px] bg-green-500/25 rounded-full blur-[80px] animate-pulse" />
                    <div className="absolute bottom-[-60px] left-[-40px] w-[250px] h-[250px] bg-emerald-400/15 rounded-full blur-[60px]" />
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200px] h-[200px] bg-green-500/10 rounded-full blur-[60px]" />

                    {/* Grid pattern overlay */}
                    <div
                        className="absolute inset-0 opacity-[0.04]"
                        style={{
                            backgroundImage: "linear-gradient(rgba(255,255,255,.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.3) 1px, transparent 1px)",
                            backgroundSize: "40px 40px",
                        }}
                    />

                    {/* Content */}
                    <div className="relative z-10 p-10 flex-1 flex flex-col justify-center">
                        {/* CHIKITSA brand block */}
                        <div className="mb-10">
                            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.07] border border-white/[0.1] backdrop-blur-sm mb-6">
                                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                                <span className="text-[11px] text-green-300 font-semibold uppercase tracking-wider">AI-Powered Platform</span>
                            </div>

                            <h2 className="text-[40px] font-black text-white leading-[1.1] mb-2 tracking-tight">
                                CHIKITSA
                            </h2>
                            <p className="text-base text-slate-400 leading-relaxed max-w-[280px]">
                                Your personal AI nutritionist that adapts to your body, budget & local food ecosystem.
                            </p>
                        </div>

                        {/* Feature list */}
                        <div className="space-y-3 mb-10">
                            {[
                                { icon: "🧬", text: "Medically-aware meal plans" },
                                { icon: "💰", text: "Budget-optimized grocery lists" },
                                { icon: "🏆", text: "Gamified health challenges" },
                                { icon: "🐾", text: "Virtual pet companion" },
                                { icon: "🍽", text: "Shareable meal plans" },
                            ].map((f, i) => (
                                <motion.div
                                    key={f.text}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.3 + i * 0.1 }}
                                    className="flex items-center gap-3"
                                >
                                    <span className="text-sm">{f.icon}</span>
                                    <span className="text-sm text-slate-300 font-medium">{f.text}</span>
                                </motion.div>
                            ))}
                        </div>
                    </div>

                    {/* Bottom stats */}
                    <div className="relative z-10 px-10 pb-8">
                        <div className="flex gap-8 border-t border-white/[0.08] pt-6">
                            <div>
                                <div className="text-2xl font-black text-white">50K+</div>
                                <div className="text-[10px] text-slate-500 mt-0.5 uppercase tracking-widest font-bold">Users</div>
                            </div>
                            <div className="w-px bg-white/[0.08]" />
                            <div>
                                <div className="text-2xl font-black text-green-400">98%</div>
                                <div className="text-[10px] text-slate-500 mt-0.5 uppercase tracking-widest font-bold">Satisfaction</div>
                            </div>
                            <div className="w-px bg-white/[0.08]" />
                            <div>
                                <div className="text-2xl font-black text-emerald-300">2M+</div>
                                <div className="text-[10px] text-slate-500 mt-0.5 uppercase tracking-widest font-bold">Meals Planned</div>
                            </div>
                        </div>
                    </div>
                </div>
            </motion.div>
        </main>
    );
}
