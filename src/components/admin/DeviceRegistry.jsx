import React, { useState, useEffect } from 'react';
import { 
    Smartphone, 
    Search, 
    RefreshCw, 
    ChevronLeft,
    Shield,
    Trash2,
    CheckCircle2,
    AlertCircle,
    User
} from 'lucide-react';
import { db } from '../../config/firebase';
import { collection, getDocs } from 'firebase/firestore';

const DeviceRegistry = ({ onBack, adminData }) => {
    const [devices, setDevices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        fetchDevices();
    }, [adminData?.collegeId]);

    const fetchDevices = async () => {
        if (!adminData?.collegeId) return;
        setLoading(true);
        try {
            // First fetch devices
            const devicesRef = collection(db, `colleges/${adminData.collegeId}/devices`);
            const devicesSnap = await getDocs(devicesRef);
            
            // Then fetch students to map names
            const studentsRef = collection(db, `colleges/${adminData.collegeId}/students`);
            const studentsSnap = await getDocs(studentsRef);
            
            const studentsMap = {};
            studentsSnap.forEach(doc => {
                studentsMap[doc.id] = doc.data();
            });

            const fetchedDevices = [];
            devicesSnap.forEach(doc => {
                const data = doc.data();
                const studentData = studentsMap[data.studentId] || {};
                
                fetchedDevices.push({
                    id: doc.id,
                    ...data,
                    students: {
                        full_name: studentData.name || data.studentName || 'Unknown Student',
                        student_id: studentData.studentId || data.studentId || 'N/A'
                    }
                });
            });

            // Sort by last sync
            fetchedDevices.sort((a, b) => {
                const dateA = a.lastSync?.toDate ? a.lastSync.toDate() : new Date(a.lastSync || 0);
                const dateB = b.lastSync?.toDate ? b.lastSync.toDate() : new Date(b.lastSync || 0);
                return dateB - dateA;
            });
            
            setDevices(fetchedDevices);
        } catch (err) {
            console.error("Error fetching devices:", err);
            setDevices([]);
        } finally {
            setLoading(false);
        }
    };

    const filteredDevices = devices.filter(d => 
        d.students?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.deviceName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.deviceId?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="flex flex-col h-full animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <button 
                        onClick={onBack}
                        className="w-10 h-10 rounded-2xl bg-white border border-gray-100 flex items-center justify-center hover:bg-gray-50 hover:border-gray-200 transition-all text-gray-400 hover:text-gray-900 shadow-sm cursor-pointer"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h2 className="text-2xl font-black tracking-tight uppercase text-gray-900">Hardware Registry</h2>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Active Device Ecosystem</p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-[#f47c20] transition-colors" />
                        <input 
                            type="text" 
                            placeholder="SEARCH DEVICES..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="bg-gray-50 border border-gray-100 rounded-2xl py-3 pl-12 pr-6 text-[10px] font-bold tracking-widest uppercase focus:outline-none focus:ring-2 focus:ring-[#f47c20]/10 focus:border-[#f47c20] transition-all w-64 text-gray-900"
                        />
                    </div>
                    <button 
                        onClick={fetchDevices}
                        className="w-10 h-10 rounded-2xl bg-[#fff5ec] border border-[#f47c20]/20 flex items-center justify-center hover:bg-[#ffe8d6] transition-all text-[#f47c20] shadow-sm shadow-[#f47c20]/5 cursor-pointer"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {/* Content Table */}
            <div className="flex-1 overflow-hidden bg-white border border-gray-100 rounded-[40px] flex flex-col shadow-[0_10px_40px_rgba(0,0,0,0.02)]">
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="border-b border-gray-50 bg-gray-50/30">
                                <th className="px-8 py-6 text-left text-[9px] font-black uppercase tracking-[0.2em] text-gray-400">Student Ownership</th>
                                <th className="px-8 py-6 text-left text-[9px] font-black uppercase tracking-[0.2em] text-gray-400">Device Persona</th>
                                <th className="px-8 py-6 text-left text-[9px] font-black uppercase tracking-[0.2em] text-gray-400">Hardware ID</th>
                                <th className="px-8 py-6 text-left text-[9px] font-black uppercase tracking-[0.2em] text-gray-400">Security Status</th>
                                <th className="px-8 py-6 text-right text-[9px] font-black uppercase tracking-[0.2em] text-gray-400">Last Sync</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {loading ? (
                                Array(5).fill(0).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan="5" className="px-8 py-6 h-20 bg-gray-50/50" />
                                    </tr>
                                ))
                            ) : filteredDevices.length > 0 ? (
                                filteredDevices.map((device) => (
                                    <tr 
                                        key={device.id}
                                        className="group hover:bg-gray-50/50 transition-colors"
                                    >
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center shadow-sm">
                                                    <User className="w-5 h-5 text-indigo-500" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-black tracking-tight uppercase leading-none mb-1 text-gray-900">{device.students?.full_name}</p>
                                                    <p className="text-[10px] text-gray-400 font-bold tracking-widest uppercase">{device.students?.student_id}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-3">
                                                <Smartphone className="w-4 h-4 text-gray-300" />
                                                <p className="text-xs font-black tracking-tight uppercase text-gray-600">{device.deviceName || 'Unknown Device'}</p>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <code className="px-3 py-1.5 bg-gray-50 rounded-xl border border-gray-100 text-[10px] font-mono font-bold text-[#f47c20] tracking-wider uppercase">
                                                {device.deviceId || 'N/A'}
                                            </code>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border ${
                                                device.status === 'Trusted' 
                                                ? 'bg-emerald-50 border-emerald-100 text-emerald-600' 
                                                : 'bg-amber-50 border-amber-100 text-amber-600'
                                            }`}>
                                                {device.status === 'Trusted' ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                                                <span className="text-[9px] font-black uppercase tracking-wider">{device.status || 'Pending'}</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6 text-right">
                                            <p className="text-[10px] font-black text-gray-900 uppercase tracking-widest mb-1">
                                                {device.lastSync ? (device.lastSync?.toDate ? device.lastSync.toDate() : new Date(device.lastSync)).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Never'}
                                            </p>
                                            <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">
                                                {device.lastSync ? (device.lastSync?.toDate ? device.lastSync.toDate() : new Date(device.lastSync)).toLocaleDateString() : ''}
                                            </p>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="5" className="px-8 py-20 text-center">
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] font-sans">No devices detected in active registry</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default DeviceRegistry;
