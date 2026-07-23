import React, { useState, useEffect, useRef } from 'react';
import { Camera, ChevronDown, Loader2 } from 'lucide-react';
import { db, storage } from '../../config/firebase';
import { collection, getDocs, doc, updateDoc, query, orderBy } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { createGuardAccount } from '../../lib/functions';
import { logAuditAction } from '../../utils/auditLogger';

const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

const RegisterGuard = ({ adminData, onCancel, initialData }) => {
    const isEditMode = !!initialData;

    const [formData, setFormData] = useState({
        fullName: initialData?.full_name || initialData?.fullName || '',
        employeeId: initialData?.employee_id || initialData?.employeeId || '',
        email: initialData?.email || '',
        password: '',
        confirmPassword: '',
        contactNumber: initialData?.contact_number || initialData?.contactNumber || '',
        assignedGate: initialData?.gate_id || initialData?.assignedGate || '',
        shiftType: initialData?.shift_id || initialData?.shiftType || '',
        emergencyName: initialData?.emergency_contact_name || initialData?.emergencyName || '',
        emergencyContact: initialData?.emergency_contact_number || initialData?.emergencyContact || ''
    });

    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [gates, setGates] = useState([]);
    const [shifts, setShifts] = useState([]);
    const [photoFile, setPhotoFile] = useState(null);
    const [photoPreview, setPhotoPreview] = useState(initialData?.photo_url || initialData?.photoUrl || null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const fileInputRef = useRef(null);

    // Fetch dynamic gates and shifts from Firestore
    useEffect(() => {
        if (!adminData?.collegeId) return;

        const fetchConfig = async () => {
            try {
                const gatesRef = collection(db, `colleges/${adminData.collegeId}/gates`);
                const qGates = query(gatesRef, orderBy('name'));
                const gateData = await getDocs(qGates);
                const gList = [];
                gateData.forEach(d => gList.push({ id: d.id, ...d.data() }));
                setGates(gList);

                const shiftsRef = collection(db, `colleges/${adminData.collegeId}/shifts`);
                const qShifts = query(shiftsRef, orderBy('name'));
                const shiftData = await getDocs(qShifts);
                const sList = [];
                shiftData.forEach(d => sList.push({ id: d.id, ...d.data() }));
                setShifts(sList);
            } catch (err) {
                console.error("Error fetching gates/shifts:", err);
            }
        };
        fetchConfig();
    }, [adminData]);

    const handlePhotoChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (!ALLOWED_FILE_TYPES.includes(file.type)) {
                setError('Invalid file type. Only JPG, PNG, and WebP are allowed.');
                return;
            }
            if (file.size > MAX_FILE_SIZE) {
                setError('File too large. Maximum size is 5MB.');
                return;
            }
            setPhotoFile(file);
            setPhotoPreview(URL.createObjectURL(file));
        }
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        if (!adminData?.collegeId) return;
        
        setError(null);
        setIsSubmitting(true);

        // Validation
        if (!isEditMode && formData.password !== formData.confirmPassword) {
            setError("Passwords do not match.");
            setIsSubmitting(false);
            return;
        }

        try {
            let photoUrl = initialData?.photo_url || initialData?.photoUrl || null;

            // 1. Upload Photo if selected
            if (photoFile) {
                const fileExt = photoFile.name.split('.').pop();
                const fileName = `guard_${Date.now()}.${fileExt}`;
                const storageRef = ref(storage, `colleges/${adminData.collegeId}/guards/${fileName}`);
                await uploadBytes(storageRef, photoFile);
                photoUrl = await getDownloadURL(storageRef);
            }

            const guardPayload = {
                fullName: formData.fullName.trim(),
                employeeId: formData.employeeId.trim(),
                email: formData.email.trim(),
                contactNumber: formData.contactNumber.trim(),
                assignedGate: formData.assignedGate || null,
                shiftType: formData.shiftType || null,
                emergencyName: formData.emergencyName.trim(),
                emergencyContact: formData.emergencyContact.trim(),
                photoUrl: photoUrl
            };

            // 2. Auth & Database Record
            if (isEditMode) {
                // Update Guard Record
                const guardRef = doc(db, `colleges/${adminData.collegeId}/guards`, initialData.id);
                await updateDoc(guardRef, guardPayload);
            } else {
                const result = await createGuardAccount({
                    email: formData.email.trim(),
                    password: formData.password,
                    guardData: guardPayload
                });

                if (result.data?.error) {
                    throw new Error(result.data.error);
                }
            }

            // 3. Log the action
            await logAuditAction({
                action: isEditMode ? 'Updated Guard' : 'Registered Guard',
                resource: formData.employeeId,
                details: {
                    name: formData.fullName,
                    gate: gates.find(g => g.id === formData.assignedGate)?.name || 'Unknown',
                    shift: shifts.find(s => s.id === formData.shiftType)?.name || 'Unknown'
                }
            });

            // Success, return to directory
            onCancel();
        } catch (err) {
            console.error(err);
            setError(err.message || 'Failed to register guard. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="flex-1 overflow-y-auto p-8 bg-gray-50/30">
            {/* Page Header */}
            <div className="mb-8">
                <h1 className="text-[26px] font-bold text-gray-900 mb-1">
                    {isEditMode ? 'Edit Guard Profile' : 'Register New Guard'}
                </h1>
            </div>

            {/* Main Content Card */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden max-w-4xl animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* Card Header */}
                <div className="p-8 border-b border-gray-50">
                    <h2 className="text-xl font-bold text-gray-900 mb-1">
                        {isEditMode ? 'Edit Details' : 'New Guard Registration'}
                    </h2>
                    <p className="text-sm text-gray-500 font-medium">
                        {isEditMode ? 'Update the details for this security personnel.' : 'Enter details to register a new security personnel for campus gate management.'}
                    </p>
                </div>

                <div className="p-8">
                    <form onSubmit={handleRegister}>

                        {/* Profile Photo Section */}
                        <div className="mb-8">
                            <label className="block text-sm font-bold text-gray-700 mb-4">Profile Photo</label>
                            <div className="flex items-center gap-6">
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    className="hidden"
                                    accept="image/*"
                                    onChange={handlePhotoChange}
                                />
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current.click()}
                                    className="w-[100px] h-[100px] rounded-2xl border-2 border-dashed border-[#cbd5e1] bg-[#f8fafc] flex flex-col items-center justify-center text-[#64748b] hover:bg-[#f1f5f9] hover:border-[#94a3b8] overflow-hidden transition-colors group relative cursor-pointer"
                                >
                                    {photoPreview ? (
                                        <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                                    ) : (
                                        <>
                                            <Camera className="w-6 h-6 mb-1 text-[#94a3b8] group-hover:text-[#64748b] transition-colors" />
                                            <span className="text-[9px] font-bold tracking-wider uppercase">
                                                {isEditMode ? 'Update Photo' : 'Upload'}
                                            </span>
                                        </>
                                    )}
                                </button>
                                <div>
                                    <h3 className="text-sm font-bold text-gray-900 mb-1">Click to upload or drag and drop</h3>
                                    <p className="text-xs text-gray-400 font-medium">SVG, PNG, JPG or GIF (max. 800×800px)</p>
                                </div>
                            </div>
                        </div>

                        {error && (
                            <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-xl text-sm font-medium border border-red-100 flex items-center gap-2">
                                <span className="bg-red-100 text-red-600 p-1 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold font-mono">!</span>
                                {error}
                            </div>
                        )}

                        {/* Basic Info Grid */}
                        <div className="grid grid-cols-2 gap-x-8 gap-y-6 mb-8">
                            {/* Full Name */}
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Full Name</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Johnathan Doe"
                                    value={formData.fullName}
                                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                                    className="w-full px-4 py-2.5 bg-gray-50/50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#f47c20]/20 focus:border-[#f47c20] text-sm font-medium transition-colors"
                                    required
                                />
                            </div>

                            {/* Employee ID */}
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Employee ID</label>
                                <input
                                    type="text"
                                    placeholder="VP-GUARD-2024-XXX"
                                    value={formData.employeeId}
                                    onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                                    className="w-full px-4 py-2.5 bg-gray-50/50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#f47c20]/20 focus:border-[#f47c20] text-sm font-medium transition-colors"
                                    required
                                />
                            </div>

                            {/* Email Address */}
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Email Address</label>
                                <input
                                    type="email"
                                    placeholder="guard@university.edu"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    className="w-full px-4 py-2.5 bg-gray-50/50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#f47c20]/20 focus:border-[#f47c20] text-sm font-medium transition-colors"
                                    required
                                />
                            </div>

                            {!isEditMode && (
                                <>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-2">Set Password</label>
                                        <input
                                            type="password"
                                            placeholder="••••••••"
                                            value={formData.password}
                                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                            className="w-full px-4 py-2.5 bg-gray-50/50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#f47c20]/20 focus:border-[#f47c20] text-sm font-medium transition-colors"
                                            required
                                            minLength={6}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-2">Confirm Password</label>
                                        <input
                                            type="password"
                                            placeholder="••••••••"
                                            value={formData.confirmPassword}
                                            onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                                            className="w-full px-4 py-2.5 bg-gray-50/50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#f47c20]/20 focus:border-[#f47c20] text-sm font-medium transition-colors"
                                            required
                                            minLength={6}
                                        />
                                    </div>
                                </>
                            )}

                            {/* Contact Number */}
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Contact Number</label>
                                <input
                                    type="tel"
                                    placeholder="+91 00000 00000"
                                    value={formData.contactNumber}
                                    onChange={(e) => setFormData({ ...formData, contactNumber: e.target.value })}
                                    className="w-full px-4 py-2.5 bg-gray-50/50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#f47c20]/20 focus:border-[#f47c20] text-sm font-medium transition-colors"
                                    required
                                />
                            </div>

                            {/* Assigned Gate (Custom Select) */}
                            <div className="relative z-20">
                                <label className="block text-sm font-bold text-gray-700 mb-2">Assigned Gate</label>
                                <div className="relative">
                                    {isDropdownOpen && (
                                        <div
                                            className="fixed inset-0 z-10"
                                            onClick={() => setIsDropdownOpen(false)}
                                        />
                                    )}
                                    <div
                                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                        className={`w-full px-4 py-2.5 bg-gray-50/50 border rounded-lg flex items-center justify-between cursor-pointer transition-colors relative z-20 ${isDropdownOpen
                                            ? 'border-[#f47c20] ring-2 ring-[#f47c20]/20 bg-white'
                                            : 'border-gray-200 hover:border-gray-300'
                                            }`}
                                    >
                                        <span className={`text-sm font-medium ${formData.assignedGate ? 'text-gray-900' : 'text-gray-500'}`}>
                                            {formData.assignedGate ? gates.find(g => g.id === formData.assignedGate)?.name : 'Select a gate location'}
                                        </span>
                                        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
                                    </div>

                                    {isDropdownOpen && (
                                        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-100 rounded-xl shadow-lg overflow-hidden z-30 animate-in fade-in slide-in-from-top-2 duration-150">
                                            <div className="py-1 max-h-48 overflow-y-auto">
                                                {gates.length === 0 ? (
                                                    <div className="px-4 py-3 text-sm text-gray-500 text-center">No gates configured yet. Add them in Settings.</div>
                                                ) : gates.map(gate => (
                                                    <button
                                                        key={gate.id}
                                                        type="button"
                                                        onClick={() => {
                                                            setFormData({ ...formData, assignedGate: gate.id });
                                                            setIsDropdownOpen(false);
                                                        }}
                                                        className="w-full text-left px-4 py-2.5 text-sm font-medium hover:bg-gray-50 transition-colors flex items-center justify-between group cursor-pointer"
                                                    >
                                                        <span className={`${formData.assignedGate === gate.id ? 'text-[#f47c20] font-bold' : 'text-gray-700 group-hover:text-gray-900'}`}>
                                                            {gate.name}
                                                        </span>
                                                        {formData.assignedGate === gate.id && (
                                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#f47c20]">
                                                                <path d="M20 6 9 17l-5-5" />
                                                            </svg>
                                                        )}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Shift Type Section */}
                        <div className="mb-10">
                            <label className="block text-sm font-bold text-gray-700 mb-3">Shift Type</label>
                            {shifts.length === 0 ? (
                                <div className="p-4 border border-dashed border-gray-300 rounded-xl text-sm font-medium text-gray-500 text-center">
                                    No shifts configured. Add them in Settings.
                                </div>
                            ) : (
                                <div className="grid grid-cols-3 gap-4">
                                    {shifts.map((shift) => (
                                        <label key={shift.id} className={`flex items-center p-4 border rounded-xl cursor-pointer transition-all ${formData.shiftType === shift.id
                                            ? 'border-[#f47c20] bg-[#fffaf5] shadow-[0_0_0_1px_#f47c20_inset]'
                                            : 'border-gray-100 hover:border-gray-200 bg-white'
                                            }`}>
                                            <div className={`w-5 h-5 rounded-full border flex items-center justify-center mr-4 flex-shrink-0 transition-colors ${formData.shiftType === shift.id ? 'border-[#f47c20]' : 'border-gray-300'
                                                }`}>
                                                {formData.shiftType === shift.id && <div className="w-2.5 h-2.5 rounded-full bg-[#f47c20]" />}
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-gray-900 mb-0.5">{shift.name}</p>
                                                <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">{shift.time}</p>
                                            </div>
                                            <input
                                                type="radio"
                                                name="shiftType"
                                                value={shift.id}
                                                className="hidden"
                                                checked={formData.shiftType === shift.id}
                                                onChange={() => setFormData({ ...formData, shiftType: shift.id })}
                                                required
                                            />
                                        </label>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Emergency Contact Information Section */}
                        <div className="pt-6 border-t border-gray-50 pb-8 relative z-10">
                            <h3 className="text-xs font-bold text-[#8fa1b4] uppercase tracking-widest mb-6">Emergency Contact Information</h3>
                            <div className="grid grid-cols-2 gap-x-8 gap-y-6">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Contact Name</label>
                                    <input
                                        type="text"
                                        placeholder="Primary contact person"
                                        value={formData.emergencyName}
                                        onChange={(e) => setFormData({ ...formData, emergencyName: e.target.value })}
                                        className="w-full px-4 py-2.5 bg-gray-50/50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#f47c20]/20 focus:border-[#f47c20] text-sm font-medium transition-colors"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Contact Number</label>
                                    <input
                                        type="tel"
                                        placeholder="+91 00000 00000"
                                        value={formData.emergencyContact}
                                        onChange={(e) => setFormData({ ...formData, emergencyContact: e.target.value })}
                                        className="w-full px-4 py-2.5 bg-gray-50/50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#f47c20]/20 focus:border-[#f47c20] text-sm font-medium transition-colors"
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Footer Actions */}
                        <div className="pt-6 border-t border-gray-50 flex justify-end items-center gap-4 sticky bottom-0 bg-white z-0">
                            <button
                                type="button"
                                onClick={onCancel}
                                className="px-5 py-2.5 text-sm font-bold text-gray-600 hover:text-gray-900 transition-colors cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className={`px-6 py-2.5 bg-[#f47c20] hover:bg-[#e06d1c] text-white rounded-lg text-sm font-bold transition-colors shadow-sm flex items-center gap-2 ${isSubmitting ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'}`}
                            >
                                {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                                {isEditMode
                                    ? (isSubmitting ? 'Saving...' : 'Save Changes')
                                    : (isSubmitting ? 'Registering...' : 'Register Guard')
                                }
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default RegisterGuard;
