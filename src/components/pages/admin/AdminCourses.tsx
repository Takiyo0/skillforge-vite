import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
	Plus,
	AlertCircle,
	Loader,
	DollarSign,
} from 'lucide-react';
import type { Course, CourseLevel, ApiError, SandboxLanguage } from '@skillforge/vite/lib/types';
import { apiClient } from '@skillforge/vite/lib/api';
import { Breadcrumbs } from '@skillforge/vite/components/layout/Breadcrumbs';
import {Badge, GlassButton, GlassSecondaryButton, Input, Select, StateCard, Textarea} from '@skillforge/vite/components/ui/controls';
import {UserProfileLink} from '@skillforge/vite/components/ui/UserProfileLink';

type ModalState = 'closed' | 'create';

interface FormData {
	title: string;
	subtitle: string;
	description: string;
	level: CourseLevel;
	language: string;
	priceCents: number;
	currencyCode: string;
}

interface Toast {
	id: string;
	message: string;
	type: 'success' | 'error' | 'info';
}

const INITIAL_FORM_DATA: FormData = {
	title: '',
	subtitle: '',
	description: '',
	level: 'beginner',
	language: 'javascript',
	priceCents: 0,
	currencyCode: 'IDR',
};

const COURSE_LEVELS: CourseLevel[] = ['beginner', 'intermediate', 'advanced'];
const CURRENCIES = ['IDR', 'USD', 'EUR', 'GBP', 'JPY', 'CNY'];

