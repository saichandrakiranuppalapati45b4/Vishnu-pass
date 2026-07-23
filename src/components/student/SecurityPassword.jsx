import React, { useState } from 'react';
import { ChevronLeft, Lock, Eye, EyeOff, Fingerprint, ShieldCheck, Smartphone, Clock, FileText } from 'lucide-react';
import { getAuth, reauthenticateWithCredential, EmailAuthProvider, updatePassword } from 'firebase/auth';

const SecurityPassword = ({ onBack }) => {
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [biometricEnabled, setBiometricEnabled] = useState(true);
    const [updating, setUpdating] = useState(false);
    const [message, setMessage] = useState(null);

    const handleUpdatePassword = async () => {
        if (!currentPassword) {
            setMessage({ type: 'error', text: 'Please enter your current password.' });
            return;
        }
        if (!newPassword || !confirmPassword) {
            setMessage({ type: 'error', text: 'Please fill all password fields.' });
            return;
        }
        if (newPassword !== confirmPassword) {
            setMessage({ type: 'error', text: 'New passwords do not match.' });
            return;
        }
        if (newPassword.length < 12) {
            setMessage({ type: 'error', text: 'Password must be at least 12 characters.' });
            return;
        }
        if (!/[A-Z]/.test(newPassword)) {
            setMessage({ type: 'error', text: 'Password must include at least one uppercase letter (A-Z).' });
            return;
        }
        if (!/[0-9]/.test(newPassword)) {
            setMessage({ type: 'error', text: 'Password must include at least one number (0-9).' });
            return;
        }
        if (!/[!@#$%^&*]/.test(newPassword)) {
            setMessage({ type: 'error', text: 'Password must include at least one special character (!@#$%^&*).' });
            return;
        }

        setUpdating(true);
        setMessage(null);
        try {
            const auth = getAuth();
            const user = auth.currentUser;
            if (!user || !user.email) throw new Error('No active session found.');

            // Re-authenticate
            const credential = EmailAuthProvider.credential(user.email, currentPassword);
            try {
                await reauthenticateWithCredential(user, credential);
            } catch (err) {
                setMessage({ type: 'error', text: 'Current password is incorrect.' });
                setUpdating(false);
                return;
            }

            // Update password
            await updatePassword(user, newPassword);
            
            setMessage({ type: 'success', text: 'Password updated successfully!' });
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (error) {
            setMessage({ type: 'error', text: error.message || 'Failed to update password.' });
        } finally {
            setUpdating(false);
        }
    };

    return (
        <div className="flex-1 flex flex-col bg-[#f8f9fb] overflow-hidden">
            {/* Header */}
            <div className="bg-white px-5 pt-12 pb-4 border-b border-gray-100 shadow-sm">
                <div className="flex items-center gap-3">
                    <button
                        onClick={onBack}
                        className="w-9 h-9 rounded-xl bg-gray-50 flex items-center justify-center text-gray-500 hover:text-gray-900 transition-colors active:scale-95"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <h1 className="text-xl font-black text-gray-900">Security & Password</h1>
                </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto pb-28">

                {/* Change Password Card */}
                <div className="mx-5 mt-5 bg-white rounded-3xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-gray-50 p-6">
                    <div className="flex items-center gap-3 mb-6">
                        <Lock className="w-5 h-5 text-[#f47c20]" />
                        <h2 className="text-lg font-black text-gray-900">Change Password</h2>
                    </div>

                    {/* Status Message */}
                    {message && (
                        <div className={`mb-4 px-4 py-3 rounded-xl text-sm font-bold ${message.type === 'success' ? 'bg-green-50 text-green-600 border border-green-100' : 'bg-red-50 text-red-600 border border-red-100'
                            }`}>
                            {message.text}
                        </div>
                    )}

                    {/* Current Password */}
                    <div className="mb-4">
                        <label className="text-sm font-bold text-gray-600 mb-2 block">Current Password</label>
                        <div className="relative">
                            <input
                                type={showCurrent ? 'text' : 'password'}
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                className="w-full px-4 py-3.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#f47c20]/30 focus:border-[#f47c20] transition-all pr-12"
                                placeholder="••••••••"
                            />
                            <button
                                type="button"
                                onClick={() => setShowCurrent(!showCurrent)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                                {showCurrent ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                        </div>
                    </div>

                    {/* New Password */}
                    <div className="mb-4">
                        <label className="text-sm font-bold text-gray-600 mb-2 block">New Password</label>
                        <div className="relative">
                            <input
                                type={showNew ? 'text' : 'password'}
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                className="w-full px-4 py-3.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#f47c20]/30 focus:border-[#f47c20] transition-all pr-12"
                                placeholder="••••••••"
                            />
                            <button
                                type="button"
                                onClick={() => setShowNew(!showNew)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                                {showNew ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                        </div>
                    </div>

                    {/* Confirm New Password */}
                    <div className="mb-6">
                        <label className="text-sm font-bold text-gray-600 mb-2 block">Confirm New Password</label>
                        <div className="relative">
                            <input
                                type={showConfirm ? 'text' : 'password'}
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full px-4 py-3.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#f47c20]/30 focus:border-[#f47c20] transition-all pr-12"
                                placeholder="••••••••"
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirm(!showConfirm)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                                {showConfirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                        </div>
                    </div>

                    {/* Update Button */}
                    <button
                        onClick={handleUpdatePassword}
                        disabled={updating}
                        className="w-full py-4 bg-[#f47c20] hover:bg-[#e06d1c] text-white font-black rounded-2xl text-sm transition-all active:scale-[0.98] shadow-lg shadow-orange-200 disabled:opacity-60"
                    >
                        {updating ? 'Updating...' : 'Update Password'}
                    </button>
                </div>

                {/* Biometric Login Card */}
                <div className="mx-5 mt-4 bg-white rounded-3xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-gray-50 p-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center">
                                <Fingerprint className="w-5 h-5 text-purple-500" />
                            </div>
                            <div>
                                <h3 className="text-base font-black text-gray-900">Biometric Login</h3>
                            </div>
                        </div>
                        {/* Toggle */}
                        <button
                            onClick={() => setBiometricEnabled(!biometricEnabled)}
                            className={`relative w-12 h-7 rounded-full transition-colors duration-300 ${biometricEnabled ? 'bg-[#f47c20]' : 'bg-gray-300'
                                }`}
                        >
                            <div className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow-md transition-transform duration-300 ${biometricEnabled ? 'translate-x-[22px]' : 'translate-x-0.5'
                                }`} />
                        </button>
                    </div>
                    <p className="text-xs text-gray-400 font-medium mt-3 leading-relaxed pl-[52px]">
                        Use Face ID or Fingerprint for faster access to your student dashboard.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default SecurityPassword;
