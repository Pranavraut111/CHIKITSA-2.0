import { useEffect, useState } from "react";
import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import { useGamification } from "../contexts/GamificationContext";
import { motion, AnimatePresence } from "framer-motion";
import VirtualPet from "../components/VirtualPet";

const NAV = [
    { href: "/dashboard", label: "Dashboard", d: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" },
    { href: "/meals", label: "Meal Plan", d: "M12 6v6m0 0v6m0-6h6m-6 0H6" },
    { href: "/grocery", label: "Grocery", d: "M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" },
    { href: "/map", label: "Nearby Stores", d: "M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" },
    { href: "/log", label: "Food Log", d: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" },
    { href: "/chat", label: "AI Chat", d: "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" },
    { href: "/achievements", label: "Achievements", d: "M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" },
    { href: "/community", label: "Community", d: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" },
    { href: "/profile", label: "Profile", d: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" },
];

export default function AppLayout() {
    const { user, profile, loading, logout } = useAuth();
    const { theme, toggle } = useTheme();
    const { streak, userLevel, userXP } = useGamification();
    const navigate = useNavigate();
    const location = useLocation();
    const pathname = location.pathname;
    const [mobileOpen, setMobileOpen] = useState(false);

    useEffect(() => {
        if (!loading && !user) navigate("/auth");
    }, [user, loading, navigate]);

    useEffect(() => {
        if (!loading && user && profile && !profile.onboardingComplete && pathname !== "/onboarding") {
            navigate("/onboarding");
        }
    }, [user, profile, loading, pathname, navigate]);

    useEffect(() => { setMobileOpen(false); }, [pathname]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white dark:bg-slate-950">
                <div className="w-7 h-7 rounded-full border-2 border-slate-200 dark:border-slate-700 border-t-green-600 animate-spin" />
            </div>
        );
    }

    if (!user) return null;

    const Sidebar = () => (
        <div className="flex flex-col h-full">
            {/* Logo + streak */}
            <div className="h-14 flex items-center justify-between px-5 border-b border-slate-100 dark:border-slate-800 shrink-0">
                <Link to="/dashboard" className="text-base font-bold tracking-tight text-slate-900 dark:text-white">
                    CHIKITSA
                </Link>
                {streak > 0 && (
                    <span className="text-xs font-bold bg-orange-100 dark:bg-orange-950 text-orange-600 dark:text-orange-400 px-2 py-0.5 rounded-full">
                        🔥 {streak}
                    </span>
                )}
            </div>

            {/* Nav */}
            <nav className="flex-1 py-2 px-2.5 space-y-0.5 overflow-y-auto">
                {NAV.map((item) => {
                    const active = pathname === item.href;
                    return (
                        <Link
                            key={item.href}
                            to={item.href}
                            className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors
                ${active
                                    ? "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400"
                                    : "text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800/60"
                                }`}
                        >
                            <svg className="w-[18px] h-[18px] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                                <path strokeLinecap="round" strokeLinejoin="round" d={item.d} />
                            </svg>
                            {item.label}
                        </Link>
                    );
                })}
            </nav>

            {/* Bottom */}
            <div className="px-2.5 pb-3 space-y-1 border-t border-slate-100 dark:border-slate-800 pt-2">
                {/* User Level widget */}
                <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 border border-green-100 dark:border-green-900">
                    <div className="w-8 h-8 rounded-lg bg-green-600 flex items-center justify-center text-xs font-black text-white shadow-sm">{userLevel}</div>
                    <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-bold text-green-700 dark:text-green-400">Level {userLevel}</p>
                        <div className="w-full h-1 rounded-full bg-green-200 dark:bg-green-900 mt-0.5">
                            <div className="h-full rounded-full bg-green-500 transition-all" style={{ width: `${(userXP / (userLevel * 100)) * 100}%` }} />
                        </div>
                        <p className="text-[9px] text-green-500 mt-0.5">{userXP}/{userLevel * 100} XP</p>
                    </div>
                </div>

                {/* Theme toggle */}
                <button
                    onClick={toggle}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800/60 transition-colors"
                >
                    {theme === "light" ? (
                        <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                        </svg>
                    ) : (
                        <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                    )}
                    {theme === "light" ? "Dark Mode" : "Light Mode"}
                </button>

                {/* User */}
                <div className="flex items-center gap-2.5 px-3 py-2">
                    <div className="w-7 h-7 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center text-[11px] font-bold text-green-700 dark:text-green-400 shrink-0">
                        {profile?.name?.charAt(0)?.toUpperCase() || "U"}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium text-slate-800 dark:text-slate-200 truncate">{profile?.name || "User"}</p>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate">{user.email}</p>
                    </div>
                </div>

                <button
                    onClick={() => { logout(); navigate("/auth"); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Sign Out
                </button>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-200">
            {/* Desktop sidebar */}
            <aside className="hidden md:block fixed inset-y-0 left-0 w-56 bg-white dark:bg-slate-900 border-r border-slate-100 dark:border-slate-800 z-40">
                <Sidebar />
            </aside>

            {/* Mobile overlay */}
            <AnimatePresence>
                {mobileOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="md:hidden fixed inset-0 bg-black/30 z-40" onClick={() => setMobileOpen(false)}
                        />
                        <motion.aside
                            initial={{ x: -224 }} animate={{ x: 0 }} exit={{ x: -224 }}
                            transition={{ type: "spring", damping: 25, stiffness: 300 }}
                            className="md:hidden fixed inset-y-0 left-0 w-56 bg-white dark:bg-slate-900 border-r border-slate-100 dark:border-slate-800 z-50"
                        >
                            <Sidebar />
                        </motion.aside>
                    </>
                )}
            </AnimatePresence>

            {/* Mobile top bar */}
            <div className="md:hidden fixed top-0 left-0 right-0 h-12 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 z-30 flex items-center justify-between px-4">
                <button onClick={() => setMobileOpen(true)} className="text-slate-700 dark:text-slate-300">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                </button>
                <span className="text-sm font-bold text-slate-900 dark:text-white">CHIKITSA</span>
                <button onClick={toggle} className="text-slate-500 dark:text-slate-400">
                    {theme === "light" ? (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                        </svg>
                    ) : (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                    )}
                </button>
            </div>

            {/* Main content */}
            <main className="md:ml-56 min-h-screen">
                <div className="p-4 pt-16 md:p-6 md:pt-6 max-w-5xl mx-auto">
                    <Outlet />
                </div>
            </main>

            {/* Virtual Pet floating widget */}
            <VirtualPet />
        </div>
    );
}
