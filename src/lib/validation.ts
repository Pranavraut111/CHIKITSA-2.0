/**
 * Sanitize user input — strips ALL HTML tags, special characters,
 * script injections, and dangerous patterns.
 * Use this on EVERY user-entered text before saving to Firestore.
 */
export function sanitize(input: string): string {
    return input
        .replace(/<[^>]*>/g, "")           // strip HTML tags like <div>, <script>, </div>
        .replace(/&lt;/g, "").replace(/&gt;/g, "")  // remove encoded entities
        .replace(/&amp;/g, "&")
        .replace(/&quot;/g, "")
        .replace(/&#\d+;/g, "")            // remove numeric HTML entities
        .replace(/javascript:/gi, "")      // remove JS protocol
        .replace(/on\w+\s*=/gi, "")        // remove event handlers (onclick=, onerror=)
        .replace(/[<>{}]/g, "")            // remove angle brackets and curly braces
        .trim();
}

/**
 * Strict sanitizer for names — only allows letters, numbers, spaces, and basic punctuation.
 * Blocks ALL special characters, tags, and code injection attempts.
 */
export function sanitizeName(input: string): string {
    // Only allow: letters (any language), numbers, spaces, dots, hyphens, apostrophes
    return input.replace(/[^a-zA-Z0-9\s.\-'À-ÿ]/g, "").trim();
}

/** Validate onboarding inputs and return error messages */
export interface ValidationError {
    field: string;
    message: string;
}

/**
 * Gender + age-based weight ranges (in kg)
 *   Child 5-8:    14 – 30 kg
 *   Child 9-11:   20 – 45 kg
 *   Boy 12-17:    30 – 80 kg
 *   Girl 12-17:   25 – 70 kg
 *   Adult Male:   50 – 120 kg
 *   Adult Female:  40 – 100 kg
 *   Other:        same as Male
 */
function getWeightRange(age: number, gender: string): [number, number] {
    if (age >= 5 && age <= 8) return [14, 30];
    if (age >= 9 && age <= 11) return [20, 45];

    if (age >= 12 && age <= 17) {
        if (gender === "female") return [25, 70];
        return [30, 80];
    }

    // Adults 18+
    if (gender === "female") return [40, 100];
    return [50, 120]; // male & other
}

function getHeightRange(age: number): [number, number] {
    if (age >= 5 && age <= 8) return [95, 140];
    if (age >= 9 && age <= 12) return [110, 165];
    if (age >= 13 && age <= 17) return [130, 195];
    return [140, 220];
}

/** Validate personal info (step 0) — blocks Continue if invalid */
export function validatePersonalInfo(data: {
    name: string;
    age: number;
    weight: number;
    height: number;
    gender: string;
}): ValidationError[] {
    const errors: ValidationError[] = [];

    // Name — no special characters allowed
    if (!data.name || data.name.length < 2) {
        errors.push({ field: "name", message: "Name must be at least 2 characters" });
    }
    if (data.name !== sanitizeName(data.name)) {
        errors.push({ field: "name", message: "Name contains invalid characters. Only letters, numbers, spaces, dots and hyphens are allowed. Kindly re-enter." });
    }

    // Age
    if (data.age < 5 || data.age > 120) {
        errors.push({ field: "age", message: "Age must be between 5 and 120 years" });
    }

    // Height (age-appropriate)
    if (data.height < 60 || data.height > 270) {
        errors.push({ field: "height", message: "Height must be between 60 and 270 cm" });
    } else if (data.age >= 5) {
        const [minH, maxH] = getHeightRange(data.age);
        if (data.height < minH || data.height > maxH) {
            errors.push({ field: "height", message: `${data.height}cm is not valid for a ${data.age}-year-old (expected ${minH}–${maxH}cm). Kindly re-enter with appropriate values.` });
        }
    }

    // Weight (gender + age appropriate)
    if (data.weight < 10 || data.weight > 300) {
        errors.push({ field: "weight", message: "Weight must be between 10 and 300 kg" });
    } else if (data.age >= 5) {
        const [minW, maxW] = getWeightRange(data.age, data.gender);
        const genderLabel = data.gender === "female" ? "female" : data.gender === "male" ? "male" : "person";
        if (data.weight < minW || data.weight > maxW) {
            errors.push({ field: "weight", message: `${data.weight}kg is not practical for a ${data.age}-year-old ${genderLabel} (expected ${minW}–${maxW}kg). Kindly re-enter with appropriate values.` });
        }
    }

    return errors;
}

/** Validate budget info (step 5) — blocks Continue if invalid */
export function validateBudget(data: {
    weeklyBudget: number;
    monthlyBudget: number;
}): ValidationError[] {
    const errors: ValidationError[] = [];

    if (data.weeklyBudget < 200) {
        errors.push({ field: "weeklyBudget", message: "Weekly food budget should be at least ₹200 to plan realistic meals. Kindly re-enter with appropriate values." });
    }
    if (data.weeklyBudget > 50000) {
        errors.push({ field: "weeklyBudget", message: "Weekly budget seems unrealistically high (max ₹50,000)" });
    }
    if (data.monthlyBudget > 0 && data.monthlyBudget < 500) {
        errors.push({ field: "monthlyBudget", message: "Monthly food budget should be at least ₹500" });
    }
    if (data.monthlyBudget > 0 && data.weeklyBudget > 0 && data.monthlyBudget < data.weeklyBudget) {
        errors.push({ field: "monthlyBudget", message: "Monthly budget can't be less than weekly budget. Kindly re-enter with appropriate values." });
    }

    return errors;
}
