import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api, formatApiError } from '@/lib/api';

const AuthCtx = createContext(null);

// Which roles each real role may PREVIEW (view-as) — hierarchical
const PREVIEW_MATRIX = {
    admin: ['pengurus', 'peserta'],
    pengurus: ['peserta'],
    peserta: [],
};

export const ROLE_LABELS = {
    admin: 'Admin',
    pengurus: 'Pengurus',
    peserta: 'Peserta',
};

export function AuthProvider({ children }) {
    const [account, setAccount] = useState(null); // null=checking, false=guest, obj=account
    const [publicCfg, setPublicCfg] = useState({ admin_wa: '6281937718541', app_name: 'E-Kertalangu' });
    const [previewRole, setPreviewRoleState] = useState(() => localStorage.getItem('ektl_preview') || null);

    const bootstrap = useCallback(async () => {
        const token = localStorage.getItem('ektl_token');
        try {
            const cfg = await api.get('/config/public');
            setPublicCfg(cfg.data);
        } catch {}
        if (!token) {
            setAccount(false);
            return;
        }
        try {
            const { data } = await api.get('/auth/me');
            setAccount(data.user);
        } catch {
            localStorage.removeItem('ektl_token');
            setAccount(false);
        }
    }, []);

    useEffect(() => {
        bootstrap();
    }, [bootstrap]);

    const clearPreview = () => {
        setPreviewRoleState(null);
        localStorage.removeItem('ektl_preview');
    };

    const login = async (identifier, password, role = null) => {
        try {
            const { data } = await api.post('/auth/login', { identifier, password, role });
            if (data.needs_role) {
                return { ok: false, needsRole: true, roles: data.roles || [], name: data.name || '' };
            }
            localStorage.setItem('ektl_token', data.token);
            clearPreview();
            setAccount(data.user);
            return { ok: true, user: data.user };
        } catch (e) {
            return { ok: false, error: formatApiError(e) };
        }
    };

    const logout = async () => {
        try { await api.post('/auth/logout'); } catch {}
        localStorage.removeItem('ektl_token');
        clearPreview();
        setAccount(false);
    };

    const realRole = account && account !== false ? account.role : null;
    const allowedPreviews = realRole ? (PREVIEW_MATRIX[realRole] || []) : [];
    const activePreview = previewRole && allowedPreviews.includes(previewRole) ? previewRole : null;

    const setPreviewRole = (role) => {
        if (!role || role === realRole) {
            clearPreview();
        } else if (allowedPreviews.includes(role)) {
            setPreviewRoleState(role);
            localStorage.setItem('ektl_preview', role);
        }
    };

    // Effective user: role reflects preview so the whole UI adapts automatically
    const user =
        account && account !== false
            ? { ...account, role: activePreview || account.role }
            : account;

    const setUser = (u) => setAccount(u);

    return (
        <AuthCtx.Provider
            value={{
                user,
                setUser,
                login,
                logout,
                publicCfg,
                realRole,
                previewRole: activePreview,
                allowedPreviews,
                setPreviewRole,
            }}
        >
            {children}
        </AuthCtx.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthCtx);
    if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
    return ctx;
}
