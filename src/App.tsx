import {useState, useEffect, useMemo} from 'react';
import {BrowserRouter as Router, Routes, Route, Navigate, useLocation} from 'react-router-dom';
import type {User} from '@skillforge/vite/lib/types';
import {Sidebar} from '@skillforge/vite/components/layout/Sidebar';
import {UserMenu} from '@skillforge/vite/components/layout/UserMenu';
import {MobileNav} from '@skillforge/vite/components/layout/MobileNav';
import {StudentDashboard} from '@skillforge/vite/components/pages/student/StudentDashboard';
import {LearningPath} from '@skillforge/vite/components/pages/student/LearningPath';
import {LearningPathsPage} from '@skillforge/vite/components/pages/student/LearningPathsPage';
import {CodePlayground} from '@skillforge/vite/components/pages/student/CodePlayground';
import {Certificates} from '@skillforge/vite/components/pages/student/Certificates';
import {CertificatePage} from '@skillforge/vite/components/pages/student/CertificatePage';
import {CertificateVerification} from '@skillforge/vite/components/pages/student/CertificateVerification';
import {BrowseCourses} from '@skillforge/vite/components/pages/student/BrowseCourses';
import {CourseDetail} from '@skillforge/vite/components/pages/student/CourseDetail';
import {UnitView} from '@skillforge/vite/components/pages/student/UnitView';
import {AssessmentPage} from '@skillforge/vite/components/pages/student/AssessmentPage';
import {ProfilePage} from '@skillforge/vite/components/pages/student/ProfilePage';
import {SettingsPage} from '@skillforge/vite/components/pages/student/SettingsPage';
import {UserForumsPage} from '@skillforge/vite/components/pages/student/UserForumsPage';
import {CourseForumsPage} from '@skillforge/vite/components/pages/student/CourseForumsPage';
import {ForumThreadPage} from '@skillforge/vite/components/pages/student/ForumThreadPage';
import {AdminDashboard} from '@skillforge/vite/components/pages/admin/AdminDashboard';
import {AdminCourses} from '@skillforge/vite/components/pages/admin/AdminCourses';
import {AdminCourseDetail} from '@skillforge/vite/components/pages/admin/AdminCourseDetail';
import {AdminUnitDetail} from '@skillforge/vite/components/pages/admin/AdminUnitDetail';
import {Login} from '@skillforge/vite/components/pages/auth/Login';
import {Register} from '@skillforge/vite/components/pages/auth/Register';
import {apiClient} from '@skillforge/vite/lib/api';
import {canAccessAdmin, isAdmin, isInstructor} from '@skillforge/vite/lib/roles';
import '@skillforge/vite/App.css';

