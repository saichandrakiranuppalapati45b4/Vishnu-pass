import React, { useState, useEffect } from 'react';
import { UserPlus, Download, Filter, Shield, Loader2 } from 'lucide-react';
import { supabase } from '../../config/supabase';
import { logAuditAction } from '../../utils/auditLogger';
import { useNotification } from '../../contexts/NotificationContext';
import AddCollegeModal from './AddCollegeModal';

// Helper to generate initials from name
const getInitials = (name) => {
    if (!name) return '??';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
        return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
};

// Helper to generate a consistent color based on name string
const getAvatarColor = (name) => {
    if (!name) return '#94a3b8'; // default gray
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash % 360);
    return `hsl(${hue}, 65%, 45%)`;
};

const CollegeManagement = ({ onNavigate, currentCollege, collegeData }) => {
    const [colleges, setColleges] = useState([]);
    const [loading, setLoading] = useState(true);
    const { showNotification, showModal } = useNotification();
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingRoleId, setEditingRoleId] = useState(null);
    const [updating, setUpdating] = useState(null);

    const fetchColleges = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('admins')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;

            const mappedColleges = (data || []).map((college) => {
                const status = college.status || 'Active';
                return {
                    ...college,
                    initials: getInitials(college.name),
                    avatar: getAvatarColor(college.name),
                    roleBadge: college.role || 'Admin',
                    status: status,
                    statusColor: status === 'Inactive' ? 'text-gray-400' : 'text-emerald-500',
                };
            });

            setColleges(mappedColleges);
        } catch (err) {
            console.error("Error fetching admins:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchColleges();
    }, [showAddModal]);

    const handleToggleStatus = async (id, currentStatus, collegeName) => {
        const newStatus = currentStatus === 'Active' ? 'Inactive' : 'Active';
        setUpdating(id);
        try {
            const { error } = await supabase
                .from('admins')
                .update({ status: newStatus })
                .eq('id', id);

            if (error) throw error;
            
            await logAuditAction({
                action: newStatus === 'Active' ? 'Activated Admin' : 'Deactivated Admin',
                resource: `Admin: ${collegeName || id}`,
                details: { adminId: id, previousStatus: currentStatus, newStatus: newStatus }
            });

            setColleges(colleges.map(a => a.id === id ? { 
                ...a, 
                status: newStatus, 
                statusColor: newStatus === 'Inactive' ? 'text-gray-400' : 'text-emerald-500' 
            } : a));
        } catch (err) {
            console.error(err);
            showNotification("Failed to update status.", "error");
        } finally {
            setUpdating(null);
        }
    };

    const handleRoleChange = async (id, newRole, collegeName, oldRole) => {
        if (newRole === oldRole) {
            setEditingRoleId(null);
            return;
        }
        setUpdating(id);
        try {
            const { error } = await supabase
                .from('admins')
                .update({ role: newRole })
                .eq('id', id);

            if (error) throw error;

            await logAuditAction({
                action: 'Changed Role',
                resource: `Admin: ${collegeName || id}`,
                details: { adminId: id, oldRole, newRole }
            });

            setColleges(colleges.map(a => a.id === id ? { ...a, role: newRole, roleBadge: newRole } : a));
            setEditingRoleId(null);
        } catch (err) {
            console.error(err);
            showNotification("Failed to update role.", "error");
        } finally {
            setUpdating(null);
        }
    };

    const handleDeleteCollege = async (id, name, email) => {
        const confirmed = await showModal({
            title: 'Delete Administrator',
            message: `Are you sure you want to PERMANENTLY delete administrator ${name} (${email || 'no email'})?`,
            confirmText: 'Delete',
            cancelText: 'Cancel',
            type: 'warning'
        });

        if (!confirmed) {
            return;
        }

        setUpdating(id);
        try {
            const { error } = await supabase
                .from('admins')
                .delete()
                .eq('id', id);

            if (error) throw error;

            await logAuditAction({
                action: 'Deleted Admin',
                resource: `Admin: ${name} (${email})`,
                details: { adminId: id, email }
            });

            showNotification("Administrator deleted successfully.", "success");
            setColleges(colleges.filter(a => a.id !== id));
        } catch (err) {
            console.error(err);
            showNotification(`Failed to delete admin: ${err.message || "Unknown error"}`, "error");
        } finally {
            setUpdating(null);
        }
    };

    return (
        <div className="flex-1 overflow-y-auto p-10 bg-[#f8f9fb]">
            {/* Header */}
            <div className="flex items-start justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-black text-[#1a2b3c] mb-2 tracking-tight">System Collegeistrators</h1>
                    <p className="text-sm text-gray-500 font-medium">Manage system-wide permissions and portal access for staff members.</p>
                </div>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="flex items-center gap-2 px-6 py-3 bg-[#f47c20] hover:bg-[#e06d1c] text-white rounded-xl text-sm font-bold transition-all shadow-[0_4px_14px_rgba(244,124,32,0.3)] hover:shadow-[0_6px_20px_rgba(244,124,32,0.4)] hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
                >
                    <UserPlus className="w-4 h-4" />
                    Invite New College
                </button>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-3 gap-6 mb-8">
                {/* Total Colleges */}
                <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
                    <div className="flex items-center justify-between mb-4">
                        <p className="text-xs font-bold text-gray-400">Total Colleges</p>
                        <div className="w-10 h-10 bg-[#fff5ec] rounded-2xl flex items-center justify-center">
                            <Shield className="w-5 h-5 text-[#f47c20] fill-[#f47c20]/20" />
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <h3 className="text-[32px] font-black text-[#1a2b3c] leading-tight tracking-tight">
                            {loading ? <Loader2 className="w-6 h-6 animate-spin text-gray-400 inline" /> : colleges.length}
                        </h3>
                    </div>
                </div>

                {/* Active Sessions */}
                <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
                    <div className="flex items-center justify-between mb-4">
                        <p className="text-xs font-bold text-gray-400">Active Sessions</p>
                        <div className="w-10 h-10 bg-emerald-50 rounded-2xl flex items-center justify-center">
                            <svg className="w-5 h-5 text-emerald-500 fill-emerald-500/20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>
                        </div>
                    </div>
                    <h3 className="text-[32px] font-black text-[#1a2b3c] leading-tight tracking-tight">8</h3>
                </div>

                {/* Pending Invites */}
                <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
                    <div className="flex items-center justify-between mb-4">
                        <p className="text-xs font-bold text-gray-400">Pending Invites</p>
                        <div className="w-10 h-10 bg-amber-50 rounded-2xl flex items-center justify-center">
                            <svg className="w-5 h-5 text-amber-500 fill-amber-500/20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="2" /><path d="M22 7l-10 7L2 7" /></svg>
                        </div>
                    </div>
                    <h3 className="text-[32px] font-black text-[#1a2b3c] leading-tight tracking-tight">3</h3>
                </div>
            </div>

            {/* Collegeistrator List */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)] overflow-hidden mb-8">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-white">
                    <h3 className="font-bold text-[#1a2b3c] text-lg">Collegeistrator List</h3>
                    <div className="flex items-center gap-2">
                        <button className="p-2.5 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-xl transition-colors cursor-pointer">
                            <Filter className="w-4 h-4" />
                        </button>
                        <button 
                            onClick={() => {
                                // Exclude primary college from download for security
                                const exportData = colleges.filter(a => a.email !== 'saichandrakiranuppalapati@gmail.com');
                                showNotification("College list (excluding primary college) ready for export.", "success");
                            }}
                            className="p-2.5 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-xl transition-colors cursor-pointer"
                        >
                            <Download className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20">
                        <Loader2 className="w-8 h-8 text-[#f47c20] animate-spin mb-4" />
                        <p className="text-sm font-bold text-gray-400">Loading collegeistrators...</p>
                    </div>
                ) : colleges.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                            <Shield className="w-8 h-8 text-gray-300" />
                        </div>
                        <h3 className="text-base font-bold text-[#1a2b3c] mb-1">No Collegeistrators Found</h3>
                        <p className="text-sm text-gray-500">There are currently no collegeistrator accounts in the system.</p>
                    </div>
                ) : (
                    <table className="w-full text-left text-sm">
                        <thead>
                            <tr className="border-b border-gray-100 bg-[#f8f9fb]">
                                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Name</th>
                                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Role</th>
                                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Email Address</th>
                                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 bg-white">
                            {colleges.map((college) => (
                                <tr 
                                    key={college.id} 
                                    onClick={() => onNavigate('college-profile', college.id)}
                                    className="hover:bg-gray-50/50 transition-colors cursor-pointer"
                                >
                                    <td className="px-6 py-5">
                                        <div className="flex items-center gap-4">
                                            <div
                                                className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${
                                                    college.role === 'Super College' ? 'bg-[#fff5ec] text-[#f47c20]' : 
                                                    college.role === 'Editor' ? 'bg-gray-100 text-gray-500' : 
                                                    'bg-blue-50 text-blue-600'
                                                }`}
                                            >
                                                {college.initials}
                                            </div>
                                            <span className="font-bold text-[#1a2b3c]">{college.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5">
                                        {editingRoleId === college.id ? (
                                            <select
                                                autoFocus
                                                disabled={updating === college.id}
                                                defaultValue={college.role}
                                                onClick={(e) => e.stopPropagation()}
                                                onChange={(e) => handleRoleChange(college.id, e.target.value, college.name, college.role)}
                                                onBlur={() => setEditingRoleId(null)}
                                                className="bg-white border border-gray-200 text-[#1a2b3c] text-[11px] font-black rounded-lg focus:ring-2 focus:ring-[#f47c20] focus:border-transparent outline-none py-1.5 px-2 w-32 shadow-sm disabled:opacity-50"
                                            >
                                                <option value="Super College">Super College</option>
                                                <option value="Manager">Manager</option>
                                                <option value="Editor">Editor</option>
                                            </select>
                                        ) : (
                                            <span className={`inline-flex px-3 py-1 text-[11px] font-black rounded-full ${
                                                college.role === 'Super College' ? 'bg-[#fff5ec] text-[#f47c20]' : 
                                                college.role === 'Editor' ? 'bg-[#f8f9fb] text-[#1a2b3c]' : 
                                                'bg-[#f0f4f8] text-[#1a2b3c]'
                                            }`}>
                                                {college.role || 'Unassigned'}
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-5 text-gray-500 font-medium">{college.email}</td>
                                    <td className="px-6 py-5">
                                        <span className={`inline-flex items-center gap-1.5 text-xs font-bold ${college.statusColor} ${updating === college.id ? 'opacity-50' : ''}`}>
                                            <span className={`w-1.5 h-1.5 rounded-full ${college.status === 'Active' ? 'bg-emerald-500' : 'bg-gray-400'}`}></span>
                                            {college.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-5 text-right whitespace-nowrap">
                                        {editingRoleId !== college.id ? (
                                            <>
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); setEditingRoleId(college.id); }}
                                                    disabled={updating === college.id}
                                                    className="text-[13px] font-bold text-[#f47c20] hover:text-[#e06d1c] transition-colors mr-4 disabled:opacity-50 cursor-pointer"
                                                >
                                                    Edit Role
                                                </button>
                                                {currentCollege?.email?.toLowerCase().trim() === 'saichandrakiranuppalapati@gmail.com' && (
                                                    <button 
                                                        onClick={(e) => { 
                                                            e.stopPropagation(); 
                                                            handleDeleteCollege(college.id, college.name, college.email); 
                                                        }}
                                                        disabled={updating === college.id || college.id === currentCollege?.id}
                                                        className="px-4 py-1.5 text-[11px] font-black bg-red-50 text-red-600 hover:bg-red-600 hover:text-white rounded-lg border border-red-100 transition-all mr-4 disabled:opacity-30 disabled:cursor-not-allowed uppercase tracking-tighter cursor-pointer"
                                                    >
                                                        {updating === college.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Delete'}
                                                    </button>
                                                )}
                                            </>
                                        ) : (
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); setEditingRoleId(null); }}
                                                disabled={updating === college.id}
                                                className="text-[13px] font-bold text-gray-500 hover:text-gray-700 transition-colors mr-6 disabled:opacity-50 cursor-pointer"
                                            >
                                                Cancel
                                            </button>
                                        )}
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); handleToggleStatus(college.id, college.status, college.name); }}
                                            disabled={updating === college.id || college.role === 'Super College'}
                                            className={`text-[13px] font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${
                                                college.status === 'Active' ? 'text-red-500 hover:text-red-600' : 'text-emerald-500 hover:text-emerald-600'
                                            }`}
                                        >
                                            {updating === college.id ? (
                                                <Loader2 className="w-3.5 h-3.5 animate-spin inline" />
                                            ) : college.status === 'Active' ? 'Deactivate' : 'Activate'}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}


                {/* Footer */}
                <div className="flex items-center justify-between px-6 py-4 bg-[#f8f9fb]">
                    <p className="text-sm text-gray-500 font-medium">Showing {colleges.length} of {colleges.length} collegeistrators</p>
                    <div className="flex items-center gap-2 bg-white rounded-xl border border-gray-200 p-1">
                        <button className="text-[13px] font-bold text-gray-400 hover:bg-gray-50 px-4 py-1.5 rounded-lg transition-colors cursor-pointer">
                            Previous
                        </button>
                        <button className="text-[13px] font-bold text-[#1a2b3c] px-4 py-1.5 rounded-lg transition-colors shadow-sm border border-gray-100 cursor-pointer">
                            Next
                        </button>
                    </div>
                </div>
            </div>

            {/* Bottom Row: Quick Help + Security Audit */}
            <div className="grid grid-cols-2 gap-8">
                {/* Quick Help */}
                <div className="bg-[#fff5ec] rounded-3xl p-8 border border-[#f47c20]/10">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-8 h-8 bg-[#f47c20] rounded-full flex items-center justify-center text-white font-bold text-sm">
                            i
                        </div>
                        <h3 className="font-black text-[#1a2b3c] text-lg tracking-tight">Quick Help: Collegeistrator Roles</h3>
                    </div>

                    <div className="space-y-6">
                        <div className="flex items-start gap-4">
                            <span className="inline-flex px-3 py-1 text-[11px] font-black rounded bg-[#f47c20] text-white flex-shrink-0 mt-0.5">
                                SUPER
                            </span>
                            <div>
                                <h4 className="font-bold text-[#1a2b3c] text-sm mb-1">Super College</h4>
                                <p className="text-sm text-gray-500 font-medium leading-relaxed">
                                    Full access to all modules, including system settings and high-level user management.
                                </p>
                            </div>
                        </div>
                        <div className="flex items-start gap-4">
                            <span className="inline-flex px-3 py-1 text-[11px] font-black rounded bg-[#1a2b3c] text-white flex-shrink-0 mt-0.5">
                                MGR
                            </span>
                            <div>
                                <h4 className="font-bold text-[#1a2b3c] text-sm mb-1">Manager</h4>
                                <p className="text-sm text-gray-500 font-medium leading-relaxed">
                                    Can manage students and guards, generate reports, but cannot access system settings.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Security Audit */}
                <div className="bg-white rounded-3xl p-8 text-[#1a2b3c] relative overflow-hidden flex flex-col items-center justify-center text-center border border-gray-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
                    <div className="w-12 h-12 bg-[#fff5ec] rounded-xl flex items-center justify-center mb-6 shadow-sm">
                        <Shield className="w-6 h-6 text-[#f47c20] fill-[#f47c20]/10" />
                    </div>
                    
                    <h3 className="font-black text-2xl mb-4 tracking-tight">Security Audit</h3>
                    <p className="text-[15px] text-gray-500 font-medium leading-relaxed mb-8 max-w-sm">
                        Last system-wide security audit was completed 2 days ago. No unusual collegeistrative activity detected.
                    </p>
                    
                    <button
                        onClick={() => onNavigate('audit-logs')}
                        className="text-[#f47c20] font-bold text-sm transition-all hover:text-[#e06d1c] border-b-2 border-[#f47c20] pb-1 hover:border-[#e06d1c] cursor-pointer"
                    >
                        View Audit Logs
                    </button>
                </div>
            </div>

            {/* Modals */}
            {showAddModal && (
                <AddCollegeModal onClose={() => setShowAddModal(false)} collegeData={collegeData} />
            )}
        </div>
    );
};

export default CollegeManagement;
