import React, { useState, useRef } from 'react';
import { Camera, Loader2, Upload, AlertCircle, CheckCircle2, UserCheck, Lock, Eye, EyeOff, ShieldCheck, LogOut, ArrowRight, ArrowLeft, KeyRound, Sparkles } from 'lucide-react';
import { supabase, uploadFile } from '../../config/supabase';
import { logAuditAction } from '../../utils/auditLogger';

const ActivationScreen = ({ studentData, onComplete, onStatusChange, onLogout }) => {
    // Current step: 1 = Change Password, 2 = Upload Profile Image
    const [currentStep, setCurrentStep] = useState(1);

    // Step 1: Password State
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [passwordSaved, setPasswordSaved] = useState(false);

    // Step 2: Photo State
    const [photoFile, setPhotoFile] = useState(null);
    const [photoPreview, setPhotoPreview] = useState(studentData?.photo_url || null);
    const fileInputRef = useRef(null);

    // Common State
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const [successMsg, setSuccessMsg] = useState(null);

    // Handle photo selection
    const handlePhotoChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
            if (!allowedTypes.includes(file.type)) {
                setError('Invalid file type. Only JPG, PNG, and WebP images are allowed.');
                return;
            }
            if (file.size > 5 * 1024 * 1024) {
                setError('File is too large. Maximum allowed size is 5MB.');
                return;
            }
            setPhotoFile(file);
            setPhotoPreview(URL.createObjectURL(file));
            setError(null);
        }
    };

    // Step 1 Submit: Validate & update password in Supabase Auth, then navigate to Step 2
    const handlePasswordSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setSuccessMsg(null);

        if (!newPassword || newPassword.length < 6) {
            setError('Please choose a new password of at least 6 characters.');
            return;
        }

        if (newPassword !== confirmPassword) {
            setError('New password and confirm password do not match.');
            return;
        }

        setIsSubmitting(true);

        try {
            // Update password in Supabase Auth
            const { error: authErr } = await supabase.auth.updateUser({
                password: newPassword,
                data: {
                    full_name: studentData?.full_name || studentData?.name,
                    role: 'student',
                    student_id: studentData?.student_id
                }
            });

            if (authErr) throw authErr;

            setPasswordSaved(true);
            setSuccessMsg('Password updated successfully! Now, please upload your profile photo.');
            
            // Navigate to Step 2 after a brief delay for smooth UX
            setTimeout(() => {
                setSuccessMsg(null);
                setCurrentStep(2);
            }, 600);
        } catch (err) {
            console.error('Password change error:', err);
            setError(err.message || 'Failed to update password. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Step 2 Submit: Upload photo and mark onboarding complete in database
    const handlePhotoSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setSuccessMsg(null);

        if (!photoFile && !photoPreview) {
            setError('Please select and upload a clear portrait photo for your ID pass.');
            return;
        }

        setIsSubmitting(true);

        try {
            let publicUrl = photoPreview;

            // Upload photo file to Supabase storage if a new file was chosen
            if (photoFile) {
                const fileExt = photoFile.name.split('.').pop();
                const fileName = `student_${studentData?.id || studentData?.student_id || Date.now()}_${Date.now()}.${fileExt}`;
                publicUrl = await uploadFile('students', fileName, photoFile);
            }

            // Update Auth User Metadata to mark first login completed
            await supabase.auth.updateUser({
                data: {
                    first_login_completed: true,
                    full_name: studentData?.full_name || studentData?.name,
                    role: 'student',
                    student_id: studentData?.student_id
                }
            });

            // Update students table with photo_url and first_login_completed = true
            const updatePayload = {
                first_login_completed: true,
                status: 'Active'
            };
            if (publicUrl) {
                updatePayload.photo_url = publicUrl;
            }

            let studentUpdateQuery = supabase.from('students').update(updatePayload);
            if (studentData?.id) {
                studentUpdateQuery = studentUpdateQuery.eq('id', studentData.id);
            } else if (studentData?.student_id) {
                studentUpdateQuery = studentUpdateQuery.eq('student_id', studentData.student_id);
            } else if (studentData?.email) {
                studentUpdateQuery = studentUpdateQuery.eq('email', studentData.email);
            }

            const { error: updateErr } = await studentUpdateQuery;
            if (updateErr) throw updateErr;

            // Log audit action
            await logAuditAction({
                action: 'Completed Student Onboarding',
                resource: studentData?.student_id || studentData?.id,
                details: { fullName: studentData?.full_name, email: studentData?.email }
            });

            // Notify parent to complete onboarding and refresh dashboard
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
            console.error('Photo upload & activation error:', err);
            setError(err.message || 'Failed to complete profile activation. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="flex-1 bg-[#f8f9fb] flex flex-col p-4 sm:p-6 h-full font-sans overflow-y-auto">
            {/* Top Bar: Brand & Logout */}
            <div className="flex justify-between items-center w-full mb-4 max-w-md mx-auto">
                <div className="flex items-center gap-2">
                    <div className="bg-[#fef3c7] w-8 h-8 rounded-lg flex items-center justify-center border border-orange-100 overflow-hidden shadow-xs">
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
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 text-gray-600 hover:text-gray-900 rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer hover:bg-gray-50"
                    >
                        <LogOut className="w-3.5 h-3.5" />
                        Log Out
                    </button>
                )}
            </div>

            {/* Stepper Progress Bar */}
            <div className="w-full max-w-md mx-auto mb-4 bg-white p-3 rounded-2xl border border-gray-100 shadow-xs">
                <div className="flex items-center justify-between relative">
                    {/* Connecting line */}
                    <div className="absolute left-6 right-6 top-1/2 -translate-y-1/2 h-0.5 bg-gray-100 -z-0">
                        <div 
                            className="h-full bg-[#f47c20] transition-all duration-300"
                            style={{ width: currentStep === 2 || passwordSaved ? '100%' : '0%' }}
                        />
                    </div>

                    {/* Step 1 Indicator */}
                    <div 
                        onClick={() => currentStep === 2 && setCurrentStep(1)}
                        className={`flex items-center gap-2 z-10 bg-white px-2 cursor-pointer select-none transition-all ${
                            currentStep === 1 ? 'scale-105' : 'opacity-80'
                        }`}
                    >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs transition-all ${
                            passwordSaved || currentStep > 1
                                ? 'bg-emerald-500 text-white shadow-xs'
                                : currentStep === 1
                                    ? 'bg-[#f47c20] text-white ring-4 ring-orange-100 shadow-sm'
                                    : 'bg-gray-100 text-gray-400'
                        }`}>
                            {passwordSaved || currentStep > 1 ? <CheckCircle2 className="w-4 h-4" /> : '1'}
                        </div>
                        <div className="hidden xs:block text-left">
                            <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">Step 1</p>
                            <p className={`text-xs font-bold leading-tight ${currentStep === 1 ? 'text-gray-900' : 'text-gray-500'}`}>
                                Password
                            </p>
                        </div>
                    </div>

                    {/* Step 2 Indicator */}
                    <div className={`flex items-center gap-2 z-10 bg-white px-2 select-none transition-all ${
                        currentStep === 2 ? 'scale-105' : 'opacity-80'
                    }`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs transition-all ${
                            currentStep === 2
                                ? 'bg-[#f47c20] text-white ring-4 ring-orange-100 shadow-sm'
                                : 'bg-gray-100 text-gray-400'
                        }`}>
                            2
                        </div>
                        <div className="hidden xs:block text-left">
                            <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">Step 2</p>
                            <p className={`text-xs font-bold leading-tight ${currentStep === 2 ? 'text-gray-900' : 'text-gray-400'}`}>
                                Profile Image
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content Card */}
            <div className="w-full max-w-md bg-white rounded-[32px] border border-gray-100 shadow-[0_15px_40px_rgba(0,0,0,0.04)] p-6 sm:p-8 overflow-hidden relative mx-auto my-auto animate-in fade-in zoom-in-95 duration-300">
                {/* Visual Glow */}
                <div className="absolute top-0 right-0 w-36 h-36 bg-orange-100/60 rounded-full blur-3xl -translate-y-16 translate-x-16 pointer-events-none" />

                {/* Error Banner */}
                {error && (
                    <div className="flex items-start gap-2.5 p-3.5 bg-red-50 border border-red-100 rounded-2xl mb-5 animate-in slide-in-from-top-2">
                        <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                        <p className="text-xs font-bold text-red-600 leading-tight">{error}</p>
                    </div>
                )}

                {/* Success Banner */}
                {successMsg && (
                    <div className="flex items-start gap-2.5 p-3.5 bg-emerald-50 border border-emerald-100 rounded-2xl mb-5 animate-in slide-in-from-top-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                        <p className="text-xs font-bold text-emerald-700 leading-tight">{successMsg}</p>
                    </div>
                )}

                {/* ========================================================= */}
                {/* STEP 1: CHANGE PASSWORD SCREEN                             */}
                {/* ========================================================= */}
                {currentStep === 1 && (
                    <div className="animate-in fade-in slide-in-from-left-3 duration-200">
                        <div className="relative z-10 text-center mb-6">
                            <div className="w-14 h-14 bg-orange-50 text-[#f47c20] rounded-2xl flex items-center justify-center mx-auto mb-3 border-2 border-white shadow-xs">
                                <KeyRound className="w-7 h-7" />
                            </div>
                            <span className="inline-block px-3 py-1 bg-orange-50 text-[#f47c20] text-[11px] font-black rounded-full uppercase tracking-wider mb-2">
                                Step 1 of 2: Security Setup
                            </span>
                            <h1 className="text-2xl font-black text-gray-900 leading-tight mb-1.5">Change Your Password</h1>
                            <p className="text-xs text-gray-500 font-medium leading-relaxed">
                                Welcome, <span className="font-bold text-gray-800">{studentData?.full_name || studentData?.name || 'Student'}</span> ({studentData?.student_id || 'ID'}). Please create a secure password to replace your temporary login credentials.
                            </p>
                        </div>

                        <form onSubmit={handlePasswordSubmit} className="space-y-4">
                            <div className="bg-gray-50/70 rounded-2xl p-4 border border-gray-100 space-y-3.5">
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                                        <span>New Password</span>
                                        <span className="text-gray-400 normal-case font-medium">Min 6 characters</span>
                                    </label>
                                    <div className="relative">
                                        <input
                                            type={showNewPassword ? 'text' : 'password'}
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            placeholder="Enter your new password"
                                            className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-medium text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#f47c20]/20 focus:border-[#f47c20] pr-10 shadow-2xs"
                                            required
                                            minLength={6}
                                            disabled={isSubmitting}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowNewPassword(!showNewPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer p-1"
                                            tabIndex={-1}
                                        >
                                            {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                                        Confirm New Password
                                    </label>
                                    <div className="relative">
                                        <input
                                            type={showConfirmPassword ? 'text' : 'password'}
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            placeholder="Re-enter your new password"
                                            className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-medium text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#f47c20]/20 focus:border-[#f47c20] pr-10 shadow-2xs"
                                            required
                                            minLength={6}
                                            disabled={isSubmitting}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer p-1"
                                            tabIndex={-1}
                                        >
                                            {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isSubmitting || !newPassword || !confirmPassword}
                                className="w-full flex justify-center items-center gap-2 py-3.5 px-6 rounded-2xl bg-[#f47c20] hover:bg-[#e06d1c] disabled:bg-gray-200 disabled:text-gray-400 text-white font-black text-sm transition-all shadow-lg shadow-orange-500/20 active:scale-[0.98] cursor-pointer"
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Updating Password...
                                    </>
                                ) : (
                                    <>
                                        Save Password & Continue
                                        <ArrowRight className="w-4 h-4" />
                                    </>
                                )}
                            </button>

                            <p className="text-[10px] font-medium text-center text-gray-400 leading-relaxed">
                                Once your password is saved, you will proceed to step 2 to upload your ID photo.
                            </p>
                        </form>
                    </div>
                )}

                {/* ========================================================= */}
                {/* STEP 2: UPLOAD PROFILE IMAGE SCREEN                        */}
                {/* ========================================================= */}
                {currentStep === 2 && (
                    <div className="animate-in fade-in slide-in-from-right-3 duration-200">
                        <div className="relative z-10 text-center mb-6">
                            <div className="w-14 h-14 bg-orange-50 text-[#f47c20] rounded-2xl flex items-center justify-center mx-auto mb-3 border-2 border-white shadow-xs">
                                <Camera className="w-7 h-7" />
                            </div>
                            <span className="inline-block px-3 py-1 bg-emerald-50 text-emerald-700 text-[11px] font-black rounded-full uppercase tracking-wider mb-2 flex items-center gap-1 w-fit mx-auto">
                                <CheckCircle2 className="w-3 h-3" /> Password Changed &bull; Step 2 of 2
                            </span>
                            <h1 className="text-2xl font-black text-gray-900 leading-tight mb-1.5">Upload Profile Photo</h1>
                            <p className="text-xs text-gray-500 font-medium leading-relaxed">
                                Please upload a clear portrait photograph. This photo will be printed on your digital Vishnu ID card and verified by campus gate guards.
                            </p>
                        </div>

                        <form onSubmit={handlePhotoSubmit} className="space-y-5">
                            {/* Photo Upload Area */}
                            <div className="bg-gray-50/70 rounded-2xl p-5 border border-gray-100 flex flex-col items-center text-center">
                                <div
                                    onClick={() => !isSubmitting && fileInputRef.current?.click()}
                                    className={`w-28 h-28 rounded-3xl border-2 border-dashed relative overflow-hidden flex flex-col items-center justify-center transition-all group mb-3.5 ${
                                        isSubmitting
                                            ? 'border-gray-200 bg-gray-100 cursor-not-allowed'
                                            : 'border-orange-300 bg-white hover:border-[#f47c20] hover:bg-orange-50/40 cursor-pointer shadow-sm'
                                    }`}
                                >
                                    {photoPreview ? (
                                        <>
                                            <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                                            {!isSubmitting && (
                                                <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white">
                                                    <Camera className="w-6 h-6 mb-1" />
                                                    <span className="text-[10px] font-bold">Change Photo</span>
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        <>
                                            <Upload className="w-8 h-8 text-[#f47c20] group-hover:scale-110 transition-transform mb-1.5" />
                                            <span className="text-[11px] font-black text-gray-500 group-hover:text-[#f47c20]">
                                                Upload Photo
                                            </span>
                                        </>
                                    )}
                                </div>

                                <p className="text-xs font-bold text-gray-800 mb-1">
                                    {photoPreview ? 'Photo selected successfully' : 'Tap to select or take portrait photo'}
                                </p>
                                <p className="text-[10px] text-gray-400 max-w-[240px] leading-relaxed mb-3">
                                    Front-facing face photo, max 5MB (JPG, PNG, WebP).
                                </p>

                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={isSubmitting}
                                    className="px-4 py-2 bg-white border border-gray-200 hover:border-[#f47c20] hover:text-[#f47c20] text-gray-700 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer active:scale-95"
                                >
                                    {photoPreview ? 'Choose Different Photo' : 'Browse Files'}
                                </button>

                                <input
                                    type="file"
                                    accept="image/*"
                                    ref={fileInputRef}
                                    onChange={handlePhotoChange}
                                    className="hidden"
                                    disabled={isSubmitting}
                                />
                            </div>

                            {/* Buttons */}
                            <div className="space-y-2.5">
                                <button
                                    type="submit"
                                    disabled={isSubmitting || (!photoFile && !photoPreview)}
                                    className="w-full flex justify-center items-center gap-2 py-3.5 px-6 rounded-2xl bg-[#f47c20] hover:bg-[#e06d1c] disabled:bg-gray-200 disabled:text-gray-400 text-white font-black text-sm transition-all shadow-lg shadow-orange-500/20 active:scale-[0.98] cursor-pointer"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Completing Activation...
                                        </>
                                    ) : (
                                        <>
                                            <ShieldCheck className="w-4 h-4" />
                                            Complete Activation & Enter Portal
                                        </>
                                    )}
                                </button>

                                <button
                                    type="button"
                                    onClick={() => {
                                        setError(null);
                                        setCurrentStep(1);
                                    }}
                                    disabled={isSubmitting}
                                    className="w-full flex justify-center items-center gap-1.5 py-2 px-4 text-xs font-bold text-gray-500 hover:text-gray-800 transition-colors cursor-pointer"
                                >
                                    <ArrowLeft className="w-3.5 h-3.5" />
                                    Back to Change Password
                                </button>
                            </div>

                            <p className="text-[10px] font-medium text-center text-gray-400 leading-relaxed">
                                Your pass will be instantly activated upon photo submission.
                            </p>
                        </form>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ActivationScreen;

