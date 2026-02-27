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
Based on the following meal plan, generate a consolidated grocery list for the week.

Meal Plan:
${mealsJson}

Weekly Budget: ₹${weeklyBudget}

Return ONLY a valid JSON array (no markdown, no explanation) with this exact structure:
[
  { "name": "Item name", "quantity": "500g", "estimatedPrice": 50, "category": "Vegetables", "purchased": false },
  ...
]

Categories: "Vegetables", "Fruits", "Dairy", "Grains", "Proteins", "Spices & Condiments", "Beverages", "Snacks", "Other"
estimatedPrice should be in INR (₹). Only return the JSON array, nothing else.`;

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
