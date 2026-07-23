import React, { useState, useRef, useEffect } from 'react';
import { User, GraduationCap, Camera, ChevronDown, Loader2, Lock, ChevronLeft, Upload, FileSpreadsheet, CheckCircle, AlertCircle, FileText } from 'lucide-react';
import { db, storage } from '../../config/firebase';
import { collection, getDocs, doc, query, orderBy, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { createStudentAccount } from '../../lib/functions';
import { logAuditAction } from '../../utils/auditLogger';
import { useNotification } from '../../contexts/NotificationContext';
import Papa from 'papaparse';

// Custom Dropdown Component
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

const genderOptions = [
    { value: 'male', label: 'Male' },
    { value: 'female', label: 'Female' },
    { value: 'other', label: 'Other' },
];

const yearOptions = [
    { value: '1', label: '1st Year' },
    { value: '2', label: '2nd Year' },
    { value: '3', label: '3rd Year' },
    { value: '4', label: '4th Year' },
];

const hostelOptions = [
    { value: 'dayscholar', label: 'Dayscholar' },
    { value: 'hosteler', label: 'Hosteler' },
];

const RegisterStudent = ({ adminData, onCancel }) => {
    const [registrationMode, setRegistrationMode] = useState('single'); // 'single' | 'bulk'
    const [departments, setDepartments] = useState([]);
    const [batches, setBatches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const { showNotification } = useNotification();
    
    // Single Registration State
    const [formData, setFormData] = useState({
        fullName: '',
        studentId: '',
        gender: '',
        email: '',
        password: '',
        confirmPassword: '',
        department: '',
        yearOfStudy: '',
        hostel: '',
        batch: '',
        contactNumber: '',
    });
    const [photoFile, setPhotoFile] = useState(null);
    const [photoPreview, setPhotoPreview] = useState(null);
    const fileInputRef = useRef(null);

    // Bulk Registration State
    const [bulkDepartment, setBulkDepartment] = useState('');
    const [csvFile, setCsvFile] = useState(null);
    const [parsedData, setParsedData] = useState([]);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploadLogs, setUploadLogs] = useState([]);
    const csvInputRef = useRef(null);

    // Fetch live departments and batches from Firestore
    useEffect(() => {
        if (!adminData?.collegeId) return;

        const loadData = async () => {
            setLoading(true);
            try {
                const deptQuery = query(collection(db, `colleges/${adminData.collegeId}/departments`), orderBy('name'));
                const deptSnap = await getDocs(deptQuery);
                const depts = [];
                deptSnap.forEach(d => depts.push({ value: d.id, label: d.data().name }));
                setDepartments(depts);

                const batchQuery = query(collection(db, `colleges/${adminData.collegeId}/batches`), orderBy('name'));
                const batchSnap = await getDocs(batchQuery);
                const bs = [];
                batchSnap.forEach(b => bs.push({ value: b.id, label: b.data().name }));
                setBatches(bs);
                
                if (bs.length > 0) {
                    setFormData(prev => ({ ...prev, batch: bs[0].label })); // Setting by name not ID, based on previous implementation
                }
            } catch (err) {
                console.error("Error loading form data:", err);
            }
            setLoading(false);
        };

        loadData();
    }, [adminData]);

    // Single Change Handlers
    const handleChange = (field, value) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
    };

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
        }
    };

    // Single Submit
    const handleSingleSubmit = async (e) => {
        e.preventDefault();
        if (!adminData?.collegeId) return;
        
        setError(null);
        setIsSubmitting(true);

        try {
            if (formData.password !== formData.confirmPassword) {
                throw new Error("Passwords do not match");
            }
            if (!formData.password || formData.password.length < 6) {
                throw new Error("Password must be at least 6 characters");
            }

            let photoUrl = null;

            if (photoFile) {
                const fileExt = photoFile.name.split('.').pop();
                const fileName = `student_${Date.now()}.${fileExt}`;
                const storageRef = ref(storage, `colleges/${adminData.collegeId}/students/${fileName}`);
                await uploadBytes(storageRef, photoFile);
                photoUrl = await getDownloadURL(storageRef);
            }

            // Call Cloud Function to create auth user and insert into Firestore securely
            const result = await createStudentAccount({
                email: formData.email.trim(),
                password: formData.password,
                fullName: formData.fullName.trim(),
                studentId: formData.studentId.trim(),
                gender: formData.gender,
                departmentId: formData.department || null,
                yearOfStudy: formData.yearOfStudy,
                hostelType: formData.hostel,
                batch: formData.batch,
                contactNumber: formData.contactNumber,
                photoUrl: photoUrl
            });

            if (result.data.error) {
                throw new Error(result.data.error);
            }

            await logAuditAction({
                action: 'Registered Student',
                resource: formData.studentId,
                details: {
                    name: formData.fullName,
                    department: formData.department,
                    batch: formData.batch
                }
            });

            showNotification('Student registered successfully!', 'success');
            onCancel();
        } catch (err) {
            setError(err.message || 'Failed to register student. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Bulk Change Handlers
    const handleCsvChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setCsvFile(file);
            Papa.parse(file, {
                header: true,
                skipEmptyLines: true,
                complete: (results) => {
                    if (results.errors.length > 0) {
                        setError('CSV Parsing Error. Ensure file is correctly formatted.');
                        setParsedData([]);
                    } else {
                        const validatedData = results.data.map(row => {
                            const errors = [];
                            if (!row.fullName?.trim()) errors.push('Name');
                            if (!row.email?.trim()) errors.push('Email');
                            if (!row.studentId?.trim()) errors.push('ID');
                            return { ...row, _errors: errors };
                        });
                        setParsedData(validatedData);
                        setError(null);
                    }
                }
            });
        }
    };

    const downloadCsvTemplate = () => {
        if (!bulkDepartment) {
            setError("Please select a branch from the dropdown before downloading the template.");
            return;
        }
        setError(null);
        const selectedDept = departments.find(d => d.value === bulkDepartment);
        const deptName = selectedDept ? selectedDept.label : 'Computer Science';

        const headers = ['fullName', 'studentId', 'gender', 'email', 'contactNumber', 'departmentName', 'yearOfStudy', 'hostel', 'batch', 'password'];
        const csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\n" +
            `John Doe,VP-2024-001,male,john@university.edu,+91 9999999999,${deptName},1,dayscholar,2024,password123`;
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "bulk_student_template.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleBulkSubmit = async () => {
        if (parsedData.length === 0 || !adminData?.collegeId) return;
        setIsSubmitting(true);
        setError(null);
        setUploadLogs([]);
        setUploadProgress(0);

        let successCount = 0;
        let failCount = 0;

        for (let i = 0; i < parsedData.length; i++) {
            const row = parsedData[i];
            try {
                // Determine Department ID precisely
                let deptId = bulkDepartment || null;
                if (!deptId && row.departmentName) {
                    const deptMatch = departments.find(d => 
                        d.label.toLowerCase().includes(row.departmentName.toLowerCase())
                    );
                    if (deptMatch) deptId = deptMatch.value;
                }

                const result = await createStudentAccount({
                    email: row.email.trim(),
                    password: row.password || 'changeme123',
                    fullName: row.fullName.trim(),
                    studentId: row.studentId.trim(),
                    gender: row.gender?.toLowerCase() || 'other',
                    departmentId: deptId,
                    yearOfStudy: row.yearOfStudy || '1',
                    hostelType: row.hostel?.toLowerCase() || 'dayscholar',
                    batch: row.batch || '2024',
                    contactNumber: row.contactNumber || '',
                    photoUrl: null
                });

                if (result.data.error) {
                    throw new Error(result.data.error);
                }
                
                successCount++;
                setUploadLogs(prev => [...prev, { status: 'success', message: `${row.fullName} (${row.studentId}) registered.` }]);
            } catch (err) {
                failCount++;
                setUploadLogs(prev => [...prev, { status: 'error', message: `Failed ${row.studentId || row.email}: ${err.message}` }]);
            }
            setUploadProgress(Math.round(((i + 1) / parsedData.length) * 100));
        }

        setIsSubmitting(false);
        
        await logAuditAction({
            action: 'Bulk Registered Students',
            resource: 'Multiple Records',
            details: { success: successCount, failed: failCount }
        });

        if (failCount === 0) {
            showNotification(`Successfully registered ${successCount} students!`, 'success');
        } else {
            showNotification(`Finished with ${failCount} errors out of ${parsedData.length}. Check logs.`, 'warning');
        }
    };

    return (
        <div className="flex-1 overflow-y-auto p-8">
            {/* Header / Back Button */}
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={isSubmitting}
                        className="w-10 h-10 rounded-xl bg-white border border-gray-100 flex items-center justify-center text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-all shadow-sm active:scale-95 disabled:opacity-50"
                    >
                        <ChevronLeft className="w-6 h-6" />
                    </button>
                    <div>
                        <h1 className="text-[26px] font-bold text-gray-900 mb-1">Register Student</h1>
                        <p className="text-sm text-gray-500 font-medium">Add new student records individually or via bulk upload.</p>
                    </div>
                </div>

                {/* Mode Toggle */}
                <div className="flex bg-gray-100 p-1 rounded-xl">
                    <button
                        onClick={() => setRegistrationMode('single')}
                        disabled={isSubmitting}
                        className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${registrationMode === 'single' ? 'bg-white text-[#f47c20] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Single Entry
                    </button>
                    <button
                        onClick={() => setRegistrationMode('bulk')}
                        disabled={isSubmitting}
                        className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${registrationMode === 'bulk' ? 'bg-white text-[#f47c20] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Bulk Upload
                    </button>
                </div>
            </div>

            {error && (
                <div className="mb-6 bg-red-50 border border-red-100 rounded-xl p-4 flex items-center gap-3 text-red-600">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <p className="text-sm font-bold">{error}</p>
                </div>
            )}

            {registrationMode === 'single' ? (
                // SINGLE REGISTRATION FORM
                <form onSubmit={handleSingleSubmit}>
                    <div className="grid grid-cols-3 gap-6 mb-8">
                        {/* Student Photo */}
                        <div className="col-span-1 bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.04)] p-6 flex flex-col items-center">
                            <h3 className="text-sm font-semibold text-gray-900 mb-5 self-start">Student Photo</h3>

                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handlePhotoChange}
                                accept="image/*"
                                className="hidden"
                            />

                            <div
                                onClick={() => fileInputRef.current.click()}
                                className="w-28 h-28 bg-[#f4f6f8] border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center mb-4 cursor-pointer hover:border-[#f47c20] hover:bg-orange-50/30 transition-colors group overflow-hidden"
                            >
                                {photoPreview ? (
                                    <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                                ) : (
                                    <>
                                        <Camera className="w-6 h-6 text-gray-300 group-hover:text-[#f47c20] transition-colors mb-1" />
                                        <span className="text-[10px] text-gray-400 font-medium group-hover:text-[#f47c20] transition-colors">Upload Image</span>
                                    </>
                                )}
                            </div>
                            <p className="text-[10px] text-gray-400 font-medium text-center leading-relaxed mt-auto">
                                Upload a high-quality portrait photo.<br />
                                Max size 5MB (JPG, PNG).
                            </p>
                        </div>

                        {/* Personal Information */}
                        <div className="col-span-2 bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.04)] p-6">
                            <div className="flex items-center gap-2.5 mb-5">
                                <User className="w-4 h-4 text-[#f47c20]" />
                                <h3 className="text-sm font-bold text-gray-900">Personal Information</h3>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Full Name</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Johnathan Doe"
                                        value={formData.fullName}
                                        onChange={(e) => handleChange('fullName', e.target.value)}
                                        className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#f47c20]/20 focus:border-[#f47c20] placeholder:text-gray-400"
                                        required
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Student ID</label>
                                        <input
                                            type="text"
                                            placeholder="VP-2024-001"
                                            value={formData.studentId}
                                            onChange={(e) => handleChange('studentId', e.target.value)}
                                            className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#f47c20]/20 focus:border-[#f47c20] placeholder:text-gray-400"
                                            required
                                        />
                                    </div>
                                    <CustomSelect
                                        label="Gender"
                                        value={formData.gender}
                                        options={genderOptions}
                                        onChange={(val) => handleChange('gender', val)}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Email Address</label>
                                        <input
                                            type="email"
                                            placeholder="student@university.edu"
                                            value={formData.email}
                                            onChange={(e) => handleChange('email', e.target.value)}
                                            className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#f47c20]/20 focus:border-[#f47c20] placeholder:text-gray-400"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Contact Number</label>
                                        <input
                                            type="tel"
                                            placeholder="+91 XXXXX XXXXX"
                                            value={formData.contactNumber}
                                            onChange={(e) => handleChange('contactNumber', e.target.value)}
                                            className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#f47c20]/20 focus:border-[#f47c20] placeholder:text-gray-400"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.04)] p-6 mb-8">
                        <div className="flex items-center gap-2.5 mb-5">
                            <Lock className="w-4 h-4 text-[#f47c20]" />
                            <h3 className="text-sm font-bold text-gray-900">Set Student Password</h3>
                        </div>
                        <div className="grid grid-cols-2 gap-6">
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Password</label>
                                <input
                                    type="password"
                                    placeholder="••••••••"
                                    value={formData.password}
                                    onChange={(e) => handleChange('password', e.target.value)}
                                    className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#f47c20]/20 focus:border-[#f47c20] placeholder:text-gray-400"
                                    required
                                    minLength={6}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Confirm Password</label>
                                <input
                                    type="password"
                                    placeholder="••••••••"
                                    value={formData.confirmPassword}
                                    onChange={(e) => handleChange('confirmPassword', e.target.value)}
                                    className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#f47c20]/20 focus:border-[#f47c20] placeholder:text-gray-400"
                                    required
                                    minLength={6}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.04)] p-6 mb-8">
                        <div className="flex items-center gap-2.5 mb-5">
                            <GraduationCap className="w-4 h-4 text-[#f47c20]" />
                            <h3 className="text-sm font-bold text-gray-900">Academic Details</h3>
                        </div>
                        <div className="grid grid-cols-3 gap-4 mb-4">
                            <CustomSelect
                                label="Department"
                                value={formData.department}
                                options={departments}
                                placeholder={loading ? 'Loading...' : 'Select'}
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
                                placeholder={loading ? 'Loading...' : 'Select'}
                                onChange={(val) => handleChange('batch', val)}
                            />
                        </div>
                        <CustomSelect
                            label="Assigned Hostel/Campus"
                            value={formData.hostel}
                            options={hostelOptions}
                            onChange={(val) => handleChange('hostel', val)}
                        />
                    </div>

                    <div className="flex items-center justify-end gap-4">
                        <button
                            type="button"
                            onClick={onCancel}
                            disabled={isSubmitting}
                            className="px-6 py-2.5 text-sm font-semibold text-gray-600 hover:text-gray-800 transition-colors disabled:opacity-50 cursor-pointer"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="flex items-center gap-2 px-6 py-2.5 bg-[#f47c20] hover:bg-[#e06d1c] text-white font-semibold rounded-xl text-sm transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                'Add Student Record'
                            )}
                        </button>
                    </div>
                </form>
            ) : (
                // BULK REGISTRATION FORM
                <div className="space-y-6">
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.04)] p-8">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h3 className="text-lg font-bold text-gray-900 mb-1">Import CSV List</h3>
                                <p className="text-sm text-gray-500 font-medium">Select a branch and upload your CSV student data.</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="w-56">
                                    <CustomSelect
                                        value={bulkDepartment}
                                        options={departments}
                                        placeholder="Select Branch..."
                                        onChange={setBulkDepartment}
                                    />
                                </div>
                                <button
                                    onClick={downloadCsvTemplate}
                                    type="button"
                                    className="flex items-center gap-2 px-4 py-2 border border-[#f47c20] text-[#f47c20] hover:bg-orange-50 rounded-xl text-sm font-bold transition-colors whitespace-nowrap"
                                >
                                    <FileSpreadsheet className="w-4 h-4" />
                                    Download Template
                                </button>
                            </div>
                        </div>
                        
                        <input
                            type="file"
                            accept=".csv"
                            ref={csvInputRef}
                            onChange={handleCsvChange}
                            className="hidden"
                        />
                        
                        <div
                            onClick={() => !isSubmitting && csvInputRef.current.click()}
                            className={`w-full h-40 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center transition-all ${isSubmitting ? 'border-gray-200 bg-gray-50 cursor-not-allowed' : 'border-gray-200 hover:border-[#f47c20] hover:bg-orange-50/50 cursor-pointer group'}`}
                        >
                            <Upload className={`w-8 h-8 mb-3 transition-colors ${csvFile ? 'text-[#f47c20]' : 'text-gray-300 group-hover:text-[#f47c20]'}`} />
                            {csvFile ? (
                                <>
                                    <p className="font-bold text-gray-900">{csvFile.name}</p>
                                    <p className="text-sm text-gray-500">{parsedData.length} records found</p>
                                    <p className="text-xs text-[#f47c20] mt-1 font-semibold group-hover:underline">Click to change file</p>
                                </>
                            ) : (
                                <>
                                    <p className="font-bold text-gray-600 mb-1 group-hover:text-[#f47c20] transition-colors">Click to upload CSV File</p>
                                    <p className="text-xs font-semibold text-gray-400">Max file size 5MB.</p>
                                </>
                            )}
                        </div>
                    </div>
                    
                    {parsedData.length > 0 && (
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.04)] p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                                    <FileText className="w-4 h-4 text-[#f47c20]" />
                                    Data Preview & Validation
                                </h3>
                                <div className="flex gap-2 text-xs font-bold">
                                    <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-lg">Total: {parsedData.length} records</span>
                                    {parsedData.filter(r => r._errors?.length > 0).length > 0 && (
                                        <span className="px-3 py-1 bg-red-100 text-red-600 rounded-lg shadow-sm">
                                            {parsedData.filter(r => r._errors?.length > 0).length} Invalid Rows
                                        </span>
                                    )}
                                </div>
                            </div>
                            
                            <div className="overflow-x-auto max-h-64 overflow-y-auto mb-6 border border-gray-100 rounded-xl relative">
                                <table className="w-full text-left text-sm border-collapse">
                                    <thead className="sticky top-0 bg-gray-50 z-10">
                                        <tr className="border-b border-gray-100">
                                            <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest truncate">Status</th>
                                            <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest truncate">Name</th>
                                            <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest truncate">Student ID</th>
                                            <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest truncate">Gender</th>
                                            <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest truncate">Email</th>
                                            <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest truncate">Contact</th>
                                            <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest truncate">Department</th>
                                            <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest truncate">Year</th>
                                            <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest truncate">Hostel</th>
                                            <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest truncate">Batch</th>
                                            <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest truncate">Password</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {parsedData.map((row, idx) => (
                                            <tr key={idx} className={row._errors?.length > 0 ? 'bg-red-50/30' : ''}>
                                                <td className="px-4 py-3">
                                                    {row._errors?.length > 0 ? (
                                                        <span className="flex items-center gap-1 text-[10px] font-bold text-red-500 bg-red-50 px-2 py-1 rounded w-fit">
                                                            <AlertCircle className="w-3 h-3" /> Missing {row._errors.join(', ')}
                                                        </span>
                                                    ) : (
                                                        <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-500 bg-emerald-50 px-2 py-1 rounded w-fit">
                                                            <CheckCircle className="w-3 h-3" /> Valid
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 font-semibold text-gray-900 truncate">{row.fullName || 'N/A'}</td>
                                                <td className="px-4 py-3 font-medium text-gray-500 truncate">{row.studentId || 'N/A'}</td>
                                                <td className="px-4 py-3 font-medium text-gray-500 truncate">{row.gender || 'N/A'}</td>
                                                <td className="px-4 py-3 font-medium text-gray-500 truncate">{row.email || 'N/A'}</td>
                                                <td className="px-4 py-3 font-medium text-gray-500 truncate">{row.contactNumber || 'N/A'}</td>
                                                <td className="px-4 py-3 font-medium text-gray-500 truncate">{row.departmentName || 'N/A'}</td>
                                                <td className="px-4 py-3 font-medium text-gray-500 truncate">{row.yearOfStudy || 'N/A'}</td>
                                                <td className="px-4 py-3 font-medium text-gray-500 truncate">{row.hostel || 'N/A'}</td>
                                                <td className="px-4 py-3 font-medium text-gray-500 truncate">{row.batch || 'N/A'}</td>
                                                <td className="px-4 py-3 font-medium text-gray-500 truncate">{row.password || 'N/A'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            
                            {/* Upload Progress & Actions */}
                            {isSubmitting || uploadLogs.length > 0 ? (
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between text-sm font-bold text-gray-700">
                                        <span>Upload Progress</span>
                                        <span>{uploadProgress}%</span>
                                    </div>
                                    <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                                        <div 
                                            className="h-full bg-[#f47c20] transition-all duration-300"
                                            style={{ width: `${uploadProgress}%` }}
                                        />
                                    </div>
                                    
                                    <div className="bg-gray-900 rounded-xl p-4 h-40 overflow-y-auto space-y-2 font-mono text-xs">
                                        {uploadLogs.map((log, idx) => (
                                            <div key={idx} className={`flex items-start gap-2 ${log.status === 'error' ? 'text-red-400' : 'text-emerald-400'}`}>
                                                {log.status === 'error' ? <AlertCircle className="w-3.5 h-3.5 mt-0.5" /> : <CheckCircle className="w-3.5 h-3.5 mt-0.5" />}
                                                <span>{log.message}</span>
                                            </div>
                                        ))}
                                        {uploadProgress === 100 && (
                                            <div className="text-white pt-2 font-bold text-center">Batch Process Completed</div>
                                        )}
                                    </div>
                                    
                                    {uploadProgress === 100 && (
                                        <div className="flex justify-end pt-2">
                                            <button
                                                onClick={onCancel}
                                                className="px-6 py-2 bg-gray-100 hover:bg-gray-200 text-gray-900 font-bold rounded-xl transition-colors"
                                            >
                                                Return to Directory
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="flex items-center justify-end gap-4 border-t border-gray-50 pt-6">
                                    <button
                                        type="button"
                                        onClick={onCancel}
                                        className="px-6 py-2.5 text-sm font-semibold text-gray-600 hover:text-gray-800 transition-colors cursor-pointer"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleBulkSubmit}
                                        disabled={parsedData.some(r => r._errors?.length > 0)}
                                        className="flex items-center gap-2 px-6 py-2.5 bg-[#f47c20] hover:bg-[#e06d1c] disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold rounded-xl text-sm transition-colors shadow-sm cursor-pointer"
                                    >
                                        Upload Valid Records
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default RegisterStudent;
