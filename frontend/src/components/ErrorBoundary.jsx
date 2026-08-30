import React from 'react';

/**
 * Global error boundary — mencegah halaman blank/putih ketika terjadi
 * runtime error di React (mis. konflik DOM pihak ketiga). Menampilkan
 * pesan ramah + tombol untuk mencoba lagi. Minimal-invasive, tidak
 * mengubah arsitektur.
 */
export default class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError() {
        return { hasError: true };
    }

    componentDidCatch(error, info) {
        // Logging internal untuk debugging (tidak ditampilkan ke pengguna)
        // eslint-disable-next-line no-console
        console.error('[ErrorBoundary]', error, info);
    }

    handleReset = () => {
        this.setState({ hasError: false });
        // Muat ulang halaman saat ini agar state kembali bersih
        window.location.reload();
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen grid place-items-center p-6 bg-background text-foreground">
                    <div className="max-w-sm w-full text-center rounded-2xl border border-border bg-card p-6 shadow-sm">
                        <h1 className="font-display font-bold text-xl">Terjadi kendala</h1>
                        <p className="text-sm text-muted-foreground mt-2">
                            Maaf, terjadi kesalahan saat menampilkan halaman. Silakan coba lagi.
                        </p>
                        <button
                            onClick={this.handleReset}
                            className="mt-5 w-full h-11 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90"
                        >
                            Muat Ulang
                        </button>
                    </div>
                </div>
            );
        }
        return this.props.children;
    }
}
