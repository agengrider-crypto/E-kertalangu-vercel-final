import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Empty state modern: ikon + judul + deskripsi + CTA opsional (sesuai hak akses).
export function EmptyState({ icon: Icon, title, description, actionLabel, onAction, actionTestId, testId, compact = false }) {
    return (
        <div data-testid={testId} className={`flex flex-col items-center justify-center text-center px-6 ${compact ? 'py-10' : 'py-14'}`}>
            {Icon && (
                <div className="h-16 w-16 rounded-2xl bg-primary/10 grid place-items-center mb-4">
                    <Icon className="h-8 w-8 text-primary" />
                </div>
            )}
            <p className="font-display font-bold text-lg">{title}</p>
            {description && <p className="text-sm text-muted-foreground mt-1 max-w-sm">{description}</p>}
            {actionLabel && onAction && (
                <Button data-testid={actionTestId} onClick={onAction} className="rounded-full mt-5">
                    <Plus className="h-4 w-4 mr-2" /> {actionLabel}
                </Button>
            )}
        </div>
    );
}
