import { useRef, useEffect, useState, useCallback } from "react";
import {
    motion,
    useScroll,
    useTransform,
    useMotionValueEvent,
    AnimatePresence,
} from "framer-motion";
import { Link } from "react-router-dom";

/* ═══════════════════ CONSTANTS ═══════════════════ */
const TOTAL_FRAMES = 240;

function frameSrc(i: number) {
    return `/sequence/frame_${String(i).padStart(3, "0")}.jpg`;
}

/* ═══════════════════ TEXT STAGES ═══════════════════ */
interface Stage {
    start: number;
    end: number;
    heading: string;
    sub?: string;
    cta?: boolean;
}

const STAGES: Stage[] = [
    {
        start: 0,
        end: 0.15,
        heading: "CHIKITSA",
        sub: "AI-Powered Adaptive Nutrition",
    },
    {
        start: 0.24,
        end: 0.40,
        heading: "Your body produces millions\nof biological signals.",
    },
    {
        start: 0.50,
        end: 0.68,
        heading: "Our AI understands them.",
    },
    {
        start: 0.80,
        end: 1.0,
        heading: "Personalized nutrition.\nFinally.",
        cta: true,
    },
];

/* ═══════════════════ NAV ═══════════════════ */
const NAV_LINKS = ["Home", "About", "Features", "How It Works", "Contact"];

/* ═══════════════════ STATS ═══════════════════ */
const STATS = [
    { value: "50K+", label: "Plans Generated" },
    { value: "98%", label: "User Satisfaction" },
    { value: "200+", label: "Conditions Supported" },
    { value: "15+", label: "Countries" },
];

/* ═══════════════════ FEATURES ═══════════════════ */
const FEATURE_CARDS = [
    {
        icon: "🧬",
        title: "Hyper-Personalized",
        desc: "Deep health profiling through 30+ parameter analysis of your unique biology, lifestyle, and preferences.",
    },
    {
        icon: "💰",
        title: "Budget-Aware",
        desc: "Smart meal optimization that respects your weekly budget while maximizing nutritional value.",
    },
    {
        icon: "📍",
        title: "Local Intelligence",
        desc: "Recommendations tailored to ingredients actually available at your neighborhood stores.",
    },
    {
        icon: "🔬",
        title: "Explainable AI",
        desc: 'Every recommendation comes with a clear "Why this meal?" explanation you can trust.',
    },
    {
        icon: "📊",
        title: "Adaptive Learning",
        desc: "Plans evolve dynamically as you log meals, skip foods, track weight, and change routines.",
    },
    {
        icon: "🛒",
        title: "Smart Grocery Lists",
        desc: "Auto-generated, cost-optimized shopping lists with quantity estimates and substitution suggestions.",
    },
];

/* ═══════════════════ STEPS ═══════════════════ */
const STEPS = [
    {
        num: "01",
        title: "Complete Your Health Profile",
        desc: "Answer a detailed questionnaire covering health conditions, lifestyle, diet preferences, budget, and local food access.",
    },
    {
        num: "02",
        title: "AI Generates Your Plan",
        desc: "Our multi-objective optimization engine creates meals balancing nutrition, medical constraints, budget, and availability.",
    },
    {
        num: "03",
        title: "Track, Adapt & Evolve",
        desc: "Log meals, track groceries, chat with your AI companion — watch CHIKITSA learn and improve your plan daily.",
    },
];

