import React, { useState, useEffect } from 'react';
import { ChevronLeft, Mail, Shield, Calendar, Key, AlertTriangle } from 'lucide-react';
import { db } from '../../config/firebase';
import { collection, doc, getDoc, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { format } from 'date-fns';

const AdminProfile = ({ adminId, onBack, adminData: loggedInAdminData }) => {
    const [admin, setAdmin] = useState(null);
    const [loading, setLoading] = useState(true);

    const [activity, setActivity] = useState([]);

    useEffect(() => {
        const fetchData = async () => {
            if (!adminId || !loggedInAdminData?.collegeId) return;
            setLoading(true);
            try {
                // Fetch Admin Details
                const adminRef = doc(db, `colleges/${loggedInAdminData.collegeId}/admins`, adminId);
                const adminSnap = await getDoc(adminRef);

                if (!adminSnap.exists()) {
                    setAdmin(null);
                    setLoading(false);
                    return;
                }
                
                setAdmin({ id: adminSnap.id, ...adminSnap.data() });

                // Fetch Admin Activity
                const logsRef = collection(db, `colleges/${loggedInAdminData.collegeId}/audit_logs`);
                const q = query(
                    logsRef,
                    where('adminId', '==', adminId),
                    orderBy('createdAt', 'desc'),
                    limit(5)
                );
                
                const logsSnap = await getDocs(q);
                const activityData = [];
                logsSnap.forEach(docSnap => {
                    const data = docSnap.data();
                    activityData.push({
                        id: docSnap.id,
                        ...data,
                        createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt || 0)
                    });
                });

                setActivity(activityData);
            } catch (err) {
                console.error("Error fetching admin profile:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [adminId, loggedInAdminData?.collegeId]);

    const getInitials = (name) => {
        if (!name) return '??';
        const parts = name.trim().split(' ');
        if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
        return name.substring(0, 2).toUpperCase();
    };

    if (loading) {
        return (
            <div className="flex-1 overflow-y-auto p-10 bg-[#f8f9fb] flex justify-center items-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#f47c20]"></div>
            </div>
        );
    }

    if (!admin) {
        return (
            <div className="flex-1 overflow-y-auto p-10 bg-[#f8f9fb]">
                <button onClick={onBack} className="flex items-center text-gray-500 hover:text-gray-900 transition-colors mb-6 cursor-pointer">
                    <ChevronLeft className="w-5 h-5 mr-1" />
                    Back to Administrators
                </button>
                <div className="bg-white rounded-3xl p-10 border border-gray-100 shadow-sm text-center">
                    <h2 className="text-xl font-bold text-gray-900">Administrator Not Found</h2>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-y-auto p-10 bg-[#f8f9fb]">
            <button 
                onClick={onBack}
                className="flex items-center text-gray-500 font-medium hover:text-[#1a2b3c] transition-colors mb-6 cursor-pointer"
            >
                <ChevronLeft className="w-5 h-5 mr-1" />
                Back to Administrators
            </button>

            {/* Header Profile Card */}
            <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)] mb-8 flex items-center justify-between">
                <div className="flex items-center gap-6">
                    <div className="w-24 h-24 rounded-full flex items-center justify-center font-bold text-3xl flex-shrink-0 bg-[#fff5ec] text-[#f47c20] shadow-sm">
                        {getInitials(admin.name)}
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-[#1a2b3c] tracking-tight mb-2">{admin.name}</h1>
                        <span className={`inline-flex px-3 py-1 text-[11px] font-black uppercase tracking-widest rounded-full ${
                            admin.role === 'Super Admin' ? 'bg-[#fff5ec] text-[#f47c20]' : 
                            admin.role === 'Editor' ? 'bg-gray-100 text-gray-500' : 
                            'bg-blue-50 text-blue-600'
                        }`}>
                            {admin.role || 'Admin'}
                        </span>
                    </div>
                </div>
                <div className="text-right">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-50 border border-gray-100 mb-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${admin.status === 'Active' ? 'bg-emerald-500' : 'bg-gray-400'}`}></span>
                        <span className="text-sm font-bold text-gray-700">{admin.status || 'Active'}</span>
                    </div>
                    <p className="text-xs text-gray-500 font-medium text-right pr-2">
                        Account Status
                    </p>
                </div>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-2 gap-8">
                {/* Contact Info */}
                <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
                    <h3 className="font-bold text-[#1a2b3c] text-lg mb-6 flex items-center gap-2">
                        <Mail className="w-5 h-5 text-[#f47c20]" /> Contact Information
                    </h3>
                    <div className="space-y-6">
                        <div>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Email Address</p>
                            <p className="text-[#1a2b3c] font-medium">{admin.email}</p>
                        </div>
                        <div>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Internal Reference ID</p>
                            <p className="text-gray-500 text-sm">{admin.id}</p>
                        </div>
                    </div>
                </div>

                {/* Account Details */}
                <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
                    <h3 className="font-bold text-[#1a2b3c] text-lg mb-6 flex items-center gap-2">
                        <Shield className="w-5 h-5 text-[#f47c20]" /> Security Details
                    </h3>
                    <div className="space-y-6">
                        <div>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5" /> Account Created
                            </p>
                            <p className="text-[#1a2b3c] font-medium">
                                {admin.createdAt ? format(admin.createdAt?.toDate ? admin.createdAt.toDate() : new Date(admin.createdAt), 'MMM dd, yyyy - hh:mm a') : 'N/A'}
                            </p>
                        </div>
                        <div>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                                <Key className="w-3.5 h-3.5" /> Last Password Change
                            </p>
                            <p className="text-[#1a2b3c] font-medium">
                                {admin.passwordChangedAt ? format(admin.passwordChangedAt?.toDate ? admin.passwordChangedAt.toDate() : new Date(admin.passwordChangedAt), 'MMM dd, yyyy') : 'No recent changes recorded'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Activity Feed Placeholder */}
                <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)] col-span-2">
                    <h3 className="font-bold text-[#1a2b3c] text-lg mb-6 flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-[#f47c20]" /> Recent Activity Log
                    </h3>
                    
                    {activity.length > 0 ? (
                        <div className="space-y-4">
                            {activity.map((log) => (
                                <div key={log.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100/50">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs ${
                                            (log.action || '').includes('Register') ? 'bg-emerald-50 text-emerald-600' : 
                                            (log.action || '').includes('Role') ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-[#f47c20]'
                                        }`}>
                                            {(log.action || 'A').substring(0, 1)}
                                        </div>
                                        <div>
                                            <p className="font-bold text-[#1a2b3c] text-sm">{log.action}</p>
                                            <p className="text-xs text-gray-400 font-medium">Resource: {log.resource || 'System'}</p>
                                        </div>
                                    </div>
                                    <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">
                                        {format(log.createdAt, 'MMM dd, hh:mm a')}
                                    </p>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="bg-gray-50 rounded-2xl p-8 text-center border border-dashed border-gray-200">
                            <Shield className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                            <p className="text-sm font-bold text-gray-400">
                                No recent activity found for this administrator.
                            </p>
                            <p className="text-xs text-gray-400 font-medium mt-1">Actions like role changes or registrations will appear here.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdminProfile;
