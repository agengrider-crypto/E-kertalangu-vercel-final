import { Skeleton } from '@/components/ui/skeleton';

// Skeleton tabel — jumlah baris & kolom bisa diatur. Hanya visual saat loading.
export function TableSkeleton({ rows = 6, cols = 5 }) {
    return (
        <div className="p-4 space-y-3" data-testid="table-skeleton">
            <div className="flex gap-4">
                {Array.from({ length: cols }).map((_, i) => (
                    <Skeleton key={i} className="h-4 flex-1" />
                ))}
            </div>
            {Array.from({ length: rows }).map((_, r) => (
                <div key={r} className="flex gap-4 items-center">
                    {Array.from({ length: cols }).map((_, c) => (
                        <Skeleton key={c} className={`h-5 flex-1 ${c === 0 ? 'max-w-[40%]' : ''}`} />
                    ))}
                </div>
            ))}
        </div>
    );
}

export function CardsSkeleton({ count = 6, className = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' }) {
    return (
        <div className={className} data-testid="cards-skeleton">
            {Array.from({ length: count }).map((_, i) => (
                <div key={i} className="rounded-2xl border border-border bg-card p-5 space-y-3">
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-6 w-2/3" />
                    <Skeleton className="h-4 w-1/2" />
                </div>
            ))}
        </div>
    );
}
