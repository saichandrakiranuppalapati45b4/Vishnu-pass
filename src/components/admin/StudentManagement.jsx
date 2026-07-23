import React, { useState, useEffect, useRef } from 'react';
import {
    Plus, Search, Filter, Download, MoreVertical,
    ChevronDown, Trash2, User, ChevronLeft, ChevronRight,
    ChevronsLeft, ChevronsRight, Pencil, Loader2
} from 'lucide-react';

import { db } from '../../config/firebase';
import { collection, getDocs, doc, getDoc, updateDoc, deleteDoc, query, where, orderBy, getCountFromServer } from 'firebase/firestore';
import { logAuditAction } from '../../utils/auditLogger';
import { useNotification } from '../../contexts/NotificationContext';
import EditStudentModal from './EditStudentModal';

// Helper function to generate a consistent color from a name
const stringToColor = (name) => {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    let color = '#';
    for (let i = 0; i < 3; i++) {
        const value = (hash >> (i * 8)) & 0xff;
        color += `00${value.toString(16)}`.slice(-2);
    }
    return color;
};

const statusStyles = {
    Active: 'bg-emerald-50 text-emerald-600 border-emerald-200',
    'On Leave': 'bg-amber-50 text-amber-600 border-amber-200',
    Graduated: 'bg-gray-100 text-gray-500 border-gray-200',
    Pending: 'bg-gray-50 text-gray-600 border-gray-200',
    'Under Review': 'bg-blue-50 text-blue-600 border-blue-200',
    Inactive: 'bg-rose-50 text-rose-600 border-rose-200',
};

