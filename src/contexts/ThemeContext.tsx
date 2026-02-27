import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";

type Theme = "light" | "dark";

const ThemeContext = createContext<{ theme: Theme; toggle: () => void }>({
    theme: "light",
    toggle: () => { },
});

export function useTheme() {
    return useContext(ThemeContext);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
    const [theme, setTheme] = useState<Theme>("light");
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        const saved = localStorage.getItem("chikitsa-theme") as Theme;
        if (saved === "dark") {
            setTheme("dark");
            document.documentElement.classList.add("dark");
        }
        setMounted(true);
    }, []);

    function toggle() {
        const next = theme === "light" ? "dark" : "light";
        setTheme(next);
        localStorage.setItem("chikitsa-theme", next);
        if (next === "dark") {
            document.documentElement.classList.add("dark");
        } else {
            document.documentElement.classList.remove("dark");
        }
    }

    if (!mounted) return null;

    return (
        <ThemeContext.Provider value={{ theme, toggle }}>
            {children}
        </ThemeContext.Provider>
    );
}