export function AdminCourses() {
	const navigate = useNavigate();
	const [courses, setCourses] = useState<Course[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [toasts, setToasts] = useState<Toast[]>([]);

	const [modalState, setModalState] = useState<ModalState>('closed');
	const [formData, setFormData] = useState<FormData>(INITIAL_FORM_DATA);
	const [formErrors, setFormErrors] = useState<Record<string, string>>({});
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [supportedLanguages, setSupportedLanguages] = useState<SandboxLanguage[]>([]);
	const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
	const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);

	useEffect(() => {
		fetchCourses();
		void fetchSupportedLanguages();
	}, []);

	const fetchSupportedLanguages = async () => {
		try {
			const languages = await apiClient.getSandboxLanguages(false);
			setSupportedLanguages(languages);
		} catch {
			setSupportedLanguages([]);
		}
	};

	const fetchCourses = async () => {
		try {
			setLoading(true);
			setError(null);
			const data = await apiClient.getInstructorCourses();
			setCourses(data);
		} catch (err) {
			const apiError = err as ApiError;
			setError(apiError.message || 'Failed to fetch courses');
			addToast('Failed to load courses', 'error');
		} finally {
			setLoading(false);
		}
	};

	const addToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
		const id = Math.random().toString(36).substr(2, 9);
		setToasts((prev) => [...prev, { id, message, type }]);
		setTimeout(() => {
			setToasts((prev) => prev.filter((t) => t.id !== id));
		}, 5000);
	};

	const validateForm = (): boolean => {
		const errors: Record<string, string> = {};

		if (!formData.title.trim()) errors.title = 'Title is required';
		if (!formData.subtitle.trim()) errors.subtitle = 'Subtitle is required';
		if (!formData.description.trim()) errors.description = 'Description is required';
		if (formData.priceCents < 0) errors.priceCents = 'Price must be >= 0';

		setFormErrors(errors);
		return Object.keys(errors).length === 0;
	};

	const handleOpenCreate = () => {
		const defaultLanguage = supportedLanguages[0]?.id || INITIAL_FORM_DATA.language;
		setFormData(INITIAL_FORM_DATA);
		setFormData((prev) => ({ ...prev, language: defaultLanguage }));
		setFormErrors({});
		setThumbnailFile(null);
		setThumbnailPreview(null);
		setModalState('create');
	};

	const handleCreateCourse = async () => {
		if (!validateForm()) return;

		try {
			setIsSubmitting(true);
			const newCourse = await apiClient.createCourse(formData);
			const courseWithThumb = thumbnailFile
				? await apiClient.uploadCourseThumbnail(newCourse.id, thumbnailFile)
				: newCourse;
			setCourses((prev) => [...prev, courseWithThumb]);
			setThumbnailFile(null);
			setThumbnailPreview(null);
			addToast('Course created successfully', 'success');
			setModalState('closed');
		} catch (err) {
			const apiError = err as ApiError;
			if (apiError.statusCode === 409) {
				addToast('A course with this slug already exists', 'error');
			} else {
				addToast(apiError.message || 'Failed to create course', 'error');
			}
		} finally {
			setIsSubmitting(false);
		}
	};


	const handleFormChange = (field: keyof FormData, value: any) => {
		setFormData((prev) => ({ ...prev, [field]: value }));
		if (formErrors[field]) {
			setFormErrors((prev) => {
				const newErrors = { ...prev };
				delete newErrors[field];
				return newErrors;
			});
		}
	};

	const isPublished = (course: Course): boolean => {
		return course.isPublished ?? false;
	};

	const getCourseStats = (course: Course) => {
		const units = course.units || [];
		return {
			units: units.length,
			exercises: units.filter((unit) => unit.type === 'exercise').length,
			quizzes: units.filter((unit) => unit.type === 'assessment').length,
			finalExams: units.filter((unit) => unit.type === 'final_exam').length,
			modules: units.filter((unit) => unit.type === 'module').length,
		};
	};

	return (
		<div className="flex-1 overflow-y-auto">
			<div className="mx-auto max-w-[1600px] space-y-4 sm:space-y-6 px-2 sm:px-4 md:px-8 py-3 sm:py-4 md:py-8">
				<Breadcrumbs
					items={[
						{ label: 'Admin', to: '/admin' },
						{ label: 'Courses' },
					]}
				/>

				{/* Toast Notifications */}
				<div className="fixed top-2 right-2 sm:top-6 sm:right-6 z-50 space-y-2 sm:space-y-3 pointer-events-none max-w-[calc(100vw-1rem)] sm:max-w-none">
				{toasts.map((toast) => (
					<div
						key={toast.id}
						className={`px-6 py-4 rounded-2xl font-bold text-white shadow-lg pointer-events-auto animate-in slide-in-from-right ${
							toast.type === 'success'
								? 'bg-emerald-500'
								: toast.type === 'error'
									? 'bg-red-500'
									: 'bg-blue-500'
						}`}
					>
						{toast.message}
						</div>
					))}
				</div>

				{/* Header with Create Button */}
				<div className="flex flex-col gap-3 sm:gap-4 rounded-2xl sm:rounded-[2rem] glass-panel px-3 sm:px-4 md:px-6 py-4 sm:py-5 lg:flex-row lg:items-center lg:justify-between">
					<div>
						<h2 className="text-2xl font-black text-slate-900 dark:text-white">Manage Courses</h2>
						<p className="text-slate-500 dark:text-slate-400 font-medium mt-1">
							{courses.length} course{courses.length !== 1 ? 's' : ''} created
						</p>
					</div>
					<GlassButton
						onClick={handleOpenCreate}
						className="w-full justify-center lg:w-auto"
					>
						<Plus size={20} strokeWidth={3} />
						<span>New Course</span>
					</GlassButton>
				</div>

				{/* Error Message */}
				{error && (
					<div className="glass-state p-3 sm:p-4 md:p-6 rounded-2xl flex items-start space-x-3 sm:space-x-4 border-red-500/20 bg-red-500/10">
						<div className="w-10 h-10 bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
							<AlertCircle size={24} />
						</div>
						<div className="flex-1">
							<p className="font-bold text-red-700 dark:text-red-300">{error}</p>
							<button
								onClick={fetchCourses}
								className="text-sm font-bold text-red-600 dark:text-red-400 hover:underline mt-2"
							>
								Try again
							</button>
						</div>
					</div>
				)}

				{/* Courses Table */}
				<div className="glass-shell rounded-2xl sm:rounded-[2.5rem] overflow-hidden">
					{loading ? (
						<div className="flex items-center justify-center py-16">
							<StateCard title="Loading courses..." description="Please wait while the catalog syncs." />
						</div>
					) : courses.length === 0 ? (
						<div className="p-4 sm:p-8">
							<StateCard
								icon={<Plus size={24} />}
								title="No courses yet"
								description="Create your first course to get started."
								action={<GlassButton onClick={handleOpenCreate}>Create Course</GlassButton>}
							/>
						</div>
					) : (
						<div className="overflow-x-auto">
							<table className="w-full">
								<thead>
									<tr className="glass-table-head border-b border-blue-200/60 dark:border-blue-500/15">
										<th className="text-left px-6 py-4 font-black text-slate-900 dark:text-white uppercase tracking-wider text-sm">
											Title
										</th>
										<th className="text-left px-6 py-4 font-black text-slate-900 dark:text-white uppercase tracking-wider text-sm">
											Author
										</th>
										<th className="text-left px-6 py-4 font-black text-slate-900 dark:text-white uppercase tracking-wider text-sm">
											Level
										</th>
										<th className="text-left px-6 py-4 font-black text-slate-900 dark:text-white uppercase tracking-wider text-sm">
											Language
										</th>
										<th className="text-left px-6 py-4 font-black text-slate-900 dark:text-white uppercase tracking-wider text-sm">
											Status
										</th>
										<th className="text-left px-6 py-4 font-black text-slate-900 dark:text-white uppercase tracking-wider text-sm">
											Price
										</th>
										<th className="text-left px-6 py-4 font-black text-slate-900 dark:text-white uppercase tracking-wider text-sm">
											Content
										</th>
									</tr>
								</thead>
								<tbody>
									{courses.map((course) => (
										<tr
											key={course.id}
											onClick={() => navigate(`/admin/courses/${course.id}`)}
											onKeyDown={(e) => {
												if (e.key === 'Enter' || e.key === ' ') {
													e.preventDefault();
													navigate(`/admin/courses/${course.id}`);
												}
											}}
											role="button"
											tabIndex={0}
											className="glass-table-row border-b border-blue-200/60 dark:border-blue-500/15 cursor-pointer"
										>
											<td className="px-6 py-4">
												<div>
													<p className="font-bold text-slate-900 dark:text-white">{course.title}</p>
													<p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{course.subtitle}</p>
												</div>
											</td>
											<td className="px-6 py-4">
												<p className="font-medium text-slate-700 dark:text-slate-300">
													<UserProfileLink userId={course.creator?.id} className="hover:underline">
														{course.creator?.displayName || 'Unknown'}
													</UserProfileLink>
												</p>
											</td>
											<td className="px-6 py-4">
												<Badge tone="slate" className="capitalize">
													{course.level}
												</Badge>
											</td>
										<td className="hidden md:table-cell px-6 py-4">
											<div className="flex items-center space-x-2 text-slate-700 dark:text-slate-300">
												<span className="font-medium text-xs">{course.language}</span>
											</div>
										</td>
										<td className="px-6 py-4">
											<Badge tone={isPublished(course) ? 'green' : 'amber'}>
												{isPublished(course) ? 'Published' : 'Draft'}
											</Badge>
										</td>
										<td className="hidden md:table-cell px-6 py-4">
											<div className="flex items-center space-x-1 text-slate-700 dark:text-slate-300">
												<DollarSign size={16} />
												<span className="font-bold text-sm">
													{(course.priceCents / 100).toFixed(2)} {course.currencyCode}
												</span>
											</div>
										</td>
										<td className="hidden lg:table-cell px-6 py-4">
											{(() => {
												const stats = getCourseStats(course);
												return (
													<div className="inline-flex flex-wrap gap-2">
														<Badge tone="slate" className="normal-case">
															{stats.units} units
														</Badge>
														<Badge tone="green" className="normal-case">
															{stats.exercises} exercises
														</Badge>
														<Badge tone="blue" className="normal-case">
															{stats.quizzes} quizzes
														</Badge>
														<Badge tone="amber" className="normal-case">
															{stats.finalExams} final exams
														</Badge>
														<Badge tone="blue" className="normal-case">
															{stats.modules} modules
														</Badge>
													</div>
												);
											})()}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)}
			</div>

			{/* Create Modal */}
			{modalState === 'create' && (
				<div className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center p-4">
					<div className="glass-panel-strong rounded-2xl sm:rounded-[2.5rem] max-w-2xl w-full max-h-[90vh] overflow-y-auto">
						<div className="sticky top-0 glass-panel-strong border-b border-blue-200/60 dark:border-blue-500/15 px-4 sm:px-6 md:px-8 py-4 sm:py-6">
							<h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
								Create New Course
							</h2>
						</div>

						<div className="p-4 sm:p-6 md:p-8 space-y-4 sm:space-y-6">
							{/* Title */}
							<div>
								<label className="block text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider mb-3">
									Course Title
								</label>
								<Input
									type="text"
									value={formData.title}
									onChange={(e) => handleFormChange('title', e.target.value)}
									placeholder="e.g., React Advanced Patterns"
									className={`font-medium ${formErrors.title ? 'border-red-500' : ''}`}
								/>
								{formErrors.title && (
									<p className="text-sm text-red-600 dark:text-red-400 mt-2">{formErrors.title}</p>
								)}
							</div>

							{/* Subtitle */}
							<div>
								<label className="block text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider mb-3">
									Subtitle
								</label>
								<Input
									type="text"
									value={formData.subtitle}
									onChange={(e) => handleFormChange('subtitle', e.target.value)}
									placeholder="e.g., Master advanced React patterns"
									className={`font-medium ${formErrors.subtitle ? 'border-red-500' : ''}`}
								/>
								{formErrors.subtitle && (
									<p className="text-sm text-red-600 dark:text-red-400 mt-2">{formErrors.subtitle}</p>
								)}
							</div>

							{/* Description */}
							<div>
								<label className="block text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider mb-3">
									Description
								</label>
								<Textarea
									value={formData.description}
									onChange={(e) => handleFormChange('description', e.target.value)}
									placeholder="Describe your course in detail..."
									rows={5}
									className={`font-medium ${formErrors.description ? 'border-red-500' : ''}`}
								/>
								{formErrors.description && (
									<p className="text-sm text-red-600 dark:text-red-400 mt-2">{formErrors.description}</p>
								)}
							</div>

							<div>
								<label className="block text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider mb-3">
									Course Banner / Thumbnail
								</label>
								<div className="space-y-3">
									{thumbnailPreview && (
										<img
											src={thumbnailPreview}
											alt="Course banner preview"
											className="w-full h-40 object-cover rounded-xl border border-blue-200/60 dark:border-blue-500/15"
										/>
									)}
									<input
										type="file"
										accept="image/*"
										onChange={(e) => {
											const file = e.target.files?.[0] || null;
											setThumbnailFile(file);
											setThumbnailPreview(file ? URL.createObjectURL(file) : null);
										}}
										className="glass-control w-full rounded-2xl px-4 py-3"
									/>
									<p className="text-xs text-slate-500 dark:text-slate-400">
										Uploaded image will be stored to S3 and saved into <code>thumbnail_s3_key</code>.
									</p>
								</div>
							</div>

							{/* Level */}
							<div>
								<label className="block text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider mb-3">
									Course Level
								</label>
								<Select
									value={formData.level}
									onChange={(e) => handleFormChange('level', e.target.value as CourseLevel)}
									className="font-medium"
								>
									{COURSE_LEVELS.map((level) => (
										<option key={level} value={level} className="capitalize">
											{level.charAt(0).toUpperCase() + level.slice(1)}
										</option>
									))}
								</Select>
							</div>

							{/* Language */}
							<div>
								<label className="block text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider mb-3">
									Language
								</label>
								<Select
									value={formData.language}
									onChange={(e) => handleFormChange('language', e.target.value)}
									className="font-medium"
								>
									{(supportedLanguages.length > 0 ? supportedLanguages : [{ id: formData.language, name: formData.language.toUpperCase() }]).map((lang) => (
										<option key={lang.id} value={lang.id}>
											{lang.name}
										</option>
									))}
								</Select>
							</div>

							{/* Price */}
							<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-6">
								<div>
									<label className="block text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider mb-3">
										Price (in cents)
									</label>
									<Input
										type="number"
										value={formData.priceCents}
										onChange={(e) => handleFormChange('priceCents', parseInt(e.target.value) || 0)}
										min="0"
										className={`font-medium ${formErrors.priceCents ? 'border-red-500' : ''}`}
										placeholder="e.g., 9999 for $99.99"
									/>
									{formErrors.priceCents && (
										<p className="text-sm text-red-600 dark:text-red-400 mt-2">{formErrors.priceCents}</p>
									)}
								</div>

								{/* Currency */}
								<div>
									<label className="block text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider mb-3">
										Currency
									</label>
									<Select
										value={formData.currencyCode}
										onChange={(e) => handleFormChange('currencyCode', e.target.value)}
										className="font-medium"
									>
										{CURRENCIES.map((curr) => (
											<option key={curr} value={curr}>
												{curr}
											</option>
										))}
									</Select>
								</div>
							</div>

							{/* Actions */}
							<div className="flex flex-col-reverse sm:flex-row justify-end gap-3 sm:space-x-4 pt-4 sm:pt-6 border-t border-blue-200/60 dark:border-blue-500/15">
								<GlassSecondaryButton
									onClick={() => setModalState('closed')}
									disabled={isSubmitting}
									className="w-full sm:w-auto px-4 sm:px-6 py-2.5 sm:py-3"
								>
									Cancel
								</GlassSecondaryButton>
								<GlassButton
									onClick={handleCreateCourse}
									disabled={isSubmitting}
									className="w-full sm:w-auto px-4 sm:px-6 py-2.5 sm:py-3 disabled:opacity-50 flex items-center justify-center space-x-2"
								>
									{isSubmitting ? (
										<>
											<Loader size={18} className="animate-spin" />
											<span>Saving...</span>
										</>
									) : (
										<span>Create</span>
									)}
								</GlassButton>
							</div>
						</div>
					</div>
				</div>
			)}
			</div>
		</div>
	);
}
