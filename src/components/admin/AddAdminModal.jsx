import React, { useState } from 'react';
import { db } from '../../config/firebase';
import { doc, updateDoc, collection, addDoc, setDoc } from 'firebase/firestore';
import { logAuditAction } from '../../utils/auditLogger';
import { Loader2, AlertTriangle, ShieldCheck, ChevronDown, X } from 'lucide-react';
import { getFunctions, httpsCallable } from 'firebase/functions';

const AddAdminModal = ({ admin = null, onClose, onUpdate, adminData }) => {
    const isEdit = !!admin;
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const roles = ["Super Admin", "Manager", "Editor"];
    const [formData, setFormData] = useState({
        fullName: admin?.name || '',
        email: admin?.email || '',
        role: admin?.role || '',
        password: '',
        confirmPassword: '',
        permissions: admin?.permissions || {
            manageStudents: false,
            approvePasses: false,
            securityGuards: false,
            auditLogs: false,
            deleteAdmins: false,
        }
    });

    const handlePermissionChange = (field) => {
        setFormData(prev => ({
            ...prev,
            permissions: {
                ...prev.permissions,
                [field]: !prev.permissions[field]
            }
        }));
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setError(null);
        if (!adminData?.collegeId) return;

        if (!isEdit && formData.password !== formData.confirmPassword) {
            setError("Passwords do not match");
            return;
        }

        setIsSubmitting(true);

        try {
            if (isEdit) {
                // 1. Update existing admin record
                const adminRef = doc(db, `colleges/${adminData.collegeId}/admins`, admin.id);
                await updateDoc(adminRef, {
                    name: formData.fullName,
                    role: formData.role,
                    permissions: formData.permissions
                });

                // 2. Log the action
                await logAuditAction({
                    action: 'Updated Admin',
                    resource: formData.email,
                    details: {
                        name: formData.fullName,
                        role: formData.role,
                        permissions: formData.permissions
                    },
                    collegeId: adminData.collegeId
                });
            } else {
                const functions = getFunctions();
                const createCollegeAdminAccount = httpsCallable(functions, 'createCollegeAdminAccount');
                
                const response = await createCollegeAdminAccount({
                    email: formData.email,
                    password: formData.password,
                    adminData: {
                        name: formData.fullName,
                        role: formData.role,
                        permissions: formData.permissions
                    }
                });
                
                if (!response.data.success) {
                    throw new Error(response.data.message || 'Failed to create admin account');
                }

                // 3. Log the action
                await logAuditAction({
                    action: 'Invited Admin',
                    resource: formData.email,
                    details: {
                        name: formData.fullName,
                        role: formData.role,
                        permissions: formData.permissions
                    },
                    collegeId: adminData.collegeId
                });
            }

            if (onUpdate) onUpdate();
            onClose();
        } catch (err) {
            console.error(err);
            setError(err.message || "Failed to save admin account");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center z-[60] animate-in fade-in duration-200 p-4 sm:p-6 lg:p-8">
            <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in slide-in-from-bottom-4 duration-300">
                {/* Header */}
                <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
                    <div>
                        <h2 className="text-2xl font-black text-gray-900 leading-tight">{isEdit ? 'Edit Administrator' : 'Add New Admin'}</h2>
                        <p className="text-sm text-gray-500 font-medium">
                            {isEdit ? `Update role and accessibility for ${admin.name}` : 'Configure access and credentials for a new system administrator.'}
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-50 rounded-xl transition-colors text-gray-400 cursor-pointer">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="p-8 overflow-y-auto flex-1 custom-scrollbar">
                    <form onSubmit={handleSave}>
                        {error && (
                            <div className="mb-6 p-4 bg-rose-50 border border-rose-100 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                                <AlertTriangle className="w-5 h-5 text-rose-500" />
                                <p className="text-sm font-bold text-rose-600">{error}</p>
                            </div>
                        )}
                        {/* Name and Email */}
                        <div className="grid grid-cols-2 gap-6 mb-6">
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Full Name</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Rahul Sharma"
                                    value={formData.fullName}
                                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                                    className="w-full px-4 py-2.5 bg-gray-50 border-none rounded-xl text-sm font-bold text-gray-900 focus:ring-2 focus:ring-[#f47c20]/20 transition-all"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Email Address</label>
                                <input
                                    type="email"
                                    placeholder="rahul.s@vishnupass.com"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    disabled={isEdit}
                                    className={`w-full px-4 py-2.5 border-none rounded-xl text-sm font-bold transition-all ${isEdit ? 'bg-gray-100 text-gray-500' : 'bg-gray-50 text-gray-900 focus:ring-2 focus:ring-[#f47c20]/20'}`}
                                    required
                                />
                            </div>
                        </div>

                        {/* Role Designation */}
                        <div className="mb-8 relative z-20">
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Role Designation</label>

                            <div className="relative">
                                {/* Dropdown trigger */}
                                <div
                                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                    className={`w-full px-4 py-3 bg-gray-50 rounded-xl flex items-center justify-between cursor-pointer transition-all ${isDropdownOpen
                                        ? 'ring-2 ring-[#f47c20]/20 shadow-sm'
                                        : ''
                                        }`}
                                >
                                    <span className={`text-sm font-black ${formData.role ? 'text-gray-900' : 'text-gray-400'}`}>
                                        {formData.role || 'Select an admin role'}
                                    </span>
                                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
                                </div>

                                {/* Dropdown menu */}
                                {isDropdownOpen && (
                                    <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-100 rounded-2xl shadow-xl overflow-hidden z-30 animate-in fade-in slide-in-from-top-2 duration-150">
                                        <div className="py-2">
                                            {roles.map(role => (
                                                <button
                                                    key={role}
                                                    type="button"
                                                    onClick={() => {
                                                        setFormData({ ...formData, role });
                                                        setIsDropdownOpen(false);
                                                    }}
                                                    className="w-full text-left px-4 py-3 text-sm font-bold hover:bg-orange-50 hover:text-[#f47c20] transition-colors flex items-center justify-between group cursor-pointer"
                                                >
                                                    {role}
                                                    {formData.role === role && (
                                                        <ShieldCheck className="w-5 h-5 text-[#f47c20]" />
                                                    )}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Access Permissions */}
                        <div>
                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Access Permissions</h3>
                            <div className="grid grid-cols-2 gap-4">
                                {[
                                    { id: 'manageStudents', label: 'Manage Students', desc: 'Add, edit, or remove student records' },
                                    { id: 'approvePasses', label: 'Approve Passes', desc: 'Grant or deny exit/entry requests' },
                                    { id: 'securityGuards', label: 'Security Guards', desc: 'Manage guard shifts and assignments' },
                                    { id: 'auditLogs', label: 'Audit Logs', desc: 'Access and export system activity reports' },
                                    { id: 'deleteAdmins', label: 'Delete Other Admins', desc: 'Permanently remove administrator accounts' }
                                ].map((p) => (
                                    <label key={p.id} className={`flex items-start gap-4 p-5 rounded-2xl border transition-all cursor-pointer ${formData.permissions[p.id] ? 'bg-orange-50/50 border-[#f47c20]/20 shadow-sm' : 'bg-white border-gray-100 hover:border-gray-200'}`}>
                                        <div className="flex items-center h-5 mt-0.5">
                                            <input
                                                type="checkbox"
                                                checked={formData.permissions[p.id] || false}
                                                onChange={() => handlePermissionChange(p.id)}
                                                className="w-5 h-5 text-[#f47c20] border-gray-300 rounded-lg focus:ring-[#f47c20]/20 cursor-pointer transition-all"
                                            />
                                        </div>
                                        <div>
                                            <p className={`text-sm font-black mb-1 ${formData.permissions[p.id] ? 'text-[#f47c20]' : 'text-gray-900'}`}>{p.label}</p>
                                            <p className="text-[11px] text-gray-500 font-bold uppercase tracking-wider leading-tight">{p.desc}</p>
                                        </div>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Password Settings */}
                        {!isEdit && (
                            <div className="mt-8 border-t border-gray-100 pt-8">
                                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Password Settings</h3>
                                <div className="grid grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Password</label>
                                        <input
                                            type="password"
                                            placeholder="••••••••"
                                            value={formData.password}
                                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                            className="w-full px-4 py-2.5 bg-gray-50 border-none rounded-xl text-sm font-bold tracking-widest transition-all focus:ring-2 focus:ring-[#f47c20]/20"
                                            required={!isEdit}
                                            minLength={6}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Confirm Password</label>
                                        <input
                                            type="password"
                                            placeholder="••••••••"
                                            value={formData.confirmPassword}
                                            onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                                            className="w-full px-4 py-2.5 bg-gray-50 border-none rounded-xl text-sm font-bold tracking-widest transition-all focus:ring-2 focus:ring-[#f47c20]/20"
                                            required={!isEdit}
                                            minLength={6}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Footer Line */}
                        <div className="mt-10 pt-6 border-t border-gray-100 flex justify-end items-center gap-4 sticky bottom-0 bg-white pb-2">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-6 py-2.5 text-sm font-black text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="px-8 py-3 bg-[#f47c20] hover:bg-[#e06d1c] text-white rounded-2xl text-sm font-black shadow-lg shadow-orange-500/20 transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        {isEdit ? 'Updating...' : 'Creating...'}
                                    </>
                                ) : (
                                    isEdit ? 'Update Administrator' : 'Create Admin Account'
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default AddAdminModal;
