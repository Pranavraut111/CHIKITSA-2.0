import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY!);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

/** Generate a daily meal plan JSON with full recipes based on user context string */
export async function generateMealPlan(context: string): Promise<string> {
    const prompt = `You are CHIKITSA, an expert Indian nutritionist and dietitian AI.
Based on the following user context, generate a practical daily meal plan for ONE day.

User Context:
${context}

IMPORTANT: Generate recipes that match the user's diet type, allergies, food dislikes, and cuisine preference. Use ONLY ingredients the user can eat.

Return ONLY a valid JSON object (no markdown, no explanation) with this exact structure:
{
  "date": "YYYY-MM-DD",
  "breakfast": {
    "name": "Dish Name",
    "ingredients": [{"item": "ingredient name", "quantity": "100g"}],
    "recipe": ["Step 1: ...", "Step 2: ...", "Step 3: ..."],
    "prepTime": "10 min",
    "cookTime": "15 min",
    "calories": 350,
    "protein": 15,
    "carbs": 45,
    "fats": 10,
    "imageQuery": "dish name food photography",
    "explanation": "Why this meal is good for you"
  },
  "lunch": { ...same structure... },
  "dinner": { ...same structure... },
  "snack": { ...same structure... },
  "totalCalories": 1800
}

- All macros in grams
- Recipe steps should be clear, numbered, and practical for home cooking
- imageQuery should be a good search term for finding a photo of this dish
- Only return the JSON, nothing else.`;

    const result = await model.generateContent(prompt);
    return result.response.text();
}

/** Generate a grocery list JSON from meal plan JSON and weekly budget (INR) */
export async function generateGroceryList(mealsJson: string, weeklyBudget: number): Promise<string> {
    const prompt = `You are CHIKITSA, an expert Indian nutritionist and grocery planner AI.
Based on the following SELECTED meals (not a full week — just these specific meals), generate a practical grocery list.

IMPORTANT RULES:
- Quantities must be REALISTIC for the specific meals listed. For example: if a recipe needs 1 onion, write "1 medium (150g)", NOT "1kg".
- Do NOT give bulk/weekly quantities. Give exact amounts needed for cooking these meals ONCE.
- Common sense: a cheela recipe needs 100g dal, not 500g. A curry needs 2 tomatoes, not 1kg.
- Consolidate duplicate ingredients across meals but keep quantities realistic (add them up sensibly).

Selected Meals:
${mealsJson}

Budget: ₹${weeklyBudget}

Return ONLY a valid JSON array (no markdown, no explanation) with this exact structure:
[
  { "name": "Item name", "quantity": "2 medium (200g)", "estimatedPrice": 15, "category": "Vegetables", "purchased": false },
  ...
]

Categories: "Vegetables", "Fruits", "Dairy", "Grains", "Proteins", "Spices & Condiments", "Beverages", "Snacks", "Other"
estimatedPrice should be in INR (₹) and should be realistic Indian market prices. Only return the JSON array, nothing else.`;

    const result = await model.generateContent(prompt);
    return result.response.text();
}

/** Chat with the CHIKITSA health AI */
export async function chatWithAI(
    userMessage: string,
    history: string,
    userContext: string
): Promise<string> {
    const prompt = `You are CHIKITSA, a warm, knowledgeable Indian health and nutrition assistant. 
You help users with diet, nutrition, meal planning, and general wellness in a friendly, practical manner.
Always give actionable advice tailored to the Indian context. Keep responses concise (2-4 sentences unless detail is needed).

User Profile:
${userContext}

Recent conversation:
${history}

User: ${userMessage}

Respond helpfully:`;

    const result = await model.generateContent(prompt);
    return result.response.text();
}

/** Generate a fun foodie personality type from quiz answers */
export async function generateFoodiePersonality(answers: Record<string, string>): Promise<string> {
    const prompt = `You are a fun food personality quiz generator. Based on the following answers to food preference questions, generate a creative "Foodie Personality" profile.

Quiz Answers:
${Object.entries(answers).map(([q, a]) => `Q: ${q}\nA: ${a}`).join("\n\n")}

Return ONLY a valid JSON object (no markdown) with this structure:
{
  "type": "The Midnight Muncher",
  "emoji": "🌙",
  "description": "A fun 2-3 sentence personality description",
  "traits": ["trait1", "trait2", "trait3", "trait4"]
}

Be creative, fun, and light — food-themed personality types like "The Spice Commander", "The Comfort King", "The Green Galaxy Explorer" etc.
Only return the JSON, nothing else.`;

    const result = await model.generateContent(prompt);
    return result.response.text();
}

/** Regenerate a single meal type while keeping the others */
export async function regenerateSingleMeal(
    mealType: "breakfast" | "lunch" | "dinner" | "snack",
    context: string,
    currentMeals: string
): Promise<string> {
    const prompt = `You are CHIKITSA, an expert Indian nutritionist and dietitian AI.
Regenerate ONLY the ${mealType} meal — the user didn't like the previous suggestion.

User Context:
${context}

Current meal plan (keep the OTHER meals exactly as-is, ONLY change ${mealType}):
${currentMeals}

Return ONLY a valid JSON object for the single meal with this structure:
{
  "name": "New Dish Name",
  "ingredients": [{"item": "ingredient", "quantity": "100g"}],
  "recipe": ["Step 1: ...", "Step 2: ..."],
  "prepTime": "10 min",
  "cookTime": "15 min",
  "calories": 350,
  "protein": 15,
  "carbs": 45,
  "fats": 10,
  "imageQuery": "dish name food photography",
  "explanation": "Why this new meal is a great alternative"
}

Make it DIFFERENT from the current ${mealType}. Match the user's preferences. Only return the JSON, nothing else.`;

    const result = await model.generateContent(prompt);
    return result.response.text();
}

/** Analyze a food image using Gemini vision and return nutrition data */
export async function analyzeImageNutrition(imageBase64: string, mimeType: string): Promise<string> {
    const visionModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `You are CHIKITSA, an expert food and nutrition analyst AND health advisor.
Analyze this food image carefully and identify every food item visible.

Return ONLY a valid JSON object (no markdown, no explanation) with this structure:
{
  "items": [
    {
      "item": "Food item name",
      "calories": 250,
      "protein": 8,
      "carbs": 30,
      "fats": 12,
      "fiber": 3,
      "sugar": 5,
      "serving": "1 piece (approx 150g)"
    }
  ],
  "totalCalories": 250,
  "totalProtein": 8,
  "totalCarbs": 30,
  "totalFats": 12,
  "summary": "A brief 1-2 sentence health assessment of this food",
  "healthScore": 7,
  "healthAdvice": "Is this food good or bad for you? Explain briefly considering the overall balance of macros, oil/sugar content, and nutritional value. Be honest — if it's unhealthy, say so.",
  "consumptionTip": "How much of this should a healthy adult eat? E.g. '1 bowl of chole is fine, but limit pooris to 1-2 instead of 3-4 to reduce refined carbs and oil intake. Pair with a salad for better nutrition.'"
}

- healthScore is 1-10 (10 = extremely healthy)
- healthAdvice should be practical and honest (e.g. 'This is high in saturated fat due to deep frying' or 'Great source of protein and fiber')
- consumptionTip should give specific actionable quantities the person should eat, not vague advice
- Be accurate with Indian food items especially
- All macros in grams, calories in kcal
- Only return the JSON, nothing else.`;

    const result = await visionModel.generateContent([
        prompt,
        {
            inlineData: {
                mimeType,
                data: imageBase64,
            },
        },
    ]);
    return result.response.text();
}
