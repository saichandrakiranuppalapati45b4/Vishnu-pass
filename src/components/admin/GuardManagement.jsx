import React, { useState, useEffect } from 'react';
import { ChevronRight, ChevronLeft, MoreVertical, MapPin } from 'lucide-react';
import RegisterGuard from './RegisterGuard';
import GuardProfile from './GuardProfile';
import { db } from '../../config/firebase';
import { collection, getDocs, doc, deleteDoc, updateDoc, query, orderBy } from 'firebase/firestore';
import { formatDistanceToNow } from 'date-fns';
import { useNotification } from '../../contexts/NotificationContext';

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

const GuardManagement = ({ adminData }) => {
    const [activeTab, setActiveTab] = useState('all');
    const [isRegistering, setIsRegistering] = useState(false);
    const [selectedGuard, setSelectedGuard] = useState(null);
    const [openDropdownId, setOpenDropdownId] = useState(null);
    const [editGuardData, setEditGuardData] = useState(null);
    const [guards, setGuards] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const { showNotification, showModal } = useNotification();

    const tabs = [
        { key: 'all', label: 'All Guards' },
        { key: 'active', label: 'Active' },
        { key: 'offline', label: 'Offline' },
    ];

    useEffect(() => {
        fetchGuards();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isRegistering, adminData]);

    const fetchGuards = async () => {
        if (!adminData?.collegeId) return;
        try {
            setIsLoading(true);
            const guardsRef = collection(db, `colleges/${adminData.collegeId}/guards`);
            const q = query(guardsRef, orderBy('createdAt', 'desc'));
            const querySnapshot = await getDocs(q);
            
            const guardsList = [];
            querySnapshot.forEach((doc) => {
                guardsList.push({ id: doc.id, ...doc.data() });
            });
            
            // Note: Since we are not doing a join, we can fetch gates in parallel or display gateId
            // In a real app we might fetch all gates and map them here
            const gatesRef = collection(db, `colleges/${adminData.collegeId}/gates`);
            const gatesSnap = await getDocs(gatesRef);
            const gatesMap = {};
            gatesSnap.forEach(d => { gatesMap[d.id] = d.data().name; });
            
            const enrichedGuards = guardsList.map(g => ({
                ...g,
                gateName: g.assignedGate ? gatesMap[g.assignedGate] : null
            }));

            setGuards(enrichedGuards);
        } catch (error) {
            console.error("Error fetching guards:", error);
            showNotification("Failed to fetch guards", "error");
        } finally {
            setIsLoading(false);
        }
    };

    // Filter guards based on activeTab
    const filteredGuards = guards.filter((guard) => {
        if (activeTab === 'all') return guard.status !== 'Inactive';
        if (activeTab === 'active') return guard.status === 'Active';
        if (activeTab === 'offline') return guard.status === 'Offline';
        return false;
    });

    const handleActionClick = (e, guardId) => {
        e.stopPropagation(); // Prevent opening the profile view
        setOpenDropdownId(openDropdownId === guardId ? null : guardId);
    };

    const handleEditGuard = (e, guard) => {
        e.stopPropagation();
        setOpenDropdownId(null);
        setEditGuardData(guard);
        setIsRegistering(true);
    };

    const handleDeleteGuard = async (e, guardId) => {
        e.stopPropagation();
        setOpenDropdownId(null);

        const confirmed = await showModal({
            title: 'Deactivate Guard',
            message: "Are you sure you want to deactivate this guard profile? They will no longer be able to log in.",
            confirmText: 'Deactivate',
            cancelText: 'Cancel',
            type: 'warning'
        });

        if (confirmed) {
            try {
                const guardRef = doc(db, `colleges/${adminData.collegeId}/guards`, guardId);
                await updateDoc(guardRef, { status: 'Inactive' });
                fetchGuards();
                showNotification('Guard profile deactivated successfully.', 'success');
            } catch (err) {
                showNotification("Failed to deactivate guard.", "error");
            }
        }
    };

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = () => setOpenDropdownId(null);
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, []);

    return (
        <>
            {isRegistering ? (
                <RegisterGuard
                    adminData={adminData}
                    initialData={editGuardData}
                    onCancel={() => {
                        setIsRegistering(false);
                        setEditGuardData(null);
                    }}
                />
            ) : selectedGuard ? (
                <GuardProfile
                    adminData={adminData}
                    guard={selectedGuard}
                    onBack={() => setSelectedGuard(null)}
                    onEdit={(guard) => {
                        setEditGuardData(guard);
                        setSelectedGuard(null);
                        setIsRegistering(true);
                    }}
                />
            ) : (
                <div className="flex-1 overflow-y-auto p-8">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-6">
                        <div>
                            <h1 className="text-[26px] font-bold text-gray-900 mb-1">Guard Directory</h1>
                            <p className="text-sm text-gray-500 font-medium">Manage and monitor security personnel across all gates.</p>
                        </div>
                        <button
                            onClick={() => setIsRegistering(true)}
                            className="flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors shadow-sm cursor-pointer"
                        >
                            Register Guard
                        </button>
                    </div>

                    {/* Stat Cards */}
                    <div className="grid grid-cols-3 gap-5 mb-8">
                        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.04)] relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-1 h-full bg-blue-500 rounded-r-full"></div>
                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1 ml-3">Total Guards</p>
                            <h3 className="text-[28px] font-bold text-gray-900 leading-tight ml-3">
                                {isLoading ? '...' : guards.filter(g => g.status !== 'Inactive').length}
                            </h3>
                        </div>

                        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.04)] relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500 rounded-r-full"></div>
                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1 ml-3">Active Now</p>
                            <h3 className="text-[28px] font-bold text-emerald-600 leading-tight ml-3">
                                {isLoading ? '...' : guards.filter(g => g.status === 'Active').length}
                            </h3>
                        </div>

                        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.04)] relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-1 h-full bg-amber-500 rounded-r-full"></div>
                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1 ml-3">Offline</p>
                            <h3 className="text-[28px] font-bold text-amber-600 leading-tight ml-3">
                                {isLoading ? '...' : guards.filter(g => g.status === 'Offline').length}
                            </h3>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="flex items-center gap-6 border-b border-gray-100 mb-6">
                        {tabs.map((tab) => (
                            <button
                                key={tab.key}
                                onClick={() => setActiveTab(tab.key)}
                                className={`pb-3 text-sm font-semibold transition-colors relative cursor-pointer ${activeTab === tab.key ? 'text-[#f47c20]' : 'text-gray-400 hover:text-gray-600'
                                    }`}
                            >
                                {tab.label}
                                {activeTab === tab.key && (
                                    <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#f47c20] rounded-full"></div>
                                )}
                            </button>
                        ))}
                    </div>

                    {/* Table */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
                        <table className="w-full text-left text-sm">
                            <thead>
                                <tr className="border-b border-gray-100">
                                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Guard Member</th>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Assigned Gate</th>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Contact Info</th>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {isLoading ? (
                                    <tr>
                                        <td colSpan="5" className="px-6 py-12 text-center text-gray-400">Loading guards...</td>
                                    </tr>
                                ) : filteredGuards.length === 0 ? (
                                    <tr>
                                        <td colSpan="5" className="px-6 py-12 text-center text-gray-400">No guards found.</td>
                                    </tr>
                                ) : (
                                    filteredGuards.map((guard) => (
                                        <tr
                                            key={guard.id}
                                            onClick={() => setSelectedGuard(guard)}
                                            className="hover:bg-gray-50/50 transition-colors group cursor-pointer"
                                        >
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    {guard.photoUrl || guard.photo_url ? (
                                                        <img src={guard.photoUrl || guard.photo_url} alt="" className="w-9 h-9 rounded-full object-cover border border-gray-100" />
                                                    ) : (
                                                        <div
                                                            className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold"
                                                            style={{ backgroundColor: stringToColor(guard.fullName || guard.full_name || 'Guard') }}
                                                        >
                                                            {(guard.fullName || guard.full_name || 'G').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                                                        </div>
                                                    )}
                                                    <div>
                                                        <p className="font-semibold text-gray-900 text-sm">{guard.fullName || guard.full_name}</p>
                                                        <p className="text-xs text-gray-400 font-medium">{guard.employeeId || guard.employee_id || 'Security personnel'}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center gap-1.5 text-xs font-bold ${guard.status === 'Active' ? 'text-emerald-600' : 'text-gray-500'}`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full ${guard.status === 'Active' ? 'bg-emerald-500' : 'bg-gray-400'}`}></span>
                                                    {guard.status?.toUpperCase() || 'UNKNOWN'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2 text-sm text-gray-600 font-medium">
                                                    <span className="text-base text-gray-400"><MapPin size={16} /></span>
                                                    {guard.gateName || 'Unassigned'}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-600 font-medium">{guard.contactNumber || guard.contact_number}</td>
                                            <td className="px-6 py-4 text-right relative">
                                                <button
                                                    onClick={(e) => handleActionClick(e, guard.id)}
                                                    className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                                                >
                                                    <MoreVertical className="w-4 h-4" />
                                                </button>

                                                {/* Dropdown Menu */}
                                                {openDropdownId === guard.id && (
                                                    <div className="absolute right-6 top-10 w-40 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50 animate-in fade-in zoom-in-95 duration-100">
                                                        <button
                                                            onClick={(e) => handleEditGuard(e, guard)}
                                                            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-[#f47c20] transition-colors cursor-pointer"
                                                        >
                                                            Edit Profile
                                                        </button>
                                                        <button
                                                            onClick={(e) => handleDeleteGuard(e, guard.id)}
                                                            className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                                                        >
                                                            Deactivate Profile
                                                        </button>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>

                        {/* Pagination footer - simplified for now */}
                        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
                            <p className="text-sm text-gray-400 font-medium">Showing {filteredGuards.length} guards</p>
                            <div className="flex items-center gap-1">
                                <button className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                                    <ChevronLeft className="w-4 h-4" />
                                </button>
                                <button className="w-8 h-8 flex items-center justify-center bg-[#f47c20] text-white rounded-lg text-sm font-bold">1</button>
                                <button className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default GuardManagement;
