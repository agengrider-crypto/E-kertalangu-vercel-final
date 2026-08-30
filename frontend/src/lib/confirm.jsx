import { createContext, useContext, useState, useCallback, useRef } from 'react';
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const ConfirmCtx = createContext(null);

const DEFAULT = { open: false, title: 'Konfirmasi', description: '', confirmText: 'Hapus', cancelText: 'Batal', danger: true };

export function ConfirmProvider({ children }) {
    const [state, setState] = useState(DEFAULT);
    const resolver = useRef(null);

    const confirm = useCallback((opts = {}) => {
        return new Promise((resolve) => {
            resolver.current = resolve;
            setState({
                open: true,
                title: opts.title || 'Konfirmasi',
                description: opts.description || '',
                confirmText: opts.confirmText || 'Hapus',
                cancelText: opts.cancelText || 'Batal',
                danger: opts.danger !== false,
            });
        });
    }, []);

    const close = (result) => {
        setState((s) => ({ ...s, open: false }));
        if (resolver.current) { resolver.current(result); resolver.current = null; }
    };

    return (
        <ConfirmCtx.Provider value={confirm}>
            {children}
            <AlertDialog open={state.open} onOpenChange={(o) => { if (!o) close(false); }}>
                <AlertDialogContent data-testid="confirm-dialog" className="rounded-2xl">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="font-display">{state.title}</AlertDialogTitle>
                        {state.description && <AlertDialogDescription>{state.description}</AlertDialogDescription>}
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel data-testid="confirm-cancel" onClick={() => close(false)} className="rounded-full">
                            {state.cancelText}
                        </AlertDialogCancel>
                        <AlertDialogAction
                            data-testid="confirm-accept"
                            onClick={() => close(true)}
                            className={`rounded-full ${state.danger ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : ''}`}
                        >
                            {state.confirmText}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </ConfirmCtx.Provider>
    );
}

export function useConfirm() {
    const ctx = useContext(ConfirmCtx);
    if (!ctx) throw new Error('useConfirm must be used within ConfirmProvider');
    return ctx;
}
