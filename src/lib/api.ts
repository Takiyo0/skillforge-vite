import type {
    AuthResponse,
    LoginRequest,
    RegisterRequest,
    User,
    XpSummary,
    Streak,
    UserBadgesResponse,
    PaginatedResponse,
    Course,
    Unit,
    CourseUnitsResponse,
    CourseProgress,
    SubmissionResponse,
    QuizSubmissionResponse,
    FinalExamAttemptStartResponse,
    FinalExamSubmissionResponse,
    QuizAnswerDto,
    CourseLevel,
    ApiError,
    SubmissionFeedback,
    AttemptReviewResponse,
    Certificate,
    CertificateDownloadResponse,
    CertificateVerificationResponse,
    LearningPath,
    UserProfile,
    ExerciseDetails,
    ModuleContent,
    TestCase,
    Hint,
    Quiz,
    QuizQuestion,
    QuizOption,
    FinalExam,
    AdminBadge,
    BadgeCriteriaMetadata,
    CreateBadgeRequest,
    UpdateBadgeRequest,
    ModuleResource,
    SandboxLanguage,
    SandboxRunResponse,
    SandboxTestCaseRequest,
} from '@skillforge/vite/lib/types';

// Interface for leaderboard entry
interface LeaderboardEntry {
    userId: string;
    displayName: string;
    currentStreakDays: number;
    longestStreakDays: number;
}

const BASE_API = import.meta.env.VITE_BASE_API;
const ADMIN_UNIT_CACHE_TTL_MS = 5000;
const adminUnitCache = new Map<string, { data: Unit; expiresAt: number }>();
const adminUnitInFlight = new Map<string, Promise<Unit>>();

function invalidateAdminUnitCache(unitId: string): void {
    adminUnitCache.delete(unitId);
    adminUnitInFlight.delete(unitId);
}

// Helper function to handle API responses and errors
async function handleResponse<T>(response: Response): Promise<T> {
    if (response.status === 204) {
        return undefined as T;
    }

    try {
        const data = await response.json();

        if (!response.ok) {
            const error: ApiError = {
                message: data.message || 'An error occurred',
                statusCode: response.status,
                timestamp: new Date().toISOString(),
            };
            throw error;
        }

        return data;
    } catch (err) {
        // Handle JSON parsing errors and network issues
        if (err instanceof SyntaxError || err instanceof TypeError) {
            throw {
                message: 'Network error or invalid server response',
                statusCode: response.status,
                timestamp: new Date().toISOString(),
            } as ApiError;
        }
        // Re-throw if it's already an ApiError
        throw err;
    }
}

async function handleNoContentResponse(response: Response): Promise<void> {
    if (response.ok) {
        return;
    }

    let message = 'An error occurred';
    try {
        const data = await response.json();
        message = data.message || message;
    } catch {
        // Keep default message when the response has no JSON body.
    }

    throw {
        message,
        statusCode: response.status,
        timestamp: new Date().toISOString(),
    } as ApiError;
}

// Helper function to make authenticated requests
function getAuthHeader(): Headers {
    const token = localStorage.getItem('accessToken');
    const headers = new Headers({
        'Content-Type': 'application/json',
    });

    if (token) {
        headers.set('Authorization', `Bearer ${token}`);
    }

    return headers;
}

/**
 * API Client for SkillForge
 * Handles all communication with the backend server
 */
