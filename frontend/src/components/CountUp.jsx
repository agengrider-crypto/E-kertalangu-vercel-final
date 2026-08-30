import { useEffect, useRef, useState } from 'react';

const prefersReduced = () =>
    typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Animasi count-up untuk angka statistik. Mempertahankan prefix/suffix (mis. "%").
// Nilai akhir SELALU sama dengan `value` asli.
export default function CountUp({ value, duration = 900, className }) {
    const str = String(value ?? '');
    const match = str.match(/-?\d[\d.,]*/);
    const [display, setDisplay] = useState(str);
    const raf = useRef();

    useEffect(() => {
        if (!match) { setDisplay(str); return; }
        const prefix = str.slice(0, match.index);
        const suffix = str.slice(match.index + match[0].length);
        const isFloat = /[.,]/.test(match[0]);
        const target = parseFloat(match[0].replace(/,/g, '.')) || 0;
        if (prefersReduced() || target === 0) { setDisplay(str); return; }
        const start = performance.now();
        const tick = (now) => {
            const t = Math.min((now - start) / duration, 1);
            const eased = 1 - Math.pow(1 - t, 3);
            const cur = target * eased;
            const num = isFloat ? cur.toFixed(1) : Math.round(cur).toString();
            setDisplay(`${prefix}${num}${suffix}`);
            if (t < 1) raf.current = requestAnimationFrame(tick);
            else setDisplay(str);
        };
        raf.current = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf.current);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [str]);

    return <span className={className}>{display}</span>;
}
