# CHIKITSA 2.0

**Your AI-Powered Personal Nutritionist — Built for India**

CHIKITSA (meaning "treatment" in Hindi) is a smart nutrition and wellness platform that creates hyper-personalized meal plans, tracks food intake through photos, generates real grocery lists, and makes healthy eating fun through gamification — all designed specifically for Indian food, budgets, and dietary needs.

---

## What Makes It Different

Unlike generic calorie counters, CHIKITSA understands the difference between a dosa and a paratha. It knows your grandmother's dal recipe needs different ingredients than a restaurant version. And it won't suggest avocado toast when you're on a ₹1500/week budget.

- Understands 7+ Indian cuisines (South Indian, Punjabi, Chinese-Indian, Continental, etc.)
- Respects medical conditions (diabetes, PCOS, hypertension, thyroid — 12+ conditions)
- Works within your actual food budget (₹200-50,000/week)
- Gives honest health advice, not just numbers ("limit pooris to 1-2, pair with salad")
- Validates inputs properly — won't accept a 12-year-old weighing 80kg or a ₹20 weekly food budget

---

## Features

### Smart Onboarding
A 7-step health profile that captures 25+ data points — from your sleep schedule to your spice tolerance. Every AI response is tailored to this profile. Inputs are validated for realistic values and sanitized against XSS attacks.

### AI Meal Plans
One-tap daily meal plans with full recipes, ingredient lists, and macro breakdowns. Choose your cuisine, cooking time preference, and spice level. Swap individual meals you don't like. Tick to log what you ate.

### Food Photo Scanner
Upload a photo of your food. Gemini Vision identifies every item and gives you calories, macros, a health score out of 10, and practical advice on how much you should actually eat.

### Smart Grocery Lists
Select which meals you want to cook, get a realistic ingredient list with exact quantities (not bulk amounts), and buy directly through Amazon, Blinkit, Zepto, or BigBasket links.

### AI Health Chat
A conversational nutritionist that knows your profile, medical conditions, and food history. Ask anything from "Is paneer healthy for me?" to "What should I eat before a workout?"

### Gamification
XP points, levels, streaks, achievements, and a virtual pet named Chompy who unlocks at Level 20. Logging meals earns XP. Consistency earns badges. It makes tracking your food feel less like a chore.

### Community
Share meal plans, achievements, and food photos. Like and comment on posts. All posts persist across sessions — no more disappearing content on refresh.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript + Vite |
| AI | Google Gemini 2.5 Flash (text + vision) |
| Auth | Firebase Authentication (Google + Email) |
| Database | Cloud Firestore |
| Animations | Framer Motion |
| Styling | Tailwind CSS (dark mode supported) |

---

## Getting Started

### Prerequisites
- Node.js 18+
- A Firebase project with Firestore and Authentication enabled
- A Google Gemini API key

### Setup

```bash
# Clone the repository
git clone https://github.com/Pranavraut111/CHIKITSA-2.0.git
cd CHIKITSA-2.0

# Install dependencies
npm install

# Create environment file
cp .env.example .env.local
```

Add your keys to `.env.local`:
```
VITE_GEMINI_API_KEY=your_gemini_api_key
```

Firebase config is in `src/lib/firebase.ts`.

### Run locally

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

### Build for production

```bash
npm run build
```

---

## Project Structure

```
src/
├── components/        # Reusable UI components (HeroScroll, VirtualPet, etc.)
├── contexts/          # React contexts (Auth, Theme, Gamification)
├── layouts/           # App layout with sidebar navigation
├── lib/
│   ├── firebase.ts    # Firebase configuration
│   ├── firestore.ts   # All Firestore CRUD operations
│   ├── gemini.ts      # Gemini AI prompt functions
│   ├── types.ts       # TypeScript interfaces
│   └── validation.ts  # Input validation & XSS sanitization
├── pages/             # All route pages
│   ├── LandingPage    # Public landing page
│   ├── AuthPage       # Login / Sign up
│   ├── OnboardingPage # 7-step health profile (with input validation)
│   ├── DashboardPage  # Stats, calorie ring, weekly chart
│   ├── MealsPage      # AI meal plan generator
│   ├── GroceryPage    # Smart grocery list with ecommerce links
│   ├── LogPage        # Manual food logging
│   ├── ChatPage       # AI health chatbot + photo scanner
│   ├── MapPage        # Nearby grocery stores
│   ├── AchievementsPage # Badges + virtual pet (Chompy)
│   ├── CommunityPage  # Social feed (Firestore-backed)
│   └── ProfilePage    # User profile management
└── App.tsx            # Routes and providers
```

---

## Security

- All user-facing text inputs are sanitized to prevent XSS (HTML tag injection)
- Profile names, community posts, and comments are stripped of `<script>`, `<img>`, and all HTML tags
- Event handler attributes (`onclick=`, `onerror=`) are removed from inputs
- `javascript:` protocol URIs are blocked
- Firebase security rules should be configured for production use

---

## Data Model

```
Firestore
├── users/{uid}
│   ├── (profile fields)
│   ├── mealPlans/{date}        → daily meal plan
│   ├── foodLogs/{id}           → individual food entries
│   ├── groceryLists/{date}     → grocery items
│   ├── chatHistory/{id}        → chat messages
│   ├── achievements/{id}       → unlocked achievements
│   ├── challenges/{id}         → active challenges
│   └── gameState/
│       ├── pet                 → virtual pet state
│       └── userLevel           → XP and level
├── communityPosts/{id}         → social feed posts
└── sharedPlans/{id}            → publicly shared meal plans
```

---

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/your-feature`)
3. Commit your changes (`git commit -m 'Add your feature'`)
4. Push to the branch (`git push origin feature/your-feature`)
5. Open a Pull Request

---

## License

This project is part of an academic submission. Please contact the author before using it commercially.

---

Built with care by [InnovateX]  -> (https://github.com/Pranavraut111)
