import React, { useState, useRef, useEffect } from 'react';
import { User, GraduationCap, Camera, ChevronDown, Loader2, X } from 'lucide-react';
import { db, storage } from '../../config/firebase';
import { collection, getDocs, doc, updateDoc, query, orderBy } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { logAuditAction } from '../../utils/auditLogger';

// Custom Dropdown Component (reused)
const CustomSelect = ({ label, value, options, placeholder = 'Select', onChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const selectRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (selectRef.current && !selectRef.current.contains(e.target)) setIsOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const selected = options.find((o) => o.value === value);

    return (
        <div>
            {label && <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">{label}</label>}
            <div className="relative" ref={selectRef}>
                <button
                    type="button"
                    onClick={() => setIsOpen(!isOpen)}
                    className={`w-full flex items-center justify-between px-4 py-2.5 bg-white border rounded-xl text-sm font-medium transition-colors cursor-pointer ${isOpen ? 'border-[#f47c20] ring-2 ring-[#f47c20]/20' : 'border-gray-200 hover:border-gray-300'} ${selected ? 'text-gray-700' : 'text-gray-400'}`}
                >
                    <span>{selected ? selected.label : placeholder}</span>
                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </button>

                {isOpen && (
                    <div className="absolute z-50 top-full left-0 right-0 mt-1.5 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden animate-in fade-in slide-in-from-top-1">
                        <div className="py-1 max-h-52 overflow-y-auto">
                            {options.map((option) => (
                                <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => {
                                        onChange(option.value);
                                        setIsOpen(false);
                                    }}
                                    className={`w-full text-left px-4 py-2.5 text-sm font-medium transition-colors ${value === option.value ? 'bg-[#f47c20] text-white' : 'text-gray-700 hover:bg-orange-50 hover:text-[#f47c20]'}`}
                                >
                                    {option.label}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

const yearOptions = [
    { value: '1', label: '1st Year' },
    { value: '2', label: '2nd Year' },
    { value: '3', label: '3rd Year' },
    { value: '4', label: '4th Year' },
];

const statusOptions = [
    { value: 'Active', label: 'Active' },
    { value: 'Pending', label: 'Pending' },
    { value: 'Under Review', label: 'Under Review' },
    { value: 'On Leave', label: 'On Leave' },
    { value: 'Graduated', label: 'Graduated' },
    { value: 'Inactive', label: 'Inactive' },
];

const EditStudentModal = ({ adminData, student, onClose, onUpdate }) => {
    const [formData, setFormData] = useState({
        fullName: student.full_name || '',
        studentId: student.student_id || '',
        gender: student.gender || '',
        email: student.email || '',
        department: student.department_id || '',
        yearOfStudy: student.year_of_study || '',
        hostel: student.hostel_type || '',
        batch: student.batch || '2024',
        contactNumber: student.contact_number || '',
        status: student.status || 'Active',
    });

    const [departments, setDepartments] = useState([]);
    const [batches, setBatches] = useState([]);
    const [photoFile, setPhotoFile] = useState(null);
    const [photoPreview, setPhotoPreview] = useState(student.photo_url || student.photoUrl || null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const fileInputRef = useRef(null);

    useEffect(() => {
        if (!adminData?.collegeId) return;

        const loadData = async () => {
            try {
                const deptQuery = query(collection(db, `colleges/${adminData.collegeId}/departments`), orderBy('name'));
                const deptSnap = await getDocs(deptQuery);
                const depts = [];
                deptSnap.forEach(d => depts.push({ value: d.id, label: d.data().name }));
                setDepartments(depts);

                const batchQuery = query(collection(db, `colleges/${adminData.collegeId}/batches`), orderBy('name'));
                const batchSnap = await getDocs(batchQuery);
                const bs = [];
                batchSnap.forEach(b => bs.push({ value: b.id, label: b.data().name })); // we need to use label/name as value based on how batch is stored
                setBatches(bs.map(b => ({ value: b.label, label: b.label }))); 
            } catch (err) {
                console.error("Error loading options:", err);
            }
        };

        loadData();
    }, [adminData]);

    const handleChange = (field, value) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
    };

    const handlePhotoChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setPhotoFile(file);
            setPhotoPreview(URL.createObjectURL(file));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!adminData?.collegeId) return;

        setError(null);
        setIsSubmitting(true);

        try {
            let photoUrl = student.photo_url || student.photoUrl;

            if (photoFile) {
                const fileExt = photoFile.name.split('.').pop();
                const fileName = `student_${Date.now()}.${fileExt}`;
                const storageRef = ref(storage, `colleges/${adminData.collegeId}/students/${fileName}`);
                await uploadBytes(storageRef, photoFile);
                photoUrl = await getDownloadURL(storageRef);
            }

            const studentRef = doc(db, `colleges/${adminData.collegeId}/students`, student.id);
            
            await updateDoc(studentRef, {
                full_name: formData.fullName.trim(),
                student_id: formData.studentId.trim(),
                gender: formData.gender,
                email: formData.email.trim(),
                department_id: formData.department || null,
                year_of_study: formData.yearOfStudy,
                hostel_type: formData.hostel,
                batch: formData.batch,
                contact_number: formData.contactNumber,
                status: formData.status,
                photo_url: photoUrl
            });

            await logAuditAction({
                action: 'Updated Student',
                resource: formData.studentId,
                details: {
                    name: formData.fullName,
                    changes: {
                        status: formData.status,
                        department: formData.department
                    }
                }
            });

            onUpdate();
            onClose();
        } catch (err) {
            console.error(err);
            setError(err.message || 'Failed to update student.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={onClose} />
            <div className="bg-white rounded-[32px] w-full max-w-2xl overflow-hidden shadow-2xl relative z-10 animate-in zoom-in-95 duration-200">
                <div className="p-8">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h2 className="text-2xl font-black text-gray-900 leading-tight">Edit Student Record</h2>
                            <p className="text-sm text-gray-400 font-bold uppercase tracking-wider mt-1">Profile ID: {student.student_id}</p>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-gray-50 rounded-xl text-gray-400 hover:text-gray-600 transition-colors">
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="flex gap-8">
                            {/* Photo Column */}
                            <div className="w-32 flex-shrink-0">
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Photo</label>
                                <input type="file" ref={fileInputRef} onChange={handlePhotoChange} accept="image/*" className="hidden" />
                                <div
                                    onClick={() => fileInputRef.current.click()}
                                    className="w-32 h-32 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center cursor-pointer hover:border-[#f47c20] hover:bg-orange-50/50 transition-all overflow-hidden group"
                                >
                                    {photoPreview ? (
                                        <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                                    ) : (
                                        <Camera className="w-8 h-8 text-gray-300 group-hover:text-[#f47c20] transition-colors" />
                                    )}
                                </div>
                            </div>

                            {/* Info Column */}
                            <div className="flex-1 space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Full Name</label>
                                    <input
                                        type="text"
                                        value={formData.fullName}
                                        onChange={(e) => handleChange('fullName', e.target.value)}
                                        className="w-full px-4 py-2.5 bg-gray-50 border-none rounded-xl text-sm font-bold text-gray-900 focus:ring-2 focus:ring-[#f47c20]/20"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Student ID</label>
                                        <input
                                            type="text"
                                            value={formData.studentId}
                                            onChange={(e) => handleChange('studentId', e.target.value)}
                                            className="w-full px-4 py-2.5 bg-gray-50 border-none rounded-xl text-sm font-bold text-gray-900 focus:ring-2 focus:ring-[#f47c20]/20"
                                        />
                                    </div>
                                    <CustomSelect
                                        label="Status"
                                        value={formData.status}
                                        options={statusOptions}
                                        onChange={(val) => handleChange('status', val)}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Email</label>
                                        <input
                                            type="email"
                                            value={formData.email}
                                            onChange={(e) => handleChange('email', e.target.value)}
                                            className="w-full px-4 py-2.5 bg-gray-50 border-none rounded-xl text-sm font-bold text-gray-900 focus:ring-2 focus:ring-[#f47c20]/20"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Contact Number</label>
                                        <input
                                            type="tel"
                                            value={formData.contactNumber}
                                            onChange={(e) => handleChange('contactNumber', e.target.value)}
                                            className="w-full px-4 py-2.5 bg-gray-50 border-none rounded-xl text-sm font-bold text-gray-900 focus:ring-2 focus:ring-[#f47c20]/20"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4 border-t border-gray-50 pt-6">
                            <CustomSelect
                                label="Department"
                                value={formData.department}
                                options={departments}
                                onChange={(val) => handleChange('department', val)}
                            />
                            <CustomSelect
                                label="Year"
                                value={formData.yearOfStudy}
                                options={yearOptions}
                                onChange={(val) => handleChange('yearOfStudy', val)}
                            />
                            <CustomSelect
                                label="Batch"
                                value={formData.batch}
                                options={batches}
                                onChange={(val) => handleChange('batch', val)}
                            />
                        </div>

                        <div className="flex items-center justify-between gap-6 pt-6">
                            <div className="flex-1">
                                {error && <p className="text-xs font-bold text-red-500">{error}</p>}
                            </div>
                            <div className="flex items-center gap-4">
                                <button type="button" onClick={onClose} className="px-6 py-2.5 text-sm font-bold text-gray-400 hover:text-gray-600">Cancel</button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="flex items-center gap-2 px-8 py-2.5 bg-[#f47c20] hover:bg-[#e06d1c] text-white font-black rounded-xl text-sm shadow-lg shadow-orange-500/20 transition-all disabled:opacity-50 active:scale-95"
                                >
                                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Update Student'}
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default EditStudentModal;
