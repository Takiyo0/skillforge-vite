import {useLocation} from 'react-router-dom';
import {AdminCourses} from '@skillforge/vite/components/pages/admin/AdminCourses';
import {AdminLearningPaths} from '@skillforge/vite/components/pages/admin/AdminLearningPaths';
import {AdminBadges} from '@skillforge/vite/components/pages/admin/AdminBadges';
import {AdminUsers} from '@skillforge/vite/components/pages/admin/AdminUsers';
import {AdminHome} from '@skillforge/vite/components/pages/admin/AdminHome';
import {Breadcrumbs} from "@skillforge/vite/components/layout/Breadcrumbs";

export function AdminDashboard() {
    const location = useLocation();
    const pathname = location.pathname;

    const renderContent = () => {
        switch (pathname) {
            case '/admin':
            case '/admin/':
                return <AdminHome/>;
            case '/admin/courses':
                return <AdminCourses/>;
            case '/admin/learning-paths':
                return <AdminLearningPaths/>;
            case '/admin/badges':
                return <AdminBadges/>;
            case '/admin/users':
                return <AdminUsers/>;
            default:
                return <AdminHome/>;
        }
    };

    const getPageTitle = () => {
        const titles: Record<string, string> = {
            '/admin': 'Dashboard',
            '/admin/': 'Dashboard',
            '/admin/courses': 'Courses',
            '/admin/learning-paths': 'Learning Paths',
            '/admin/badges': 'Badges',
            '/admin/users': 'User Management',
        };
        return titles[pathname] || 'Dashboard';
    };

    const getPageDescription = () => {
        if (pathname === '/admin' || pathname === '/admin/') {
            return 'Monitor and manage the SkillForge ecosystem.';
        }
        if (pathname === '/admin/users') {
            return 'Manage user accounts, roles, and access.';
        }
        return `Manage ${getPageTitle().toLowerCase()}`;
    };

    return (
        <div className="flex-1 overflow-y-auto">
            <div className="space-y-6 overflow-y-auto px-6 py-6 md:px-8 md:py-8 max-w-[1600px]">
                {/* Header with Breadcrumbs */}
                <div>
                    <Breadcrumbs items={[
                        {label: 'Admin', to: '/admin'},
                        {label: getPageTitle()}
                    ]}/>
                    <div className="mt-5"/>
                    <h1 className="text-3xl font-black text-slate-900 dark:text-white">{getPageTitle()}</h1>
                    <p className="text-slate-500 dark:text-slate-400 font-medium mt-2">
                        {getPageDescription()}
                    </p>
                </div>

                {/* Tab Content */}
                <div>
                    {renderContent()}
                </div>
            </div>
        </div>
    );
}
