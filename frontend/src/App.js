import '@/App.css';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/lib/auth';
import { ThemeProvider } from '@/lib/theme';
import { ConfirmProvider } from '@/lib/confirm';
import { Toaster } from '@/components/ui/sonner';
import ErrorBoundary from '@/components/ErrorBoundary';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import ForgotPassword from '@/pages/ForgotPassword';
import PublicQr from '@/pages/PublicQr';
import ShareRecap from '@/pages/ShareRecap';
import Announcements from '@/pages/Announcements';
import AppShell from '@/pages/AppShell';
import Dashboard from '@/pages/Dashboard';
import Participants from '@/pages/Participants';
import ParticipantDetail from '@/pages/ParticipantDetail';
import Activities from '@/pages/Activities';
import ActivityDetail from '@/pages/ActivityDetail';
import MorePage from '@/pages/MorePage';
import Musyawarah from '@/pages/Musyawarah';
import ActivityLog from '@/pages/ActivityLog';
import Backup from '@/pages/Backup';
import Reports from '@/pages/Reports';
import ArchivedParticipants from '@/pages/ArchivedParticipants';
import Users from '@/pages/Users';
import MyProfile from '@/pages/MyProfile';
import ScanPage from '@/pages/ScanPage';
import Checkin from '@/pages/Checkin';
import Activation from '@/pages/Activation';

function Protected({ children }) {
    const { user } = useAuth();
    if (user === null) return <div className="min-h-screen grid place-items-center text-muted-foreground">Memuat…</div>;
    if (!user) return <Navigate to="/login" replace />;
    return children;
}

function RootRedirect() {
    const { user } = useAuth();
    if (user === null) return <div className="min-h-screen grid place-items-center text-muted-foreground">Memuat…</div>;
    if (!user) return <Navigate to="/login" replace />;
    return <Navigate to="/app/dashboard" replace />;
}

function RequireAdmin({ children }) {
    const { user } = useAuth();
    if (user === null) return <div className="min-h-screen grid place-items-center text-muted-foreground">Memuat…</div>;
    if (!user) return <Navigate to="/login" replace />;
    if (user.role !== 'admin') return <Navigate to="/app/dashboard" replace />;
    return children;
}

export default function App() {
    return (
        <div className="App">
            <ThemeProvider>
                <AuthProvider>
                    <BrowserRouter>
                        <ErrorBoundary>
                        <ConfirmProvider>
                        <Routes>
                            <Route path="/" element={<RootRedirect />} />
                            <Route path="/login" element={<Login />} />
                            <Route path="/register" element={<Register />} />
                            <Route path="/aktivasi" element={<Activation />} />
                            <Route path="/forgot-password" element={<ForgotPassword />} />
                            <Route path="/qr-daftar" element={<PublicQr />} />
                            <Route path="/a/:code" element={<Checkin />} />
                            <Route path="/share/:token" element={<ShareRecap />} />
                            <Route
                                path="/app"
                                element={
                                    <Protected>
                                        <AppShell />
                                    </Protected>
                                }
                            >
                                <Route index element={<Navigate to="dashboard" replace />} />
                                <Route path="dashboard" element={<Dashboard />} />
                                <Route path="participants" element={<Participants />} />
                                <Route path="participants/:pid" element={<ParticipantDetail />} />
                                <Route path="activities" element={<Activities />} />
                                <Route path="activities/:aid" element={<ActivityDetail />} />
                                <Route path="musyawarah" element={<Musyawarah />} />
                                <Route path="announcements" element={<Announcements />} />
                                <Route path="activity-log" element={<RequireAdmin><ActivityLog /></RequireAdmin>} />
                                <Route path="reports" element={<Reports />} />
                                <Route path="archive" element={<RequireAdmin><ArchivedParticipants /></RequireAdmin>} />
                                <Route path="backup" element={<Backup />} />
                                <Route path="users" element={<Users />} />
                                <Route path="scan" element={<ScanPage />} />
                                <Route path="me" element={<MyProfile />} />
                                <Route path="more" element={<MorePage />} />
                            </Route>
                            <Route path="*" element={<Navigate to="/" replace />} />
                        </Routes>
                        </ConfirmProvider>
                        </ErrorBoundary>
                    </BrowserRouter>
                    <Toaster position="bottom-right" richColors />
                </AuthProvider>
            </ThemeProvider>
        </div>
    );
}