/* ═══════════════════════════════════════════════════ */
/*                   MAIN COMPONENT                   */
/* ═══════════════════════════════════════════════════ */
export default function HeroScroll() {
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const imagesRef = useRef<HTMLImageElement[]>([]);
    const rafRef = useRef<number>(0);
    const currentFrameRef = useRef<number>(0);

    const [loaded, setLoaded] = useState(false);
    const [loadProgress, setLoadProgress] = useState(0);
    const [progress, setProgress] = useState(0);
    const [navScrolled, setNavScrolled] = useState(false);

    const { scrollYProgress } = useScroll({
        target: containerRef,
        offset: ["start start", "end end"],
    });

    useMotionValueEvent(scrollYProgress, "change", (v) => setProgress(v));

    useEffect(() => {
        const handleScroll = () => setNavScrolled(window.scrollY > 60);
        window.addEventListener("scroll", handleScroll, { passive: true });
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    /* preload */
    useEffect(() => {
        let cancelled = false;
        let count = 0;
        const imgs: HTMLImageElement[] = new Array(TOTAL_FRAMES);
        for (let i = 0; i < TOTAL_FRAMES; i++) {
            const img = new Image();
            img.src = frameSrc(i + 1);
            const onDone = () => {
                if (cancelled) return;
                count++;
                setLoadProgress(count / TOTAL_FRAMES);
                if (count === TOTAL_FRAMES) {
                    imagesRef.current = imgs;
                    setLoaded(true);
                }
            };
            img.onload = onDone;
            img.onerror = onDone;
            imgs[i] = img;
        }
        return () => { cancelled = true; };
    }, []);

    /* draw — COVER scaling, crop watermark */
    const drawFrame = useCallback((index: number) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        const img = imagesRef.current[index];
        if (!img || !img.complete || img.naturalWidth === 0) return;

        const dpr = window.devicePixelRatio || 1;
        const w = canvas.clientWidth;
        const h = canvas.clientHeight;

        if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
            canvas.width = w * dpr;
            canvas.height = h * dpr;
        }

        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, w, h);

        const cropBottom = 0.90;
        const srcW = img.naturalWidth;
        const srcH = img.naturalHeight * cropBottom;

        const imgRatio = srcW / srcH;
        const canvasRatio = w / h;
        let dw: number, dh: number, dx: number, dy: number;

        if (imgRatio > canvasRatio) {
            dh = h;
            dw = h * imgRatio;
            dx = (w - dw) / 2;
            dy = 0;
        } else {
            dw = w;
            dh = w / imgRatio;
            dx = 0;
            dy = (h - dh) / 2;
        }

        ctx.drawImage(img, 0, 0, srcW, srcH, dx, dy, dw, dh);
    }, []);

    useEffect(() => {
        if (!loaded) return;
        const update = () => {
            const p = scrollYProgress.get();
            const idx = Math.min(Math.floor(p * (TOTAL_FRAMES - 1)), TOTAL_FRAMES - 1);
            if (idx !== currentFrameRef.current) {
                currentFrameRef.current = idx;
                drawFrame(idx);
            }
            rafRef.current = requestAnimationFrame(update);
        };
        rafRef.current = requestAnimationFrame(update);
        drawFrame(0);
        return () => cancelAnimationFrame(rafRef.current);
    }, [loaded, scrollYProgress, drawFrame]);

    useEffect(() => {
        if (!loaded) return;
        const h = () => drawFrame(currentFrameRef.current);
        window.addEventListener("resize", h);
        return () => window.removeEventListener("resize", h);
    }, [loaded, drawFrame]);

    function stageOpacity(s: Stage) {
        const fi = 0.05, fo = 0.05;
        if (progress < s.start) return 0;
        if (progress < s.start + fi) return (progress - s.start) / fi;
        if (progress < s.end - fo) return 1;
        if (progress < s.end) return (s.end - progress) / fo;
        return 0;
    }

    /* ═══════════════════ RENDER ═══════════════════ */
    return (
        <>
            {/* ═══════ LOADING ═══════ */}
            <AnimatePresence>
                {!loaded && (
                    <motion.div
                        key="loader"
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.5 }}
                        className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-white"
                    >
                        <div className="relative w-16 h-16 mb-6">
                            <div className="absolute inset-0 rounded-full border-2 border-slate-200" />
                            <div
                                className="absolute inset-0 rounded-full border-2 border-t-green-600 animate-spin"
                                style={{ animationDuration: "0.7s" }}
                            />
                        </div>
                        <div className="w-48 h-[3px] bg-slate-100 rounded-full overflow-hidden">
                            <motion.div
                                className="h-full bg-green-600 rounded-full"
                                style={{ width: `${loadProgress * 100}%` }}
                            />
                        </div>
                        <p className="mt-3 text-[10px] tracking-[0.35em] uppercase text-slate-400 font-medium">
                            Loading · {Math.round(loadProgress * 100)}%
                        </p>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ═══════ NAVBAR ═══════ */}
            <nav
                className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 bg-white/90 backdrop-blur-md ${navScrolled ? "border-b border-slate-200 shadow-sm" : "border-b border-transparent"
                    }`}
            >
                <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="hidden md:flex items-center gap-8">
                        {NAV_LINKS.map((link) => (
                            <a
                                key={link}
                                href={`#${link.toLowerCase().replace(/ /g, "-")}`}
                                className="text-slate-500 text-[13px] font-medium tracking-wide hover:text-slate-900 transition-colors duration-300"
                            >
                                {link}
                            </a>
                        ))}
                    </div>
                    <Link to="/auth" className="px-5 py-2 rounded-full text-xs font-semibold text-white bg-green-600 hover:bg-green-700 transition-colors duration-300 shadow-md shadow-green-600/20 cursor-pointer ml-auto">
                        Get Started
                    </Link>
                </div>
            </nav>

            {/* ═══════ HERO SCROLL ═══════ */}
            <section ref={containerRef} className="relative h-[500vh]" id="home">
                <div className="sticky top-0 h-screen w-full overflow-hidden">
                    <canvas
                        ref={canvasRef}
                        className="absolute inset-0 w-full h-full"
                        style={{ opacity: loaded ? 1 : 0, transition: "opacity 0.6s" }}
                    />

                    {/* Bottom gradient for text legibility */}
                    <div
                        className="pointer-events-none absolute inset-0"
                        style={{
                            background: `linear-gradient(
                to bottom,
                rgba(255,255,255,0.1) 0%,
                transparent 25%,
                transparent 55%,
                rgba(255,255,255,0.6) 80%,
                rgba(255,255,255,0.95) 100%
              )`,
                        }}
                    />

                    {/* Text at BOTTOM */}
                    {STAGES.map((stage, i) => {
                        const op = stageOpacity(stage);
                        const yOff = (1 - op) * 24;
                        return (
                            <div
                                key={i}
                                className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col items-center text-center px-6 pb-14 md:pb-20"
                                style={{
                                    opacity: op,
                                    transform: `translateY(${yOff}px)`,
                                    willChange: "opacity, transform",
                                }}
                            >
                                <h2
                                    className={`font-bold tracking-tight leading-[1.08] whitespace-pre-line ${i === 0
                                        ? "text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl"
                                        : "text-2xl sm:text-3xl md:text-4xl lg:text-5xl"
                                        }`}
                                    style={{ color: "#0f172a" }}
                                >
                                    {stage.heading}
                                </h2>
                                {stage.sub && (
                                    <p className="mt-3 md:mt-4 text-sm sm:text-base md:text-lg text-slate-500 tracking-wide font-light max-w-xl">
                                        {stage.sub}
                                    </p>
                                )}
                                {stage.cta && op > 0.5 && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 12 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.15, duration: 0.4 }}
                                        className="pointer-events-auto mt-6"
                                    >
                                        <Link
                                            to="/auth"
                                            className="inline-block px-7 py-3 rounded-full text-sm font-semibold
                                 text-white bg-green-600 hover:bg-green-700
                                 shadow-lg shadow-green-600/25
                                 transition-all duration-300 cursor-pointer"
                                        >
                                            Start Your Health Profile
                                        </Link>
                                    </motion.div>
                                )}
                            </div>
                        );
                    })}

                    {/* Scroll hint */}
                    <motion.div
                        className="absolute bottom-5 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5"
                        style={{ opacity: useTransform(scrollYProgress, [0, 0.04], [1, 0]) }}
                    >
                        <span className="text-[9px] uppercase tracking-[0.35em] text-slate-400 font-medium">
                            Scroll
                        </span>
                        <div className="w-5 h-7 rounded-full border border-slate-300 flex items-start justify-center pt-1">
                            <motion.div
                                className="w-0.5 h-1.5 rounded-full bg-green-600"
                                animate={{ y: [0, 7, 0] }}
                                transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
                            />
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* ═══════ ABOUT ═══════ */}
            <section id="about" className="relative z-10 bg-white py-24 md:py-32">
                <div className="max-w-5xl mx-auto px-6">
                    <motion.div
                        initial={{ opacity: 0, y: 40 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, amount: 0.4 }}
                        transition={{ duration: 0.7 }}
                        className="text-center"
                    >
                        <span className="inline-block px-4 py-1.5 rounded-full text-[11px] uppercase tracking-[0.2em] font-semibold
                             bg-green-50 text-green-700 border border-green-200 mb-6">
                            About CHIKITSA
                        </span>
                        <h3 className="text-3xl md:text-5xl lg:text-6xl font-bold text-slate-900 mb-6 leading-tight">
                            The Future of{" "}
                            <span className="text-green-600">Nutrition Science</span>
                        </h3>
                        <p className="text-slate-500 text-sm md:text-base lg:text-lg max-w-2xl mx-auto leading-relaxed">
                            CHIKITSA is an AI-driven nutrition intelligence platform that generates
                            personalized, adaptive diet plans based on your health profile, lifestyle,
                            medical conditions, budget constraints, and local food availability —
                            making healthy eating scientifically personalized, economically feasible,
                            and easily actionable.
                        </p>
                    </motion.div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-16 md:mt-20">
                        {STATS.map((stat, i) => (
                            <motion.div
                                key={stat.label}
                                className="text-center p-6 rounded-2xl bg-slate-50 border border-slate-100"
                                initial={{ opacity: 0, y: 24 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: 0.1 * i, duration: 0.5 }}
                            >
                                <div className="text-3xl md:text-4xl font-black text-green-600 mb-1">
                                    {stat.value}
                                </div>
                                <p className="text-slate-400 text-xs md:text-sm">{stat.label}</p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ═══════ FEATURES ═══════ */}
            <section id="features" className="relative z-10 bg-slate-50 py-24 md:py-32">
                <div className="max-w-6xl mx-auto px-6">
                    <motion.div
                        className="text-center mb-16"
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, amount: 0.5 }}
                        transition={{ duration: 0.7 }}
                    >
                        <span className="inline-block px-4 py-1.5 rounded-full text-[11px] uppercase tracking-[0.2em] font-semibold
                             bg-blue-50 text-blue-600 border border-blue-200 mb-5">
                            Features
                        </span>
                        <h3 className="text-3xl md:text-5xl font-bold text-slate-900">
                            Intelligence That Adapts to{" "}
                            <span className="text-blue-600">You</span>
                        </h3>
                    </motion.div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
                        {FEATURE_CARDS.map((card, i) => (
                            <motion.div
                                key={card.title}
                                className="group h-[260px] cursor-pointer"
                                style={{ perspective: "1000px" }}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: 0.08 * i, duration: 0.5 }}
                            >
                                <div className="relative w-full h-full transition-transform duration-700 group-hover:[transform:rotateY(180deg)] [transform-style:preserve-3d]">
                                    {/* Front Side */}
                                    <div className="absolute inset-0 [backface-visibility:hidden] rounded-2xl border border-slate-200 bg-white p-6 flex flex-col justify-center items-center text-center shadow-sm group-hover:shadow-md transition-shadow">
                                        <div className="text-4xl mb-5">{card.icon}</div>
                                        <h4 className="text-lg font-semibold text-slate-900 px-2">{card.title}</h4>
                                        <span className="mt-5 text-[10px] sm:text-xs uppercase tracking-widest text-slate-400 font-medium flex items-center gap-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
                                            Hover to explore
                                        </span>
                                    </div>
                                    {/* Back Side */}
                                    <div className="absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)] rounded-2xl border border-green-200 bg-green-50/90 p-6 flex flex-col justify-center items-center text-center shadow-lg shadow-green-100/50">
                                        <div className="w-12 h-12 shrink-0 rounded-full bg-green-100 flex items-center justify-center text-green-600 mb-3 text-2xl shadow-sm">
                                            {card.icon}
                                        </div>
                                        <h4 className="text-sm font-bold text-slate-900 mb-2">{card.title}</h4>
                                        <p className="text-sm text-slate-600 leading-relaxed px-2">{card.desc}</p>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ═══════ HOW IT WORKS ═══════ */}
            <section id="how-it-works" className="relative z-10 bg-white py-24 md:py-32">
                <div className="max-w-5xl mx-auto px-6">
                    <motion.div
                        className="text-center mb-16"
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, amount: 0.5 }}
                        transition={{ duration: 0.7 }}
                    >
                        <span className="inline-block px-4 py-1.5 rounded-full text-[11px] uppercase tracking-[0.2em] font-semibold
                             bg-green-50 text-green-700 border border-green-200 mb-5">
                            How It Works
                        </span>
                        <h3 className="text-3xl md:text-5xl font-bold text-slate-900">
                            Three Steps to <span className="text-green-600">Better Health</span>
                        </h3>
                    </motion.div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
                        {STEPS.map((step, i) => (
                            <motion.div
                                key={step.num}
                                className="relative rounded-2xl border border-slate-200 bg-slate-50 p-8 group
                           hover:border-green-300 hover:shadow-lg hover:shadow-green-50
                           transition-all duration-500"
                                initial={{ opacity: 0, y: 24 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: 0.15 * i, duration: 0.55 }}
                            >
                                <span className="text-7xl font-black text-slate-100 absolute top-3 right-5 select-none
                                 group-hover:text-green-100 transition-colors duration-500">
                                    {step.num}
                                </span>
                                <div className="w-10 h-10 rounded-xl bg-green-100 text-green-700 flex items-center justify-center mb-5 text-sm font-bold">
                                    {step.num}
                                </div>
                                <h4 className="text-lg font-semibold text-slate-900 mb-2.5 relative z-10">
                                    {step.title}
                                </h4>
                                <p className="text-sm text-slate-500 leading-relaxed relative z-10">
                                    {step.desc}
                                </p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ═══════ AI COMPANION ═══════ */}
            <section className="relative z-10 bg-slate-50 py-24 md:py-32">
                <div className="max-w-5xl mx-auto px-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-16 items-center">
                        {/* left */}
                        <motion.div
                            initial={{ opacity: 0, x: -30 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.7 }}
                        >
                            <span className="inline-block px-4 py-1.5 rounded-full text-[11px] uppercase tracking-[0.2em] font-semibold
                               bg-purple-50 text-purple-600 border border-purple-200 mb-5">
                                AI Companion
                            </span>
                            <h3 className="text-3xl md:text-4xl lg:text-5xl font-bold text-slate-900 mb-5 leading-tight">
                                Your Personal <span className="text-purple-600">Health Coach</span>
                            </h3>
                            <p className="text-slate-500 text-sm md:text-base leading-relaxed mb-8">
                                Chat with your AI nutrition assistant. Get instant answers about your diet,
                                adjust meal plans on the fly, log food intake naturally, and receive
                                science-backed dietary advice — all conversationally.
                            </p>
                            <div className="space-y-3">
                                {[
                                    "Understand meal recommendations instantly",
                                    "Adjust plans with natural language",
                                    "Log meals by simply describing them",
                                    "Get real-time dietary advice",
                                ].map((item, i) => (
                                    <motion.div
                                        key={item}
                                        className="flex items-center gap-3"
                                        initial={{ opacity: 0, x: -16 }}
                                        whileInView={{ opacity: 1, x: 0 }}
                                        viewport={{ once: true }}
                                        transition={{ delay: 0.1 * i + 0.3, duration: 0.4 }}
                                    >
                                        <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                                            <svg className="w-3 h-3 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                            </svg>
                                        </div>
                                        <span className="text-slate-600 text-sm">{item}</span>
                                    </motion.div>
                                ))}
                            </div>
                        </motion.div>

                        {/* right: chat mockup */}
                        <motion.div
                            initial={{ opacity: 0, x: 30 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.7, delay: 0.2 }}
                        >
                            <div className="rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-100 p-5 space-y-4">
                                <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-500 to-teal-500 flex items-center justify-center text-white text-xs font-bold">
                                        AI
                                    </div>
                                    <div>
                                        <p className="text-slate-800 text-sm font-medium">CHIKITSA AI</p>
                                        <p className="text-green-500 text-[10px]">● Online</p>
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <div className="flex justify-end">
                                        <div className="bg-green-50 border border-green-100 rounded-2xl rounded-br-md px-4 py-2.5 max-w-[80%]">
                                            <p className="text-slate-700 text-sm">I skipped lunch today.</p>
                                        </div>
                                    </div>
                                    <div className="flex justify-start">
                                        <div className="bg-slate-50 border border-slate-100 rounded-2xl rounded-bl-md px-4 py-2.5 max-w-[85%]">
                                            <p className="text-slate-600 text-sm leading-relaxed">
                                                No worries! Consider a high-protein snack like{" "}
                                                <span className="text-green-600 font-medium">Greek yogurt with almonds</span> —
                                                it&apos;ll help maintain your energy balance and keep you on track. 💪
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 pt-2">
                                    <div className="flex-1 rounded-full bg-slate-50 border border-slate-200 px-4 py-2.5">
                                        <p className="text-slate-400 text-sm">Ask your AI coach...</p>
                                    </div>
                                    <div className="w-9 h-9 rounded-full bg-green-600 flex items-center justify-center shrink-0">
                                        <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                                        </svg>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* ═══════ CTA ═══════ */}
            <section id="contact" className="relative z-10 bg-green-600 py-20 md:py-28">
                <div className="max-w-3xl mx-auto text-center px-6">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.7 }}
                    >
                        <h3 className="text-3xl md:text-5xl lg:text-6xl font-bold text-white mb-5">
                            Nutrition, Reimagined.
                        </h3>
                        <p className="text-white/70 text-sm md:text-base mb-10 max-w-lg mx-auto">
                            Join the future of health. CHIKITSA bridges the gap between medical
                            nutrition science and real-world food choices.
                        </p>
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                            <Link to="/auth" className="px-8 py-3.5 rounded-full text-sm font-semibold tracking-wide
                                 text-green-700 bg-white hover:bg-green-50
                                 shadow-lg shadow-green-800/20
                                 transition-all duration-300 cursor-pointer inline-block">
                                Get Early Access
                            </Link>
                            <button className="px-8 py-3.5 rounded-full text-sm font-semibold tracking-wide
                                 text-white border-2 border-white/40
                                 hover:border-white hover:bg-white/10
                                 transition-all duration-300 cursor-pointer">
                                Learn More
                            </button>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* ═══════ FOOTER ═══════ */}
            <footer className="bg-slate-900 py-12">
                <div className="max-w-6xl mx-auto px-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
                        <div>
                            <h4 className="text-white font-bold text-sm mb-3">CHIKITSA</h4>
                            <p className="text-slate-400 text-xs leading-relaxed">
                                AI-Powered Adaptive Nutrition. Making healthy eating scientifically
                                personalized, economically feasible, and easily actionable.
                            </p>
                        </div>
                        <div>
                            <h4 className="text-slate-300 font-semibold text-xs uppercase tracking-wider mb-3">Navigation</h4>
                            <div className="flex flex-col gap-2">
                                {NAV_LINKS.map((link) => (
                                    <a key={link} href={`#${link.toLowerCase().replace(/ /g, "-")}`}
                                        className="text-slate-400 text-xs hover:text-white transition-colors duration-300">
                                        {link}
                                    </a>
                                ))}
                            </div>
                        </div>
                        <div>
                            <h4 className="text-slate-300 font-semibold text-xs uppercase tracking-wider mb-3">Legal</h4>
                            <div className="flex flex-col gap-2">
                                {["Privacy Policy", "Terms of Service", "Cookie Policy"].map((l) => (
                                    <a key={l} href="#" className="text-slate-400 text-xs hover:text-white transition-colors duration-300">
                                        {l}
                                    </a>
                                ))}
                            </div>
                        </div>
                    </div>
                    <div className="border-t border-slate-800 pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
                        <p className="text-[10px] text-slate-500 tracking-widest uppercase">
                            © 2026 CHIKITSA · AI-Powered Adaptive Nutrition
                        </p>
                        <div className="flex items-center gap-4">
                            {["Twitter", "LinkedIn", "GitHub"].map((s) => (
                                <a key={s} href="#" className="text-slate-500 text-[10px] uppercase tracking-wider hover:text-white transition-colors">
                                    {s}
                                </a>
                            ))}
                        </div>
                    </div>
                </div>
            </footer>
        </>
    );
}
