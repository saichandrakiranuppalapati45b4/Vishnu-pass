import React, { useState } from 'react';
import { ArrowLeft, Key, Lock, Shield, Eye, EyeOff, Loader2, CheckCircle2, RotateCcw, Info } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { db, auth } from '../../config/firebase';
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';

const SecuritySettings = ({ onBack }) => {
    const { t } = useLanguage();
    const [passwords, setPasswords] = useState({
        current: '',
        new: '',
        confirm: ''
    });
    const [showPasswords, setShowPasswords] = useState({
        current: false,
        new: false,
        confirm: false
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);

    const handlePasswordChange = async (e) => {
        e.preventDefault();
        setError(null);
        setSuccess(false);

        if (!passwords.current) {
            setError('Please enter your current password.');
            return;
        }

        if (passwords.new !== passwords.confirm) {
            setError(t('guard.security.matchError'));
            return;
        }

        if (passwords.new.length < 12) {
            setError('Password must be at least 12 characters.');
            return;
        }

        setIsSubmitting(true);

        try {
            // Verify current password by re-authenticating
            const user = auth.currentUser;
            if (!user) throw new Error('No active session found.');

            const credential = EmailAuthProvider.credential(user.email, passwords.current);
            await reauthenticateWithCredential(user, credential);

            await updatePassword(user, passwords.new);

            setSuccess(true);
            setPasswords({ current: '', new: '', confirm: '' });
        } catch (err) {
            setError(err.message || "Failed to update password.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="flex flex-col min-h-screen bg-[#fdfdfd] pb-10">
            {/* Header */}
            <header className="px-6 py-5 flex items-center justify-between bg-white border-b border-gray-50 sticky top-0 z-50">
                <button 
                    onClick={onBack}
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-[#1a2b3c] active:scale-90 transition-transform"
                >
                    <ArrowLeft className="w-6 h-6" />
                </button>
                <h1 className="text-xl font-black text-[#1a2b3c] tracking-tight">{t('guard.security.title')}</h1>
                <div className="w-10" /> {/* Spacer */}
            </header>

            <div className="px-6 pt-12 pb-8 flex flex-col items-center">
                {/* Icon Section */}
                <div className="w-24 h-24 rounded-full bg-[#fef5ec] flex items-center justify-center mb-8">
                    <div className="w-16 h-16 rounded-full bg-[#ffebd8] flex items-center justify-center text-[#f47c20]">
                        <RotateCcw className="w-8 h-8" />
                    </div>
                </div>

                <div className="text-center max-w-[280px] mb-12">
                    <p className="text-base font-bold text-[#475569] leading-relaxed">
                        {t('guard.security.description')}
                    </p>
                </div>

                {/* Form Card */}
                <form onSubmit={handlePasswordChange} className="w-full bg-white rounded-[32px] shadow-[0_8px_40px_rgba(0,0,0,0.04)] border border-gray-50 p-6 space-y-6">
                    {/* Status Messages */}
                    {error && (
                        <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl text-rose-600 text-xs font-bold animate-in fade-in slide-in-from-top-2">
                            {error}
                        </div>
                    )}
                    {success && (
                        <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl text-emerald-600 text-xs font-bold animate-in fade-in slide-in-from-top-2">
                            {t('guard.security.success')}
                        </div>
                    )}

                    <div className="space-y-6">
                        {/* Current Password */}
                        <div>
                            <label className="block text-sm font-black text-[#1a2b3c] mb-3 pl-1">{t('guard.security.currentLabel')}</label>
                            <div className="relative group">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#f47c20] transition-colors">
                                    <Key className="w-5 h-5" />
                                </div>
                                <input
                                    type={showPasswords.current ? "text" : "password"}
                                    value={passwords.current}
                                    onChange={(e) => setPasswords({...passwords, current: e.target.value})}
                                    className="w-full pl-12 pr-12 py-4 bg-[#f8f9fb] border border-transparent rounded-[20px] focus:bg-white focus:border-[#f47c20]/20 focus:ring-4 focus:ring-[#f47c20]/5 outline-none text-sm font-bold transition-all placeholder:text-slate-400"
                                    placeholder="••••••••"
                                />
                                <button 
                                    type="button"
                                    onClick={() => setShowPasswords({...showPasswords, current: !showPasswords.current})}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                                >
                                    {showPasswords.current ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                                <div className="absolute right-0 -bottom-6">
                                    <button type="button" className="text-[11px] font-black text-[#f47c20] hover:underline">{t('guard.security.forgot')}</button>
                                </div>
                            </div>
                        </div>

                        {/* New Password */}
                        <div className="pt-2">
                            <label className="block text-sm font-black text-[#1a2b3c] mb-3 pl-1">{t('guard.security.newLabel')}</label>
                            <div className="relative group">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#f47c20] transition-colors">
                                    <Lock className="w-5 h-5" />
                                </div>
                                <input
                                    type={showPasswords.new ? "text" : "password"}
                                    value={passwords.new}
                                    onChange={(e) => setPasswords({...passwords, new: e.target.value})}
                                    className="w-full pl-12 pr-12 py-4 bg-[#f8f9fb] border border-transparent rounded-[20px] focus:bg-white focus:border-[#f47c20]/20 focus:ring-4 focus:ring-[#f47c20]/5 outline-none text-sm font-bold transition-all placeholder:text-slate-400"
                                    placeholder="••••••••"
                                    required
                                />
                                <button 
                                    type="button"
                                    onClick={() => setShowPasswords({...showPasswords, new: !showPasswords.new})}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                                >
                                    {showPasswords.new ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>

                        {/* Confirm Password */}
                        <div>
                            <label className="block text-sm font-black text-[#1a2b3c] mb-3 pl-1">{t('guard.security.confirmLabel')}</label>
                            <div className="relative group">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#f47c20] transition-colors">
                                    <Shield className="w-5 h-5" />
                                </div>
                                <input
                                    type={showPasswords.confirm ? "text" : "password"}
                                    value={passwords.confirm}
                                    onChange={(e) => setPasswords({...passwords, confirm: e.target.value})}
                                    className="w-full pl-12 pr-4 py-4 bg-[#f8f9fb] border border-transparent rounded-[20px] focus:bg-white focus:border-[#f47c20]/20 focus:ring-4 focus:ring-[#f47c20]/5 outline-none text-sm font-bold transition-all placeholder:text-slate-400"
                                    placeholder="••••••••"
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    {/* Security Guidelines */}
                    <div className="p-5 bg-[#f0f9f4] rounded-[24px] border border-[#e3f2e9] space-y-3">
                        <div className="flex items-center gap-2 text-[#166534]">
                            <Info className="w-4 h-4" />
                            <span className="text-[11px] font-black uppercase tracking-wider">{t('guard.security.guidelines')}</span>
                        </div>
                        <ul className="space-y-2">
                            <li className="flex items-center gap-2 text-[11px] font-bold text-[#166534]">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                {t('guard.security.minChars')}
                            </li>
                            <li className="flex items-center gap-2 text-[11px] font-bold text-[#166534]">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                {t('guard.security.includeNumber')}
                            </li>
                        </ul>
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full py-5 bg-[#f47c20] text-white font-black rounded-[24px] shadow-xl shadow-orange-500/20 hover:bg-[#e06b12] transition-all active:scale-[0.98] disabled:opacity-70 disabled:active:scale-100 flex items-center justify-center gap-3"
                    >
                        {isSubmitting ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            t('guard.security.update')
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default SecuritySettings;
