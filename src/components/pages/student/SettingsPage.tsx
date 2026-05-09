import {useState, useEffect} from 'react';
import {Settings, User, Shield, Palette, Upload} from 'lucide-react';
import {apiClient} from '@skillforge/vite/lib/api';
import {AvatarCropper} from '@skillforge/vite/components/ui/AvatarCropper';
import type {User as UserType} from '@skillforge/vite/lib/types';
import {GlassButton, GlassSecondaryButton, Input, Select, StateCard, Switch, Tabs, Textarea} from '@skillforge/vite/components/ui/controls';

interface SettingsPageProps {
    onDarkModeChange?: (isDarkMode: boolean) => void;
    onProfileUpdate?: (user: UserType) => void;
}

export function SettingsPage({onDarkModeChange, onProfileUpdate}: SettingsPageProps) {
    const [user, setUser] = useState<UserType | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'profile' | 'preferences' | 'account'>('profile');
    const [formData, setFormData] = useState({
        displayName: '',
        email: '',
        bio: '',
    });
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
    const [showCropper, setShowCropper] = useState(false);
    const [imageToCrop, setImageToCrop] = useState<string | null>(null);
    const [isDarkMode, setIsDarkMode] = useState(false);
    const [preferredLocale, setPreferredLocale] = useState('en-US');
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [showPasswordForm, setShowPasswordForm] = useState(false);
    const [passwordData, setPasswordData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
    });

    useEffect(() => {
        const fetchUser = async () => {
            try {
                setLoading(true);
                const userData = await apiClient.getProfile();
                setUser(userData);
                setFormData({
                    displayName: userData.displayName || '',
                    email: userData.email || '',
                    bio: userData.bio || '',
                });
                if (userData.preference) {
                    setIsDarkMode(userData.preference.darkModeEnabled);
                    setPreferredLocale(userData.preference.preferredLocale);
                }
            } catch (error) {
                console.error('Failed to fetch user:', error);
                setMessage({type: 'error', text: 'Failed to load settings'});
            } finally {
                setLoading(false);
            }
        };
        fetchUser();
    }, []);

    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const {name, value} = e.target;
        setFormData((prev) => ({...prev, [name]: value}));
    };

    const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setImageToCrop(reader.result as string);
                setShowCropper(true);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleCropComplete = (croppedFile: File) => {
        setAvatarFile(croppedFile);
        const reader = new FileReader();
        reader.onloadend = () => {
            setAvatarPreview(reader.result as string);
        };
        reader.readAsDataURL(croppedFile);
        setShowCropper(false);
        setImageToCrop(null);
    };

    const handleSaveProfile = async () => {
        try {
            setSaving(true);
            setMessage(null);
            const updateData: any = {};
            if (formData.displayName) updateData.displayName = formData.displayName;
            if (formData.email) updateData.email = formData.email;
            if (formData.bio) updateData.bio = formData.bio;
            if (avatarFile) updateData.avatar = avatarFile;

            const updatedUser = await apiClient.updateProfile(updateData);
            // Merge updated fields with existing user to preserve stats like level, xpSummary, etc.
            setUser((prevUser) => prevUser ? { ...prevUser, ...updatedUser } : updatedUser);
            onProfileUpdate?.(user ? { ...user, ...updatedUser } : updatedUser);
            setAvatarFile(null);
            setAvatarPreview(null);
            setMessage({type: 'success', text: 'Profile updated successfully'});
        } catch (error: any) {
            console.error('Failed to save profile:', error);
            const errorMsg = error.message || 'Failed to save profile';
            if (error.statusCode === 409) {
                setMessage({type: 'error', text: 'Email already in use'});
            } else if (error.statusCode === 400) {
                setMessage({type: 'error', text: 'Invalid file format or data'});
            } else {
                setMessage({type: 'error', text: errorMsg});
            }
        } finally {
            setSaving(false);
        }
    };

    const handleSavePreferences = async () => {
        try {
            setSaving(true);
            setMessage(null);
            const updatedUser = await apiClient.updatePreferences({
                darkModeEnabled: isDarkMode,
                preferredLocale,
            });
            // Merge updated preferences with existing user to preserve all other data
            setUser((prevUser) => prevUser ? { ...prevUser, preference: updatedUser.preference } : updatedUser);
            onProfileUpdate?.(user ? { ...user, preference: updatedUser.preference } : updatedUser);
            setMessage({type: 'success', text: 'Preferences updated successfully'});
            onDarkModeChange?.(isDarkMode);
        } catch (error: any) {
            console.error('Failed to save preferences:', error);
            const errorMsg = error.message || 'Failed to save preferences';
            if (error.statusCode === 400) {
                setMessage({type: 'error', text: 'Invalid locale format'});
            } else if (error.statusCode === 404) {
                setMessage({type: 'error', text: 'User preferences not found'});
            } else if (error.statusCode === 401) {
                setMessage({type: 'error', text: 'Authentication required'});
            } else {
                setMessage({type: 'error', text: errorMsg});
            }
        } finally {
            setSaving(false);
        }
    };

    const handleChangePassword = async () => {
        setMessage(null);
        
        if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
            setMessage({type: 'error', text: 'All fields are required'});
            return;
        }

        if (passwordData.newPassword !== passwordData.confirmPassword) {
            setMessage({type: 'error', text: 'New passwords do not match'});
            return;
        }

        try {
            setSaving(true);
            await apiClient.changePassword(passwordData.currentPassword, passwordData.newPassword);
            setMessage({type: 'success', text: 'Password changed successfully'});
            setPasswordData({currentPassword: '', newPassword: '', confirmPassword: ''});
            setShowPasswordForm(false);
        } catch (error: any) {
            console.error('Failed to change password:', error);
            if (error.statusCode === 401) {
                setMessage({type: 'error', text: 'Current password is incorrect'});
            } else if (error.statusCode === 400) {
                const errorMsg = Array.isArray(error.message) ? error.message[0] : error.message;
                setMessage({type: 'error', text: errorMsg || 'Invalid password format'});
            } else {
                setMessage({type: 'error', text: error.message || 'Failed to change password'});
            }
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <StateCard title="Loading settings..." description="Syncing your profile and preferences." />
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-y-auto">
            <div className="max-w-4xl mx-auto p-8 space-y-8">
                {/* Header */}
                <div className="flex items-center space-x-4 mb-8">
                    <div
                        className="w-12 h-12 bg-blue-500/20 text-blue-500 rounded-2xl flex items-center justify-center">
                        <Settings size={24}/>
                    </div>
                    <h1 className="text-3xl font-black text-slate-900 dark:text-white">Settings</h1>
                </div>

                {/* Message Alert */}
                {message && (
                    <div
                        className={`p-4 rounded-xl border-2 ${
                            message.type === 'success'
                                ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300'
                                : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300'
                        }`}
                    >
                        <p className="font-bold">{message.text}</p>
                    </div>
                )}

                {/* Settings Tabs */}
                <Tabs
                    value={activeTab}
                    onValueChange={(value) => setActiveTab(value as typeof activeTab)}
                    tabs={[
                        {value: 'profile', label: <span className="inline-flex items-center gap-2"><User size={18}/> Profile</span>},
                        {value: 'preferences', label: <span className="inline-flex items-center gap-2"><Palette size={18}/> Preferences</span>},
                        {value: 'account', label: <span className="inline-flex items-center gap-2"><Shield size={18}/> Account</span>},
                    ]}
                    className="pb-2"
                />

                {/* Profile Settings */}
                {activeTab === 'profile' && (
                    <div
                        className="glass-panel rounded-2xl p-8 space-y-6">
                        <h2 className="text-2xl font-black text-slate-900 dark:text-white flex items-center space-x-2">
                            <User size={24}/>
                            <span>Edit Profile</span>
                        </h2>

                        <div className="space-y-6">
                            {/* Avatar Upload */}
                            <div>
                                <label
                                    className="block text-sm font-bold uppercase text-slate-700 dark:text-slate-300 mb-2">
                                    Avatar
                                </label>
                                <div className="flex items-center space-x-4">
                                    {avatarPreview && (
                                        <img
                                            src={avatarPreview}
                                            alt="Avatar preview"
                                            className="w-16 h-16 rounded-2xl object-cover border border-blue-400/40"
                                        />
                                    )}
                                    <label
                                        className="glass-chip flex flex-1 cursor-pointer items-center justify-center rounded-2xl border-dashed px-4 py-3 transition-colors hover:border-blue-400/50">
                                        <div className="flex items-center space-x-2">
                                            <Upload size={18} className="text-slate-600 dark:text-slate-400"/>
                                            <span className="text-sm font-bold text-slate-600 dark:text-slate-400">
												Choose image
											</span>
                                        </div>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handleAvatarChange}
                                            className="hidden"
                                        />
                                    </label>
                                </div>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                    JPG, PNG, or WebP. Max 5MB.
                                </p>
                            </div>

                            {/* Display Name */}
                            <div>
                                <label
                                    className="block text-sm font-bold uppercase text-slate-700 dark:text-slate-300 mb-2">
                                    Display Name
                                </label>
                                <Input
                                    type="text"
                                    name="displayName"
                                    value={formData.displayName}
                                    onChange={handleFormChange}
                                    className="font-bold"
                                    placeholder="Your name"
                                />
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                    How you'll appear to other users
                                </p>
                            </div>

                            {/* Email */}
                            <div>
                                <label
                                    className="block text-sm font-bold uppercase text-slate-700 dark:text-slate-300 mb-2">
                                    Email
                                </label>
                                <Input
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleFormChange}
                                    className="font-bold"
                                    placeholder="your.email@example.com"
                                />
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                    Your email address for login and notifications
                                </p>
                            </div>

                            {/* Bio */}
                            <div>
                                <label
                                    className="block text-sm font-bold uppercase text-slate-700 dark:text-slate-300 mb-2">
                                    Bio
                                </label>
                                <Textarea
                                    name="bio"
                                    value={formData.bio}
                                    onChange={handleFormChange}
                                    rows={4}
                                    placeholder="Tell us about yourself..."
                                />
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                    Maximum 500 characters
                                </p>
                            </div>

                            {/* Save Button */}
                            <GlassButton
                                onClick={handleSaveProfile}
                                disabled={saving}
                                className="w-full uppercase"
                            >
                                {saving ? 'Saving...' : 'Save Changes'}
                            </GlassButton>
                        </div>
                    </div>
                )}

                {/* Preferences Settings */}
                {activeTab === 'preferences' && (
                    <div
                        className="glass-panel rounded-2xl p-8 space-y-6">
                        <h2 className="text-2xl font-black text-slate-900 dark:text-white flex items-center space-x-2">
                            <Palette size={24}/>
                            <span>Preferences</span>
                        </h2>

                        <div className="space-y-6">
                            {/* Dark Mode */}
                            <div
                                className="glass-chip flex items-center justify-between rounded-2xl p-4">
                                <div>
                                    <p className="font-bold text-slate-900 dark:text-white">Dark Mode</p>
                                    <p className="text-sm text-slate-600 dark:text-slate-400">
                                        Use dark theme across the platform
                                    </p>
                                </div>
                                <Switch checked={isDarkMode} onCheckedChange={setIsDarkMode} />
                            </div>

                            {/* Language */}
                            <div>
                                <label
                                    className="block text-sm font-bold uppercase text-slate-700 dark:text-slate-300 mb-2">
                                    Preferred Language
                                </label>
                                <Select
                                    value={preferredLocale}
                                    onChange={(e) => setPreferredLocale(e.target.value)}
                                    className="font-bold"
                                >
                                    <option value="en-US">English (United States)</option>
                                    <option value="id-ID">Bahasa Indonesia</option>
                                    <option value="fr-FR">Français (France)</option>
                                    <option value="de-DE">Deutsch (Germany)</option>
                                    <option value="ja-JP">日本語 (Japan)</option>
                                    <option value="zh-CN">中文 (Simplified)</option>
                                </Select>
                            </div>

                            {/* Save Button */}
                            <GlassButton
                                onClick={handleSavePreferences}
                                disabled={saving}
                                className="w-full uppercase"
                            >
                                {saving ? 'Saving...' : 'Save Preferences'}
                            </GlassButton>
                        </div>
                    </div>
                )}

                {/* Account Settings */}
                {activeTab === 'account' && (
                    <div
                        className="glass-panel rounded-2xl p-8 space-y-6">
                        <h2 className="text-2xl font-black text-slate-900 dark:text-white flex items-center space-x-2">
                            <Shield size={24}/>
                            <span>Account</span>
                        </h2>

                        <div className="space-y-4">
                            {/* Account Info */}
                            <div className="glass-chip p-4 rounded-lg">
                                <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Account ID</p>
                                <p className="font-mono font-bold text-slate-900 dark:text-white break-all">{user?.id}</p>
                            </div>

                            <div className="glass-chip p-4 rounded-lg">
                                <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Member Since</p>
                                <p className="font-bold text-slate-900 dark:text-white">
                                    {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', {
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric'
                                    }) : 'N/A'}
                                </p>
                            </div>

                            {/* Change Password Section */}
                            <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                                <h3 className="font-bold text-slate-900 dark:text-white mb-4">Change Password</h3>
                                
                                {!showPasswordForm ? (
                                <GlassSecondaryButton
                                    onClick={() => setShowPasswordForm(true)}
                                    className="w-full uppercase"
                                >
                                    Change Password
                                </GlassSecondaryButton>
                            ) : (
                                    <div className="space-y-4 glass-chip rounded-2xl p-4">
                                        <div>
                                            <label className="block text-sm font-bold uppercase text-slate-700 dark:text-slate-300 mb-2">
                                                Current Password
                                            </label>
                                            <Input
                                                type="password"
                                                value={passwordData.currentPassword}
                                                onChange={(e) => setPasswordData({...passwordData, currentPassword: e.target.value})}
                                                placeholder="Enter current password"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-bold uppercase text-slate-700 dark:text-slate-300 mb-2">
                                                New Password
                                            </label>
                                            <Input
                                                type="password"
                                                value={passwordData.newPassword}
                                                onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
                                                placeholder="Enter new password (8-128 characters)"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-bold uppercase text-slate-700 dark:text-slate-300 mb-2">
                                                Confirm Password
                                            </label>
                                            <Input
                                                type="password"
                                                value={passwordData.confirmPassword}
                                                onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                                                placeholder="Confirm new password"
                                            />
                                        </div>

                                        <div className="flex gap-2 pt-2">
                                            <GlassButton
                                                onClick={handleChangePassword}
                                                disabled={saving}
                                                className="flex-1 uppercase text-sm"
                                            >
                                                {saving ? 'Updating...' : 'Update Password'}
                                            </GlassButton>
                                            <GlassSecondaryButton
                                                onClick={() => {
                                                    setShowPasswordForm(false);
                                                    setPasswordData({currentPassword: '', newPassword: '', confirmPassword: ''});
                                                }}
                                                disabled={saving}
                                                className="flex-1 uppercase text-sm"
                                            >
                                                Cancel
                                            </GlassSecondaryButton>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Danger Zone */}
                            <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                                <h3 className="font-bold text-red-600 dark:text-red-400 mb-4">Danger Zone</h3>
                                <button
                                    className="w-full rounded-2xl border border-red-400/20 bg-red-500/10 px-6 py-3 font-black uppercase text-red-600 transition-colors hover:bg-red-500/15 dark:text-red-300">
                                    Delete Account
                                </button>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                                    This action cannot be undone. All your data will be permanently deleted.
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Avatar Cropper Modal */}
            {showCropper && imageToCrop && (
                <AvatarCropper
                    imageSrc={imageToCrop}
                    onCropComplete={handleCropComplete}
                    onCancel={() => {
                        setShowCropper(false);
                        setImageToCrop(null);
                    }}
                />
            )}
        </div>
    );
}
