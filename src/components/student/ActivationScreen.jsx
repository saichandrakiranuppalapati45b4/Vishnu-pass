import React, { useState, useRef } from 'react';
import { Camera, Loader2, Upload, AlertCircle, CheckCircle2, UserCheck, Lock, Eye, EyeOff, ShieldCheck, LogOut } from 'lucide-react';
import { supabase, uploadFile } from '../../config/supabase';
import { logAuditAction } from '../../utils/auditLogger';

const ActivationScreen = ({ studentData, onComplete, onStatusChange, onLogout }) => {
    const [photoFile, setPhotoFile] = useState(null);
    const [photoPreview, setPhotoPreview] = useState(studentData?.photo_url || null);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const fileInputRef = useRef(null);

    const handlePhotoChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
            if (!allowedTypes.includes(file.type)) {
                setError('Invalid file type. Only JPG, PNG, and WebP are allowed.');
                return;
            }
            if (file.size > 5 * 1024 * 1024) {
                setError('File too large. Maximum size is 5MB.');
                return;
            }
            setPhotoFile(file);
            setPhotoPreview(URL.createObjectURL(file));
            setError(null);
        }
    };

    const handleActivationSubmit = async (e) => {
        e.preventDefault();
        setError(null);

        // 1. Password validation
        if (!newPassword || newPassword.length < 6) {
            setError('Please choose a new password of at least 6 characters.');
            return;
        }

        if (newPassword !== confirmPassword) {
            setError('New password and confirm password do not match.');
            return;
        }

        // 2. Photo validation
        if (!photoFile && !photoPreview) {
            setError('Please upload a clear profile photo to complete your ID card.');
            return;
        }

        setIsSubmitting(true);

        try {
            let publicUrl = photoPreview;

            // 1. Upload photo if newly selected
            if (photoFile) {
                const fileExt = photoFile.name.split('.').pop();
                const fileName = `student_${studentData.id || studentData.student_id || Date.now()}_${Date.now()}.${fileExt}`;
                publicUrl = await uploadFile('students', fileName, photoFile);
            }

            // 2. Update password & user metadata in Supabase Auth
            const { error: authErr } = await supabase.auth.updateUser({
                password: newPassword,
                data: {
                    first_login_completed: true,
                    full_name: studentData.full_name || studentData.name,
                    role: 'student',
                    student_id: studentData.student_id
                }
            });

            if (authErr) throw authErr;

            // 3. Update public.students table with photo_url and first_login_completed
            const updatePayload = {
                first_login_completed: true,
                status: 'Active'
            };
            if (publicUrl) {
                updatePayload.photo_url = publicUrl;
            }

            const { error: updateErr } = await supabase
                .from('students')
                .update(updatePayload)
                .or(`id.eq.${studentData.id},student_id.eq.${studentData.student_id}`);

            if (updateErr) throw updateErr;

            // 4. Log audit action
            await logAuditAction({
                action: 'Completed Student Onboarding',
                resource: studentData.student_id || studentData.id,
                details: { fullName: studentData.full_name, email: studentData.email }
            });

            // 5. Notify parent component to refresh student data
            if (onComplete) {
                onComplete({
                    photo_url: publicUrl,
                    first_login_completed: true,
                    status: 'Active'
                });
            } else if (onStatusChange) {
                onStatusChange('Active');
            }
        } catch (err) {
            console.error('Activation error:', err);
            setError(err.message || 'Failed to update profile and password. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="flex-1 bg-[#f8f9fb] flex flex-col p-4 sm:p-6 h-full font-sans overflow-y-auto">
            {/* Header / Logout */}
            <div className="flex justify-between items-center w-full mb-6 max-w-md mx-auto">
                <div className="flex items-center gap-2">
                    <div className="bg-[#fef3c7] w-8 h-8 rounded-lg flex items-center justify-center border border-orange-100 overflow-hidden">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 2L3 7L3 11C3 16.5 6.8 21.5 12 23C17.2 21.5 21 16.5 21 11L21 7L12 2Z" fill="#F47C20" opacity="0.3" />
                            <path d="M12 22C17 20.5 20 16 20 11V7.5L12 3L4 7.5V11C4 16 7 20.5 12 22Z" fill="#F47C20" />
                            <circle cx="12" cy="11" r="3" fill="white" />
                        </svg>
                    </div>
                    <span className="text-sm font-black text-gray-900 tracking-tight">Vishnu Pass</span>
                </div>
                {onLogout && (
                    <button
                        type="button"
                        onClick={onLogout}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 text-gray-600 hover:text-gray-900 rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer"
                    >
                        <LogOut className="w-3.5 h-3.5" />
                        Log Out
                    </button>
                )}
            </div>

            {/* Main Form Container */}
            <div className="w-full max-w-md bg-white rounded-[32px] border border-gray-100 shadow-[0_15px_40px_rgba(0,0,0,0.04)] p-6 sm:p-8 overflow-hidden relative mx-auto my-auto animate-in fade-in zoom-in-95 duration-300">
                {/* Visual Glow */}
                <div className="absolute top-0 right-0 w-36 h-36 bg-orange-100/60 rounded-full blur-3xl -translate-y-16 translate-x-16 pointer-events-none" />

                <div className="relative z-10 text-center mb-6">
                    <div className="w-14 h-14 bg-orange-50 text-[#f47c20] rounded-2xl flex items-center justify-center mx-auto mb-3 border-2 border-white shadow-sm">
                        <UserCheck className="w-7 h-7" />
                    </div>
                    <span className="inline-block px-3 py-1 bg-orange-50 text-[#f47c20] text-[11px] font-black rounded-full uppercase tracking-wider mb-2">
                        First-Time Setup
                    </span>
                    <h1 className="text-2xl font-black text-gray-900 leading-tight mb-1.5">Activate Your Pass</h1>
                    <p className="text-xs text-gray-500 font-medium leading-relaxed">
                        Welcome, <span className="font-bold text-gray-800">{studentData?.full_name || studentData?.name || 'Student'}</span> ({studentData?.student_id || 'ID'}). Please set your new password and upload your photo.
                    </p>
                </div>

                {error && (
                    <div className="flex items-start gap-2.5 p-3.5 bg-red-50 border border-red-100 rounded-2xl mb-6 animate-in slide-in-from-top-2">
                        <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                        <p className="text-xs font-bold text-red-600 leading-tight">{error}</p>
                    </div>
                )}

                <form onSubmit={handleActivationSubmit} className="space-y-6">
                    {/* Section 1: Photo Upload */}
                    <div className="bg-gray-50/70 rounded-2xl p-4 border border-gray-100">
                        <div className="flex items-center justify-between mb-3">
                            <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                                <Camera className="w-3.5 h-3.5 text-[#f47c20]" />
                                Profile Photograph
                            </label>
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Required for ID</span>
                        </div>

                        <div className="flex items-center gap-4">
                            <div
                                onClick={() => !isSubmitting && fileInputRef.current?.click()}
                                className={`w-20 h-20 rounded-2xl border-2 border-dashed relative overflow-hidden flex flex-col items-center justify-center transition-all group flex-shrink-0 ${
                                    isSubmitting
                                        ? 'border-gray-200 bg-gray-50'
                                        : 'border-orange-200 bg-white hover:border-[#f47c20] hover:bg-orange-50/30 cursor-pointer shadow-sm'
                                }`}
                            >
                                {photoPreview ? (
                                    <>
                                        <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                                        {!isSubmitting && (
                                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Camera className="w-6 h-6 text-white" />
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <>
                                        <Upload className="w-6 h-6 text-[#f47c20] group-hover:scale-110 transition-transform mb-1" />
                                        <span className="text-[9px] font-bold text-gray-400 group-hover:text-[#f47c20]">Upload</span>
                                    </>
                                )}
                            </div>

                            <div className="flex-1">
                                <p className="text-xs font-semibold text-gray-700 mb-1">
                                    {photoPreview ? 'Photo selected' : 'Upload recent portrait'}
                                </p>
                                <p className="text-[10px] text-gray-400 leading-relaxed mb-2">
                                    Clear face photo, max 5MB (JPG, PNG, WebP).
                                </p>
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={isSubmitting}
                                    className="px-3 py-1 bg-white border border-gray-200 hover:border-[#f47c20] hover:text-[#f47c20] text-gray-700 rounded-lg text-[11px] font-bold transition-all shadow-sm cursor-pointer"
                                >
                                    {photoPreview ? 'Change Photo' : 'Select Photo'}
                                </button>
                            </div>
                        </div>

                        <input
                            type="file"
                            accept="image/*"
                            ref={fileInputRef}
                            onChange={handlePhotoChange}
                            className="hidden"
                            disabled={isSubmitting}
                        />
                    </div>

                    {/* Section 2: Set New Password */}
                    <div className="bg-gray-50/70 rounded-2xl p-4 border border-gray-100 space-y-3.5">
                        <div className="flex items-center justify-between">
                            <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                                <Lock className="w-3.5 h-3.5 text-[#f47c20]" />
                                Set New Password
                            </label>
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Min 6 chars</span>
                        </div>

                        <div>
                            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                                New Password
                            </label>
                            <div className="relative">
                                <input
                                    type={showNewPassword ? 'text' : 'password'}
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    placeholder="Enter new password"
                                    className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-medium text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#f47c20]/20 focus:border-[#f47c20] pr-10"
                                    required
                                    minLength={6}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowNewPassword(!showNewPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                                >
                                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>

                        <div>
                            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                                Confirm New Password
                            </label>
                            <div className="relative">
                                <input
                                    type={showConfirmPassword ? 'text' : 'password'}
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="Confirm new password"
                                    className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-medium text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#f47c20]/20 focus:border-[#f47c20] pr-10"
                                    required
                                    minLength={6}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                                >
                                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full flex justify-center items-center gap-2 py-3.5 px-6 rounded-2xl bg-[#f47c20] hover:bg-[#e06d1c] disabled:bg-gray-200 disabled:text-gray-400 text-white font-black text-sm transition-all shadow-lg shadow-orange-500/20 active:scale-[0.98] cursor-pointer"
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Setting Up Portal Access...
                            </>
                        ) : (
                            <>
                                <ShieldCheck className="w-4 h-4" />
                                Save & Activate My Portal
                            </>
                        )}
                    </button>

                    <p className="text-[10px] font-medium text-center text-gray-400 leading-relaxed">
                        Your password and profile photo will be secured and saved to your official Vishnu digital student profile.
                    </p>
                </form>
            </div>
        </div>
    );
};

export default ActivationScreen;

