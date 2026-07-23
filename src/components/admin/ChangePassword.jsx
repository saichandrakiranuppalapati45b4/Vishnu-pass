import React, { useState, useEffect } from 'react';
import { Shield, Eye, EyeOff, CheckCircle2, Circle, AlertCircle, ArrowLeft, Lock, Loader2, X } from 'lucide-react';
import { db, auth } from '../../config/firebase';
import { collection, getDocs, doc, getDoc, updateDoc } from 'firebase/firestore';
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth';

const ChangePassword = ({ onBack }) => {
    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(true);
    const [lastChanged, setLastChanged] = useState(null);
    const [error, setError] = useState(null);
    const [isShake, setIsShake] = useState(false);
    const [success, setSuccess] = useState(null);

    useEffect(() => {
        const fetchCurrentPassword = async () => {
            try {
                const user = auth.currentUser;
                if (user) {
                    // Fetch user info from Firestore (assuming user info is in top level 'users' collection)
                    const userDocRef = doc(db, 'users', user.uid);
                    const userDoc = await getDoc(userDocRef);

                    if (userDoc.exists()) {
                        setLastChanged(userDoc.data().passwordChangedAt?.toDate() || null);
                    }
                }
            } catch (err) {
                console.error("Error fetching user data:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchCurrentPassword();
    }, []);

    const triggerShake = () => {
        setIsShake(true);
        setTimeout(() => setIsShake(false), 500);
    };

    const requirements = [
        { label: 'At least 12 characters long', met: newPassword.length >= 12 },
        { label: 'Include at least one uppercase letter (A-Z)', met: /[A-Z]/.test(newPassword) },
        { label: 'Include at least one number (0-9)', met: /[0-9]/.test(newPassword) },
        { label: 'Include one special character (!@#$%^&*)', met: /[!@#$%^&*]/.test(newPassword) },
        { label: 'Cannot be the same as your current password', met: newPassword.trim() !== currentPassword.trim() && newPassword !== '' },
    ];

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);

        try {
            setLoading(true);
            const user = auth.currentUser;

            if (!user) throw new Error('No active session found.');

            // 1. Validation: Check if all requirements are met
            const allMet = requirements.every(req => req.met);
            if (!allMet) {
                setError('Please ensure all security requirements on the right are met.');
                triggerShake();
                return;
            }

            // 2. Validation: Check if new password matches confirm password
            if (newPassword.trim() !== confirmPassword.trim()) {
                setError('The new passwords you entered do not match.');
                triggerShake();
                return;
            }

            // 3. Reauthenticate user
            const credential = EmailAuthProvider.credential(user.email, currentPassword.trim());
            try {
                await reauthenticateWithCredential(user, credential);
            } catch (authError) {
                setError('The current password you entered is incorrect. Please try again.');
                triggerShake();
                return;
            }

            // 4. Update Firebase Auth password
            await updatePassword(user, newPassword.trim());

            // 5. Update the 'users' document
            const now = new Date();
            const userDocRef = doc(db, 'users', user.uid);
            await updateDoc(userDocRef, {
                passwordChangedAt: now
            });

            setLastChanged(now);
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');

            setSuccess('Your password has been updated successfully! Security credentials are synchronized.');
            setTimeout(() => setSuccess(null), 5000);
        } catch (err) {
            setError('Failed to update password: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center bg-[#f8f9fb]">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-8 h-8 text-[#f47c20] animate-spin" />
                    <p className="text-sm font-medium text-gray-500 text-center">Loading security settings...</p>
                </div>
            </div>
        );
    }

    const formatLastChanged = (date) => {
        if (!date) return 'Never';
        return new Intl.DateTimeFormat('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        }).format(date);
    };

    return (
        <div className="flex-1 overflow-y-auto p-8 bg-[#f8f9fb]">
            <style>
                {`
                    @keyframes shake {
                        0%, 100% { transform: translateX(0); }
                        20%, 60% { transform: translateX(-5px); }
                        40%, 80% { transform: translateX(5px); }
                    }
                    .animate-shake {
                        animation: shake 0.4s cubic-bezier(.36,.07,.19,.97) both;
                    }
                `}
            </style>

            {/* Breadcrumbs */}
            <div className="flex items-center gap-2 text-sm font-medium mb-6">
                <button onClick={onBack} className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer">Settings</button>
                <span className="text-gray-300">›</span>
                <span className="text-[#f47c20]">Change Password</span>
            </div>

            <div className="mb-8">
                <h1 className="text-[26px] font-bold text-gray-900 mb-1">Security Settings</h1>
                <p className="text-sm text-gray-500 font-medium">Update your account password and security preferences to keep your account safe.</p>
            </div>

            <div className="grid grid-cols-12 gap-8">
                {/* Form Section */}
                <div className="col-span-8">
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
                        <div className="p-6 border-b border-gray-50 flex items-center gap-3">
                            <div className="w-8 h-8 bg-orange-50 rounded-lg flex items-center justify-center">
                                <Shield className="w-4 h-4 text-[#f47c20]" />
                            </div>
                            <h3 className="font-bold text-gray-900 text-[15px]">Update Password</h3>
                        </div>

                        <form onSubmit={handleSubmit} className="p-8 space-y-6">
                            {/* Error Message */}
                            {error && (
                                <div className={`flex items-start gap-3 p-4 bg-red-50 border border-red-100 rounded-xl transition-all ${isShake ? 'animate-shake' : ''}`}>
                                    <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                                    <div className="flex-1">
                                        <p className="text-sm font-bold text-red-800">Security Alert</p>
                                        <p className="text-xs text-red-600 font-medium">{error}</p>
                                    </div>
                                    <button type="button" onClick={() => setError(null)} className="text-red-400 hover:text-red-500 transition-colors cursor-pointer">
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            )}

                            {/* Success Message */}
                            {success && (
                                <div className="flex items-start gap-3 p-4 bg-emerald-50 border border-emerald-100 rounded-xl animate-in fade-in slide-in-from-top-2 duration-300">
                                    <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                                    <div className="flex-1">
                                        <p className="text-sm font-bold text-emerald-800">Success Updated</p>
                                        <p className="text-xs text-emerald-600 font-medium">{success}</p>
                                    </div>
                                    <button type="button" onClick={() => setSuccess(null)} className="text-emerald-400 hover:text-emerald-500 transition-colors cursor-pointer">
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            )}

                            {/* Current Password */}
                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Current Password</label>
                                <div className="relative">
                                    <input
                                        type={showCurrent ? 'text' : 'password'}
                                        value={currentPassword}
                                        onChange={(e) => {
                                            setCurrentPassword(e.target.value);
                                            if (error) setError(null);
                                        }}
                                        className={`w-full px-4 py-3 bg-white border ${error && currentPassword === '' ? 'border-red-200 ring-2 ring-red-50' : 'border-gray-200'} rounded-xl text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#f47c20]/20 focus:border-[#f47c20] pr-12`}
                                        placeholder="Enter current password"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowCurrent(!showCurrent)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
                                    >
                                        {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>

                            {/* New Password */}
                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">New Password</label>
                                <div className="relative">
                                    <input
                                        type={showNew ? 'text' : 'password'}
                                        value={newPassword}
                                        onChange={(e) => {
                                            setNewPassword(e.target.value);
                                            if (error) setError(null);
                                        }}
                                        className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#f47c20]/20 focus:border-[#f47c20] pr-12"
                                        placeholder="Enter new password"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowNew(!showNew)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
                                    >
                                        {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>

                            {/* Confirm Password */}
                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Confirm New Password</label>
                                <input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => {
                                        setConfirmPassword(e.target.value);
                                        if (error) setError(null);
                                    }}
                                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#f47c20]/20 focus:border-[#f47c20]"
                                    placeholder="Re-enter new password"
                                />
                            </div>

                            <div className="flex justify-end pt-4">
                                <button
                                    type="submit"
                                    className="px-8 py-3 bg-[#f47c20] hover:bg-[#e06d1c] text-white font-bold rounded-xl text-sm transition-all shadow-lg active:scale-[0.98] flex items-center gap-2 cursor-pointer"
                                >
                                    <Lock className="w-4 h-4" />
                                    Update Password
                                </button>
                            </div>
                        </form>
                    </div>

                    {/* Footer Info */}
                    <div className="mt-8 bg-white/50 border border-dashed border-gray-200 rounded-2xl p-6 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-400">
                                <Shield className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-gray-900">Last password change</p>
                                <p className="text-xs text-gray-400 font-medium whitespace-pre">{formatLastChanged(lastChanged)}</p>
                            </div>
                        </div>
                        <div className="px-3 py-1 bg-emerald-50 text-emerald-600 text-[10px] font-bold uppercase tracking-wider rounded-full border border-emerald-100">
                            Account Secure
                        </div>
                    </div>
                </div>

                {/* Sidebar Section */}
                <div className="col-span-4 space-y-6">
                    {/* Requirements */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.04)] p-6">
                        <div className="flex items-center gap-2 mb-6">
                            <Shield className="w-4 h-4 text-[#f47c20]" />
                            <h3 className="font-bold text-gray-900 text-[14px] uppercase tracking-wider">Security Requirements</h3>
                        </div>
                        <ul className="space-y-4">
                            {requirements.map((req, idx) => (
                                <li key={idx} className="flex items-start gap-3">
                                    {req.met ? (
                                        <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                                    ) : (
                                        <Circle className="w-4 h-4 text-gray-200 mt-0.5 flex-shrink-0" />
                                    )}
                                    <span className={`text-[13px] font-medium leading-relaxed ${req.met ? 'text-gray-900' : 'text-gray-400'}`}>
                                        {req.label}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Help Card */}
                    <div className="bg-orange-50/50 border border-orange-100 rounded-2xl p-6">
                        <div className="flex items-center gap-2 mb-3">
                            <AlertCircle className="w-4 h-4 text-[#f47c20]" />
                            <h3 className="font-bold text-[#f47c20] text-[14px]">Need Help?</h3>
                        </div>
                        <p className="text-[13px] text-[#a86532] font-medium leading-[1.6]">
                            If you're having trouble changing your password, please contact the IT support desk or refer to the administrative security manual.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ChangePassword;
