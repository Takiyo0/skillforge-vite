import {useState, useEffect} from 'react';
import {
    Search,
    Users,
    Trash2,
    Shield,
    Lock,
    Unlock,
    MoreVertical,
    X,
    Check,
} from 'lucide-react';
import {apiClient} from '@skillforge/vite/lib/api';
import {Badge, GlassSecondaryButton, Input, Select, StateCard} from '@skillforge/vite/components/ui/controls';
import {UserProfileLink} from '@skillforge/vite/components/ui/UserProfileLink';

interface User {
    id: string;
    email: string;
    displayName: string;
    roles: string[];
    isActive: boolean;
    createdAt: string;
    lastLoginAt?: string;
}

interface UserStats {
    totalUsers: number;
    activeUsers: number;
    inactiveUsers: number;
    byRole: Record<string, number>;
}

export function AdminUsers() {
    const [users, setUsers] = useState<User[]>([]);
    const [stats, setStats] = useState<UserStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState<string>('');
    const [statusFilter, setStatusFilter] = useState<string>('');
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [pages, setPages] = useState(0);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [showModal, setShowModal] = useState(false);
    const [modalType, setModalType] = useState<'roles' | 'activate' | 'deactivate' | 'delete'>('roles');
    const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
    const [actionLoading, setActionLoading] = useState(false);
    const [openMenu, setOpenMenu] = useState<string | null>(null);

    // Fetch users
    useEffect(() => {
        fetchUsers();
        fetchStats();
    }, [search, roleFilter, statusFilter, page]);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            setError(null);
            const result = await apiClient.listUsers({
                search: search || undefined,
                role: roleFilter || undefined,
                status: (statusFilter || undefined) as 'active' | 'inactive' | undefined,
                page,
                limit: 20,
            });
            setUsers(result.data || []);
            setTotal(result.pagination?.total || 0);
            setPages(result.pagination?.totalPages || 0);
        } catch (err) {
            setError('Failed to load users');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const fetchStats = async () => {
        try {
            const result = await apiClient.getUserStats();
            setStats(result);
        } catch (err) {
            console.error('Failed to load stats:', err);
        }
    };

    const openUserModal = (user: User, type: 'roles' | 'activate' | 'deactivate' | 'delete') => {
        setSelectedUser(user);
        setModalType(type);
        if (type === 'roles') {
            setSelectedRoles(user.roles);
        }
        setShowModal(true);
        setOpenMenu(null);
    };

    const handleUpdateRoles = async () => {
        if (!selectedUser || selectedRoles.length === 0) return;

        try {
            setActionLoading(true);
            await apiClient.updateUserRoles(selectedUser.id, selectedRoles);
            setShowModal(false);
            await fetchUsers();
        } catch {
            setError('Failed to update user roles');
        } finally {
            setActionLoading(false);
        }
    };

    const handleActivateUser = async () => {
        if (!selectedUser) return;

        try {
            setActionLoading(true);
            await apiClient.activateUser(selectedUser.id);
            setShowModal(false);
            await fetchUsers();
        } catch {
            setError('Failed to activate user');
        } finally {
            setActionLoading(false);
        }
    };

    const handleDeactivateUser = async () => {
        if (!selectedUser) return;

        try {
            setActionLoading(true);
            await apiClient.deactivateUser(selectedUser.id);
            setShowModal(false);
            await fetchUsers();
        } catch {
            setError('Failed to deactivate user');
        } finally {
            setActionLoading(false);
        }
    };

    const handleDeleteUser = async () => {
        if (!selectedUser) return;

        try {
            setActionLoading(true);
            await apiClient.deleteUser(selectedUser.id);
            setShowModal(false);
            await fetchUsers();
        } catch {
            setError('Failed to delete user');
        } finally {
            setActionLoading(false);
        }
    };

    const toggleRole = (role: string) => {
        setSelectedRoles((prev) =>
            prev.includes(role)
                ? prev.filter((r) => r !== role)
                : [...prev, role]
        );
    };

    const allRoles = ['learner', 'instructor', 'admin'];
    const pages_array = Array.from({length: pages}, (_, i) => i + 1);

    return (
        <div className="space-y-8">
            {/* Statistics */}
            {stats && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="p-6 rounded-2xl glass-shell relative overflow-hidden group">
                        <div
                            className="absolute -right-6 -top-6 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl group-hover:bg-blue-500/20 transition-colors"></div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider mb-2">Total
                            Users</p>
                        <h3 className="text-4xl font-black text-slate-900 dark:text-white">{stats.totalUsers}</h3>
                    </div>
                    <div className="p-6 rounded-2xl glass-shell relative overflow-hidden group">
                        <div
                            className="absolute -right-6 -top-6 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition-colors"></div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider mb-2">Active
                            Users</p>
                        <h3 className="text-4xl font-black text-emerald-600">{stats.activeUsers}</h3>
                    </div>
                    <div className="p-6 rounded-2xl glass-shell relative overflow-hidden group">
                        <div
                            className="absolute -right-6 -top-6 w-24 h-24 bg-yellow-500/10 rounded-full blur-2xl group-hover:bg-yellow-500/20 transition-colors"></div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider mb-2">Inactive
                            Users</p>
                        <h3 className="text-4xl font-black text-yellow-600">{stats.inactiveUsers}</h3>
                    </div>
                    <div className="p-6 rounded-2xl glass-shell relative overflow-hidden group">
                        <div
                            className="absolute -right-6 -top-6 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl group-hover:bg-blue-500/20 transition-colors"></div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider mb-2">Admins</p>
                        <h3 className="text-4xl font-black text-blue-600">{stats.byRole.admin || 0}</h3>
                    </div>
                </div>
            )}

            {/* Search and Filters */}
            <div className="rounded-2xl glass-shell p-6 space-y-4">
                <div className="flex flex-col sm:flex-row gap-4">
                    {/* Search */}
                    <div className="flex-1 relative">
                        <Search size={18} className="absolute left-3 top-3 text-slate-400"/>
                        <Input
                            type="text"
                            placeholder="Search by email or name..."
                            value={search}
                            onChange={(e) => {
                                setSearch(e.target.value);
                                setPage(1);
                            }}
                            className="pl-10"
                        />
                    </div>

                    {/* Role Filter */}
                    <Select
                        value={roleFilter}
                        onChange={(e) => {
                            setRoleFilter(e.target.value);
                            setPage(1);
                        }}
                        className="font-medium"
                    >
                        <option value="">All Roles</option>
                        <option value="learner">Learner</option>
                        <option value="instructor">Instructor</option>
                        <option value="admin">Admin</option>
                    </Select>

                    {/* Status Filter */}
                    <Select
                        value={statusFilter}
                        onChange={(e) => {
                            setStatusFilter(e.target.value);
                            setPage(1);
                        }}
                        className="font-medium"
                    >
                        <option value="">All Status</option>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                    </Select>
                </div>
            </div>

            {/* Error Message */}
            {error && (
                <div
                    className="glass-state rounded-2xl border-red-500/20 bg-red-500/10 p-4 text-red-700 dark:text-red-300">
                    {error}
                </div>
            )}

            {/* Users Table */}
            <div className="rounded-2xl glass-shell overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center p-12">
                        <StateCard title="Loading users..." description="Refreshing roles and status filters."/>
                    </div>
                ) : users.length === 0 ? (
                    <StateCard icon={<Users size={24}/>} title="No users found"
                               description="Try adjusting search or filters." className="m-6"/>
                ) : (
                    <>
                        <div className="overflow-x-auto sm:overflow-visible">
                            <table className="min-w-[600px] sm:min-w-0 w-full">
                                <thead>
                                <tr className="glass-table-head border-b border-blue-200/60 dark:border-blue-500/15">
                                    <th className="text-left px-6 py-4 font-black text-slate-900 dark:text-white uppercase tracking-wider text-xs">User</th>
                                    <th className="text-left px-6 py-4 font-black text-slate-900 dark:text-white uppercase tracking-wider text-xs">Roles</th>
                                    <th className="text-left px-6 py-4 font-black text-slate-900 dark:text-white uppercase tracking-wider text-xs">Status</th>
                                    <th className="text-left px-6 py-4 font-black text-slate-900 dark:text-white uppercase tracking-wider text-xs">Joined</th>
                                    <th className="text-center px-6 py-4 font-black text-slate-900 dark:text-white uppercase tracking-wider text-xs">Actions</th>
                                </tr>
                                </thead>
                                <tbody>
                                {users.map((user) => (
                                    <tr key={user.id}
                                        className="glass-table-row border-b border-blue-200/60 dark:border-blue-500/15">
                                        <td className="px-6 py-4">
                                            <p className="font-bold text-slate-900 dark:text-white">
                                                <UserProfileLink userId={user.id} className="hover:underline">
                                                    {user.displayName}
                                                </UserProfileLink>
                                            </p>
                                            <p className="text-sm text-slate-500 dark:text-slate-400">{user.email}</p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex gap-2 flex-wrap">
                                                {user.roles.map((role) => (
                                                    <Badge
                                                        key={role}
                                                        tone={role === 'admin' ? 'red' : role === 'instructor' ? 'blue' : 'slate'}
                                                    >
                                                        {role}
                                                    </Badge>
                                                ))}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <Badge tone={user.isActive ? 'green' : 'red'}>
                                                {user.isActive ? 'Active' : 'Inactive'}
                                            </Badge>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                                            {new Date(user.createdAt).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 text-center relative">
                                            <button
                                                onClick={() => setOpenMenu(openMenu === user.id ? null : user.id)}
                                                className="glass-chip p-2.5 min-w-[44px] min-h-[44px] rounded-xl transition-colors inline-flex items-center justify-center"
                                            >
                                                <MoreVertical size={18} className="text-slate-600 dark:text-slate-400"/>
                                            </button>

                                            {/* Action Menu */}
                                            {openMenu === user.id && (
                                                <div
                                                    className="absolute right-0 top-12 glass-menu rounded-2xl z-10 min-w-[180px] overflow-hidden">
                                                    <button
                                                        onClick={() => openUserModal(user, 'roles')}
                                                        className="w-full text-left px-4 py-3 hover:bg-blue-500/10 text-sm font-medium text-slate-900 dark:text-white flex items-center gap-2"
                                                    >
                                                        <Shield size={16}/>
                                                        Edit Roles
                                                    </button>
                                                    {user.isActive ? (
                                                        <button
                                                            onClick={() => openUserModal(user, 'deactivate')}
                                                            className="w-full text-left px-4 py-3 hover:bg-blue-500/10 text-sm font-medium text-slate-900 dark:text-white flex items-center gap-2"
                                                        >
                                                            <Lock size={16}/>
                                                            Deactivate
                                                        </button>
                                                    ) : (
                                                        <button
                                                            onClick={() => openUserModal(user, 'activate')}
                                                            className="w-full text-left px-4 py-3 hover:bg-blue-500/10 text-sm font-medium text-slate-900 dark:text-white flex items-center gap-2"
                                                        >
                                                            <Unlock size={16}/>
                                                            Activate
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => openUserModal(user, 'delete')}
                                                        className="w-full text-left px-4 py-3 hover:bg-red-500/10 text-red-600 dark:text-red-400 text-sm font-medium flex items-center gap-2"
                                                    >
                                                        <Trash2 size={16}/>
                                                        Delete
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        <div
                            className="flex items-center justify-between px-6 py-4 border-t border-blue-200/60 dark:border-blue-500/15">
                            <div className="text-sm text-slate-600 dark:text-slate-400">
                                Showing {users.length} of {total} users
                            </div>
                            <div className="flex gap-2">
                                <GlassSecondaryButton
                                    onClick={() => setPage(Math.max(1, page - 1))}
                                    disabled={page === 1}
                                    className="px-3 py-2"
                                >
                                    Previous
                                </GlassSecondaryButton>
                                {pages_array.slice(Math.max(0, page - 2), Math.min(pages_array.length, page + 1)).map((p) => (
                                    <button
                                        key={p}
                                        onClick={() => setPage(p)}
                                        className={`glass-chip px-3 py-2 font-medium transition-colors ${
                                            p === page
                                                ? 'bg-blue-500/20 text-blue-700 dark:text-blue-200'
                                                : 'text-slate-900 dark:text-white hover:bg-white/80 dark:hover:bg-slate-800/70'
                                        }`}
                                    >
                                        {p}
                                    </button>
                                ))}
                                <GlassSecondaryButton
                                    onClick={() => setPage(Math.min(pages, page + 1))}
                                    disabled={page === pages}
                                    className="px-3 py-2"
                                >
                                    Next
                                </GlassSecondaryButton>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Modal */}
            {showModal && selectedUser && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div
                        className="glass-panel-strong rounded-2xl max-w-md w-full p-6 border border-blue-200/60 dark:border-blue-500/15">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-black text-slate-900 dark:text-white">
                                {modalType === 'roles' && 'Edit User Roles'}
                                {modalType === 'activate' && 'Activate User'}
                                {modalType === 'deactivate' && 'Deactivate User'}
                                {modalType === 'delete' && 'Delete User'}
                            </h2>
                            <button
                                onClick={() => setShowModal(false)}
                                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                            >
                                <X size={20}/>
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">User</p>
                                <p className="font-bold text-slate-900 dark:text-white">
                                    <UserProfileLink userId={selectedUser.id} className="hover:underline">
                                        {selectedUser.displayName}
                                    </UserProfileLink>
                                </p>
                                <p className="text-sm text-slate-500 dark:text-slate-400">{selectedUser.email}</p>
                            </div>

                            {/* Roles Selection */}
                            {modalType === 'roles' && (
                                <div className="space-y-3">
                                    <p className="font-bold text-slate-900 dark:text-white">Assign Roles</p>
                                    {allRoles.map((role) => (
                                        <label key={role} className="flex items-center gap-3 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={selectedRoles.includes(role)}
                                                onChange={() => toggleRole(role)}
                                                className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                            />
                                            <span
                                                className="capitalize font-medium text-slate-900 dark:text-white">{role}</span>
                                        </label>
                                    ))}
                                </div>
                            )}

                            {/* Activate/Deactivate/Delete Confirmation */}
                            {modalType !== 'roles' && (
                                <div className="p-4 bg-white/60 dark:bg-slate-950/50 backdrop-blur-sm rounded-lg">
                                    <p className="text-sm text-slate-700 dark:text-slate-300">
                                        {modalType === 'activate' && 'Are you sure you want to activate this user?'}
                                        {modalType === 'deactivate' && 'Are you sure you want to deactivate this user? They will not be able to access their account.'}
                                        {modalType === 'delete' && 'Are you sure you want to permanently delete this user? This action cannot be undone.'}
                                    </p>
                                </div>
                            )}

                            {/* Buttons */}
                            <div className="flex gap-3 pt-4">
                                <button
                                    onClick={() => setShowModal(false)}
                                    className="flex-1 rounded-2xl px-4 py-3 font-bold text-slate-900 dark:text-white glass-chip transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => {
                                        if (modalType === 'roles') handleUpdateRoles();
                                        else if (modalType === 'activate') handleActivateUser();
                                        else if (modalType === 'deactivate') handleDeactivateUser();
                                        else if (modalType === 'delete') handleDeleteUser();
                                    }}
                                    disabled={actionLoading}
                                    className={`flex-1 rounded-2xl px-4 py-3 font-bold text-white transition-colors flex items-center justify-center gap-2 ${
                                        modalType === 'delete'
                                            ? 'bg-red-600 hover:bg-red-700 disabled:opacity-50'
                                            : 'glass-button disabled:opacity-50'
                                    }`}
                                >
                                    {actionLoading ? (
                                        <>
                                            <div
                                                className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                            Loading...
                                        </>
                                    ) : (
                                        <>
                                            <Check size={18}/>
                                            {modalType === 'roles' && 'Save Roles'}
                                            {modalType === 'activate' && 'Activate'}
                                            {modalType === 'deactivate' && 'Deactivate'}
                                            {modalType === 'delete' && 'Delete'}
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
