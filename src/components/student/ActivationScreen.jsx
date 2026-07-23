import React, { useState, useRef } from 'react';
import { Camera, Loader2, Upload, AlertCircle, CheckCircle2, UserCheck, Clock, LogOut } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../config/firebase';
import { logAuditAction } from '../../utils/auditLogger';

const ActivationScreen = ({ studentData, onStatusChange, onLogout }) => {
    const [photoFile, setPhotoFile] = useState(null);
    const [photoPreview, setPhotoPreview] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const fileInputRef = useRef(null);

    const isUnderReview = studentData?.status === 'Under Review';

    const handlePhotoChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setPhotoFile(file);
            setPhotoPreview(URL.createObjectURL(file));
            setError(null);
        }
    };

    const handleActivationRequest = async (e) => {
        e.preventDefault();
        
        if (!photoFile) {
            setError("Please upload a clear profile photo to proceed.");
            return;
        }

        setError(null);
        setIsSubmitting(true);

        try {
            const fileExt = photoFile.name.split('.').pop();
            const fileName = `student_activation_${Date.now()}.${fileExt}`;
            
            // Upload to Firebase Storage
            const storageRef = ref(storage, `colleges/${studentData.collegeId}/students/${studentData.id}/profile.jpg`);
            await uploadBytes(storageRef, photoFile);
            
            // Get public URL
            const publicUrl = await getDownloadURL(storageRef);

            // Update Firestore
            const studentRef = doc(db, `colleges/${studentData.collegeId}/students`, studentData.id);
            await updateDoc(studentRef, {
                photo_url: publicUrl,
                status: 'Active'
            });

            // Log event for audit trail
            await logAuditAction({
                action: 'Profile Activated',
                resource: studentData.student_id,
                details: { fullName: studentData.full_name }
            });

            if (onStatusChange) {
                // Manually trigger a UI refresh to 'Active' state
                onStatusChange('Active');
            }
        } catch (err) {
            setError(err.message || 'Failed to submit activation request. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="flex-1 bg-[#f8f9fb] flex flex-col p-6 h-full font-sans overflow-y-auto">
            {/* Header / Logout */}
            <div className="flex justify-between items-center w-full mb-8">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8">
                        <img src="/vishnu-logo.png" alt="Logo" className="w-full h-full object-contain" />
                    </div>
                </div>
                {onLogout && (
                    <button onClick={onLogout} className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 text-gray-600 rounded-lg text-xs font-bold shadow-sm">
                        <LogOut className="w-3 h-3" />
                        Log Out
                    </button>
                )}
            </div>

            <div className="w-full max-w-sm bg-white rounded-[32px] border border-gray-100 shadow-[0_15px_40px_rgba(0,0,0,0.04)] p-8 overflow-hidden relative mx-auto my-auto">
                
                {/* Visual Flair */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-orange-50 rounded-full blur-3xl -translate-y-16 translate-x-16" />

                <div className="relative z-10 text-center mb-8">
                    <div className="w-16 h-16 bg-orange-50 text-[#f47c20] rounded-2xl flex items-center justify-center mx-auto mb-4 border-2 border-white shadow-sm">
                        <UserCheck className="w-8 h-8" />
                    </div>
                    <h1 className="text-2xl font-black text-gray-900 leading-tight mb-2">Activate Profile</h1>
                    <p className="text-sm text-gray-500 font-medium leading-relaxed">
                        To activate your Vishnu Pass, you must upload a clear, recent profile photograph.
                    </p>
                </div>

                {error && (
                    <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-100 rounded-xl mb-6 animate-in slide-in-from-top-2">
                        <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                        <p className="text-xs font-bold text-red-600">{error}</p>
                    </div>
                )}

                <form onSubmit={handleActivationRequest}>
                    {/* Photo Upload Area */}
                    <div className="mb-8">
                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1 mb-2">Profile Photo (Required)</label>
                        <div 
                            onClick={() => !isSubmitting && fileInputRef.current?.click()}
                            className={`w-full aspect-square max-w-[200px] mx-auto rounded-full border-4 border-dashed relative overflow-hidden flex flex-col items-center justify-center transition-all group ${
                                isSubmitting ? 'border-gray-200 bg-gray-50' : 'border-gray-200 bg-gray-50/50 hover:bg-orange-50/50 hover:border-[#f47c20] cursor-pointer'
                            }`}
                        >
                            {photoPreview ? (
                                <>
                                    <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                                    {!isSubmitting && (
                                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Camera className="w-8 h-8 text-white" />
                                        </div>
                                    )}
                                </>
                            ) : (
                                <>
                                    <Upload className="w-8 h-8 text-gray-300 group-hover:text-[#f47c20] transition-colors mb-2" />
                                    <span className="text-xs font-bold text-gray-400 group-hover:text-[#f47c20]">Tap to Upload</span>
                                </>
                            )}
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

                    <button
                        type="submit"
                        disabled={isSubmitting || !photoFile}
                        className="w-full flex justify-center items-center gap-2 py-3.5 px-6 rounded-xl bg-[#f47c20] hover:bg-[#e06d1c] disabled:bg-gray-200 disabled:text-gray-400 text-white font-bold text-sm transition-colors shadow-sm"
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Activating Profile...
                            </>
                        ) : (
                            'Upload Photo & Continue'
                        )}
                    </button>
                    <p className="text-[10px] font-semibold text-center text-gray-400 mt-4 leading-relaxed">
                        By submitting, you confirm that this is a photograph of yourself and follows university guidelines.
                    </p>
                </form>
            </div>
        </div>
    );
};

export default ActivationScreen;