const StudentManagement = ({ adminData, onNavigate }) => {
    const [students, setStudents] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [totalCount, setTotalCount] = useState(0);
    const [departments, setDepartments] = useState([]);
    const [batches, setBatches] = useState([]);
    const { showNotification, showModal } = useNotification();
    
    // Delete Batch State
    const [isDeleteBatchOpen, setIsDeleteBatchOpen] = useState(false);
    const [selectedBatchToDelete, setSelectedBatchToDelete] = useState('');

    // Filter State
    const [deptFilter, setDeptFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
    const [batchFilter, setBatchFilter] = useState('all');

    // Dropdown State
    const [openDropdown, setOpenDropdown] = useState(null); // 'dept' | 'batch' | null
    const [actionMenuId, setActionMenuId] = useState(null); // student.id | null
    const [editingStudent, setEditingStudent] = useState(null);
    const dropdownRef = useRef(null);
    const actionMenuRef = useRef(null);

    useEffect(() => {
        if (adminData?.collegeId) {
            fetchDepartments();
            fetchBatches();
        }
    }, [adminData]);

    useEffect(() => {
        if (adminData?.collegeId) {
            fetchStudents();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [deptFilter, statusFilter, batchFilter, adminData]);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setOpenDropdown(null);
            }
            if (actionMenuRef.current && !actionMenuRef.current.contains(e.target)) {
                setActionMenuId(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const fetchDepartments = async () => {
        const q = query(collection(db, `colleges/${adminData.collegeId}/departments`), orderBy('name'));
        const snapshot = await getDocs(q);
        const data = [];
        snapshot.forEach(doc => data.push({ id: doc.id, ...doc.data() }));
        setDepartments(data);
    };

    const fetchBatches = async () => {
        const q = query(collection(db, `colleges/${adminData.collegeId}/batches`), orderBy('name'));
        const snapshot = await getDocs(q);
        const data = [];
        snapshot.forEach(doc => data.push({ id: doc.id, ...doc.data() }));
        setBatches(data);
    };

    const handleDeleteBatch = async () => {
        if (!selectedBatchToDelete) return;

        const confirmed = await showModal({
            title: 'Delete Batch and Students',
            message: `Are you sure you want to delete Batch ${selectedBatchToDelete}? This will permanently delete the batch AND all students belonging to this batch, along with their scan history. This action cannot be undone.`,
            confirmText: 'Delete All',
            cancelText: 'Cancel',
            type: 'warning'
        });

        if (!confirmed) return;

        try {
            // NOTE: In a real app, large deletes should be done via Cloud Functions or batches.
            // For now, we will mark them as Inactive to avoid massive data loss.
            const studentsRef = collection(db, `colleges/${adminData.collegeId}/students`);
            const q = query(studentsRef, where('batch', '==', selectedBatchToDelete));
            const snapshot = await getDocs(q);
            
            for (const docSnap of snapshot.docs) {
                await updateDoc(docSnap.ref, { status: 'Inactive' });
            }

            // Log the action
            await logAuditAction({
                action: 'Deactivated Batch Students',
                resource: selectedBatchToDelete
            });

            showNotification(`Batch ${selectedBatchToDelete} students deactivated successfully.`, 'success');
            fetchStudents();
            setIsDeleteBatchOpen(false);
            setSelectedBatchToDelete('');
        } catch (error) {
            showNotification('Failed to process batch. Please try again.', 'error');
        }
    };

    const fetchStudents = async () => {
        setIsLoading(true);
        try {
            const studentsRef = collection(db, `colleges/${adminData.collegeId}/students`);
            
            let queryConstraints = [];
            
            if (deptFilter !== 'all') {
                queryConstraints.push(where('department_id', '==', deptFilter));
            }

            if (statusFilter === 'Active Only') {
                queryConstraints.push(where('status', '==', 'Active'));
            }

            if (batchFilter !== 'all') {
                queryConstraints.push(where('batch', '==', batchFilter));
            }

            const q = query(studentsRef, ...queryConstraints, orderBy('created_at', 'desc'));
            
            // Get total count
            const countSnap = await getCountFromServer(query(studentsRef, ...queryConstraints));
            setTotalCount(countSnap.data().count);

            const snapshot = await getDocs(q);
            const data = [];
            
            // We need to resolve department names
            // For simplicity, we just use the loaded departments array
            const deptMap = {};
            departments.forEach(d => { deptMap[d.id] = d; });
            
            snapshot.forEach(doc => {
                const studentData = doc.data();
                data.push({
                    id: doc.id,
                    ...studentData,
                    departments: deptMap[studentData.department_id] || { name: studentData.department || 'General' }
                });
            });
            
            setStudents(data);
        } catch (error) {
            console.error("Error fetching students:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteStudent = async (studentId, studentName) => {
        const confirmed = await showModal({
            title: 'Deactivate Student',
            message: `Are you sure you want to deactivate ${studentName}?`,
            confirmText: 'Deactivate',
            cancelText: 'Cancel',
            type: 'warning'
        });

        if (!confirmed) {
            return;
        }

        try {
            const studentRef = doc(db, `colleges/${adminData.collegeId}/students`, studentId);
            await updateDoc(studentRef, { status: 'Inactive' });

            // Log the action
            await logAuditAction({
                action: 'Deactivated Student',
                resource: studentName,
                details: { id: studentId }
            });

            fetchStudents();
            setActionMenuId(null);
            showNotification(`${studentName} deactivated successfully.`, 'success');
        } catch (error) {
            showNotification('Failed to deactivate student. Please try again.', 'error');
        }
    };

    const getDeptName = () => {
        if (deptFilter === 'all') return 'All Departments';
        return departments.find(d => d.id === deptFilter)?.name || 'All Departments';
    };

    return (
        <div className="flex-1 overflow-y-auto p-8">
            {/* Header */}
            <div className="flex items-start justify-between mb-6">
                <div>
                    <h1 className="text-[26px] font-bold text-gray-900 mb-1">Student Directory</h1>
                    <p className="text-sm text-gray-500 font-medium">Manage and monitor {totalCount.toLocaleString()} student records across all campuses.</p>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={() => setIsDeleteBatchOpen(true)} className="flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors shadow-sm">
                        <Trash2 className="w-4 h-4 text-red-500" />
                        Deactivate Batch
                    </button>
                    <button className="flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors shadow-sm">
                        <Download className="w-4 h-4" />
                        Export CSV
                    </button>
                    <button onClick={() => onNavigate('register-student')} className="flex items-center gap-2 px-5 py-2.5 bg-[#f47c20] hover:bg-[#e06d1c] text-white rounded-xl text-sm font-semibold transition-colors shadow-sm">
                        <Plus className="w-4 h-4" />
                        Add New Student
                    </button>
                </div>
            </div>

            {/* Breadcrumb */}
            <div className="text-sm text-gray-400 font-medium mb-5">
                <span className="text-gray-400">Admin</span>
                <span className="mx-2">/</span>
                <span className="text-gray-700 font-semibold">Students</span>
            </div>

            {/* Filters */}
            <div className="flex items-center justify-between mb-6" ref={dropdownRef}>
                <div className="flex items-center gap-3">
                    {/* Department Filter */}
                    <div className="relative">
                        <button
                            onClick={() => setOpenDropdown(openDropdown === 'dept' ? null : 'dept')}
                            className={`flex items-center gap-2 px-4 py-2 bg-white border rounded-lg text-sm font-medium transition-colors ${deptFilter !== 'all' ? 'border-[#f47c20] text-[#f47c20]' : 'border-gray-200 text-gray-700 hover:bg-gray-50'}`}
                        >
                            {getDeptName()}
                            <ChevronDown className={`w-4 h-4 transition-transform ${openDropdown === 'dept' ? 'rotate-180' : ''}`} />
                        </button>

                        {openDropdown === 'dept' && (
                            <div className="absolute z-50 top-full left-0 mt-1.5 w-64 bg-white border border-gray-200 rounded-xl shadow-lg ring-1 ring-black/5 overflow-hidden animate-in fade-in slide-in-from-top-1">
                                <div className="py-1 max-h-60 overflow-y-auto">
                                    <button
                                        onClick={() => { setDeptFilter('all'); setOpenDropdown(null); }}
                                        className={`w-full text-left px-4 py-2 text-sm ${deptFilter === 'all' ? 'bg-orange-50 text-[#f47c20] font-bold' : 'text-gray-700 hover:bg-gray-50'}`}
                                    >
                                        All Departments
                                    </button>
                                    {departments.map((dept) => (
                                        <button
                                            key={dept.id}
                                            onClick={() => { setDeptFilter(dept.id); setOpenDropdown(null); }}
                                            className={`w-full text-left px-4 py-2 text-sm ${deptFilter === dept.id ? 'bg-orange-50 text-[#f47c20] font-bold' : 'text-gray-700 hover:bg-gray-50'}`}
                                        >
                                            {dept.name}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Active Only Filter */}
                    <button
                        onClick={() => setStatusFilter(statusFilter === 'Active Only' ? 'all' : 'Active Only')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${statusFilter === 'Active Only' ? 'bg-[#f47c20] text-white border-[#f47c20]' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'}`}
                    >
                        <Filter className={`w-3.5 h-3.5 ${statusFilter === 'Active Only' ? 'text-white' : 'text-gray-400'}`} />
                        Active Only
                    </button>

                    {/* Batch Filter */}
                    <div className="relative">
                        <button
                            onClick={() => setOpenDropdown(openDropdown === 'batch' ? null : 'batch')}
                            className={`flex items-center gap-2 px-4 py-2 bg-white border rounded-lg text-sm font-medium transition-colors ${batchFilter !== 'all' ? 'border-[#f47c20] text-[#f47c20]' : 'border-gray-200 text-gray-700 hover:bg-gray-50'}`}
                        >
                            {batchFilter === 'all' ? 'Select Batch' : `Batch ${batchFilter}`}
                            <ChevronDown className={`w-4 h-4 transition-transform ${openDropdown === 'batch' ? 'rotate-180' : ''}`} />
                        </button>

                        {openDropdown === 'batch' && (
                            <div className="absolute z-50 top-full left-0 mt-1.5 w-40 bg-white border border-gray-200 rounded-xl shadow-lg ring-1 ring-black/5 overflow-hidden animate-in fade-in slide-in-from-top-1">
                                <div className="py-1">
                                    {['all', ...batches.map(b => b.name)].map((batch) => (
                                        <button
                                            key={batch}
                                            onClick={() => { setBatchFilter(batch); setOpenDropdown(null); }}
                                            className={`w-full text-left px-4 py-2 text-sm ${batchFilter === batch ? 'bg-orange-50 text-[#f47c20] font-bold' : 'text-gray-700 hover:bg-gray-50'}`}
                                        >
                                            {batch === 'all' ? 'All Batches' : `Batch ${batch}`}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
                <div className="text-sm text-gray-400 font-medium flex items-center gap-2">
                    Showing {students.length} of {totalCount}
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
                <table className="w-full text-left text-sm">
                    <thead>
                        <tr className="border-b border-gray-100">
                            <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Student Name</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Student ID</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Department</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {isLoading ? (
                            <tr>
                                <td colSpan="5" className="px-6 py-12 text-center text-gray-400">
                                    <div className="flex flex-col items-center gap-3">
                                        <Loader2 className="w-8 h-8 animate-spin text-[#f47c20]" />
                                        <p className="text-sm font-medium">Fetching student directory...</p>
                                    </div>
                                </td>
                            </tr>
                        ) : students.length === 0 ? (
                            <tr>
                                <td colSpan="5" className="px-6 py-12 text-center text-gray-400">No student records found.</td>
                            </tr>
                        ) : (
                            students.map((student) => (
                                <tr
                                    key={student.id}
                                    onClick={() => onNavigate('student-profile', student.id)}
                                    className="hover:bg-gray-50/50 transition-colors group cursor-pointer"
                                >
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            {student.photo_url ? (
                                                <img src={student.photo_url} alt="" className="w-9 h-9 rounded-full object-cover border border-gray-100" />
                                            ) : (
                                                <div
                                                    className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                                                    style={{ backgroundColor: stringToColor(student.full_name) }}
                                                >
                                                    {student.full_name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                                                </div>
                                            )}
                                            <div>
                                                <p className="font-semibold text-gray-900 text-sm">{student.full_name}</p>
                                                <p className="text-xs text-gray-400 font-medium">{student.email}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-gray-600 font-medium">{student.student_id}</td>
                                    <td className="px-6 py-4 text-gray-600 font-medium">{student.departments?.name || 'General'}</td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex px-3 py-1 text-xs font-bold rounded-full border ${statusStyles[student.status] || statusStyles['Active']}`}>
                                            {student.status || 'Active'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                                        <div className="relative inline-block text-left" ref={actionMenuId === student.id ? actionMenuRef : null}>
                                            <button
                                                onClick={() => setActionMenuId(actionMenuId === student.id ? null : student.id)}
                                                className={`p-1.5 text-gray-400 hover:text-gray-600 transition-colors rounded-lg ${actionMenuId === student.id ? 'bg-gray-100 text-gray-900' : 'opacity-0 group-hover:opacity-100'}`}
                                            >
                                                <MoreVertical className="w-4 h-4" />
                                            </button>

                                            {actionMenuId === student.id && (
                                                <div className="absolute z-50 right-0 mt-2 w-44 bg-white border border-gray-100 rounded-xl shadow-xl ring-1 ring-black/5 animate-in fade-in zoom-in-95">
                                                    <div className="py-1.5 px-1">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setEditingStudent(student);
                                                                setActionMenuId(null);
                                                            }}
                                                            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-gray-700 hover:bg-orange-50 hover:text-[#f47c20] rounded-lg transition-colors"
                                                        >
                                                            <Pencil className="w-3.5 h-3.5" />
                                                            Edit Record
                                                        </button>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleDeleteStudent(student.id, student.full_name);
                                                                setActionMenuId(null);
                                                            }}
                                                            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                            Deactivate
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
            {/* Modals */}
            {editingStudent && (
                <EditStudentModal
                    adminData={adminData}
                    student={editingStudent}
                    onClose={() => setEditingStudent(null)}
                    onUpdate={fetchStudents}
                />
            )}
            {/* Delete Batch Modal */}
            {isDeleteBatchOpen && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setIsDeleteBatchOpen(false)}>
                    <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl mx-4" onClick={(e) => e.stopPropagation()}>
                        <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center mb-4 mx-auto">
                            <Trash2 className="w-6 h-6 text-red-500" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 text-center mb-2">Deactivate Batch</h3>
                        <p className="text-sm text-gray-500 text-center mb-6 font-medium">
                            Select the batch you want to deactivate.
                        </p>
                        
                        <div className="mb-6">
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Select Batch</label>
                            <div className="relative">
                                <select
                                    value={selectedBatchToDelete}
                                    onChange={(e) => setSelectedBatchToDelete(e.target.value)}
                                    className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#f47c20]/20 focus:border-[#f47c20] appearance-none cursor-pointer"
                                >
                                    <option value="">Select a batch...</option>
                                    {batches.map((batch) => (
                                        <option key={batch.id} value={batch.name}>
                                            Batch {batch.name}
                                        </option>
                                    ))}
                                </select>
                                <ChevronDown className="w-4 h-4 text-gray-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setIsDeleteBatchOpen(false)}
                                className="flex-1 px-5 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDeleteBatch}
                                disabled={!selectedBatchToDelete}
                                className="flex-1 px-5 py-2.5 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-xl text-sm transition-colors shadow-sm disabled:opacity-50"
                            >
                                Deactivate
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StudentManagement;