export const apiClient = {
    // ==================== AUTHENTICATION ====================

    /**
     * Register a new user
     */
    async register(data: RegisterRequest): Promise<AuthResponse> {
        const response = await fetch(`${BASE_API}/auth/register`, {
            method: 'POST',
            headers: new Headers({'Content-Type': 'application/json'}),
            body: JSON.stringify(data),
        });

        const result = await handleResponse<AuthResponse>(response);
        // Store token for future requests
        localStorage.setItem('accessToken', result.accessToken);
        return result;
    },

    /**
     * Login user
     */
    async login(data: LoginRequest): Promise<AuthResponse> {
        const response = await fetch(`${BASE_API}/auth/login`, {
            method: 'POST',
            headers: new Headers({'Content-Type': 'application/json'}),
            body: JSON.stringify(data),
        });

        const result = await handleResponse<AuthResponse>(response);
        // Store token for future requests
        localStorage.setItem('accessToken', result.accessToken);
        return result;
    },

    /**
     * Logout user (client-side only)
     */
    logout(): void {
        localStorage.removeItem('accessToken');
    },

    // ==================== USER PROFILE ====================

    /**
     * Get current user's profile
     */
    async getProfile(): Promise<User> {
        const response = await fetch(`${BASE_API}/me`, {
            method: 'GET',
            headers: getAuthHeader(),
        });

        return handleResponse<User>(response);
    },

    /**
     * Get user profile by ID with complete profile data
     */
    async getUserProfile(userId: string): Promise<UserProfile> {
        const response = await fetch(`${BASE_API}/users/${userId}`);
        return handleResponse<UserProfile>(response);
    },

    /**
     * Update user profile with multipart form data (supports file upload)
     */
    async updateProfile(data: {
        displayName?: string;
        email?: string;
        bio?: string;
        avatar?: File;
    }): Promise<User> {
        const formData = new FormData();
        if (data.displayName) formData.append('displayName', data.displayName);
        if (data.email) formData.append('email', data.email);
        if (data.bio) formData.append('bio', data.bio);
        if (data.avatar) formData.append('avatar', data.avatar);

        const token = localStorage.getItem('accessToken');
        const headers = new Headers();
        if (token) {
            headers.set('Authorization', `Bearer ${token}`);
        }

        const response = await fetch(`${BASE_API}/me`, {
            method: 'PATCH',
            headers,
            body: formData,
        });

        return handleResponse<User>(response);
    },

    /**
     * Update user preferences
     */
    async updatePreferences(data: {
        darkModeEnabled?: boolean;
        preferredLocale?: string;
    }): Promise<User> {
        const headers = getAuthHeader();
        headers.set('Content-Type', 'application/json');

        const response = await fetch(`${BASE_API}/me/preferences`, {
            method: 'PATCH',
            headers,
            body: JSON.stringify(data),
        });

        return handleResponse<User>(response);
    },

    /**
     * Get user's XP and level summary
     */
    async getXpSummary(): Promise<XpSummary> {
        const response = await fetch(`${BASE_API}/me/xp`, {
            method: 'GET',
            headers: getAuthHeader(),
        });

        return handleResponse<XpSummary>(response);
    },

    /**
     * Get user's daily streak
     */
    async getStreak(): Promise<Streak> {
        const response = await fetch(`${BASE_API}/me/streak`, {
            method: 'GET',
            headers: getAuthHeader(),
        });

        return handleResponse<Streak>(response);
    },

    /**
     * Get streak leaderboard
     */
    async getStreakLeaderboard(limit?: number): Promise<LeaderboardEntry[]> {
        const url = new URL(`${BASE_API}/streaks/leaderboard`);
        if (limit) {
            url.searchParams.append('limit', limit.toString());
        }

        const response = await fetch(url.toString(), {
            method: 'GET',
            headers: getAuthHeader(),
        });

        return handleResponse<LeaderboardEntry[]>(response);
    },

    /**
     * Get user's badges
     */
    async getBadges(): Promise<UserBadgesResponse> {
        const response = await fetch(`${BASE_API}/me/badges`, {
            method: 'GET',
            headers: getAuthHeader(),
        });

        return handleResponse<UserBadgesResponse>(response);
    },

    // ==================== COURSES ====================

    /**
     * List all available courses
     */
    async listCourses(
        options?: {
            search?: string;
            level?: CourseLevel;
            page?: number;
            limit?: number;
        }
    ): Promise<PaginatedResponse<Course>> {
        const params = new URLSearchParams();

        if (options?.search) params.append('search', options.search);
        if (options?.level) params.append('level', options.level);
        if (options?.page) params.append('page', options.page.toString());
        if (options?.limit) params.append('limit', options.limit.toString());

        const url = `${BASE_API}/courses${params.toString() ? `?${params}` : ''}`;
        const response = await fetch(url, {
            method: 'GET',
            headers: getAuthHeader(),
        });

        return handleResponse<PaginatedResponse<Course>>(response);
    },

    /**
     * Get courses the user is enrolled in
     */
    async listEnrolledCourses(
        options?: {
            search?: string;
            level?: CourseLevel;
            page?: number;
            limit?: number;
        }
    ): Promise<PaginatedResponse<Course>> {
        const params = new URLSearchParams();

        if (options?.search) params.append('search', options.search);
        if (options?.level) params.append('level', options.level);
        if (options?.page) params.append('page', options.page.toString());
        if (options?.limit) params.append('limit', options.limit.toString());

        const url = `${BASE_API}/courses/enrolled${params.toString() ? `?${params}` : ''}`;
        const response = await fetch(url, {
            method: 'GET',
            headers: getAuthHeader(),
        });

        return handleResponse<PaginatedResponse<Course>>(response);
    },

    /**
     * Get course details
     */
    async getCourseDetail(courseId: string): Promise<Course> {
        const response = await fetch(`${BASE_API}/courses/${courseId}`, {
            method: 'GET',
            headers: getAuthHeader(),
        });

        return handleResponse<Course>(response);
    },

    /**
     * Get course units (without progress, public endpoint)
     */
    async getCourseUnits(courseId: string): Promise<CourseUnitsResponse> {
        const response = await fetch(`${BASE_API}/courses/${courseId}/units`, {
            method: 'GET',
            headers: new Headers({'Content-Type': 'application/json'}),
        });

        return handleResponse<CourseUnitsResponse>(response);
    },

    /**
     * Get unit details (content, prerequisites, etc)
     */
    async getUnitDetail(unitId: string): Promise<Unit> {
        const response = await fetch(`${BASE_API}/units/${unitId}`, {
            method: 'GET',
            headers: getAuthHeader(),
        });

        return handleResponse<Unit>(response);
    },

    /**
     * Enroll in a course
     */
    async enrollCourse(courseId: string): Promise<void> {
        const response = await fetch(`${BASE_API}/me/courses/${courseId}/enroll`, {
            method: 'POST',
            headers: getAuthHeader(),
        });

        await handleResponse<void>(response);
    },

    // ==================== PROGRESS ====================

    /**
     * Get user's progress in a course
     */
    async getCourseProgress(courseId: string): Promise<CourseProgress> {
        const response = await fetch(`${BASE_API}/me/courses/${courseId}/progress`, {
            method: 'GET',
            headers: getAuthHeader(),
        });

        return handleResponse<CourseProgress>(response);
    },

    /**
     * Start a unit
     */
    async startUnit(unitId: string): Promise<void> {
        const response = await fetch(`${BASE_API}/me/units/${unitId}/start`, {
            method: 'POST',
            headers: getAuthHeader(),
        });

        await handleResponse<void>(response);
    },

    /**
     * Complete a unit
     */
    async completeUnit(unitId: string): Promise<void> {
        const response = await fetch(`${BASE_API}/me/units/${unitId}/complete`, {
            method: 'POST',
            headers: getAuthHeader(),
        });

        await handleResponse<void>(response);
    },

    // ==================== EXERCISES ====================

    /**
     * Get exercises in a unit
     */
    async getExercisesInUnit(unitId: string): Promise<ExerciseDetails[]> {
        const response = await fetch(`${BASE_API}/units/${unitId}/exercises`, {
            method: 'GET',
            headers: getAuthHeader(),
        });

        return handleResponse<ExerciseDetails[]>(response);
    },

    /**
     * Submit code for an exercise (normal difficulty)
     */
    async submitExerciseCode(
        unitId: string,
        exerciseId: string,
        sourceCode: string,
        language: string
    ): Promise<SubmissionResponse> {
        const response = await fetch(
            `${BASE_API}/units/${unitId}/exercises/${exerciseId}/submissions`,
            {
                method: 'POST',
                headers: getAuthHeader(),
                body: JSON.stringify({exerciseId, language, sourceCode}),
            }
        );

        return handleResponse<SubmissionResponse>(response);
    },

    /**
     * Submit code for an advanced exercise
     */
    async submitAdvancedExerciseCode(
        unitId: string,
        exerciseId: string,
        sourceCode: string,
        language: string
    ): Promise<SubmissionResponse> {
        const response = await fetch(
            `${BASE_API}/units/${unitId}/exercises/${exerciseId}/advanced-submissions`,
            {
                method: 'POST',
                headers: getAuthHeader(),
                body: JSON.stringify({exerciseId, language, sourceCode}),
            }
        );

        return handleResponse<SubmissionResponse>(response);
    },

    /**
     * Get submission status
     */
    async getSubmissionStatus(submissionId: string): Promise<SubmissionResponse> {
        const response = await fetch(`${BASE_API}/submissions/${submissionId}`, {
            method: 'GET',
            headers: getAuthHeader(),
        });

        return handleResponse<SubmissionResponse>(response);
    },

    /**
     * Get submission feedback with hints and test results
     */
    async getSubmissionFeedback(submissionId: string): Promise<SubmissionFeedback> {
        const response = await fetch(
            `${BASE_API}/submissions/${submissionId}/feedback`,
            {
                method: 'GET',
                headers: getAuthHeader(),
            }
        );

        return handleResponse<SubmissionFeedback>(response);
    },

    /**
     * Get all submissions for a unit by current user
     */
    async getUserUnitSubmissions(unitId: string): Promise<SubmissionResponse[]> {
        const response = await fetch(`${BASE_API}/submissions/unit/${unitId}`, {
            method: 'GET',
            headers: getAuthHeader(),
        });

        return handleResponse<SubmissionResponse[]>(response);
    },

    async getSandboxLanguages(includeBaseCode = false): Promise<SandboxLanguage[]> {
        const response = await fetch(`${BASE_API}/submissions/languages?includeBaseCode=${includeBaseCode ? 'true' : 'false'}`, {
            method: 'GET',
            headers: getAuthHeader(),
        });

        return handleResponse<SandboxLanguage[]>(response);
    },

    async runCodeSandbox(
        code: string,
        language: string,
        testCases: SandboxTestCaseRequest[]
    ): Promise<SandboxRunResponse> {
        const response = await fetch(`${BASE_API}/submissions/sandbox/run`, {
            method: 'POST',
            headers: getAuthHeader(),
            body: JSON.stringify({
                code,
                language,
                testCases,
            }),
        });

        return handleResponse<SandboxRunResponse>(response);
    },

    /**
     * Ask AI to explain what is wrong with a submission (one-time per submission)
     */
    async askAiSubmissionExplanation(
        submissionId: string
    ): Promise<{ submissionId: string; aiCodeExplanation: string; alreadyExists: boolean }> {
        const response = await fetch(`${BASE_API}/submissions/${submissionId}/ai-explanation`, {
            method: 'POST',
            headers: getAuthHeader(),
        });

        return handleResponse<{ submissionId: string; aiCodeExplanation: string; alreadyExists: boolean }>(response);
    },

    // ==================== QUIZZES ====================

    /**
     * Submit quiz answers
     */
    async submitQuiz(
        unitId: string,
        quizId: string,
        answers: QuizAnswerDto[]
    ): Promise<QuizSubmissionResponse> {
        const response = await fetch(`${BASE_API}/units/${unitId}/quizzes/${quizId}/submissions`, {
            method: 'POST',
            headers: getAuthHeader(),
            body: JSON.stringify({answers}),
        });

        return handleResponse<QuizSubmissionResponse>(response);
    },

    async getAssessmentAttemptReview(
        unitId: string,
        quizId: string,
        attemptId: string
    ): Promise<AttemptReviewResponse> {
        const response = await fetch(`${BASE_API}/units/${unitId}/quizzes/${quizId}/submissions/${attemptId}/review`, {
            method: 'GET',
            headers: getAuthHeader(),
        });

        return handleResponse<AttemptReviewResponse>(response);
    },

    // ==================== FINAL EXAMS ====================

    /**
     * Start a final exam attempt
     */
    async startFinalExamAttempt(
        unitId: string,
        finalExamId: string
    ): Promise<FinalExamAttemptStartResponse> {
        const response = await fetch(`${BASE_API}/units/${unitId}/final-exams/${finalExamId}/attempts`, {
            method: 'POST',
            headers: getAuthHeader(),
        });

        return handleResponse<FinalExamAttemptStartResponse>(response);
    },

    /**
     * Submit final exam answers
     */
    async submitFinalExam(
        unitId: string,
        finalExamId: string,
        answers: QuizAnswerDto[]
    ): Promise<FinalExamSubmissionResponse> {
        const response = await fetch(`${BASE_API}/units/${unitId}/final-exams/${finalExamId}/attempts/submit`, {
            method: 'POST',
            headers: getAuthHeader(),
            body: JSON.stringify({answers}),
        });

        return handleResponse<FinalExamSubmissionResponse>(response);
    },

    async getFinalExamAttemptReview(
        unitId: string,
        finalExamId: string,
        attemptId: string
    ): Promise<AttemptReviewResponse> {
        const response = await fetch(`${BASE_API}/units/${unitId}/final-exams/${finalExamId}/attempts/${attemptId}/review`, {
            method: 'GET',
            headers: getAuthHeader(),
        });

        return handleResponse<AttemptReviewResponse>(response);
    },

    // ==================== ONBOARDING ====================

    /**
     * Get course recommendations based on onboarding
     */
    async getOnboardingRecommendations(): Promise<Course[]> {
        const response = await fetch(`${BASE_API}/recommendations`, {
            method: 'GET',
            headers: getAuthHeader(),
        });

        return handleResponse<Course[]>(response);
    },

    /**
     * Get onboarding quiz questions
     */
    async getOnboardingQuiz(): Promise<QuizQuestion[]> {
        const response = await fetch(`${BASE_API}/onboarding/quiz`, {
            method: 'GET',
            headers: new Headers({'Content-Type': 'application/json'}),
        });

        return handleResponse<QuizQuestion[]>(response);
    },

    /**
     * Save user's onboarding quiz responses
     */
    async saveOnboardingQuizResponses(responses: Array<{
        questionId: string;
        selectedOptionIds?: string[];
        answerText?: string;
    }>): Promise<{ success: boolean; message: string }> {
        const response = await fetch(`${BASE_API}/onboarding/quiz-responses`, {
            method: 'POST',
            headers: getAuthHeader(),
            body: JSON.stringify({responses}),
        });

        return handleResponse<{ success: boolean; message: string }>(response);
    },

    // ==================== CERTIFICATES ====================

    /**
     * Get user's certificates
     */
    async getCertificates(
        options?: {
            page?: number;
            limit?: number;
        }
    ): Promise<PaginatedResponse<Certificate>> {
        const params = new URLSearchParams();

        if (options?.page) params.append('page', options.page.toString());
        if (options?.limit) params.append('limit', options.limit.toString());

        const url = `${BASE_API}/certificates${params.toString() ? `?${params}` : ''}`;
        const response = await fetch(url, {
            method: 'GET',
            headers: getAuthHeader(),
        });

        return handleResponse<PaginatedResponse<Certificate>>(response);
    },

    /**
     * Get certificate by ID (public endpoint)
     */
    async getCertificate(certificateId: string): Promise<Certificate> {
        const response = await fetch(`${BASE_API}/certificates/${certificateId}`, {
            method: 'GET',
            headers: new Headers({'Content-Type': 'application/json'}),
        });

        return handleResponse<Certificate>(response);
    },

    /**
     * Get download URL for certificate PDF (public endpoint)
     */
    async getCertificateDownloadUrl(certificateId: string): Promise<CertificateDownloadResponse> {
        const response = await fetch(`${BASE_API}/certificates/${certificateId}/download`, {
            method: 'GET',
            headers: new Headers({'Content-Type': 'application/json'}),
        });

        return handleResponse<CertificateDownloadResponse>(response);
    },

    /**
     * Verify a certificate by verification code
     */
    async verifyCertificate(verificationCode: string): Promise<CertificateVerificationResponse> {
        const response = await fetch(`${BASE_API}/certificates/verify?code=${encodeURIComponent(verificationCode)}`, {
            method: 'GET',
            headers: new Headers({'Content-Type': 'application/json'}),
        });

        return handleResponse<CertificateVerificationResponse>(response);
    },

    /**
     * Get admin list of all certificates
     */
    async getAllCertificatesAdmin(
        options?: {
            page?: number;
            limit?: number;
        }
    ): Promise<PaginatedResponse<Certificate>> {
        const params = new URLSearchParams();

        if (options?.page) params.append('page', options.page.toString());
        if (options?.limit) params.append('limit', options.limit.toString());

        const url = `${BASE_API}/certificates/admin/all${params.toString() ? `?${params}` : ''}`;
        const response = await fetch(url, {
            method: 'GET',
            headers: getAuthHeader(),
        });

        return handleResponse<PaginatedResponse<Certificate>>(response);
    },

    /**
     * Get user's certificate for a specific course
     */
    async getUserCourseCertificate(courseId: string): Promise<Certificate> {
        const response = await fetch(`${BASE_API}/certificates/user/${courseId}`, {
            method: 'GET',
            headers: new Headers({'Content-Type': 'application/json'}),
        });

        return handleResponse<Certificate>(response);
    },

    /**
     * Revoke a certificate
     */
    async revokeCertificate(certificateId: string): Promise<{ message: string }> {
        const response = await fetch(`${BASE_API}/certificates/${certificateId}/revoke`, {
            method: 'POST',
            headers: getAuthHeader(),
        });

        return handleResponse<{ message: string }>(response);
    },

    /**
     * Get all available learning paths
     */
    async getLearningPaths(): Promise<PaginatedResponse<LearningPath>> {
        const response = await fetch(`${BASE_API}/learning-paths`, {
            method: 'GET',
            headers: getAuthHeader(),
        });

        return handleResponse<PaginatedResponse<LearningPath>>(response);
    },

    /**
     * Get user's assigned learning path
     */
    async getUserLearningPath(): Promise<LearningPath | { message: string }> {
        const response = await fetch(`${BASE_API}/learning-paths/me`, {
            method: 'GET',
            headers: getAuthHeader(),
        });

        return handleResponse<LearningPath | { message: string }>(response);
    },

    /**
     * Change user password
     */
    async changePassword(currentPassword: string, newPassword: string): Promise<{ message: string }> {
        const response = await fetch(`${BASE_API}/auth/change-password`, {
            method: 'POST',
            headers: getAuthHeader(),
            body: JSON.stringify({
                currentPassword,
                newPassword,
            }),
        });

        return handleResponse<{ message: string }>(response);
    },

    // ==================== ADMIN: LEARNING PATHS ====================

    /**
     * Create a new learning path
     */
    async createLearningPath(data: {
        slug: string;
        title: string;
        description: string;
        criteria?: Record<string, any>;
        isPublic?: boolean;
    }): Promise<LearningPath> {
        const response = await fetch(`${BASE_API}/admin/learning-paths`, {
            method: 'POST',
            headers: getAuthHeader(),
            body: JSON.stringify(data),
        });

        return handleResponse<LearningPath>(response);
    },

    /**
     * Get all learning paths (admin view)
     */
    async getAllLearningPathsAdmin(): Promise<LearningPath[]> {
        const response = await fetch(`${BASE_API}/admin/learning-paths`, {
            method: 'GET',
            headers: getAuthHeader(),
        });

        const result = await handleResponse<{ data: LearningPath[] }>(response);
        return result.data || [];
    },

    /**
     * Get a specific learning path
     */
    async getLearningPathAdmin(pathId: string): Promise<LearningPath> {
        const response = await fetch(`${BASE_API}/admin/learning-paths/${pathId}`, {
            method: 'GET',
            headers: getAuthHeader(),
        });

        return handleResponse<LearningPath>(response);
    },

    /**
     * Update a learning path
     */
    async updateLearningPath(
        pathId: string,
        data: {
            title?: string;
            description?: string;
            criteria?: Record<string, any>;
        }
    ): Promise<LearningPath> {
        const response = await fetch(`${BASE_API}/admin/learning-paths/${pathId}`, {
            method: 'PATCH',
            headers: getAuthHeader(),
            body: JSON.stringify(data),
        });

        return handleResponse<LearningPath>(response);
    },

    /**
     * Delete a learning path
     */
    async deleteLearningPath(pathId: string): Promise<{ success: boolean; message: string }> {
        const response = await fetch(`${BASE_API}/admin/learning-paths/${pathId}`, {
            method: 'DELETE',
            headers: getAuthHeader(),
        });

        return handleResponse<{ success: boolean; message: string }>(response);
    },

    /**
     * Add courses to a learning path
     */
    async addCoursesToPath(pathId: string, courseIds: string[]): Promise<{
        success: boolean;
        message: string;
        courseCount: number
    }> {
        const response = await fetch(`${BASE_API}/admin/learning-paths/${pathId}/courses`, {
            method: 'POST',
            headers: getAuthHeader(),
            body: JSON.stringify({courseIds}),
        });

        return handleResponse<{ success: boolean; message: string; courseCount: number }>(response);
    },

    /**
     * Remove a course from a learning path
     */
    async removeCourseFromPath(pathId: string, courseId: string): Promise<{ success: boolean; message: string }> {
        const response = await fetch(`${BASE_API}/admin/learning-paths/${pathId}/courses/${courseId}`, {
            method: 'DELETE',
            headers: getAuthHeader(),
        });

        return handleResponse<{ success: boolean; message: string }>(response);
    },

    /**
     * Reorder courses in a learning path
     */
    async reorderCoursesInPath(pathId: string, courseIds: string[]): Promise<{ success: boolean; message: string }> {
        const response = await fetch(`${BASE_API}/admin/learning-paths/${pathId}/courses/reorder`, {
            method: 'PATCH',
            headers: getAuthHeader(),
            body: JSON.stringify({courseIds}),
        });

        return handleResponse<{ success: boolean; message: string }>(response);
    },

    // ==================== ADMIN: COURSES ====================

    /**
     * Create a new course
     */
    async createCourse(data: {
        title: string;
        subtitle: string;
        description: string;
        level: CourseLevel;
        language: string;
        priceCents?: number;
        currencyCode?: string;
        thumbnailS3Key?: string;
        trailerUrl?: string;
    }): Promise<Course> {
        const response = await fetch(`${BASE_API}/admin/courses`, {
            method: 'POST',
            headers: getAuthHeader(),
            body: JSON.stringify(data),
        });

        return handleResponse<Course>(response);
    },

    /**
     * Get all courses available to the current admin/instructor
     */
    async getInstructorCourses(): Promise<Course[]> {
        const response = await fetch(`${BASE_API}/admin/courses`, {
            method: 'GET',
            headers: getAuthHeader(),
        });

        return handleResponse<Course[]>(response);
    },

    /**
     * Get course by ID
     */
    async getCourseByIdAdmin(courseId: string): Promise<Course> {
        const response = await fetch(`${BASE_API}/admin/courses/${courseId}`, {
            method: 'GET',
            headers: getAuthHeader(),
        });

        return handleResponse<Course>(response);
    },

    /**
     * Update course details
     */
    async updateCourse(
        courseId: string,
        data: {
            title?: string;
            subtitle?: string;
            description?: string;
            level?: CourseLevel;
            language?: string;
            priceCents?: number;
            currencyCode?: string;
            thumbnailS3Key?: string;
            trailerUrl?: string;
            isPublished?: boolean;
        }
    ): Promise<Course> {
        const response = await fetch(`${BASE_API}/admin/courses/${courseId}`, {
            method: 'PUT',
            headers: getAuthHeader(),
            body: JSON.stringify(data),
        });

        return handleResponse<Course>(response);
    },

    /**
     * Delete a course
     */
    async deleteCourse(courseId: string): Promise<{ success: boolean; message: string }> {
        const response = await fetch(`${BASE_API}/admin/courses/${courseId}`, {
            method: 'DELETE',
            headers: getAuthHeader(),
        });

        return handleResponse<{ success: boolean; message: string }>(response);
    },

    /**
     * Publish a course
     */
    async publishCourse(courseId: string): Promise<{ success: boolean; message: string }> {
        const response = await fetch(`${BASE_API}/admin/courses/${courseId}/publish`, {
            method: 'POST',
            headers: getAuthHeader(),
        });

        return handleResponse<{ success: boolean; message: string }>(response);
    },

    /**
     * Unpublish a course
     */
    async unpublishCourse(courseId: string): Promise<{ success: boolean; message: string }> {
        const response = await fetch(`${BASE_API}/admin/courses/${courseId}/unpublish`, {
            method: 'POST',
            headers: getAuthHeader(),
        });

        return handleResponse<{ success: boolean; message: string }>(response);
    },

    async uploadCourseThumbnail(courseId: string, file: File): Promise<Course> {
        const formData = new FormData();
        formData.append('file', file);
        const token = localStorage.getItem('accessToken');
        const headers = new Headers();
        if (token) headers.set('Authorization', `Bearer ${token}`);

        const response = await fetch(`${BASE_API}/admin/courses/${courseId}/thumbnail/upload`, {
            method: 'POST',
            headers,
            body: formData,
        });

        return handleResponse<Course>(response);
    },

    // ==================== ADMIN: UNITS ====================

    /**
     * Create a new unit within a course
     */
    async createUnit(
        courseId: string,
        data: {
            title: string;
            type: string;
            summary?: string;
            estimatedMinutes?: number;
        }
    ): Promise<Unit> {
        const response = await fetch(`${BASE_API}/admin/courses/${courseId}/units`, {
            method: 'POST',
            headers: getAuthHeader(),
            body: JSON.stringify(data),
        });

        return handleResponse<Unit>(response);
    },

    /**
     * Get unit by ID
     */
    async getUnitByIdAdmin(unitId: string, options?: { forceRefresh?: boolean }): Promise<Unit> {
        const forceRefresh = options?.forceRefresh === true;
        const now = Date.now();
        const cached = adminUnitCache.get(unitId);
        if (!forceRefresh && cached && cached.expiresAt > now) {
            return cached.data;
        }

        if (!forceRefresh) {
            const inFlight = adminUnitInFlight.get(unitId);
            if (inFlight) {
                return inFlight;
            }
        }

        const request = (async () => {
            const response = await fetch(`${BASE_API}/admin/units/${unitId}`, {
                method: 'GET',
                headers: getAuthHeader(),
            });
            const data = await handleResponse<Unit>(response);
            adminUnitCache.set(unitId, {
                data,
                expiresAt: Date.now() + ADMIN_UNIT_CACHE_TTL_MS,
            });
            return data;
        })();

        adminUnitInFlight.set(unitId, request);
        try {
            return await request;
        } finally {
            adminUnitInFlight.delete(unitId);
        }
    },

    /**
     * Update unit details
     */
    async updateUnit(
        unitId: string,
        data: {
            title?: string;
            type?: string;
            summary?: string;
            estimatedMinutes?: number;
            isPublished?: boolean;
            position?: number;
        }
    ): Promise<Unit> {
        const response = await fetch(`${BASE_API}/admin/units/${unitId}`, {
            method: 'PUT',
            headers: getAuthHeader(),
            body: JSON.stringify(data),
        });

        const updated = await handleResponse<Unit>(response);
        invalidateAdminUnitCache(unitId);
        return updated;
    },

    /**
     * Delete a unit
     */
    async deleteUnit(unitId: string): Promise<{ success: boolean; message: string }> {
        const response = await fetch(`${BASE_API}/admin/units/${unitId}`, {
            method: 'DELETE',
            headers: getAuthHeader(),
        });

        const result = await handleResponse<{ success: boolean; message: string }>(response);
        invalidateAdminUnitCache(unitId);
        return result;
    },

    /**
     * Add a prerequisite to a unit
     */
    async addUnitPrerequisite(unitId: string, prerequisiteUnitId: string): Promise<{
        success: boolean;
        message: string
    }> {
        const response = await fetch(`${BASE_API}/admin/units/${unitId}/prerequisites`, {
            method: 'POST',
            headers: getAuthHeader(),
            body: JSON.stringify({prerequisiteUnitId}),
        });

        const result = await handleResponse<{ success: boolean; message: string }>(response);
        invalidateAdminUnitCache(unitId);
        invalidateAdminUnitCache(prerequisiteUnitId);
        return result;
    },

    /**
     * Remove a prerequisite from a unit
     */
    async removeUnitPrerequisite(unitId: string, prerequisiteUnitId: string): Promise<{
        success: boolean;
        message: string
    }> {
        const response = await fetch(`${BASE_API}/admin/units/${unitId}/prerequisites/${prerequisiteUnitId}`, {
            method: 'DELETE',
            headers: getAuthHeader(),
        });

        const result = await handleResponse<{ success: boolean; message: string }>(response);
        invalidateAdminUnitCache(unitId);
        invalidateAdminUnitCache(prerequisiteUnitId);
        return result;
    },

    /**
     * Create an exercise for a unit
     */
    async createExercise(
        unitId: string,
        data: {
            title: string;
            promptMarkdown: string;
            difficulty: 'normal' | 'advanced';
            language: string;
            starterCode?: string;
            maxCpuMs?: number;
            maxMemoryKb?: number;
        }
    ): Promise<ExerciseDetails> {
        const response = await fetch(`${BASE_API}/admin/units/${unitId}/exercises`, {
            method: 'POST',
            headers: getAuthHeader(),
            body: JSON.stringify(data),
        });

        const created = await handleResponse<ExerciseDetails>(response);
        invalidateAdminUnitCache(unitId);
        return created;
    },

    /**
     * Create a quiz for a unit
     */
    async createQuiz(
        unitId: string,
        data: {
            title: string;
            instructions?: string;
            passingScore?: number;
            timeLimitSeconds?: number;
            randomizeQuestions?: boolean;
            randomizeOptions?: boolean;
        }
    ): Promise<Quiz> {
        const response = await fetch(`${BASE_API}/admin/units/${unitId}/quizzes`, {
            method: 'POST',
            headers: getAuthHeader(),
            body: JSON.stringify(data),
        });

        const created = await handleResponse<Quiz>(response);
        invalidateAdminUnitCache(unitId);
        return created;
    },

    /**
     * Create module content for a unit
     */
    async createModuleContent(
        unitId: string,
        data: {
            contentKind: string;
            videoUrl?: string;
            articleMarkdown?: string;
            subtitleS3Key?: string;
            playbackSpeeds?: number[];
            supportsPip?: boolean;
        }
    ): Promise<ModuleContent> {
        const response = await fetch(`${BASE_API}/admin/units/${unitId}/content`, {
            method: 'POST',
            headers: getAuthHeader(),
            body: JSON.stringify(data),
        });

        const created = await handleResponse<ModuleContent>(response);
        invalidateAdminUnitCache(unitId);
        return created;
    },

    /**
     * Get module content for a unit
     */
    async getModuleContent(unitId: string): Promise<ModuleContent | null> {
        const response = await fetch(`${BASE_API}/admin/units/${unitId}/content`, {
            method: 'GET',
            headers: getAuthHeader(),
        });

        // If response is 200 but body is empty, treat as no content yet (not an error)
        if (response.ok) {
            const text = await response.text();
            if (!text) {
                return null;
            }
            try {
                return JSON.parse(text);
            } catch {
                throw {
                    message: 'Invalid server response',
                    statusCode: response.status,
                    timestamp: new Date().toISOString(),
                } as ApiError;
            }
        }

        // If not ok, handle as normal error
        let errorMessage = 'An error occurred';
        try {
            const data = await response.json();
            errorMessage = data.message || errorMessage;
        } catch {
            // Keep default message when the response has no JSON body
        }

        throw {
            message: errorMessage,
            statusCode: response.status,
            timestamp: new Date().toISOString(),
        } as ApiError;
    },

    /**
     * Update module content for a unit
     */
    async updateModuleContent(
        unitId: string,
        data: {
            contentKind?: string;
            videoUrl?: string;
            articleMarkdown?: string;
            subtitleS3Key?: string;
            playbackSpeeds?: number[];
            supportsPip?: boolean;
        }
    ): Promise<ModuleContent> {
        const response = await fetch(`${BASE_API}/admin/units/${unitId}/content`, {
            method: 'PUT',
            headers: getAuthHeader(),
            body: JSON.stringify(data),
        });

        const updated = await handleResponse<ModuleContent>(response);
        invalidateAdminUnitCache(unitId);
        return updated;
    },

    /**
     * Delete module content for a unit
     */
    async deleteModuleContent(unitId: string): Promise<{ success: boolean; message: string }> {
        const response = await fetch(`${BASE_API}/admin/units/${unitId}/content`, {
            method: 'DELETE',
            headers: getAuthHeader(),
        });

        return handleResponse<{ success: boolean; message: string }>(response);
    },

    async uploadModuleVideo(unitId: string, file: File): Promise<{ s3Key: string; videoUrl: string }> {
        const formData = new FormData();
        formData.append('file', file);
        const token = localStorage.getItem('accessToken');
        const headers = new Headers();
        if (token) headers.set('Authorization', `Bearer ${token}`);

        const response = await fetch(`${BASE_API}/admin/units/${unitId}/content/video/upload`, {
            method: 'POST',
            headers,
            body: formData,
        });

        return handleResponse<{ s3Key: string; videoUrl: string }>(response);
    },

    async listModuleResources(unitId: string): Promise<ModuleResource[]> {
        const response = await fetch(`${BASE_API}/admin/units/${unitId}/resources`, {
            method: 'GET',
            headers: getAuthHeader(),
        });
        return handleResponse<ModuleResource[]>(response);
    },

    async createModuleResource(
        unitId: string,
        data: { label: string; resourceType: string; s3Key: string }
    ): Promise<ModuleResource> {
        const response = await fetch(`${BASE_API}/admin/units/${unitId}/resources`, {
            method: 'POST',
            headers: getAuthHeader(),
            body: JSON.stringify(data),
        });
        const created = await handleResponse<ModuleResource>(response);
        invalidateAdminUnitCache(unitId);
        return created;
    },

    async updateModuleResource(
        resourceId: string,
        data: { label?: string; resourceType?: string; s3Key?: string }
    ): Promise<ModuleResource> {
        const response = await fetch(`${BASE_API}/admin/module-resources/${resourceId}`, {
            method: 'PUT',
            headers: getAuthHeader(),
            body: JSON.stringify(data),
        });
        return handleResponse<ModuleResource>(response);
    },

    async deleteModuleResource(resourceId: string): Promise<{ success: boolean; message: string }> {
        const response = await fetch(`${BASE_API}/admin/module-resources/${resourceId}`, {
            method: 'DELETE',
            headers: getAuthHeader(),
        });
        return handleResponse<{ success: boolean; message: string }>(response);
    },

    async uploadModuleResource(
        unitId: string,
        file: File,
        metadata?: { label?: string; resourceType?: string }
    ): Promise<{ resource: ModuleResource; fileUrl: string }> {
        const formData = new FormData();
        formData.append('file', file);
        if (metadata?.label) formData.append('label', metadata.label);
        if (metadata?.resourceType) formData.append('resourceType', metadata.resourceType);

        const token = localStorage.getItem('accessToken');
        const headers = new Headers();
        if (token) headers.set('Authorization', `Bearer ${token}`);

        const response = await fetch(`${BASE_API}/admin/units/${unitId}/resources/upload`, {
            method: 'POST',
            headers,
            body: formData,
        });
        const uploaded = await handleResponse<{ resource: ModuleResource; fileUrl: string }>(response);
        invalidateAdminUnitCache(unitId);
        return uploaded;
    },

    /**
     * Create a final exam for a unit
     */
    async createFinalExam(
        unitId: string,
        data: {
            title: string;
            passingScore?: number;
            maxAttempts?: number;
            timeLimitSeconds?: number;
        }
    ): Promise<FinalExam> {
        const response = await fetch(`${BASE_API}/admin/units/${unitId}/final-exam`, {
            method: 'POST',
            headers: getAuthHeader(),
            body: JSON.stringify(data),
        });

        const created = await handleResponse<FinalExam>(response);
        invalidateAdminUnitCache(unitId);
        return created;
    },

    /**
     * Get final exam for a unit
     */
    async getFinalExamAdmin(unitId: string): Promise<FinalExam> {
        const response = await fetch(`${BASE_API}/admin/units/${unitId}/final-exam`, {
            method: 'GET',
            headers: getAuthHeader(),
        });

        return handleResponse<FinalExam>(response);
    },

    /**
     * Update final exam for a unit
     */
    async updateFinalExam(
        unitId: string,
        data: {
            title?: string;
            passingScore?: number;
            maxAttempts?: number;
            timeLimitSeconds?: number;
        }
    ): Promise<FinalExam> {
        const response = await fetch(`${BASE_API}/admin/units/${unitId}/final-exam`, {
            method: 'PUT',
            headers: getAuthHeader(),
            body: JSON.stringify(data),
        });

        const updated = await handleResponse<FinalExam>(response);
        invalidateAdminUnitCache(unitId);
        return updated;
    },

    /**
     * Delete final exam for a unit
     */
    async deleteFinalExam(unitId: string): Promise<{ success: boolean; message: string }> {
        const response = await fetch(`${BASE_API}/admin/units/${unitId}/final-exam`, {
            method: 'DELETE',
            headers: getAuthHeader(),
        });

        const result = await handleResponse<{ success: boolean; message: string }>(response);
        invalidateAdminUnitCache(unitId);
        return result;
    },

    /**
     * Create a question in final exam
     */
    async createFinalExamQuestion(
        unitId: string,
        data: {
            prompt: string;
            explanation?: string;
            points?: number;
            options?: Array<{ label: string; isCorrect: boolean }>;
        }
    ): Promise<FinalExam> {
        const response = await fetch(`${BASE_API}/admin/units/${unitId}/final-exam/questions`, {
            method: 'POST',
            headers: getAuthHeader(),
            body: JSON.stringify(data),
        });

        const created = await handleResponse<FinalExam>(response);
        invalidateAdminUnitCache(unitId);
        return created;
    },

    /**
     * Update a question in final exam
     */
    async updateFinalExamQuestion(
        unitId: string,
        questionId: string,
        data: {
            prompt?: string;
            explanation?: string;
            points?: number;
        }
    ): Promise<FinalExam> {
        const response = await fetch(`${BASE_API}/admin/units/${unitId}/final-exam/questions/${questionId}`, {
            method: 'PUT',
            headers: getAuthHeader(),
            body: JSON.stringify(data),
        });

        const updated = await handleResponse<FinalExam>(response);
        invalidateAdminUnitCache(unitId);
        return updated;
    },

    /**
     * Delete a question from final exam
     */
    async deleteFinalExamQuestion(unitId: string, questionId: string): Promise<void> {
        const response = await fetch(`${BASE_API}/admin/units/${unitId}/final-exam/questions/${questionId}`, {
            method: 'DELETE',
            headers: getAuthHeader(),
        });

        if (!response.ok) {
            const data = await response.json();
            const error: ApiError = {
                message: data.message || 'Failed to delete question',
                statusCode: response.status,
                timestamp: new Date().toISOString(),
            };
            throw error;
        }
        invalidateAdminUnitCache(unitId);
        // 204 No Content - no response body to parse
    },

    /**
     * Create an option for a question
     */
    async createFinalExamOption(
        unitId: string,
        questionId: string,
        label: string,
        isCorrect: boolean,
    ): Promise<FinalExam> {
        const response = await fetch(`${BASE_API}/admin/units/${unitId}/final-exam/questions/${questionId}/options`, {
            method: 'POST',
            headers: getAuthHeader(),
            body: JSON.stringify({
                label,
                isCorrect,
            }),
        });

        const created = await handleResponse<FinalExam>(response);
        invalidateAdminUnitCache(unitId);
        return created;
    },

    /**
     * Update an option for a question
     */
    async updateFinalExamOption(
        unitId: string,
        questionId: string,
        optionId: string,
        label: string,
        isCorrect: boolean,
    ): Promise<FinalExam> {
        const response = await fetch(`${BASE_API}/admin/units/${unitId}/final-exam/questions/${questionId}/options/${optionId}`, {
            method: 'PUT',
            headers: getAuthHeader(),
            body: JSON.stringify({
                label,
                isCorrect,
            }),
        });

        const updated = await handleResponse<FinalExam>(response);
        invalidateAdminUnitCache(unitId);
        return updated;
    },

    /**
     * Delete an option from a question
     */
    async deleteFinalExamOption(
        unitId: string,
        questionId: string,
        optionId: string,
    ): Promise<void> {
        const response = await fetch(`${BASE_API}/admin/units/${unitId}/final-exam/questions/${questionId}/options/${optionId}`, {
            method: 'DELETE',
            headers: getAuthHeader(),
        });

        if (!response.ok) {
            const data = await response.json();
            const error: ApiError = {
                message: data.message || 'Failed to delete option',
                statusCode: response.status,
                timestamp: new Date().toISOString(),
            };
            throw error;
        }
        invalidateAdminUnitCache(unitId);
        // 204 No Content - no response body to parse
    },

    // ==================== ADMIN: EXERCISES ====================

    /**
     * Get exercise by ID
     */
    async getExerciseByIdAdmin(exerciseId: string): Promise<ExerciseDetails> {
        const response = await fetch(`${BASE_API}/admin/exercises/${exerciseId}`, {
            method: 'GET',
            headers: getAuthHeader(),
        });

        return handleResponse<ExerciseDetails>(response);
    },

    /**
     * Update exercise details
     */
    async updateExercise(
        exerciseId: string,
        data: {
            title?: string;
            promptMarkdown?: string;
            difficulty?: 'normal' | 'advanced';
            language?: string;
            starterCode?: string;
            maxCpuMs?: number;
            maxMemoryKb?: number;
        }
    ): Promise<ExerciseDetails> {
        const response = await fetch(`${BASE_API}/admin/exercises/${exerciseId}`, {
            method: 'PUT',
            headers: getAuthHeader(),
            body: JSON.stringify(data),
        });

        return handleResponse<ExerciseDetails>(response);
    },

    /**
     * Delete an exercise
     */
    async deleteExercise(exerciseId: string): Promise<{ success: boolean; message: string }> {
        const response = await fetch(`${BASE_API}/admin/exercises/${exerciseId}`, {
            method: 'DELETE',
            headers: getAuthHeader(),
        });

        return handleResponse<{ success: boolean; message: string }>(response);
    },

    /**
     * Add a test case to an exercise
     */
    async addTestCase(
        exerciseId: string,
        data: {
            inputText: string;
            expectedOutput: string;
            isHidden?: boolean;
            weight?: number;
        }
    ): Promise<TestCase> {
        const response = await fetch(`${BASE_API}/admin/exercises/${exerciseId}/test-cases`, {
            method: 'POST',
            headers: getAuthHeader(),
            body: JSON.stringify(data),
        });

        return handleResponse<TestCase>(response);
    },

    /**
     * Add a hint to an exercise
     */
    async addHint(
        exerciseId: string,
        data: {
            content: string;
            requiredFailedAttempts?: number;
        }
    ): Promise<Hint> {
        const response = await fetch(`${BASE_API}/admin/exercises/${exerciseId}/hints`, {
            method: 'POST',
            headers: getAuthHeader(),
            body: JSON.stringify(data),
        });

        return handleResponse<Hint>(response);
    },

    // ==================== ADMIN: TEST CASES & HINTS ====================

    /**
     * Update a test case
     */
    async updateTestCase(
        testCaseId: string,
        data: {
            inputText?: string;
            expectedOutput?: string;
            isHidden?: boolean;
            weight?: number;
        }
    ): Promise<TestCase> {
        const response = await fetch(`${BASE_API}/admin/test-cases/${testCaseId}`, {
            method: 'PUT',
            headers: getAuthHeader(),
            body: JSON.stringify(data),
        });

        return handleResponse<TestCase>(response);
    },

    /**
     * Delete a test case
     */
    async deleteTestCase(testCaseId: string): Promise<{ success: boolean; message: string }> {
        const response = await fetch(`${BASE_API}/admin/test-cases/${testCaseId}`, {
            method: 'DELETE',
            headers: getAuthHeader(),
        });

        return handleResponse<{ success: boolean; message: string }>(response);
    },

    /**
     * Update a hint
     */
    async updateHint(
        hintId: string,
        data: {
            hintText?: string;
            unlockAfterFailedAttempts?: number;
            position?: number;
        }
    ): Promise<Hint> {
        const response = await fetch(`${BASE_API}/admin/hints/${hintId}`, {
            method: 'PUT',
            headers: getAuthHeader(),
            body: JSON.stringify(data),
        });

        return handleResponse<Hint>(response);
    },

    /**
     * Delete a hint
     */
    async deleteHint(hintId: string): Promise<{ success: boolean; message: string }> {
        const response = await fetch(`${BASE_API}/admin/hints/${hintId}`, {
            method: 'DELETE',
            headers: getAuthHeader(),
        });

        return handleResponse<{ success: boolean; message: string }>(response);
    },

    // ==================== ADMIN: QUIZZES ====================

    /**
     * Get quiz by ID
     */
    async getQuizByIdAdmin(quizId: string): Promise<Quiz> {
        const response = await fetch(`${BASE_API}/admin/quizzes/${quizId}`, {
            method: 'GET',
            headers: getAuthHeader(),
        });

        return handleResponse<Quiz>(response);
    },

    /**
     * Update a quiz
     */
    async updateQuiz(
        quizId: string,
        data: {
            title?: string;
            instructions?: string;
            passingScore?: number;
            timeLimitSeconds?: number;
            randomizeQuestions?: boolean;
            randomizeOptions?: boolean;
        }
    ): Promise<Quiz> {
        const response = await fetch(`${BASE_API}/admin/quizzes/${quizId}`, {
            method: 'PUT',
            headers: getAuthHeader(),
            body: JSON.stringify(data),
        });

        return handleResponse<Quiz>(response);
    },

    /**
     * Delete a quiz
     */
    async deleteQuiz(quizId: string): Promise<{ success: boolean; message: string }> {
        const response = await fetch(`${BASE_API}/admin/quizzes/${quizId}`, {
            method: 'DELETE',
            headers: getAuthHeader(),
        });

        return handleResponse<{ success: boolean; message: string }>(response);
    },

    /**
     * Add a question to a quiz
     */
    async addQuizQuestion(
        quizId: string,
        data: {
            prompt: string;
            explanation?: string;
            points?: number;
            position?: number;
            answerMultiple?: boolean;
            options?: Array<{
                label: string;
                isCorrect?: boolean;
                position?: number;
            }>;
        }
    ): Promise<QuizQuestion> {
        const response = await fetch(`${BASE_API}/admin/quizzes/${quizId}/questions`, {
            method: 'POST',
            headers: getAuthHeader(),
            body: JSON.stringify(data),
        });

        return handleResponse<QuizQuestion>(response);
    },

    /**
     * Update a quiz question
     */
    async updateQuizQuestion(
        questionId: string,
        data: {
            prompt?: string;
            explanation?: string;
            points?: number;
            answerMultiple?: boolean;
        }
    ): Promise<QuizQuestion> {
        const response = await fetch(`${BASE_API}/admin/questions/${questionId}`, {
            method: 'PUT',
            headers: getAuthHeader(),
            body: JSON.stringify(data),
        });

        return handleResponse<QuizQuestion>(response);
    },

    /**
     * Delete a quiz question
     */
    async deleteQuizQuestion(questionId: string): Promise<{ success: boolean; message: string }> {
        const response = await fetch(`${BASE_API}/admin/questions/${questionId}`, {
            method: 'DELETE',
            headers: getAuthHeader(),
        });

        return handleResponse<{ success: boolean; message: string }>(response);
    },

    // ==================== ADMIN: QUIZ OPTIONS ====================

    /**
     * Create a quiz option
     */
    async createQuizOption(
        questionId: string,
        data: {
            label: string;
            isCorrect: boolean;
            position?: number;
        }
    ): Promise<QuizOption> {
        const response = await fetch(`${BASE_API}/admin/questions/${questionId}/options`, {
            method: 'POST',
            headers: getAuthHeader(),
            body: JSON.stringify(data),
        });

        return handleResponse<QuizOption>(response);
    },

    /**
     * Update a quiz option
     */
    async updateQuizOption(
        optionId: string,
        data: {
            label?: string;
            isCorrect?: boolean;
            position?: number;
        }
    ): Promise<QuizOption> {
        const response = await fetch(`${BASE_API}/admin/options/${optionId}`, {
            method: 'PUT',
            headers: getAuthHeader(),
            body: JSON.stringify(data),
        });

        return handleResponse<QuizOption>(response);
    },

    /**
     * Delete a quiz option
     */
    async deleteQuizOption(optionId: string): Promise<{ success: boolean; message: string }> {
        const response = await fetch(`${BASE_API}/admin/options/${optionId}`, {
            method: 'DELETE',
            headers: getAuthHeader(),
        });

        return handleResponse<{ success: boolean; message: string }>(response);
    },

    // ==================== ADMIN: BADGES ====================

    /**
     * Get all available badges
     */
    async getAllBadges(): Promise<AdminBadge[]> {
        const response = await fetch(`${BASE_API}/admin/badges`, {
            method: 'GET',
            headers: getAuthHeader(),
        });

        return handleResponse<AdminBadge[]>(response);
    },

    /**
     * Get badge criteria metadata
     */
    async getBadgeCriteriaMetadata(): Promise<BadgeCriteriaMetadata[]> {
        const response = await fetch(`${BASE_API}/admin/badges/criteria`, {
            method: 'GET',
            headers: getAuthHeader(),
        });

        return handleResponse<BadgeCriteriaMetadata[]>(response);
    },

    /**
     * Get a single badge by id
     */
    async getBadgeById(badgeId: string): Promise<AdminBadge> {
        const response = await fetch(`${BASE_API}/admin/badges/${badgeId}`, {
            method: 'GET',
            headers: getAuthHeader(),
        });

        return handleResponse<AdminBadge>(response);
    },

    /**
     * Create a badge
     */
    async createBadge(data: CreateBadgeRequest): Promise<AdminBadge> {
        const response = await fetch(`${BASE_API}/admin/badges`, {
            method: 'POST',
            headers: getAuthHeader(),
            body: JSON.stringify(data),
        });

        return handleResponse<AdminBadge>(response);
    },

    /**
     * Update a badge
     */
    async updateBadge(
        badgeId: string,
        data: UpdateBadgeRequest
    ): Promise<AdminBadge> {
        const response = await fetch(`${BASE_API}/admin/badges/${badgeId}`, {
            method: 'PUT',
            headers: getAuthHeader(),
            body: JSON.stringify(data),
        });

        return handleResponse<AdminBadge>(response);
    },

    /**
     * Delete a badge
     */
    async deleteBadge(badgeId: string): Promise<void> {
        const response = await fetch(`${BASE_API}/admin/badges/${badgeId}`, {
            method: 'DELETE',
            headers: getAuthHeader(),
        });

        return handleNoContentResponse(response);
    },

    /**
     * Upload badge icon
     */
    async uploadBadgeIcon(badgeId: string, file: File): Promise<AdminBadge> {
        const formData = new FormData();
        formData.append('file', file);
        const token = localStorage.getItem('accessToken');
        const headers = new Headers();
        if (token) headers.set('Authorization', `Bearer ${token}`);

        const response = await fetch(`${BASE_API}/admin/badges/${badgeId}/icon/upload`, {
            method: 'POST',
            headers,
            body: formData,
        });

        return handleResponse<AdminBadge>(response);
    },

    // ==================== FORUM ====================

    /**
     * Get posts for a course forum
     */
    async getForumPosts(
        courseId: string,
        options?: {
            page?: number;
            limit?: number;
        }
    ): Promise<PaginatedResponse<any>> {
        const params = new URLSearchParams();
        if (options?.page) params.append('page', options.page.toString());
        if (options?.limit) params.append('limit', options.limit.toString());

        const url = `${BASE_API}/forums/courses/${courseId}/posts${params.toString() ? `?${params}` : ''}`;
        const response = await fetch(url, {
            method: 'GET',
            headers: getAuthHeader(),
        });

        return handleResponse<PaginatedResponse<any>>(response);
    },

    /**
     * Get all forums the user is involved with (created or replied to)
     */
    async getUserForums(options?: {
        page?: number;
        limit?: number;
    }): Promise<PaginatedResponse<any>> {
        const params = new URLSearchParams();
        if (options?.page) params.append('page', options.page.toString());
        if (options?.limit) params.append('limit', options.limit.toString());

        const url = `${BASE_API}/forums/me${params.toString() ? `?${params}` : ''}`;
        const response = await fetch(url, {
            method: 'GET',
            headers: getAuthHeader(),
        });

        return handleResponse<PaginatedResponse<any>>(response);
    },

    /**
     * Get a specific forum post
     */
    async getForumPost(postId: string): Promise<any> {
        const response = await fetch(`${BASE_API}/forums/posts/${postId}`, {
            method: 'GET',
            headers: getAuthHeader(),
        });

        return handleResponse<any>(response);
    },

    /**
     * Create a forum post
     */
    async createForumPost(data: {
        courseId: string;
        title: string;
        content: string;
    }): Promise<any> {
        const response = await fetch(`${BASE_API}/forums/posts`, {
            method: 'POST',
            headers: getAuthHeader(),
            body: JSON.stringify(data),
        });

        return handleResponse<any>(response);
    },

    /**
     * Get replies for a forum post
     */
    async getForumReplies(
        postId: string,
        options?: {
            page?: number;
            limit?: number;
        }
    ): Promise<PaginatedResponse<any>> {
        const params = new URLSearchParams();
        if (options?.page) params.append('page', options.page.toString());
        if (options?.limit) params.append('limit', options.limit.toString());

        const url = `${BASE_API}/forums/posts/${postId}/replies${params.toString() ? `?${params}` : ''}`;
        const response = await fetch(url, {
            method: 'GET',
            headers: getAuthHeader(),
        });

        return handleResponse<PaginatedResponse<any>>(response);
    },

    /**
     * Create a reply to a forum post
     */
    async createForumReply(data: {
        postId: string;
        content: string;
        parentReplyId?: string;
    }): Promise<any> {
        const response = await fetch(`${BASE_API}/forums/replies`, {
            method: 'POST',
            headers: getAuthHeader(),
            body: JSON.stringify(data),
        });

        return handleResponse<any>(response);
    },

    /**
     * Update forum post status (instructor/admin only)
     */
    async updateForumPostStatus(
        postId: string,
        status: string
    ): Promise<any> {
        const response = await fetch(`${BASE_API}/forums/posts/${postId}/status`, {
            method: 'PUT',
            headers: getAuthHeader(),
            body: JSON.stringify({status}),
        });

        return handleResponse<any>(response);
    },

    /**
     * Update forum reply status (instructor/admin only)
     */
    async updateForumReplyStatus(
        replyId: string,
        status: string
    ): Promise<any> {
        const response = await fetch(`${BASE_API}/forums/replies/${replyId}/status`, {
            method: 'PUT',
            headers: getAuthHeader(),
            body: JSON.stringify({status}),
        });

        return handleResponse<any>(response);
    },

    /**
     * Delete a forum post
     */
    async deleteForumPost(postId: string): Promise<void> {
        const response = await fetch(`${BASE_API}/forums/posts/${postId}`, {
            method: 'DELETE',
            headers: getAuthHeader(),
        });

        await handleResponse<void>(response);
    },

    /**
     * Delete a forum reply
     */
    async deleteForumReply(replyId: string): Promise<void> {
        const response = await fetch(`${BASE_API}/forums/replies/${replyId}`, {
            method: 'DELETE',
            headers: getAuthHeader(),
        });

        await handleResponse<void>(response);
    },

    // ==================== SHOWCASES ====================

    /**
     * Create a showcase for a course
     */
    async createShowcase(courseId: string, data: any): Promise<any> {
        const response = await fetch(`${BASE_API}/me/showcases`, {
            method: 'POST',
            headers: getAuthHeader(),
            body: JSON.stringify({courseId, ...data}),
        });

        return handleResponse<any>(response);
    },

    /**
     * Get user's showcase
     */
    async getUserShowcase(showcaseId: string): Promise<any> {
        const response = await fetch(`${BASE_API}/me/showcases/${showcaseId}`, {
            method: 'GET',
            headers: getAuthHeader(),
        });

        return handleResponse<any>(response);
    },

    /**
     * Get public showcases
     */
    async getPublicShowcases(
        options?: {
            page?: number;
            limit?: number;
        }
    ): Promise<PaginatedResponse<any>> {
        const params = new URLSearchParams();
        if (options?.page) params.append('page', options.page.toString());
        if (options?.limit) params.append('limit', options.limit.toString());

        const url = `${BASE_API}/showcases/public${params.toString() ? `?${params}` : ''}`;
        const response = await fetch(url, {
            method: 'GET',
            headers: getAuthHeader(),
        });

        return handleResponse<PaginatedResponse<any>>(response);
    },

    /**
     * Get user's public showcases
     */
    async getUserPublicShowcases(
        userId: string,
        options?: {
            page?: number;
            limit?: number;
        }
    ): Promise<PaginatedResponse<any>> {
        const params = new URLSearchParams();
        if (options?.page) params.append('page', options.page.toString());
        if (options?.limit) params.append('limit', options.limit.toString());

        const url = `${BASE_API}/users/${userId}/showcases${params.toString() ? `?${params}` : ''}`;
        const response = await fetch(url, {
            method: 'GET',
            headers: getAuthHeader(),
        });

        return handleResponse<PaginatedResponse<any>>(response);
    },

    /**
     * Get showcases for a course
     */
    async getCourseShowcases(
        courseId: string,
        options?: {
            page?: number;
            limit?: number;
        }
    ): Promise<PaginatedResponse<any>> {
        const params = new URLSearchParams();
        if (options?.page) params.append('page', options.page.toString());
        if (options?.limit) params.append('limit', options.limit.toString());

        const url = `${BASE_API}/courses/${courseId}/showcases${params.toString() ? `?${params}` : ''}`;
        const response = await fetch(url, {
            method: 'GET',
            headers: getAuthHeader(),
        });

        return handleResponse<PaginatedResponse<any>>(response);
    },

    /**
     * Update a showcase
     */
    async updateShowcase(showcaseId: string, data: any): Promise<any> {
        const response = await fetch(`${BASE_API}/me/showcases/${showcaseId}`, {
            method: 'PATCH',
            headers: getAuthHeader(),
            body: JSON.stringify(data),
        });

        return handleResponse<any>(response);
    },

    /**
     * Delete a showcase
     */
    async deleteShowcase(showcaseId: string): Promise<void> {
        const response = await fetch(`${BASE_API}/me/showcases/${showcaseId}`, {
            method: 'DELETE',
            headers: getAuthHeader(),
        });

        await handleResponse<void>(response);
    },

    // ============= USER MANAGEMENT (ADMIN ONLY) =============

    /**
     * List all users with optional filtering (Admin only)
     */
    async listUsers(query?: {
        search?: string;
        role?: string;
        status?: 'active' | 'inactive';
        page?: number;
        limit?: number;
    }): Promise<PaginatedResponse<any>> {
        const params = new URLSearchParams();
        if (query?.search) params.append('search', query.search);
        if (query?.role) params.append('role', query.role);
        if (query?.status) params.append('status', query.status);
        if (query?.page) params.append('page', query.page.toString());
        if (query?.limit) params.append('limit', query.limit.toString());

        const url = `${BASE_API}/admin/users${params.toString() ? `?${params}` : ''}`;
        const response = await fetch(url, {
            method: 'GET',
            headers: getAuthHeader(),
        });

        return handleResponse<PaginatedResponse<any>>(response);
    },

    /**
     * Get user details (Admin only)
     */
    async getUserById(userId: string): Promise<any> {
        const response = await fetch(`${BASE_API}/admin/users/${userId}`, {
            method: 'GET',
            headers: getAuthHeader(),
        });

        return handleResponse<any>(response);
    },

    /**
     * Get user statistics (Admin only)
     */
    async getUserStats(): Promise<any> {
        const response = await fetch(`${BASE_API}/admin/users/stats`, {
            method: 'GET',
            headers: getAuthHeader(),
        });

        return handleResponse<any>(response);
    },

    /**
     * Update user roles (Admin only)
     */
    async updateUserRoles(userId: string, roles: string[]): Promise<any> {
        const response = await fetch(`${BASE_API}/admin/users/${userId}/roles`, {
            method: 'PUT',
            headers: getAuthHeader(),
            body: JSON.stringify({roles}),
        });

        return handleResponse<any>(response);
    },

    /**
     * Activate user (Admin only)
     */
    async activateUser(userId: string): Promise<any> {
        const response = await fetch(`${BASE_API}/admin/users/${userId}/activate`, {
            method: 'POST',
            headers: getAuthHeader(),
        });

        return handleResponse<any>(response);
    },

    /**
     * Deactivate user (Admin only)
     */
    async deactivateUser(userId: string): Promise<any> {
        const response = await fetch(`${BASE_API}/admin/users/${userId}/deactivate`, {
            method: 'POST',
            headers: getAuthHeader(),
        });

        return handleResponse<any>(response);
    },

    /**
     * Delete user (Admin only)
     */
    async deleteUser(userId: string): Promise<void> {
        const response = await fetch(`${BASE_API}/admin/users/${userId}`, {
            method: 'DELETE',
            headers: getAuthHeader(),
        });

        await handleResponse<void>(response);
    },
};
