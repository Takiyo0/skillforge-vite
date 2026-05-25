import {useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {LogIn, Lock, Mail, AlertCircle} from 'lucide-react';
import {apiClient} from '@skillforge/vite/lib/api';
import type {ApiError} from '@skillforge/vite/lib/types';
import {GlassButton, Input} from "@skillforge/vite/components/ui/controls";
import logo from '@skillforge/vite/assets/logo.svg';

export function Login() {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            const response = await apiClient.login({email, password});

            // Store token and user data - the API already handles this, but keeping for redundancy
            // App.tsx will detect the token and verify auth
            localStorage.setItem('accessToken', response.accessToken);
            localStorage.setItem('user', JSON.stringify(response.user));

            // Navigate without reload - let App.tsx useEffect detect the token and update state
            window.location.href = '/student/dashboard';
        } catch (err) {
            const apiError = err as ApiError;
            setError(apiError.message || 'Login failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center px-4 py-10">
            <div className="w-full max-w-md space-y-8">
                {/* Logo Section */}
                <div className="flex flex-col items-center">
                    <img src={logo} alt="SkillForge logo" className="w-20 h-20 sm:w-24 sm:h-24 object-contain mb-4" />
                    <h1 className="text-3xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-cyan-400">
                        SkillForge
                    </h1>
                    <p className="text-slate-400 font-medium mt-2">Learn. Build. Master.</p>
                </div>

                {/* Login Form */}
                <form onSubmit={handleSubmit} className="glass-panel rounded-2xl p-8 space-y-6">
                    <h2 className="text-2xl font-black text-white text-center">Welcome Back</h2>

                    {/* Error Message */}
                    {error && (
                        <div
                            className="glass-state border-red-500/20 bg-red-500/10 rounded-2xl p-4 flex items-start space-x-3">
                            <AlertCircle className="text-red-400 flex-shrink-0 mt-0.5" size={20}/>
                            <p className="text-red-300 text-sm font-medium">{error}</p>
                        </div>
                    )}

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
                    </div>

                    {/* Login Button */}
                    <GlassButton
                        type="submit"
                        disabled={loading}
                        className="w-full uppercase tracking-wider"
                    >
                        <LogIn size={20}/>
                        <span>{loading ? 'Logging in...' : 'Login'}</span>
                    </GlassButton>

                    {/* Register Link */}
                    <p className="text-center text-slate-400 font-medium">
                        Don't have an account?{' '}
                        <button
                            type="button"
                            onClick={() => navigate('/register')}
                            className="text-blue-400 hover:text-blue-300 font-black transition-colors"
                        >
                            Register
                        </button>
                    </p>
                </form>
            </div>
        </div>
    );
}
