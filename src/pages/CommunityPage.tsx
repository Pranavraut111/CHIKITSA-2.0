import { useState, useRef, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useGamification } from "../contexts/GamificationContext";
import {
    getMealPlanHistory, saveCommunityPost, getCommunityPosts, updateCommunityPost,
    getLeaderboard, sendFriendRequest, acceptFriendRequest, declineFriendRequest,
    getFriendRequests, getFriends, saveCommunityChallenge, getCommunityChallenges,
    acceptCommunityChallenge,
} from "../lib/firestore";
import type { CommunityPost, LeaderboardEntry, FriendRequest, CommChallenge } from "../lib/firestore";
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

const BUILTIN_CHALLENGES = [
    { title: "No artificial sugar for 2 days", icon: "🚫🍬", target: 2, unit: "days", xpReward: 50, difficulty: "Medium" as const, description: "Avoid added sugars for 48 hours" },
    { title: "Eat 5 servings of fruit", icon: "🍎", target: 5, unit: "servings", xpReward: 30, difficulty: "Easy" as const, description: "Log 5 fruit servings this week" },
    { title: "Log every meal for 3 days", icon: "📝", target: 9, unit: "meals", xpReward: 40, difficulty: "Medium" as const, description: "Don't miss a single meal log" },
    { title: "Try a new cuisine", icon: "🌍", target: 1, unit: "meal", xpReward: 25, difficulty: "Easy" as const, description: "Cook something from a new cuisine" },
    { title: "Drink 8 glasses of water today", icon: "💧", target: 8, unit: "glasses", xpReward: 20, difficulty: "Easy" as const, description: "Hit 8 glasses today" },
    { title: "Cook at home for 5 days", icon: "👨‍🍳", target: 5, unit: "days", xpReward: 60, difficulty: "Hard" as const, description: "Home-cooked meals for 5 days" },
    { title: "Protein power week", icon: "💪", target: 7, unit: "days", xpReward: 55, difficulty: "Medium" as const, description: "Hit protein goals for 7 days" },
    { title: "Zero junk food day", icon: "🚀", target: 1, unit: "day", xpReward: 15, difficulty: "Easy" as const, description: "No junk food for an entire day" },
];

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

    // Leaderboard
    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
    const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);

    // Friends
    const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
    const [friends, setFriends] = useState<string[]>([]);
    const [sentRequests, setSentRequests] = useState<Set<string>>(new Set());

    // Community challenges
    const [commChallenges, setCommChallenges] = useState<CommChallenge[]>([]);
    const [showCreateChallenge, setShowCreateChallenge] = useState(false);
    const [newChTitle, setNewChTitle] = useState("");
    const [newChDesc, setNewChDesc] = useState("");
    const [newChTarget, setNewChTarget] = useState("5");
    const [newChUnit, setNewChUnit] = useState("days");
    const [newChDifficulty, setNewChDifficulty] = useState<"Easy" | "Medium" | "Hard">("Medium");
    const [newChIcon, setNewChIcon] = useState("🎯");
    const [creatingChallenge, setCreatingChallenge] = useState(false);

    // Load posts from Firestore on mount
    useEffect(() => {
        async function loadPosts() {
            try {
                const firestorePosts = await getCommunityPosts();
                setPosts(firestorePosts);
            } catch (err) { console.error("Failed to load community posts:", err); }
        }
        loadPosts();
    }, []);

    // Load leaderboard and friends when switching tabs
    useEffect(() => {
        if (tab === "leaderboard" && leaderboard.length === 0) {
            setLoadingLeaderboard(true);
            getLeaderboard().then(entries => { setLeaderboard(entries); setLoadingLeaderboard(false); });
        }
        if (tab === "leaderboard" || tab === "feed") {
            if (user) {
                getFriendRequests(user.uid).then(setFriendRequests);
                getFriends(user.uid).then(setFriends);
            }
        }
        if (tab === "challenges" && commChallenges.length === 0) {
            getCommunityChallenges().then(async all => {
                // Deduplicate: keep first per title+creator
                const seen = new Map<string, typeof all[0]>();
                const dupeIds: string[] = [];
                for (const ch of all) {
                    const key = `${ch.title}_${ch.creatorUid}`;
                    if (!seen.has(key)) { seen.set(key, ch); }
                    else { dupeIds.push(ch.id); }
                }
                // Delete dupes from Firestore
                if (dupeIds.length > 0) {
                    const { deleteDoc, doc } = await import("firebase/firestore");
                    const { db } = await import("../lib/firebase");
                    for (const id of dupeIds) {
                        deleteDoc(doc(db, "communityChallenges", id)).catch(() => { });
                    }
                }
                setCommChallenges(Array.from(seen.values()));
            });
        }
    }, [tab, user]);


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
            ...(pendingImage ? { imageUrl: pendingImage } : {}),
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
                                <div className="ml-auto text-right">
                                    <p className="text-2xl font-black">#{leaderboard.findIndex(e => e.uid === user?.uid) + 1 || "—"}</p>
                                    <p className="text-[10px] text-green-200">Your Rank</p>
                                </div>
                            </div>
                        </div>

                        {/* Friend requests */}
                        {friendRequests.length > 0 && (
                            <div className="bg-blue-50 dark:bg-blue-950/20 rounded-2xl border border-blue-200 dark:border-blue-800 p-4">
                                <h3 className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-3">
                                    Friend Requests ({friendRequests.length})
                                </h3>
                                <div className="space-y-2">
                                    {friendRequests.map(req => (
                                        <div key={req.id} className="flex items-center gap-3 bg-white dark:bg-slate-900 rounded-xl p-3">
                                            <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-sm font-bold text-blue-700 dark:text-blue-400">
                                                {req.fromName.charAt(0)}
                                            </div>
                                            <span className="text-sm font-medium text-slate-700 dark:text-slate-200 flex-1">{req.fromName}</span>
                                            <button onClick={async () => {
                                                await acceptFriendRequest(req.id);
                                                setFriendRequests(prev => prev.filter(r => r.id !== req.id));
                                                setFriends(prev => [...prev, req.fromUid]);
                                            }} className="px-3 py-1.5 rounded-lg text-[10px] font-bold bg-green-600 text-white hover:bg-green-700 transition-colors">
                                                Accept
                                            </button>
                                            <button onClick={async () => {
                                                await declineFriendRequest(req.id);
                                                setFriendRequests(prev => prev.filter(r => r.id !== req.id));
                                            }} className="px-3 py-1.5 rounded-lg text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 transition-colors">
                                                Decline
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Rankings */}
                        {loadingLeaderboard ? (
                            <div className="bg-white dark:bg-slate-900 rounded-2xl border p-8 text-center">
                                <div className="animate-spin inline-block w-6 h-6 border-2 border-green-600 border-t-transparent rounded-full" />
                                <p className="text-xs text-slate-400 mt-2">Loading rankings...</p>
                            </div>
                        ) : (
                            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
                                <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">
                                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Global Rankings</h3>
                                </div>
                                {leaderboard.length === 0 ? (
                                    <div className="p-8 text-center">
                                        <div className="text-4xl mb-2">🏆</div>
                                        <p className="text-sm text-slate-400">No rankings yet — complete onboarding to appear!</p>
                                    </div>
                                ) : (
                                    <div className="divide-y divide-slate-50 dark:divide-slate-800">
                                        {leaderboard.map((entry, idx) => {
                                            const isMe = entry.uid === user?.uid;
                                            const isFriend = friends.includes(entry.uid);
                                            const hasSent = sentRequests.has(entry.uid);
                                            const medal = idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : null;
                                            return (
                                                <div key={entry.uid}
                                                    className={`flex items-center gap-3 px-4 py-3 transition-colors ${isMe ? "bg-green-50 dark:bg-green-950/20" : "hover:bg-slate-50 dark:hover:bg-slate-800/50"}`}>
                                                    {/* Rank */}
                                                    <div className="w-8 text-center">
                                                        {medal ? (
                                                            <span className="text-lg">{medal}</span>
                                                        ) : (
                                                            <span className="text-sm font-bold text-slate-400">#{idx + 1}</span>
                                                        )}
                                                    </div>
                                                    {/* Avatar */}
                                                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-black ${isMe ? "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400"
                                                        : idx < 3 ? "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400"
                                                            : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"}`}>
                                                        {entry.avatarLetter}
                                                    </div>
                                                    {/* User info */}
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-1.5">
                                                            <p className={`text-sm font-semibold truncate ${isMe ? "text-green-700 dark:text-green-400" : "text-slate-800 dark:text-white"}`}>
                                                                {entry.name}
                                                            </p>
                                                            {isMe && <span className="text-[9px] font-bold bg-green-100 dark:bg-green-900 text-green-600 px-1.5 py-0.5 rounded-full">YOU</span>}
                                                            {isFriend && <span className="text-[9px] font-bold bg-blue-100 dark:bg-blue-900 text-blue-600 px-1.5 py-0.5 rounded-full">FRIEND</span>}
                                                        </div>
                                                        <p className="text-[10px] text-slate-400">Lv.{entry.level} · {entry.xp} XP · 🔥{entry.streak}</p>
                                                    </div>
                                                    {/* Add friend */}
                                                    {!isMe && !isFriend && (
                                                        <button
                                                            disabled={hasSent}
                                                            onClick={async () => {
                                                                if (!user || !profile) return;
                                                                await sendFriendRequest(user.uid, profile.name || "User", entry.uid);
                                                                setSentRequests(prev => new Set([...prev, entry.uid]));
                                                            }}
                                                            className={`px-2.5 py-1.5 rounded-lg text-[10px] font-semibold transition-colors ${hasSent
                                                                ? "bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed"
                                                                : "bg-blue-50 dark:bg-blue-950/30 text-blue-600 border border-blue-200 dark:border-blue-800 hover:bg-blue-100"}`}>
                                                            {hasSent ? "Sent ✓" : "Add Friend"}
                                                        </button>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        )}
                    </motion.div>
                )}

                {/* ═══════ CHALLENGES TAB ═══════ */}
                {tab === "challenges" && (
                    <motion.div key="challenges" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-5">
                        {/* Active challenges */}
                        {userChallenges.filter(c => !c.completed).length > 0 && (
                            <div>
                                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Active Challenges</h3>
                                <div className="space-y-3">
                                    {userChallenges.filter(c => !c.completed).map(c => (
                                        <div key={c.id} className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 rounded-2xl border border-green-200 dark:border-green-800 p-4">
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-2"><span className="text-lg">{c.icon}</span><span className="text-sm font-semibold text-slate-800 dark:text-white">{c.title}</span></div>
                                                <span className="text-xs font-bold text-green-600">+{c.xpReward} XP</span>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <div className="flex-1 h-2.5 rounded-full bg-white/60 dark:bg-slate-800 overflow-hidden">
                                                    <motion.div className="h-full rounded-full bg-gradient-to-r from-green-500 to-emerald-500"
                                                        initial={{ width: 0 }} animate={{ width: `${(c.current / c.target) * 100}%` }} transition={{ duration: 0.5 }} />
                                                </div>
                                                <span className="text-[10px] font-semibold text-slate-400">{c.current}/{c.target} {c.unit}</span>
                                                <button onClick={() => updateChallengeProgress(c.id, 1)}
                                                    className="px-3 py-1.5 rounded-lg text-[10px] font-bold bg-green-600 text-white hover:bg-green-700 transition-colors shadow-sm">+1</button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Completed */}
                        {userChallenges.filter(c => c.completed).length > 0 && (
                            <div>
                                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">✅ Completed</h3>
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

                        {/* Create challenge button */}
                        <div className="flex items-center justify-between">
                            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Available Challenges</h3>
                            <button onClick={() => setShowCreateChallenge(true)}
                                className="px-3 py-1.5 rounded-lg text-[10px] font-bold bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-700 hover:to-indigo-700 transition-all shadow-sm">
                                + Create Challenge
                            </button>
                        </div>

                        {/* Create challenge modal */}
                        <AnimatePresence>
                            {showCreateChallenge && (
                                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                                    className="bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-950/20 dark:to-indigo-950/20 rounded-2xl border border-purple-200 dark:border-purple-800 p-5 space-y-3">
                                    <h4 className="text-sm font-bold text-purple-800 dark:text-purple-300">Create Your Own Challenge</h4>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="col-span-2">
                                            <label className="text-[10px] font-semibold text-slate-500 uppercase">Title</label>
                                            <input value={newChTitle} onChange={e => setNewChTitle(e.target.value)} placeholder="e.g. Eat 3 fruits today"
                                                className="w-full px-3 py-2 rounded-lg text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none focus:border-purple-500" />
                                        </div>
                                        <div className="col-span-2">
                                            <label className="text-[10px] font-semibold text-slate-500 uppercase">Description</label>
                                            <input value={newChDesc} onChange={e => setNewChDesc(e.target.value)} placeholder="Brief description..."
                                                className="w-full px-3 py-2 rounded-lg text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none focus:border-purple-500" />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-semibold text-slate-500 uppercase">Target</label>
                                            <input type="number" value={newChTarget} onChange={e => setNewChTarget(e.target.value)}
                                                className="w-full px-3 py-2 rounded-lg text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none" />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-semibold text-slate-500 uppercase">Unit</label>
                                            <input value={newChUnit} onChange={e => setNewChUnit(e.target.value)} placeholder="days, servings, meals..."
                                                className="w-full px-3 py-2 rounded-lg text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none" />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-semibold text-slate-500 uppercase">Difficulty</label>
                                            <select value={newChDifficulty} onChange={e => setNewChDifficulty(e.target.value as "Easy" | "Medium" | "Hard")}
                                                className="w-full px-3 py-2 rounded-lg text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none">
                                                <option>Easy</option><option>Medium</option><option>Hard</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-semibold text-slate-500 uppercase">Icon</label>
                                            <select value={newChIcon} onChange={e => setNewChIcon(e.target.value)}
                                                className="w-full px-3 py-2 rounded-lg text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none">
                                                {["🎯", "🍎", "💧", "🏃", "🥗", "📝", "🧘", "💪", "🔥", "⭐"].map(ic => <option key={ic} value={ic}>{ic}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                    <div className="flex gap-2 pt-2">
                                        <button disabled={creatingChallenge} onClick={async () => {
                                            if (!newChTitle.trim() || !user || creatingChallenge) return;
                                            setCreatingChallenge(true);
                                            try {
                                                const ch: CommChallenge = {
                                                    id: Date.now().toString(),
                                                    title: sanitize(newChTitle),
                                                    description: sanitize(newChDesc) || sanitize(newChTitle),
                                                    icon: newChIcon,
                                                    target: parseInt(newChTarget) || 5,
                                                    unit: sanitize(newChUnit) || "days",
                                                    difficulty: newChDifficulty,
                                                    xpReward: newChDifficulty === "Easy" ? 20 : newChDifficulty === "Medium" ? 40 : 60,
                                                    creatorUid: user.uid,
                                                    creatorName: sanitize(profile?.name || "User"),
                                                    acceptedBy: [],
                                                    timestamp: new Date().toISOString(),
                                                };
                                                await saveCommunityChallenge(ch);
                                                setCommChallenges(prev => [ch, ...prev]);
                                                setShowCreateChallenge(false);
                                                setNewChTitle(""); setNewChDesc(""); setNewChTarget("5"); setNewChUnit("days");
                                            } finally {
                                                setCreatingChallenge(false);
                                            }
                                        }}
                                            className="flex-1 py-2.5 rounded-lg text-xs font-bold bg-purple-600 text-white hover:bg-purple-700 transition-colors">
                                            Create & Share
                                        </button>
                                        <button onClick={() => setShowCreateChallenge(false)}
                                            className="px-4 py-2.5 rounded-lg text-xs font-medium text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                                            Cancel
                                        </button>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Community-created challenges */}
                        {commChallenges.length > 0 && (
                            <div>
                                <h3 className="text-xs font-bold text-purple-500 uppercase tracking-wider mb-3">🌟 Community Challenges</h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {commChallenges.map(ch => {
                                        const accepted = ch.acceptedBy?.includes(user?.uid || "");
                                        return (
                                            <div key={ch.id}
                                                className="bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-950/10 dark:to-indigo-950/10 rounded-2xl border border-purple-200 dark:border-purple-800 p-4 hover:shadow-md transition-all">
                                                <div className="flex items-start justify-between mb-2">
                                                    <span className="text-2xl">{ch.icon}</span>
                                                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${ch.difficulty === "Easy" ? "bg-green-100 dark:bg-green-950 text-green-600" : ch.difficulty === "Hard" ? "bg-red-100 dark:bg-red-950 text-red-600" : "bg-amber-100 dark:bg-amber-950 text-amber-600"}`}>{ch.difficulty}</span>
                                                </div>
                                                <p className="text-sm font-semibold text-slate-800 dark:text-white mb-0.5">{ch.title}</p>
                                                <p className="text-[10px] text-slate-400 mb-1">{ch.description}</p>
                                                <div className="flex items-center justify-between text-[10px] text-slate-400 mb-3">
                                                    <span>Target: {ch.target} {ch.unit} · +{ch.xpReward} XP</span>
                                                    <span>by {ch.creatorName} · {ch.acceptedBy?.length || 0} joined</span>
                                                </div>
                                                <button onClick={async () => {
                                                    if (!user) return;
                                                    await acceptCommunityChallenge(ch.id, user.uid);
                                                    setCommChallenges(prev => prev.map(c => c.id === ch.id ? { ...c, acceptedBy: [...(c.acceptedBy || []), user.uid] } : c));
                                                }}
                                                    disabled={accepted}
                                                    className={`w-full py-2 rounded-lg text-xs font-semibold transition-all ${accepted
                                                        ? "bg-purple-100 dark:bg-purple-950/30 text-purple-400 cursor-not-allowed"
                                                        : "bg-purple-600 text-white hover:bg-purple-700 shadow-sm"}`}>
                                                    {accepted ? "Joined ✓" : "Join Challenge"}
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Built-in challenges */}
                        <div>
                            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Built-in Challenges</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {BUILTIN_CHALLENGES.map((ch, i) => {
                                    const alreadyActive = userChallenges.some(c => c.title === ch.title && !c.completed);
                                    return (
                                        <div key={i} className={`rounded-2xl border p-4 hover:shadow-md transition-all ${ch.difficulty === "Hard"
                                            ? "bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-950/10 dark:to-orange-950/10 border-red-200 dark:border-red-800"
                                            : ch.difficulty === "Medium"
                                                ? "bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-950/10 dark:to-yellow-950/10 border-amber-200 dark:border-amber-800"
                                                : "bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/10 dark:to-emerald-950/10 border-green-200 dark:border-green-800"}`}>
                                            <div className="flex items-start justify-between mb-2">
                                                <span className="text-2xl">{ch.icon}</span>
                                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${ch.difficulty === "Easy" ? "bg-green-100 dark:bg-green-950 text-green-600" : ch.difficulty === "Hard" ? "bg-red-100 dark:bg-red-950 text-red-600" : "bg-amber-100 dark:bg-amber-950 text-amber-600"}`}>{ch.difficulty}</span>
                                            </div>
                                            <p className="text-sm font-semibold text-slate-800 dark:text-white mb-0.5">{ch.title}</p>
                                            <p className="text-[10px] text-slate-400 mb-3">{ch.description} · +{ch.xpReward} XP</p>
                                            <button onClick={() => acceptChallenge(i)}
                                                disabled={alreadyActive}
                                                className={`w-full py-2 rounded-lg text-xs font-semibold transition-colors ${alreadyActive
                                                    ? "bg-green-100 dark:bg-green-950/30 text-green-500 cursor-not-allowed"
                                                    : "bg-white/70 dark:bg-slate-900/50 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-900"}`}>
                                                {alreadyActive ? "Active ✓" : "Accept Challenge"}
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
