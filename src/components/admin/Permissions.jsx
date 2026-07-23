import React, { useState, useEffect } from 'react';
import { Shield, Lock, CheckCircle2, AlertCircle, Save, RotateCcw, ShieldCheck, Users, FileText, Bell } from 'lucide-react';
import { db } from '../../config/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const Permissions = ({ adminData }) => {
    const [saving, setSaving] = useState(false);
    
    const roles = [
        { id: 'super_admin', name: 'Super Admin', color: '#f47c20' },
        { id: 'admin', name: 'Administrator', color: '#1a2b3c' },
        { id: 'editor', name: 'Editor', color: '#64748b' }
    ];

    const [permissionMatrix, setPermissionMatrix] = useState({
        manage_students: { super_admin: true, admin: true, editor: true },
        approve_passes: { super_admin: true, admin: true, editor: false },
        guard_management: { super_admin: true, admin: false, editor: false },
        audit_logs: { super_admin: true, admin: false, editor: false },
        system_settings: { super_admin: true, admin: false, editor: false },
        reports_view: { super_admin: true, admin: true, editor: true }
    });

    const permissionLabels = {
        manage_students: { label: 'Student Management', description: 'Create, edit, and delete student records', icon: Users },
        approve_passes: { label: 'Pass Approval', description: 'Approve or revoke student gate passes', icon: CheckCircle2 },
        guard_management: { label: 'Guard Management', description: 'Register and manage security guard accounts', icon: Shield },
        audit_logs: { label: 'System Audit Logs', description: 'View detailed system and security logs', icon: FileText },
        system_settings: { label: 'System Settings', description: 'Modify portal branding and global configurations', icon: Lock },
        reports_view: { label: 'Reports & Analytics', description: 'Access detailed movement and activity reports', icon: Bell }
    };

    useEffect(() => {
        const fetchPermissions = async () => {
            if (!adminData?.collegeId) return;
            try {
                const docRef = doc(db, `colleges/${adminData.collegeId}/settings`, 'permissions');
                const docSnap = await getDoc(docRef);
                if (docSnap.exists() && docSnap.data().matrix) {
                    setPermissionMatrix(docSnap.data().matrix);
                }
            } catch (err) {
                console.error("Error fetching permissions:", err);
            }
        };
        fetchPermissions();
    }, [adminData?.collegeId]);

    const handleToggle = (perm, role) => {
        if (role === 'super_admin') return; // Super admin permissions are locked
        setPermissionMatrix(prev => ({
            ...prev,
            [perm]: {
                ...prev[perm],
                [role]: !prev[perm][role]
            }
        }));
    };

    const handleSave = async () => {
        if (!adminData?.collegeId) return;
        setSaving(true);
        try {
            const docRef = doc(db, `colleges/${adminData.collegeId}/settings`, 'permissions');
            await setDoc(docRef, { matrix: permissionMatrix }, { merge: true });
        } catch (_err) {
            console.error("Failed to save permissions:", _err);
        } finally {
            setSaving(false);
        }
    };

    const handleReset = async () => {
        const fetchPermissions = async () => {
            if (!adminData?.collegeId) return;
            try {
                const docRef = doc(db, `colleges/${adminData.collegeId}/settings`, 'permissions');
                const docSnap = await getDoc(docRef);
                if (docSnap.exists() && docSnap.data().matrix) {
                    setPermissionMatrix(docSnap.data().matrix);
                }
            } catch (err) {
                console.error("Error resetting permissions:", err);
            }
        };
        fetchPermissions();
    };

    return (
        <div className="flex-1 overflow-y-auto p-8 bg-[#f8f9fb]">
            {/* Header */}
            <div className="mb-8 flex items-center justify-between">
                <div>
                    <h1 className="text-[26px] font-bold text-gray-900 mb-1 italic">Role Permissions</h1>
                    <p className="text-sm text-gray-500 font-medium text-left">Configure granular access levels for different administrative roles.</p>
                </div>
                <div className="flex items-center gap-3">
                    <button 
                        onClick={handleReset}
                        className="p-2.5 bg-white border border-gray-100 rounded-xl text-gray-400 hover:text-gray-600 shadow-sm transition-all active:rotate-180 duration-500 cursor-pointer"
                    >
                        <RotateCcw className="w-5 h-5" />
                    </button>
                    <button 
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center gap-2 px-6 py-2.5 bg-[#f47c20] text-white font-black rounded-xl text-xs shadow-lg shadow-orange-500/20 hover:bg-[#e06d1c] transition-all active:scale-95 disabled:opacity-70 cursor-pointer"
                    >
                        {saving ? (
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <Save className="w-4 h-4" />
                        )}
                        {saving ? 'SAVING...' : 'SAVE CHANGES'}
                    </button>
                </div>
            </div>

            {/* Permission Matrix */}
            <div className="bg-white rounded-[32px] border border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50/50">
                                <th className="py-6 px-8 border-b border-gray-100 min-w-[300px]">
                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Module Permission</span>
                                </th>
                                {roles.map(role => (
                                    <th key={role.id} className="py-6 px-4 border-b border-gray-100 text-center">
                                        <div className="inline-flex flex-col items-center">
                                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1">Role</span>
                                            <span className="text-xs font-black text-gray-900 px-3 py-1 bg-white rounded-lg border border-gray-100 shadow-sm">
                                                {role.name}
                                            </span>
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {Object.entries(permissionMatrix).map(([permKey, rolePerms]) => {
                                const Meta = permissionLabels[permKey];
                                const Icon = Meta.icon;
                                return (
                                    <tr key={permKey} className="group hover:bg-gray-50/30 transition-colors">
                                        <td className="py-6 px-8">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 bg-[#f8fafc] rounded-xl flex items-center justify-center text-gray-400 group-hover:text-[#f47c20] group-hover:bg-[#fff4eb] transition-all">
                                                    <Icon className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-[#1a2b3c] text-sm">{Meta.label}</p>
                                                    <p className="text-[11px] text-gray-400 font-medium leading-tight mt-0.5">{Meta.description}</p>
                                                </div>
                                            </div>
                                        </td>
                                        {roles.map(role => (
                                            <td key={`${permKey}-${role.id}`} className="py-6 px-4 text-center">
                                                <button
                                                    onClick={() => handleToggle(permKey, role.id)}
                                                    disabled={role.id === 'super_admin'}
                                                    className={`w-10 h-10 rounded-2xl flex items-center justify-center mx-auto transition-all cursor-pointer ${
                                                        rolePerms[role.id] 
                                                        ? 'bg-emerald-50 text-emerald-600 shadow-sm scale-110' 
                                                        : 'bg-gray-50 text-gray-300'
                                                    } ${role.id !== 'super_admin' && 'hover:scale-105 active:scale-95'}`}
                                                >
                                                    {rolePerms[role.id] ? (
                                                        <ShieldCheck className="w-5 h-5 shadow-emerald-500/20" />
                                                    ) : (
                                                        <Lock className="w-4 h-4 opacity-40" />
                                                    )}
                                                </button>
                                            </td>
                                        ))}
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Security Note */}
            <div className="mt-8 flex items-start gap-4 p-6 bg-blue-50/50 rounded-2xl border border-blue-100/50">
                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm">
                    <AlertCircle className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                    <h4 className="text-sm font-black text-blue-900 uppercase tracking-tight mb-1">Security Enforcement Notice</h4>
                    <p className="text-[11px] text-blue-700 font-medium leading-relaxed">
                        Changes to role-based permissions will take effect immediately. Administrators associated with these roles will experience updated access levels across the portal including restricted modules and authorized data views.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Permissions;
