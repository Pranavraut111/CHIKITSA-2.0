import { useState, useRef, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useGamification } from "../contexts/GamificationContext";
import { getMealPlanHistory, saveCommunityPost, getCommunityPosts, updateCommunityPost } from "../lib/firestore";
import type { CommunityPost } from "../lib/firestore";
import type { DailyMealPlan } from "../lib/types";
import { motion, AnimatePresence } from "framer-motion";
import { sanitize } from "../lib/validation";

type Tab = "feed" | "leaderboard" | "challenges";

interface Comment {
    id: string;
    author: string;
    content: string;
    timestamp: string;
}

const MEALS_LIST = ["breakfast", "lunch", "dinner", "snack"] as const;

export default function CommunityPage() {
    const { user, profile } = useAuth();
    const { challenges: userChallenges, acceptChallenge, updateChallengeProgress, achievements, userLevel, streak } = useGamification();
    const [tab, setTab] = useState<Tab>("feed");
    const [posts, setPosts] = useState<CommunityPost[]>([]);
    const [newPost, setNewPost] = useState("");
    const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());
    const [commentInput, setCommentInput] = useState<Record<string, string>>({});

    // Share Meal Plan modal
    const [showMealPicker, setShowMealPicker] = useState(false);
    const [mealHistory, setMealHistory] = useState<{ date: string; plan: DailyMealPlan }[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(false);

    // Share Achievement modal
    const [showAchievementPicker, setShowAchievementPicker] = useState(false);

    // Image upload
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [pendingImage, setPendingImage] = useState<string | null>(null);

    // Challenges
    const COMMUNITY_CHALLENGES = [
        { title: "No artificial sugar for 2 days", icon: "🚫🍬", target: 2, unit: "days", xpReward: 50, difficulty: "Medium" },
        { title: "Eat 5 servings of fruit", icon: "🍎", target: 5, unit: "servings", xpReward: 30, difficulty: "Easy" },
        { title: "Log every meal for 3 days", icon: "📝", target: 9, unit: "meals", xpReward: 40, difficulty: "Medium" },
        { title: "Try a new cuisine", icon: "🌍", target: 1, unit: "meal", xpReward: 25, difficulty: "Easy" },
        { title: "Drink 8 glasses of water today", icon: "💧", target: 8, unit: "glasses", xpReward: 20, difficulty: "Easy" },
        { title: "Cook at home for 5 days", icon: "👨‍🍳", target: 5, unit: "days", xpReward: 60, difficulty: "Hard" },
    ];

    // Load posts from Firestore on mount
    useEffect(() => {
        async function loadPosts() {
            try {
                const firestorePosts = await getCommunityPosts();
                setPosts(firestorePosts);
            } catch { /* ignore */ }
        }
        loadPosts();
    }, []);

    async function loadMealHistory() {
        if (!user) return;
        setLoadingHistory(true);
        try {
            const h = await getMealPlanHistory(user.uid, 14);
            setMealHistory(h);
        } catch { /* ignore */ }
        setLoadingHistory(false);
        setShowMealPicker(true);
    }

    async function handleShareMealPlan(entry: { date: string; plan: DailyMealPlan }) {
        const meals = MEALS_LIST.map(type => {
            const m = (entry.plan as any)[type];
            return m ? { type, name: m.name, calories: m.calories } : null;
        }).filter(Boolean) as { type: string; name: string; calories: number }[];

        const dateLabel = new Date(entry.date + "T00:00:00").toLocaleDateString("en", { weekday: "long", month: "short", day: "numeric" });
        const post: CommunityPost = {
            id: Date.now().toString(),
            author: sanitize(profile?.name || "You"),
            authorAvatar: profile?.name?.charAt(0) || "U",
            authorUid: user?.uid || "",
            content: sanitize(`Sharing my meal plan for ${dateLabel}! Total: ${entry.plan.totalCalories || 0} kcal`),
            type: "meal_plan",
            mealPlan: { date: entry.date, meals },
            likes: 0, likedBy: [], comments: [], timestamp: new Date().toISOString(),
        };
        setPosts(prev => [post, ...prev]);
        await saveCommunityPost(post);
        setShowMealPicker(false);
    }

    async function handleShareAchievement(ach: { title: string; icon: string }) {
        const post: CommunityPost = {
            id: Date.now().toString(),
            author: sanitize(profile?.name || "You"),
            authorAvatar: profile?.name?.charAt(0) || "U",
            authorUid: user?.uid || "",
            content: sanitize(`Just unlocked "${ach.title}"!`),
            type: "achievement",
            achievement: ach,
            likes: 0, likedBy: [], comments: [], timestamp: new Date().toISOString(),
        };
        setPosts(prev => [post, ...prev]);
        await saveCommunityPost(post);
        setShowAchievementPicker(false);
    }

    function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => setPendingImage(reader.result as string);
        reader.readAsDataURL(file);
    }

    async function handleLike(postId: string) {
        const uid = user?.uid || "";
        setPosts(prev => prev.map(p => {
            if (p.id !== postId) return p;
            const alreadyLiked = p.likedBy?.includes(uid);
            return {
                ...p,
                likes: alreadyLiked ? p.likes - 1 : p.likes + 1,
                likedBy: alreadyLiked ? (p.likedBy || []).filter(u => u !== uid) : [...(p.likedBy || []), uid],
            };
        }));
        const post = posts.find(p => p.id === postId);
        if (post) {
            const alreadyLiked = post.likedBy?.includes(uid);
            await updateCommunityPost(postId, {
                likes: alreadyLiked ? post.likes - 1 : post.likes + 1,
                likedBy: alreadyLiked ? (post.likedBy || []).filter(u => u !== uid) : [...(post.likedBy || []), uid],
            });
        }
    }

    async function handleComment(postId: string) {
        const text = sanitize(commentInput[postId] || "");
        if (!text) return;
        const comment: Comment = { id: Date.now().toString(), author: sanitize(profile?.name || "You"), content: text, timestamp: new Date().toISOString() };
        const post = posts.find(p => p.id === postId);
        const updatedComments = [...(post?.comments || []), comment];
        setPosts(prev => prev.map(p => p.id === postId ? { ...p, comments: updatedComments } : p));
        setCommentInput(prev => ({ ...prev, [postId]: "" }));
        await updateCommunityPost(postId, { comments: updatedComments });
    }

    async function handleNewPost() {
        const cleanContent = sanitize(newPost);
        if (!cleanContent && !pendingImage) return;
        const post: CommunityPost = {
            id: Date.now().toString(),
            author: sanitize(profile?.name || "You"),
            authorAvatar: profile?.name?.charAt(0) || "U",
            authorUid: user?.uid || "",
            content: cleanContent,
            type: pendingImage ? "photo" : "text",
            imageUrl: pendingImage || undefined,
            likes: 0, likedBy: [], comments: [], timestamp: new Date().toISOString(),
        };
        setPosts(prev => [post, ...prev]);
        await saveCommunityPost(post);
        setNewPost("");
        setPendingImage(null);
    }

    function toggleComments(postId: string) {
        setExpandedComments(prev => {
            const n = new Set(prev);
            n.has(postId) ? n.delete(postId) : n.add(postId);
            return n;
        });
    }

    function timeAgo(ts: string) {
        const diff = Date.now() - new Date(ts).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return "just now";
        if (mins < 60) return `${mins}m ago`;
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) return `${hrs}h ago`;
        return `${Math.floor(hrs / 24)}d ago`;
    }

    const unlockedAchievements = achievements.filter(a => a.unlockedAt);

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <div>
                <h1 className="text-xl font-bold text-slate-900 dark:text-white">Community</h1>
                <p className="text-xs text-slate-400 mt-0.5">Connect, compete, share your journey</p>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 p-1.5">
                {([
                    { key: "feed" as Tab, label: "Feed", icon: "📰" },
                    { key: "leaderboard" as Tab, label: "Leaderboard", icon: "🏆" },
                    { key: "challenges" as Tab, label: "Challenges", icon: "⚡" },
                ]).map(t => (
                    <button key={t.key} onClick={() => setTab(t.key)}
                        className={`flex-1 py-2.5 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${tab === t.key ? "bg-green-600 text-white shadow-sm" : "text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800"}`}>
                        <span>{t.icon}</span> {t.label}
                    </button>
                ))}
            </div>

            <AnimatePresence mode="wait">
                {/* ═══════ FEED TAB ═══════ */}
                {tab === "feed" && (
                    <motion.div key="feed" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
                        {/* New post */}
                        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-4">
                            <div className="flex gap-3">
                                <div className="w-9 h-9 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center text-sm font-bold text-green-700 dark:text-green-400 shrink-0">
                                    {profile?.name?.charAt(0) || "U"}
                                </div>
                                <div className="flex-1">
                                    <textarea value={newPost} onChange={e => setNewPost(e.target.value)} placeholder="Share your progress, meal plan, or thoughts..."
                                        className="w-full resize-none text-sm text-slate-800 dark:text-slate-200 bg-transparent outline-none placeholder:text-slate-400" rows={2} />
                                    {/* Pending image preview */}
                                    {pendingImage && (
                                        <div className="relative mt-2">
                                            <img src={pendingImage} alt="Upload preview" className="w-full max-h-48 object-cover rounded-xl" />
                                            <button onClick={() => setPendingImage(null)}
                                                className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center text-xs">✕</button>
                                        </div>
                                    )}
                                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                                        <div className="flex gap-2">
                                            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                                            <button onClick={() => fileInputRef.current?.click()}
                                                className="text-[10px] px-2.5 py-1 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-400 font-medium hover:text-slate-600 transition-colors">📸 Photo</button>
                                            <button onClick={loadMealHistory}
                                                className="text-[10px] px-2.5 py-1 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-400 font-medium hover:text-slate-600 transition-colors">🍽 Share Meal Plan</button>
                                            <button onClick={() => setShowAchievementPicker(true)}
                                                className="text-[10px] px-2.5 py-1 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-400 font-medium hover:text-slate-600 transition-colors">🏆 Achievement</button>
                                        </div>
                                        <button onClick={handleNewPost} disabled={!newPost.trim() && !pendingImage}
                                            className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-green-600 text-white hover:bg-green-700 transition-colors disabled:opacity-40">
                                            Post
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Meal Plan Picker Modal */}
                        {showMealPicker && (
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                                className="bg-white dark:bg-slate-900 rounded-2xl border border-green-200 dark:border-green-800 p-5">
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="text-sm font-bold text-slate-800 dark:text-white">📋 Select a meal plan to share</h3>
                                    <button onClick={() => setShowMealPicker(false)} className="text-xs text-slate-400 hover:text-slate-600">Close</button>
                                </div>
                                {loadingHistory && <div className="flex justify-center py-4"><div className="w-5 h-5 border-2 border-slate-200 border-t-green-600 rounded-full animate-spin" /></div>}
                                {!loadingHistory && mealHistory.length === 0 && <p className="text-xs text-slate-400 text-center py-4">No meal plans found. Generate one first!</p>}
                                <div className="space-y-2 max-h-64 overflow-y-auto">
                                    {mealHistory.map(entry => (
                                        <button key={entry.date} onClick={() => handleShareMealPlan(entry)}
                                            className="w-full text-left p-3 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-green-300 dark:hover:border-green-700 transition-colors">
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                                                    {new Date(entry.date + "T00:00:00").toLocaleDateString("en", { weekday: "short", month: "short", day: "numeric" })}
                                                </span>
                                                <span className="text-[10px] text-slate-400">{entry.plan.totalCalories || 0} kcal</span>
                                            </div>
                                            <div className="flex gap-2 mt-1">
                                                {MEALS_LIST.map(type => {
                                                    const m = (entry.plan as any)[type];
                                                    return m ? <span key={type} className="text-[9px] text-slate-400 truncate max-w-20">{m.name}</span> : null;
                                                })}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </motion.div>
                        )}

                        {/* Achievement Picker */}
                        {showAchievementPicker && (
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                                className="bg-white dark:bg-slate-900 rounded-2xl border border-amber-200 dark:border-amber-800 p-5">
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="text-sm font-bold text-slate-800 dark:text-white">🏆 Share an achievement</h3>
                                    <button onClick={() => setShowAchievementPicker(false)} className="text-xs text-slate-400 hover:text-slate-600">Close</button>
                                </div>
                                {unlockedAchievements.length === 0 ? (
                                    <p className="text-xs text-slate-400 text-center py-4">No achievements unlocked yet. Keep going!</p>
                                ) : (
                                    <div className="grid grid-cols-2 gap-2">
                                        {unlockedAchievements.map(ach => (
                                            <button key={ach.id} onClick={() => handleShareAchievement({ title: ach.title, icon: ach.icon })}
                                                className="text-left p-3 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-amber-300 dark:hover:border-amber-700 transition-colors">
                                                <span className="text-xl">{ach.icon}</span>
                                                <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 mt-1">{ach.title}</p>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </motion.div>
                        )}

                        {/* Posts */}
                        {posts.length === 0 && (
                            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-12 text-center">
                                <div className="text-4xl mb-3">💬</div>
                                <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Your feed is empty</p>
                                <p className="text-xs text-slate-400">Share a meal plan, upload a photo, or post about your progress!</p>
                            </div>
                        )}
                        {posts.map(post => (
                            <div key={post.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-5">
                                {/* Header */}
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center text-xs font-bold text-white">{post.authorAvatar}</div>
                                    <div className="flex-1">
                                        <p className="text-sm font-semibold text-slate-800 dark:text-white">{post.author}</p>
                                        <p className="text-[10px] text-slate-400">{timeAgo(post.timestamp)}</p>
                                    </div>
                                    {post.type === "achievement" && <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-[9px] font-bold text-amber-700 dark:text-amber-400">🏆 Achievement</span>}
                                    {post.type === "meal_plan" && <span className="px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-950 text-[9px] font-bold text-green-700 dark:text-green-400">🍽 Meal Plan</span>}
                                    {post.type === "photo" && <span className="px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-[9px] font-bold text-blue-700 dark:text-blue-400">📸 Photo</span>}
                                </div>

                                {/* Content */}
                                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed mb-3">{post.content}</p>

                                {/* Image */}
                                {post.imageUrl && (
                                    <img src={post.imageUrl} alt="Post" className="w-full rounded-xl mb-3 max-h-80 object-cover" />
                                )}

                                {/* Achievement badge */}
                                {post.achievement && (
                                    <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 mb-3">
                                        <span className="text-3xl">{post.achievement.icon}</span>
                                        <div>
                                            <p className="text-xs font-bold text-amber-700 dark:text-amber-400">{post.achievement.title}</p>
                                            <p className="text-[10px] text-amber-500">Achievement unlocked!</p>
                                        </div>
                                    </div>
                                )}

                                {/* Shared meal plan */}
                                {post.mealPlan && (
                                    <div className="grid grid-cols-2 gap-2 mb-3">
                                        {post.mealPlan.meals.map(m => (
                                            <div key={m.type} className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3">
                                                <span className="text-[9px] font-bold uppercase tracking-widest text-green-600">{m.type}</span>
                                                <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 mt-1 truncate">{m.name}</p>
                                                <p className="text-[10px] text-slate-400">{m.calories} kcal</p>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Actions */}
                                <div className="flex items-center gap-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                                    <button onClick={() => handleLike(post.id)}
                                        className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${post.likedBy?.includes(user?.uid || "") ? "text-red-500" : "text-slate-400 hover:text-red-500"}`}>
                                        {post.likedBy?.includes(user?.uid || "") ? "❤️" : "🤍"} {post.likes}
                                    </button>
                                    <button onClick={() => toggleComments(post.id)}
                                        className="flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-blue-500 transition-colors">
                                        💬 {post.comments.length}
                                    </button>
                                </div>

                                {/* Comments */}
                                {expandedComments.has(post.id) && (
                                    <div className="mt-3 space-y-2">
                                        {post.comments.map(c => (
                                            <div key={c.id} className="flex gap-2 pl-4 border-l-2 border-slate-100 dark:border-slate-800">
                                                <div className="flex-1">
                                                    <p className="text-xs"><span className="font-semibold text-slate-700 dark:text-slate-300">{c.author}</span> <span className="text-slate-400 ml-1">{timeAgo(c.timestamp)}</span></p>
                                                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">{c.content}</p>
                                                </div>
                                            </div>
                                        ))}
                                        <div className="flex gap-2 mt-2">
                                            <input value={commentInput[post.id] || ""} onChange={e => setCommentInput(prev => ({ ...prev, [post.id]: e.target.value }))}
                                                onKeyDown={e => e.key === "Enter" && handleComment(post.id)}
                                                placeholder="Write a comment..." className="flex-1 px-3 py-2 rounded-lg text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 outline-none" />
                                            <button onClick={() => handleComment(post.id)} className="px-3 py-2 rounded-lg text-xs font-semibold bg-green-600 text-white hover:bg-green-700 transition-colors">Send</button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </motion.div>
                )}

                {/* ═══════ LEADERBOARD TAB ═══════ */}
                {tab === "leaderboard" && (
                    <motion.div key="leaderboard" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
                        {/* Your rank card */}
                        <div className="bg-gradient-to-r from-green-600 to-emerald-600 rounded-2xl p-5 text-white">
                            <p className="text-xs font-semibold text-green-200 mb-1">Your Profile</p>
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center text-lg font-black">{profile?.name?.charAt(0) || "U"}</div>
                                <div>
                                    <p className="text-base font-bold">{profile?.name || "You"}</p>
                                    <p className="text-xs text-green-200">Level {userLevel} · 🔥 {streak} day streak</p>
                                </div>
                            </div>
                        </div>
                        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-8 text-center">
                            <div className="text-4xl mb-3">🏆</div>
                            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Leaderboard coming soon</p>
                            <p className="text-xs text-slate-400">Invite friends to compete and share your progress!</p>
                        </div>
                    </motion.div>
                )}

                {/* ═══════ CHALLENGES TAB ═══════ */}
                {tab === "challenges" && (
                    <motion.div key="challenges" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
                        {/* Active challenges */}
                        {userChallenges.filter(c => !c.completed).length > 0 && (
                            <div>
                                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Active Challenges</h3>
                                <div className="space-y-3">
                                    {userChallenges.filter(c => !c.completed).map(c => (
                                        <div key={c.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-green-200 dark:border-green-800 p-4">
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-2"><span className="text-lg">{c.icon}</span><span className="text-sm font-semibold text-slate-800 dark:text-white">{c.title}</span></div>
                                                <span className="text-xs font-bold text-green-600">+{c.xpReward} XP</span>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <div className="flex-1 h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                                                    <div className="h-full rounded-full bg-green-500 transition-all" style={{ width: `${(c.current / c.target) * 100}%` }} />
                                                </div>
                                                <span className="text-[10px] font-semibold text-slate-400">{c.current}/{c.target} {c.unit}</span>
                                                <button onClick={() => updateChallengeProgress(c.id, 1)} className="px-3 py-1 rounded-lg text-[10px] font-semibold bg-green-50 dark:bg-green-950 text-green-600 border border-green-200 dark:border-green-800 hover:bg-green-100 transition-colors">+1</button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Completed */}
                        {userChallenges.filter(c => c.completed).length > 0 && (
                            <div>
                                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Completed</h3>
                                <div className="space-y-2">
                                    {userChallenges.filter(c => c.completed).map(c => (
                                        <div key={c.id} className="bg-green-50 dark:bg-green-950/20 rounded-xl p-3 flex items-center gap-3 border border-green-200 dark:border-green-800">
                                            <span className="text-lg">{c.icon}</span>
                                            <span className="text-sm font-medium text-green-700 dark:text-green-400 flex-1">{c.title}</span>
                                            <span className="text-[10px] font-bold text-green-600">✓ +{c.xpReward} XP</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Available */}
                        <div>
                            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Available Challenges</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {COMMUNITY_CHALLENGES.map((ch, i) => (
                                    <div key={i} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-4 hover:border-green-200 dark:hover:border-green-800 transition-colors">
                                        <div className="flex items-start justify-between mb-2">
                                            <span className="text-2xl">{ch.icon}</span>
                                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${ch.difficulty === "Easy" ? "bg-green-100 dark:bg-green-950 text-green-600" : ch.difficulty === "Hard" ? "bg-red-100 dark:bg-red-950 text-red-600" : "bg-amber-100 dark:bg-amber-950 text-amber-600"}`}>{ch.difficulty}</span>
                                        </div>
                                        <p className="text-sm font-semibold text-slate-800 dark:text-white mb-1">{ch.title}</p>
                                        <p className="text-[10px] text-slate-400 mb-3">Target: {ch.target} {ch.unit} · +{ch.xpReward} XP</p>
                                        <button onClick={() => acceptChallenge(i)}
                                            className="w-full py-2 rounded-lg text-xs font-semibold bg-green-50 dark:bg-green-950/30 text-green-600 dark:text-green-400 border border-green-200 dark:border-green-800 hover:bg-green-100 transition-colors">
                                            Accept Challenge
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
