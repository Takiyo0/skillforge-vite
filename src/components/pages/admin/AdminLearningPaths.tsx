import {useState, useEffect} from 'react';
import {
    Plus,
    Edit2,
    Trash2,
    AlertCircle,
    CheckCircle,
    X,
    ChevronUp,
    ChevronDown,
    Loader,
    Unlock,
} from 'lucide-react';
import {apiClient} from '@skillforge/vite/lib/api';
import type {LearningPath, Course} from '@skillforge/vite/lib/types';

interface FormData {
    slug: string;
    title: string;
    description: string;
    isPublic: boolean;
    wantToLearn: string;
    languages: string;
    alreadyKnow: string;
}

interface Toast {
    type: 'success' | 'error';
    message: string;
}

export function AdminLearningPaths() {
    const [learningPaths, setLearningPaths] = useState<LearningPath[]>([]);
    const [courses, setCourses] = useState<Course[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [toast, setToast] = useState<Toast | null>(null);

    // Modal states
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showManageCoursesModal, setShowManageCoursesModal] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    // Form states
    const [formData, setFormData] = useState<FormData>({
        slug: '',
        title: '',
        description: '',
        isPublic: true,
        wantToLearn: '',
        languages: '',
        alreadyKnow: '',
    });
    const [editingPath, setEditingPath] = useState<LearningPath | null>(null);
    const [selectedPath, setSelectedPath] = useState<LearningPath | null>(null);
    const [pathToDelete, setPathToDelete] = useState<LearningPath | null>(null);

    // Course management states
    const [selectedCourseIds, setSelectedCourseIds] = useState<Set<string>>(new Set());
    const [coursesInPath, setCoursesInPath] = useState<any[]>([]);
    const [savingCourses, setSavingCourses] = useState(false);
    const [reorderingCourses, setReorderingCourses] = useState(false);

    // API call states
    const [submitting, setSubmitting] = useState(false);
    const [deleting, setDeleting] = useState(false);

    // Fetch all learning paths and courses on mount
    useEffect(() => {
        fetchLearningPaths();
        fetchCourses();
    }, []);

    const fetchLearningPaths = async () => {
        try {
            setLoading(true);
            setError(null);
            const paths = await apiClient.getAllLearningPathsAdmin();
            setLearningPaths(paths || []);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to fetch learning paths';
            setError(message);
            showToast('error', message);
        } finally {
            setLoading(false);
        }
    };

    const fetchCourses = async () => {
        try {
            const instructorCourses = await apiClient.getInstructorCourses();
            setCourses(instructorCourses || []);
        } catch (err) {
            console.error('Failed to fetch courses:', err);
        }
    };

    const showToast = (type: 'success' | 'error', message: string) => {
        setToast({type, message});
        setTimeout(() => setToast(null), 3000);
    };

    const resetForm = () => {
        setFormData({
            slug: '',
            title: '',
            description: '',
            isPublic: true,
            wantToLearn: '',
            languages: '',
            alreadyKnow: '',
        });
        setEditingPath(null);
    };

    const handleCreateClick = () => {
        resetForm();
        setShowCreateModal(true);
    };

    const handleEditClick = (path: LearningPath) => {
        setEditingPath(path);
        setFormData({
            slug: path.slug,
            title: path.title,
            description: path.description,
            isPublic: true,
            wantToLearn: path.criteria?.wantToLearn?.join(', ') || '',
            languages: path.criteria?.languages?.join(', ') || '',
            alreadyKnow: path.criteria?.alreadyKnow?.join(', ') || '',
        });
        setShowEditModal(true);
    };

    const handleManageCoursesClick = async (path: LearningPath) => {
        setSelectedPath(path);
        setCoursesInPath(path.courses || []);
        setSelectedCourseIds(new Set(path.courses?.map(c => c.courseId) || []));
        setShowManageCoursesModal(true);
    };

    const handleDeleteClick = (path: LearningPath) => {
        setPathToDelete(path);
        setShowDeleteConfirm(true);
    };

    const handleCreateOrUpdatePath = async () => {
        if (!formData.slug || !formData.title) {
            showToast('error', 'Slug and title are required');
            return;
        }

        try {
            setSubmitting(true);

            const criteria = {
                wantToLearn: formData.wantToLearn
                    ? formData.wantToLearn.split(',').map(s => s.trim()).filter(Boolean)
                    : [],
                languages: formData.languages
                    ? formData.languages.split(',').map(s => s.trim()).filter(Boolean)
                    : [],
                alreadyKnow: formData.alreadyKnow
                    ? formData.alreadyKnow.split(',').map(s => s.trim()).filter(Boolean)
                    : [],
            };

            if (editingPath) {
                // Update existing path
                const updated = await apiClient.updateLearningPath(editingPath.id, {
                    title: formData.title,
                    description: formData.description,
                    criteria,
                });
                setLearningPaths(learningPaths.map(p => (p.id === editingPath.id ? updated : p)));
                showToast('success', 'Learning path updated successfully');
                setShowEditModal(false);
            } else {
                // Create new path
                const newPath = await apiClient.createLearningPath({
                    slug: formData.slug,
                    title: formData.title,
                    description: formData.description,
                    criteria,
                    isPublic: formData.isPublic,
                });
                setLearningPaths([...learningPaths, newPath]);
                showToast('success', 'Learning path created successfully');
                setShowCreateModal(false);
            }

            resetForm();
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to save learning path';
            showToast('error', message);
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeletePath = async () => {
        if (!pathToDelete) return;

        try {
            setDeleting(true);
            await apiClient.deleteLearningPath(pathToDelete.id);
            setLearningPaths(learningPaths.filter(p => p.id !== pathToDelete.id));
            showToast('success', 'Learning path deleted successfully');
            setShowDeleteConfirm(false);
            setPathToDelete(null);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to delete learning path';
            showToast('error', message);
        } finally {
            setDeleting(false);
        }
    };

    const handleAddCourses = async () => {
        if (!selectedPath) return;

        try {
            setSavingCourses(true);
            const courseIdsToAdd = Array.from(selectedCourseIds).filter(
                id => !coursesInPath.find(c => c.courseId === id)
            );

            if (courseIdsToAdd.length > 0) {
                await apiClient.addCoursesToPath(selectedPath.id, courseIdsToAdd);
                const updatedPath = await apiClient.getLearningPathAdmin(selectedPath.id);
                setLearningPaths(learningPaths.map(p => (p.id === selectedPath.id ? updatedPath : p)));
                showToast('success', `${courseIdsToAdd.length} course(s) added successfully`);
            }

            setShowManageCoursesModal(false);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to add courses';
            showToast('error', message);
        } finally {
            setSavingCourses(false);
        }
    };

    const handleRemoveCourse = async (courseId: string) => {
        if (!selectedPath) return;

        try {
            await apiClient.removeCourseFromPath(selectedPath.id, courseId);
            const updatedPath = await apiClient.getLearningPathAdmin(selectedPath.id);
            setLearningPaths(learningPaths.map(p => (p.id === selectedPath.id ? updatedPath : p)));
            setCoursesInPath(updatedPath.courses || []);
            showToast('success', 'Course removed successfully');
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to remove course';
            showToast('error', message);
        }
    };

    const handleReorderCourses = async (fromIndex: number, direction: 'up' | 'down') => {
        const toIndex = direction === 'up' ? fromIndex - 1 : fromIndex + 1;

        if (toIndex < 0 || toIndex >= coursesInPath.length) return;

        const newOrder = [...coursesInPath];
        [newOrder[fromIndex], newOrder[toIndex]] = [newOrder[toIndex], newOrder[fromIndex]];
        setCoursesInPath(newOrder);

        if (!selectedPath) return;

        try {
            setReorderingCourses(true);
            const courseIds = newOrder.map(c => c.courseId);
            await apiClient.reorderCoursesInPath(selectedPath.id, courseIds);
            const updatedPath = await apiClient.getLearningPathAdmin(selectedPath.id);
            setLearningPaths(learningPaths.map(p => (p.id === selectedPath.id ? updatedPath : p)));
            showToast('success', 'Courses reordered successfully');
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to reorder courses';
            showToast('error', message);
            setCoursesInPath(selectedPath.courses || []);
        } finally {
            setReorderingCourses(false);
        }
    };

    const toggleCourseSelection = (courseId: string) => {
        const newSelected = new Set(selectedCourseIds);
        if (newSelected.has(courseId)) {
            newSelected.delete(courseId);
        } else {
            newSelected.add(courseId);
        }
        setSelectedCourseIds(newSelected);
    };

    const getAvailableCourses = () => {
        return courses.filter(c => !coursesInPath.find(cp => cp.courseId === c.id));
    };

    return (
        <div className="space-y-5">
            {/* Toast Notifications */}
            {toast && (
                <div
                    className={`fixed top-4 right-4 px-6 py-4 rounded-2xl text-white font-bold flex items-center gap-3 z-50 ${
                        toast.type === 'success'
                            ? 'bg-emerald-500'
                            : 'bg-red-500'
                    }`}
                >
                    {toast.type === 'success' ? <CheckCircle size={20}/> : <AlertCircle size={20}/>}
                    {toast.message}
                </div>
            )}

            {/* Header with Create Button */}
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">
                        {learningPaths.length} path{learningPaths.length !== 1 ? 's' : ''} available
                    </p>
                </div>
                <button
                    onClick={handleCreateClick}
                    className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white px-6 py-3 rounded-2xl font-black uppercase tracking-wider transition-transform hover:scale-105 shadow-lg shadow-blue-600/30 flex items-center gap-2"
                >
                    <Plus size={20}/> Create Path
                </button>
            </div>

            {/* Loading State */}
            {loading && (
                <div className="flex items-center justify-center min-h-96">
                    <div className="text-center space-y-4">
                        <Loader className="animate-spin mx-auto text-blue-600" size={40}/>
                        <p className="text-slate-500 dark:text-slate-400 font-medium">
                            Loading learning paths...
                        </p>
                    </div>
                </div>
            )}

            {/* Error State */}
            {error && !loading && (
                <div
                    className="bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 rounded-2xl p-6 flex items-start gap-4">
                    <AlertCircle className="text-red-600 dark:text-red-400 shrink-0 mt-1" size={24}/>
                    <div>
                        <h3 className="font-black text-red-700 dark:text-red-300 mb-1">Error Loading Paths</h3>
                        <p className="text-red-600 dark:text-red-400">{error}</p>
                        <button
                            onClick={fetchLearningPaths}
                            className="mt-3 text-red-700 dark:text-red-300 font-bold hover:underline text-sm"
                        >
                            Try Again
                        </button>
                    </div>
                </div>
            )}

            {/* Learning Paths Table */}
            {!loading && !error && learningPaths.length > 0 && (
                <div
                    className="rounded-2xl glass-panel overflow-hidden">
                    <div className="overflow-x-auto sm:overflow-visible">
                        <table className="min-w-[700px] sm:min-w-0 w-full">
                            <thead>
                            <tr className="border-b border-blue-200/60 dark:border-blue-500/15 bg-white/60 dark:bg-slate-950/50 backdrop-blur-sm/50">
                                <th className="text-left px-6 py-4 font-black text-slate-900 dark:text-white uppercase tracking-wider text-sm">
                                    Title
                                </th>
                                <th className="text-left px-6 py-4 font-black text-slate-900 dark:text-white uppercase tracking-wider text-sm">
                                    Description
                                </th>
                                <th className="text-center px-6 py-4 font-black text-slate-900 dark:text-white uppercase tracking-wider text-sm">
                                    Courses
                                </th>
                                <th className="text-center px-6 py-4 font-black text-slate-900 dark:text-white uppercase tracking-wider text-sm">
                                    Status
                                </th>
                                <th className="text-center px-6 py-4 font-black text-slate-900 dark:text-white uppercase tracking-wider text-sm">
                                    Actions
                                </th>
                            </tr>
                            </thead>
                            <tbody>
                            {learningPaths.map((path, idx) => (
                                <tr
                                    key={path.id}
                                    className={`${
                                        idx !== learningPaths.length - 1
                                            ? 'border-b border-blue-200/60 dark:border-blue-500/15'
                                            : ''
                                    } hover:bg-blue-50/60 dark:hover:bg-blue-500/10 transition-colors`}
                                >
                                    <td className="px-6 py-4">
                                        <p className="font-bold text-slate-900 dark:text-white">{path.title}</p>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                            {path.slug}
                                        </p>
                                    </td>
                                    <td className="px-6 py-4">
                                        <p className="text-slate-600 dark:text-slate-300 text-sm line-clamp-2">
                                            {path.description}
                                        </p>
                                    </td>
                                    <td className="px-6 py-4 text-center">
											<span
                                                className="inline-block px-3 py-1 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-xs font-black rounded-2xl">
												{path.courses?.length || 0}
											</span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
											<span
                                                className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 text-xs font-black rounded-2xl">
												<Unlock size={12}/> Public
											</span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <div className="flex items-center justify-center gap-2">
                                            <button
                                                onClick={() => handleManageCoursesClick(path)}
                                                className="px-3 py-2.5 min-h-[44px] min-w-[44px] bg-blue-100 dark:bg-blue-900/30 hover:bg-blue-200 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded-2xl font-bold text-xs transition-colors"
                                                title="Manage Courses"
                                            >
                                                📚 Manage
                                            </button>
                                            <button
                                                onClick={() => handleEditClick(path)}
                                                className="px-3 py-2.5 min-h-[44px] min-w-[44px] bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-900 dark:text-white rounded-2xl font-bold text-xs transition-colors inline-flex items-center justify-center"
                                                title="Edit"
                                            >
                                                <Edit2 size={14}/>
                                            </button>
                                            <button
                                                onClick={() => handleDeleteClick(path)}
                                                className="px-3 py-2.5 min-h-[44px] min-w-[44px] bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 text-red-700 dark:text-red-300 rounded-2xl font-bold text-xs transition-colors inline-flex items-center justify-center"
                                                title="Delete"
                                            >
                                                <Trash2 size={14}/>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Empty State */}
            {!loading && !error && learningPaths.length === 0 && (
                <div
                    className="bg-white/70 dark:bg-slate-950/70 backdrop-blur-xl rounded-2xl border border-blue-200/60 dark:border-blue-500/15 shadow-xl shadow-blue-950/10 p-12 text-center">
                    <div className="text-6xl mb-4">📚</div>
                    <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">
                        No Learning Paths Yet
                    </h3>
                    <p className="text-slate-500 dark:text-slate-400 mb-6">
                        Create your first learning path to get started
                    </p>
                    <button
                        onClick={handleCreateClick}
                        className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white px-6 py-3 rounded-2xl font-black uppercase tracking-wider transition-transform hover:scale-105 shadow-lg shadow-blue-600/30 inline-flex items-center gap-2"
                    >
                        <Plus size={20}/> Create First Path
                    </button>
                </div>
            )}

            {/* Create/Edit Modal */}
            {(showCreateModal || showEditModal) && (
                <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
                    <div
                        className="bg-white/70 dark:bg-slate-950/70 backdrop-blur-xl rounded-2xl border border-blue-200/60 dark:border-blue-500/15 shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-8">
                            {/* Header */}
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-2xl font-black text-slate-900 dark:text-white">
                                    {editingPath ? 'Edit Learning Path' : 'Create Learning Path'}
                                </h2>
                                <button
                                    onClick={() => {
                                        setShowCreateModal(false);
                                        setShowEditModal(false);
                                        resetForm();
                                    }}
                                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition-colors"
                                >
                                    <X size={24} className="text-slate-600 dark:text-slate-400"/>
                                </button>
                            </div>

                            {/* Form */}
                            <div className="space-y-6">
                                {/* Slug Field */}
                                <div>
                                    <label
                                        className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wider">
                                        Slug *
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.slug}
                                        onChange={(e) =>
                                            setFormData({...formData, slug: e.target.value})
                                        }
                                        disabled={!!editingPath}
                                        placeholder="e.g., frontend-web-dev"
                                        className="w-full px-4 py-3 bg-white/60 dark:bg-slate-950/50 backdrop-blur-sm border border-blue-200/60 dark:border-blue-500/15 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                    />
                                    {editingPath && (
                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                                            Slug cannot be changed after creation
                                        </p>
                                    )}
                                </div>

                                {/* Title Field */}
                                <div>
                                    <label
                                        className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wider">
                                        Title *
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.title}
                                        onChange={(e) =>
                                            setFormData({...formData, title: e.target.value})
                                        }
                                        placeholder="e.g., Frontend Web Development Masterclass"
                                        className="w-full px-4 py-3 bg-white/60 dark:bg-slate-950/50 backdrop-blur-sm border border-blue-200/60 dark:border-blue-500/15 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                    />
                                </div>

                                {/* Description Field */}
                                <div>
                                    <label
                                        className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wider">
                                        Description
                                    </label>
                                    <textarea
                                        value={formData.description}
                                        onChange={(e) =>
                                            setFormData({...formData, description: e.target.value})
                                        }
                                        placeholder="Describe this learning path..."
                                        rows={4}
                                        className="w-full px-4 py-3 bg-white/60 dark:bg-slate-950/50 backdrop-blur-sm border border-blue-200/60 dark:border-blue-500/15 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none"
                                    />
                                </div>

                                {/* Criteria Fields */}
                                <div className="space-y-4">
                                    <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                                        Criteria
                                    </h3>

                                    {/* Want to Learn */}
                                    <div>
                                        <label
                                            className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-2 uppercase tracking-wider">
                                            Want to Learn (comma-separated)
                                        </label>
                                        <textarea
                                            value={formData.wantToLearn}
                                            onChange={(e) =>
                                                setFormData({...formData, wantToLearn: e.target.value})
                                            }
                                            placeholder="e.g., React, JavaScript, Web Development"
                                            rows={2}
                                            className="w-full px-4 py-3 bg-white/60 dark:bg-slate-950/50 backdrop-blur-sm border border-blue-200/60 dark:border-blue-500/15 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none text-sm"
                                        />
                                    </div>

                                    {/* Languages */}
                                    <div>
                                        <label
                                            className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-2 uppercase tracking-wider">
                                            Languages (comma-separated)
                                        </label>
                                        <textarea
                                            value={formData.languages}
                                            onChange={(e) =>
                                                setFormData({...formData, languages: e.target.value})
                                            }
                                            placeholder="e.g., JavaScript, TypeScript, HTML, CSS"
                                            rows={2}
                                            className="w-full px-4 py-3 bg-white/60 dark:bg-slate-950/50 backdrop-blur-sm border border-blue-200/60 dark:border-blue-500/15 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none text-sm"
                                        />
                                    </div>

                                    {/* Already Know */}
                                    <div>
                                        <label
                                            className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-2 uppercase tracking-wider">
                                            Already Know (comma-separated)
                                        </label>
                                        <textarea
                                            value={formData.alreadyKnow}
                                            onChange={(e) =>
                                                setFormData({...formData, alreadyKnow: e.target.value})
                                            }
                                            placeholder="e.g., HTML, CSS, Basic JavaScript"
                                            rows={2}
                                            className="w-full px-4 py-3 bg-white/60 dark:bg-slate-950/50 backdrop-blur-sm border border-blue-200/60 dark:border-blue-500/15 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none text-sm"
                                        />
                                    </div>
                                </div>

                                {/* Is Public Toggle */}
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() =>
                                            setFormData({...formData, isPublic: !formData.isPublic})
                                        }
                                        className={`relative w-12 h-7 rounded-full transition-colors ${
                                            formData.isPublic
                                                ? 'bg-emerald-500'
                                                : 'bg-slate-300 dark:bg-slate-700'
                                        }`}
                                    >
                                        <div
                                            className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-transform ${
                                                formData.isPublic ? 'translate-x-6' : 'translate-x-1'
                                            }`}
                                        />
                                    </button>
                                    <label className="text-sm font-bold text-slate-700 dark:text-slate-300">
                                        Make Public
                                    </label>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-3 mt-8">
                                <button
                                    onClick={() => {
                                        setShowCreateModal(false);
                                        setShowEditModal(false);
                                        resetForm();
                                    }}
                                    className="flex-1 px-6 py-3 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-900 dark:text-white rounded-2xl font-bold transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleCreateOrUpdatePath}
                                    disabled={submitting}
                                    className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-2xl font-bold transition-all flex items-center justify-center gap-2"
                                >
                                    {submitting && <Loader size={16} className="animate-spin"/>}
                                    {editingPath ? 'Update Path' : 'Create Path'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Manage Courses Modal */}
            {showManageCoursesModal && selectedPath && (
                <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
                    <div
                        className="bg-white/70 dark:bg-slate-950/70 backdrop-blur-xl rounded-2xl border border-blue-200/60 dark:border-blue-500/15 shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-8">
                            {/* Header */}
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h2 className="text-2xl font-black text-slate-900 dark:text-white">
                                        Manage Courses
                                    </h2>
                                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                                        {selectedPath.title}
                                    </p>
                                </div>
                                <button
                                    onClick={() => setShowManageCoursesModal(false)}
                                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition-colors"
                                >
                                    <X size={24} className="text-slate-600 dark:text-slate-400"/>
                                </button>
                            </div>

                            <div className="grid grid-cols-2 gap-8">
                                {/* Currently Added Courses */}
                                <div>
                                    <h3 className="text-sm font-black text-slate-900 dark:text-white mb-4 uppercase tracking-wider">
                                        Courses in Path ({coursesInPath.length})
                                    </h3>
                                    <div className="space-y-2 max-h-96 overflow-y-auto">
                                        {coursesInPath.length > 0 ? (
                                            coursesInPath.map((course, idx) => (
                                                <div
                                                    key={course.courseId}
                                                    className="flex items-center justify-between p-3 bg-white/60 dark:bg-slate-950/50 backdrop-blur-sm rounded-2xl border border-blue-200/60 dark:border-blue-500/15"
                                                >
                                                    <div className="flex-1">
                                                        <p className="font-bold text-slate-900 dark:text-white text-sm">
                                                            {course.courseName}
                                                        </p>
                                                        <p className="text-xs text-slate-500 dark:text-slate-400">
                                                            Position: {course.position + 1}
                                                        </p>
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <button
                                                            onClick={() =>
                                                                handleReorderCourses(idx, 'up')
                                                            }
                                                            disabled={idx === 0 || reorderingCourses}
                                                            className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed rounded transition-colors"
                                                            title="Move up"
                                                        >
                                                            <ChevronUp size={16}/>
                                                        </button>
                                                        <button
                                                            onClick={() =>
                                                                handleReorderCourses(idx, 'down')
                                                            }
                                                            disabled={
                                                                idx === coursesInPath.length - 1 ||
                                                                reorderingCourses
                                                            }
                                                            className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed rounded transition-colors"
                                                            title="Move down"
                                                        >
                                                            <ChevronDown size={16}/>
                                                        </button>
                                                        <button
                                                            onClick={() =>
                                                                handleRemoveCourse(course.courseId)
                                                            }
                                                            className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 rounded transition-colors"
                                                            title="Remove"
                                                        >
                                                            <X size={16}/>
                                                        </button>
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <p className="text-slate-500 dark:text-slate-400 text-sm italic">
                                                No courses added yet
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {/* Available Courses to Add */}
                                <div>
                                    <h3 className="text-sm font-black text-slate-900 dark:text-white mb-4 uppercase tracking-wider">
                                        Available Courses ({getAvailableCourses().length})
                                    </h3>
                                    <div className="space-y-2 max-h-96 overflow-y-auto">
                                        {getAvailableCourses().length > 0 ? (
                                            getAvailableCourses().map(course => (
                                                <label
                                                    key={course.id}
                                                    className="flex items-center gap-3 p-3 bg-white/60 dark:bg-slate-950/50 backdrop-blur-sm rounded-2xl border border-blue-200/60 dark:border-blue-500/15 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedCourseIds.has(course.id)}
                                                        onChange={() =>
                                                            toggleCourseSelection(course.id)
                                                        }
                                                        className="w-4 h-4 rounded accent-blue-600"
                                                    />
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-bold text-slate-900 dark:text-white text-sm truncate">
                                                            {course.title}
                                                        </p>
                                                        <p className="text-xs text-slate-500 dark:text-slate-400">
                                                            {course.level}
                                                        </p>
                                                    </div>
                                                </label>
                                            ))
                                        ) : (
                                            <p className="text-slate-500 dark:text-slate-400 text-sm italic">
                                                All available courses added
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-3 mt-8">
                                <button
                                    onClick={() => setShowManageCoursesModal(false)}
                                    className="flex-1 px-6 py-3 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-900 dark:text-white rounded-2xl font-bold transition-colors"
                                >
                                    Close
                                </button>
                                <button
                                    onClick={handleAddCourses}
                                    disabled={savingCourses}
                                    className="flex-1 px-6 py-3 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-2xl font-bold transition-all flex items-center justify-center gap-2"
                                >
                                    {savingCourses && <Loader size={16} className="animate-spin"/>}
                                    Save Changes
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && pathToDelete && (
                <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
                    <div
                        className="bg-white/70 dark:bg-slate-950/70 backdrop-blur-xl rounded-2xl border border-blue-200/60 dark:border-blue-500/15 shadow-xl max-w-sm w-full">
                        <div className="p-8 text-center">
                            <div
                                className="w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mx-auto mb-4">
                                <AlertCircle size={32}/>
                            </div>
                            <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2">
                                Delete Learning Path?
                            </h2>
                            <p className="text-slate-600 dark:text-slate-400 mb-4">
                                Are you sure you want to delete "<strong>{pathToDelete.title}</strong>"?
                                This action cannot be undone.
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => {
                                        setShowDeleteConfirm(false);
                                        setPathToDelete(null);
                                    }}
                                    className="flex-1 px-6 py-3 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-900 dark:text-white rounded-2xl font-bold transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleDeletePath}
                                    disabled={deleting}
                                    className="flex-1 px-6 py-3 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-2xl font-bold transition-colors flex items-center justify-center gap-2"
                                >
                                    {deleting && <Loader size={16} className="animate-spin"/>}
                                    Delete
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
