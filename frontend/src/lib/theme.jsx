import { createContext, useContext, useEffect, useState } from 'react';

const ThemeCtx = createContext(null);

export function ThemeProvider({ children }) {
    const [theme, setTheme] = useState(() => localStorage.getItem('ektl_theme') || 'light');

    useEffect(() => {
        const root = document.documentElement;
        if (theme === 'dark') root.classList.add('dark');
        else root.classList.remove('dark');
        localStorage.setItem('ektl_theme', theme);
    }, [theme]);

    const toggle = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'));

    return <ThemeCtx.Provider value={{ theme, setTheme, toggle }}>{children}</ThemeCtx.Provider>;
}

export function useTheme() {
    const ctx = useContext(ThemeCtx);
    if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
    return ctx;
}