function App() {
    const [isDarkMode, setIsDarkMode] = useState(true);
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    useEffect(() => {
        document.documentElement.classList.toggle('dark', isDarkMode);
    }, [isDarkMode]);

    // check if user is logged in on app start
    useEffect(() => {
        const checkAuth = async () => {
            const token = localStorage.getItem('accessToken');
            if (token) {
                try {
                    const profile = await apiClient.getProfile();
                    setUser(profile);
                    setIsAuthenticated(true);
                    if (profile.preference) {
                        setIsDarkMode(profile.preference.darkModeEnabled);
                    }
                } catch {
                    localStorage.removeItem('accessToken');
                    setIsAuthenticated(false);
                }
            }
            setLoading(false);
        };

        void checkAuth();
    }, []);

    const handleLogout = () => {
        apiClient.logout();
        setUser(null);
        setIsAuthenticated(false);
    };

    if (loading) {
        return (
            <div
                className={`flex min-h-screen items-center justify-center ${isDarkMode ? 'dark bg-slate-950' : 'bg-slate-50'}`}>
                <div className="flex flex-col items-center space-y-4">
                    <div
                        className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-600 flex items-center justify-center text-white font-black text-3xl shadow-lg shadow-blue-500/30 animate-pulse">
                        S
                    </div>
                    <p className={isDarkMode ? 'text-slate-400' : 'text-slate-600'}>Loading...</p>
                </div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return (
            <div className="min-h-screen dark bg-slate-950 text-white">
                <Router>
                    <Routes>
                        <Route path="/login" element={<Login/>}/>
                        <Route path="/register" element={<Register/>}/>
                        <Route path="/student/profile/:userId" element={<ProfilePage/>}/>
                        <Route path="/student/certificates" element={<Certificates/>}/>
                        <Route path="/student/certificates/:certificateId" element={<CertificatePage/>}/>
                        <Route path="/student/certificates/verification" element={<CertificateVerification/>}/>
                        <Route path="/certificates/:certificateId" element={<CertificatePage/>}/>
                        <Route path="/certificates/verification" element={<CertificateVerification/>}/>
                        <Route path="*" element={<Navigate to="/login" replace/>}/>
                    </Routes>
                </Router>
            </div>
        );
    }

    return (
        <Router>
            <AppContent isDarkMode={isDarkMode} user={user} handleLogout={handleLogout} setIsDarkMode={setIsDarkMode}
                        setUser={setUser}/>
        </Router>
    );
}

function AppContent({isDarkMode, user, handleLogout, setIsDarkMode, setUser}: {
    isDarkMode: boolean;
    user: User | null;
    handleLogout: () => void;
    setIsDarkMode: (dark: boolean) => void;
    setUser: (user: User | null) => void
}) {
    const [mobileNavOpen, setMobileNavOpen] = useState(false);
    const location = useLocation();

    const role: 'student' | 'instructor' | 'admin' = useMemo(() => {
        const pathname = location.pathname;
        if (pathname.startsWith('/admin')) {
            if (isAdmin(user) || isInstructor(user)) return 'admin';
        }
        return 'student';
    }, [location.pathname, user]);

    const canAccessAdminArea = canAccessAdmin(user);

    return (
        <div
            className={`relative min-h-screen overflow-hidden ${isDarkMode ? 'text-slate-100 bg-slate-950' : 'text-slate-900 bg-slate-50'}`}>
            <div
                className={`pointer-events-none absolute inset-0 ${isDarkMode
                    ? 'bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.2),transparent_30%),radial-gradient(circle_at_top_right,rgba(14,165,233,0.15),transparent_24%),linear-gradient(180deg,rgba(3,7,18,0.92)_0%,rgba(7,17,30,0.88)_48%,rgba(2,6,23,0.94)_100%)]'
                    : 'bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.14),transparent_32%),radial-gradient(circle_at_top_right,rgba(14,165,233,0.1),transparent_24%),linear-gradient(180deg,rgba(248,250,252,0.98)_0%,rgba(239,246,255,0.96)_48%,rgba(226,242,255,0.92)_100%)]'
                }`}/>

            {/* Mobile Navigation - only visible on mobile */}
            <MobileNav
                isOpen={mobileNavOpen}
                onOpenChange={setMobileNavOpen}
                role={role}
                onLogout={handleLogout}
            />

            <div className="relative z-10 flex min-h-screen gap-2 sm:gap-3 md:gap-4 lg:gap-6 p-1 sm:p-2 md:p-4 lg:p-6">
                {/* Sidebar - hidden on mobile, visible on tablet and desktop */}
                <div className="hidden sm:block shrink-0 sticky top-2 sm:top-3 md:top-4 lg:top-6 h-[calc(100vh-1rem)] sm:h-[calc(100vh-1rem)] md:h-[calc(100vh-2rem)] lg:h-[calc(100vh-3rem)]">
                    <Sidebar
                        role={role}
                        isDarkMode={isDarkMode}
                        onLogout={handleLogout}
                    />
                </div>

                <div className="flex-1 min-w-0 flex flex-col overflow-hidden rounded-[2.25rem]">
                    {/* header with user menu */}
                    <div className="flex items-center justify-end rounded-[1.75rem] px-2 sm:px-3 md:px-4 py-2 sm:py-3">
                        {user && <UserMenu user={user} onLogout={handleLogout}/>}
                    </div>

                    <div className="flex-1 min-h-0 overflow-hidden">
                        <Routes>
                            {/* student routes */}
                            <Route path="/student/dashboard" element={<StudentDashboard/>}/>
                            <Route path="/student/browse-courses" element={<BrowseCourses/>}/>
                            <Route path="/student/learning-paths" element={<LearningPathsPage/>}/>
                            <Route path="/student/profile/:userId" element={<ProfilePage/>}/>
                            <Route path="/student/settings"
                                   element={<SettingsPage onDarkModeChange={setIsDarkMode}
                                                          onProfileUpdate={setUser}/>}/>
                            <Route path="/student/forum" element={<UserForumsPage/>}/>
                            <Route path="/student/courses/:courseId/forums" element={<CourseForumsPage/>}/>
                            <Route path="/student/courses/:courseId/forums/:forumId" element={<ForumThreadPage/>}/>
                            <Route path="/student/courses/:courseId" element={<CourseDetail/>}/>
                            <Route path="/student/courses/:courseId/units/:unitId" element={<UnitView/>}/>
                            <Route path="/student/courses/:courseId/units/:unitId/assessment"
                                   element={<AssessmentPage/>}/>
                            <Route path="/student/learning-path" element={<LearningPath activeCourseId="backend"/>}/>
                            <Route path="/student/playground" element={<CodePlayground/>}/>
                            <Route path="/student/certificates" element={<Certificates/>}/>
                            <Route path="/certificates/:certificateId" element={<CertificatePage/>}/>
                            <Route path="/certificates/verification" element={<CertificateVerification/>}/>
                            <Route path="/student/certificates/:certificateId" element={<CertificatePage/>}/>
                            <Route path="/student/certificates/verification" element={<CertificateVerification/>}/>

                            {/* admin routes */}
                            <Route
                                path="/admin"
                                element={
                                    canAccessAdminArea
                                        ? <Navigate to="/admin/courses" replace/>
                                        : <Navigate to="/student/dashboard" replace/>
                                }
                            />
                            <Route
                                path="/admin/courses"
                                element={canAccessAdminArea ? <AdminCourses/> :
                                    <Navigate to="/student/dashboard" replace/>}
                            />
                            <Route
                                path="/admin/courses/:courseId"
                                element={canAccessAdminArea ? <AdminCourseDetail/> :
                                    <Navigate to="/student/dashboard" replace/>}
                            />
                            <Route
                                path="/admin/courses/:courseId/:unitId"
                                element={canAccessAdminArea ? <AdminUnitDetail/> :
                                    <Navigate to="/student/dashboard" replace/>}
                            />
                            <Route
                                path="/admin/learning-paths"
                                element={canAccessAdminArea ? <AdminDashboard/> :
                                    <Navigate to="/student/dashboard" replace/>}
                            />
                            <Route
                                path="/admin/badges"
                                element={canAccessAdminArea ? <AdminDashboard/> :
                                    <Navigate to="/student/dashboard" replace/>}
                            />
                            <Route
                                path="/admin/users"
                                element={canAccessAdminArea ? <AdminDashboard/> :
                                    <Navigate to="/student/dashboard" replace/>}
                            />

                            {/* catch all */}
                            <Route path="/" element={<Navigate to="/student/dashboard" replace/>}/>
                            <Route path="*" element={<Navigate to="/student/dashboard" replace/>}/>
                        </Routes>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default App;
