import {useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {UserPlus, Lock, Mail, User, AlertCircle, CheckCircle} from 'lucide-react';
import {apiClient} from '@skillforge/vite/lib/api';
import type {ApiError} from '@skillforge/vite/lib/types';
import {GlassButton, Input} from "@skillforge/vite/components/ui/controls.tsx";

export function Register() {
    const navigate = useNavigate();
    const [displayName, setDisplayName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [passwordConfirm, setPasswordConfirm] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const validateForm = () => {
        if (!displayName.trim()) {
            setError('Display name is required');
            return false;
        }
        if (!email.trim()) {
            setError('Email is required');
            return false;
        }
        if (!password) {
            setError('Password is required');
            return false;
        }
        if (password.length < 8) {
            setError('Password must be at least 8 characters');
            return false;
        }
        if (password !== passwordConfirm) {
            setError('Passwords do not match');
            return false;
        }
        if (!email.includes('@')) {
            setError('Please enter a valid email');
            return false;
        }
        return true;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!validateForm()) {
            return;
        }

        setLoading(true);

        try {
            const response = await apiClient.register({
                email,
                password,
                displayName,
            });

            // Store token and user data
            localStorage.setItem('accessToken', response.accessToken);
            localStorage.setItem('user', JSON.stringify(response.user));

            setSuccess(true);

            // Redirect after success
            setTimeout(() => {
                navigate('/student/dashboard', {replace: true});
                window.location.reload();
            }, 1000);
        } catch (err) {
            const apiError = err as ApiError;
            setError(apiError.message || 'Registration failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center px-4 py-10">
            <div className="w-full max-w-md space-y-8">
                {/* Logo Section */}
                <div className="flex flex-col items-center">
                    <div
                        className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-600 flex items-center justify-center text-white font-black text-3xl shadow-lg shadow-blue-500/30 mb-4">
                        S
                    </div>
                    <h1 className="text-3xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-cyan-400">
                        SkillForge
                    </h1>
                    <p className="text-slate-400 font-medium mt-2">Join the learning revolution</p>
                </div>

                {/* Register Form */}
                <form onSubmit={handleSubmit} className="glass-panel-strong rounded-[2rem] p-8 space-y-6">
                    <h2 className="text-2xl font-black text-white text-center">Create Account</h2>

                    {/* Success Message */}
                    {success && (
                        <div
                            className="glass-state rounded-2xl border-green-500/20 bg-green-500/10 p-4 flex items-start space-x-3">
                            <CheckCircle className="text-green-400 flex-shrink-0 mt-0.5" size={20}/>
                            <p className="text-green-300 text-sm font-medium">Account created successfully!
                                Redirecting...</p>
                        </div>
                    )}

                    {/* Error Message */}
                    {error && (
                        <div
                            className="glass-state rounded-2xl border-red-500/20 bg-red-500/10 p-4 flex items-start space-x-3">
                            <AlertCircle className="text-red-400 flex-shrink-0 mt-0.5" size={20}/>
                            <p className="text-red-300 text-sm font-medium">{error}</p>
                        </div>
                    )}

                    {/* Display Name Field */}
                    <div>
                        <label className="block text-sm font-bold text-slate-300 uppercase tracking-wider mb-3">
                            Display Name
                        </label>
                        <div className="relative">
                            <User size={20}
                                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"/>
                            <Input
                                type="text"
                                value={displayName}
                                onChange={(e) => setDisplayName(e.target.value)}
                                placeholder="John Doe"
                                required
                                className="pl-11"
                            />
                        </div>
                    </div>

                    {/* Email Field */}
                    <div>
                        <label className="block text-sm font-bold text-slate-300 uppercase tracking-wider mb-3">
                            Email
                        </label>
                        <div className="relative">
                            <Mail size={20}
                                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"/>
                            <Input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="you@example.com"
                                required
                                className="pl-11"
                            />
                        </div>
                    </div>

                    {/* Password Field */}
                    <div>
                        <label className="block text-sm font-bold text-slate-300 uppercase tracking-wider mb-3">
                            Password
                        </label>
                        <div className="relative">
                            <Lock size={20}
                                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"/>
                            <Input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                required
                                className="pl-11"
                            />
                        </div>
                        <p className="text-xs text-slate-400 mt-2">Must be at least 8 characters</p>
                    </div>

                    {/* Confirm Password Field */}
                    <div>
                        <label className="block text-sm font-bold text-slate-300 uppercase tracking-wider mb-3">
                            Confirm Password
                        </label>
                        <div className="relative">
                            <Lock size={20}
                                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"/>
                            <Input
                                type="password"
                                value={passwordConfirm}
                                onChange={(e) => setPasswordConfirm(e.target.value)}
                                placeholder="••••••••"
                                required
                                className="pl-11"
                            />
                        </div>
                    </div>

                    {/* Register Button */}
                    <GlassButton
                        type="submit"
                        disabled={loading || success}
                        className="w-full uppercase tracking-wider"
                    >
                        <UserPlus size={20}/>
                        <span>{loading ? 'Creating account...' : success ? 'Success!' : 'Create Account'}</span>
                    </GlassButton>

                    {/* Login Link */}
                    <p className="text-center text-slate-400 font-medium">
                        Already have an account?{' '}
                        <button
                            type="button"
                            onClick={() => navigate('/login')}
                            className="text-blue-400 hover:text-blue-300 font-black transition-colors"
                        >
                            Login
                        </button>
                    </p>
                </form>

                {/* Terms */}
                <div className="text-center text-xs text-slate-500">
                    <p>
                        By registering, you agree to our{' '}
                        <span
                            className="text-slate-400 hover:text-slate-300 cursor-pointer">Terms of Service</span> and{' '}
                        <span className="text-slate-400 hover:text-slate-300 cursor-pointer">Privacy Policy</span>
                    </p>
                </div>
            </div>
        </div>
    );
}
