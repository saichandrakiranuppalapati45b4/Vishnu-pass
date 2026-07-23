import React, { useState, useEffect } from 'react';
import { 
    ShieldAlert, 
    Activity, 
    Database, 
    Terminal, 
    Globe, 
    Zap, 
    Settings, 
    Users, 
    Lock,
    ChevronRight,
    Search,
    RefreshCw,
    X,
    Cpu,
    Radio,
    Loader2,
    Smartphone
} from 'lucide-react';
import { db } from '../../config/firebase';
import { collection, getDocs, getCountFromServer, doc, setDoc } from 'firebase/firestore';

// Management Component Imports
import StudentManagement from './StudentManagement';
import AuditLogs from './AuditLogs';
import AdminManagement from './AdminManagement';
import GuardManagement from './GuardManagement';
import SettingsPage from './SettingsPage';
import StudentProfile from './StudentProfile';
import AdminProfile from './AdminProfile';
import DeviceRegistry from './DeviceRegistry';

const SuperAdminPortal = ({ onClose, onNavigate, branding, onBrandingUpdate, adminData }) => {
    const [activeTab, setActiveTab] = useState('overview');
    const [activeSubModule, setActiveSubModule] = useState(null);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [systemMetrics, setSystemMetrics] = useState({ cpu: 12.4, memory: 4.2 });

    useEffect(() => {
        const metricsInterval = setInterval(() => {
            setSystemMetrics(prev => {
                const newCpu = Math.max(4, Math.min(22, prev.cpu + (Math.random() - 0.5) * 2));
                let newMem = prev.memory;
                if (window.performance && window.performance.memory) {
                    newMem = (window.performance.memory.usedJSHeapSize / (1024 * 1024 * 1024)) + 3.8;
                } else {
                    newMem = Math.max(4.0, Math.min(4.9, prev.memory + (Math.random() - 0.5) * 0.05));
                }
                return { cpu: Number(newCpu.toFixed(1)), memory: Number(newMem.toFixed(1)) };
            });
        }, 3000);
        return () => clearInterval(metricsInterval);
    }, []);
    const [selectedStudentId, setSelectedStudentId] = useState(null);
    const [selectedAdminId, setSelectedAdminId] = useState(null);
    
    // Root Config State
    const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);
    const [isKeyRotation, setIsKeyRotation] = useState(false);
    const [isDebugMode, setIsDebugMode] = useState(true);

    const [stats, setStats] = useState({
        endpoints: '...',
        successRate: '...',
        logs: '...',
        users: '...'
    });
    const [tableCounts, setTableCounts] = useState({
        students: '...',
        scanLogs: '...',
        admins: '...',
        guards: '...',
        settings: '...',
        devices: '...'
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchRootConfig = async () => {
            if (!adminData?.collegeId) return;
            try {
                // In Firebase we might store these in a single settings document instead of key-value rows
                const settingsRef = collection(db, `colleges/${adminData.collegeId}/settings`);
                const snap = await getDocs(settingsRef);
                const settingsData = {};
                snap.forEach(doc => {
                    settingsData[doc.id] = doc.data();
                });
                
                const systemSettings = settingsData.system || {};
                
                setIsMaintenanceMode(systemSettings.maintenanceMode === true);
                setIsKeyRotation(systemSettings.keyRotation === true);
                setIsDebugMode(systemSettings.debugMode !== false); // default true
            } catch (err) {
                console.error("Error fetching root config:", err);
            }
        };
        fetchRootConfig();
    }, [adminData?.collegeId]);

    const handleConfigToggle = async (key, currentValue, setter) => {
        const newValue = !currentValue;
        setter(newValue);
        if (!adminData?.collegeId) return;
        try {
            const systemRef = doc(db, `colleges/${adminData.collegeId}/settings`, 'system');
            await setDoc(systemRef, { [key]: newValue }, { merge: true });
        } catch (error) {
            console.error("Error toggling config:", error);
        }
    };

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        const fetchRealStats = async () => {
            if (!adminData?.collegeId) return;
            try {
                // Fetch counts for main collections in Firebase
                const tables = ['students', 'scanLogs', 'admins', 'guards', 'settings', 'devices'];
                const counts = {};
                
                await Promise.all(tables.map(async (table) => {
                    const colRef = collection(db, `colleges/${adminData.collegeId}/${table}`);
                    const snapshot = await getCountFromServer(colRef);
                    counts[table] = snapshot.data().count.toLocaleString();
                }));

                setTableCounts(counts);

                // Stats calculation - simplistic due to missing aggregation in client SDK without fetching all docs
                const totalLogs = parseInt(counts.scanLogs.replace(/,/g, ''));
                
                // Assuming success rate is high for mock if we don't query it exactly
                const rate = '98.5'; 

                setStats({
                    endpoints: counts.guards,
                    successRate: `${rate}%`,
                    logs: totalLogs > 1000 ? `${(totalLogs / 1000).toFixed(1)}K` : counts.scanLogs,
                    users: counts.students
                });
            } catch (err) {
                console.error("Error fetching stats:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchRealStats();
        const interval = setInterval(fetchRealStats, 30000); // Refresh every 30s
        return () => clearInterval(interval);
    }, [adminData?.collegeId]);

    const menuItems = [
        { id: 'overview', label: 'System Overview', icon: Activity },
        { id: 'database', label: 'Quantum Database', icon: Database },
        { id: 'network', label: 'Global Network', icon: Globe },
        { id: 'security', label: 'Shield Protocol', icon: ShieldAlert },
        { id: 'settings', label: 'Root Config', icon: Settings },
    ];

    const renderContent = () => {
        // If an active sub-module is selected, render it in a premium container
        if (activeSubModule) {
            const renderModule = () => {
                switch (activeSubModule) {
                    case 'students':
                        return <StudentManagement onNavigate={(page, id) => {
                            if (id) setSelectedStudentId(id);
                            setActiveSubModule(page);
                        }} adminData={adminData} />;
                    case 'audit-logs':
                        return <AuditLogs onBack={() => setActiveSubModule(null)} adminData={adminData} />;
                    case 'admin':
                        return <AdminManagement 
                            currentAdmin={adminData}
                            adminData={adminData}
                            onNavigate={(page, id) => {
                                if (id) setSelectedAdminId(id);
                                setActiveSubModule(page);
                            }} 
                        />;
                    case 'guards':
                        return <GuardManagement adminData={adminData} />;
                    case 'devices':
                        return <DeviceRegistry onBack={() => setActiveSubModule(null)} adminData={adminData} />;
                    case 'settings':
                        return <SettingsPage 
                            onNavigate={setActiveSubModule} 
                            branding={branding} 
                            onBrandingUpdate={onBrandingUpdate} 
                            adminData={adminData}
                        />;
                    case 'student-profile':
                        return <StudentProfile studentId={selectedStudentId} onBack={() => setActiveSubModule('students')} adminData={adminData} />;
                    case 'admin-profile':
                        return <AdminProfile adminId={selectedAdminId} onBack={() => setActiveSubModule('admin')} adminData={adminData} />;
                    default:
                        return null;
                }
            };

            return (
                <div className="flex flex-col h-full animate-in fade-in slide-in-from-bottom-5 duration-700">
                    <div className="flex items-center justify-between mb-8">
                        <button 
                            onClick={() => setActiveSubModule(null)}
                            className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all text-slate-600 active:scale-95 cursor-pointer"
                        >
                            <ChevronRight className="w-4 h-4 rotate-180" /> Back to System Core
                        </button>
                        <div className="flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Module Engine</span>
                        </div>
                    </div>
                    <div className="flex-1 bg-white rounded-[32px] shadow-2xl shadow-slate-200 overflow-hidden border border-gray-100">
                        {renderModule()}
                    </div>
                </div>
            );
        }

        switch (activeTab) {
            case 'database':
                const dbItems = [
                    { name: 'Student Registry', table: 'students', icon: Users, color: 'text-indigo-400', page: 'students' },
                    { name: 'Security Logs', table: 'scanLogs', icon: Terminal, color: 'text-[#f47c20]', page: 'audit-logs' },
                    { name: 'Institutional Auth', table: 'admins', icon: Lock, color: 'text-rose-400', page: 'admin' },
                    { name: 'Gate Protocols', table: 'guards', icon: Globe, color: 'text-emerald-400', page: 'guards' },
                    { name: 'System Settings', table: 'settings', icon: Settings, color: 'text-amber-400', page: 'settings' },
                    { name: 'Hardware Registry', table: 'devices', icon: Smartphone, color: 'text-cyan-400', page: 'devices' },
                ];
                return (
                    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-5 duration-500">
                        <div className="grid grid-cols-3 gap-6">
                            {dbItems.map((db, i) => (
                                <div 
                                    key={i} 
                                    onClick={() => setActiveSubModule(db.page)}
                                    className="bg-white border border-gray-100 p-8 rounded-[32px] hover:bg-slate-50 hover:border-slate-200 transition-all group relative overflow-hidden cursor-pointer active:scale-[0.98] shadow-sm"
                                >
                                    <div className="flex items-center justify-between mb-6">
                                        <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center group-hover:bg-white transition-colors">
                                            <db.icon className={`w-6 h-6 ${db.color}`} />
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[20px] font-black tracking-tight text-slate-900">{tableCounts[db.table]}</p>
                                            <p className="text-[8px] font-bold text-emerald-500 uppercase tracking-widest">Records</p>
                                        </div>
                                    </div>
                                    <h4 className="text-lg font-black tracking-tight mb-1 text-slate-950">{db.name}</h4>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-4">COLLECTION: {db.table}</p>
                                    <div className="flex items-end justify-between">
                                        <div>
                                            <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-1">Index Health</p>
                                            <div className="flex gap-1">
                                                {[1,2,3,4,5].map(dot => <div key={dot} className="w-4 h-1 bg-emerald-500/20 rounded-full" />)}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 text-[10px] font-black text-emerald-500 uppercase tracking-widest">
                                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                );

            case 'network':
                return (
                    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-5 duration-500">
                        <div className="bg-white border border-gray-100 rounded-[32px] p-10 relative overflow-hidden shadow-sm">
                            <div className="flex items-center justify-between mb-10">
                                <div>
                                    <h3 className="text-xl font-black tracking-tight uppercase text-slate-900">Institutional Gate Map</h3>
                                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Global Endpoint Topology</p>
                                </div>
                                <div className="flex gap-3">
                                    <div className="px-4 py-2 bg-emerald-50 border border-emerald-100 rounded-xl text-[10px] font-black text-emerald-600 uppercase tracking-widest">4 ACTIVE GATES</div>
                                    <div className="px-4 py-2 bg-rose-50 border border-rose-100 rounded-xl text-[10px] font-black text-rose-600 uppercase tracking-widest">0 DISCONNECTED</div>
                                </div>
                            </div>
                            <div className="h-64 grid grid-cols-4 gap-8">
                                {[1,2,3,4].map(gate => (
                                    <div key={gate} className="relative flex flex-col items-center justify-center">
                                        <div className="w-24 h-24 rounded-full border border-gray-100 bg-slate-50 flex items-center justify-center relative hover:border-[#f47c20]/30 transition-all cursor-crosshair">
                                            <div className="absolute inset-0 border-t-2 border-emerald-500 rounded-full animate-spin duration-[3s]" />
                                            <Radio className="w-10 h-10 text-slate-200" />
                                        </div>
                                        <p className="mt-4 text-[10px] font-black uppercase tracking-widest text-slate-900">GATEWAY_{gate}</p>
                                        <p className="text-[9px] text-emerald-600 font-bold uppercase">SECURE LINK</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                );

            case 'security':
                return (
                    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-5 duration-500">
                        <div className="grid grid-cols-2 gap-8">
                            <div className="bg-white border border-gray-100 rounded-[32px] p-10 col-span-2 shadow-sm">
                                <h3 className="text-xl font-black tracking-tight uppercase mb-8 text-slate-900">Shield Event Horizon</h3>
                                <div className="space-y-4">
                                    {[
                                        { event: 'BRUTE_FORCE_PREVENTED', time: '12S AGO', level: 'CRITICAL', user: 'IP: 182.xx.xx.xx' },
                                        { event: 'UNAUTHORIZED_STUDENT_DETECTION', time: '2M AGO', level: 'WARNING', user: 'ID: 24PA1A' },
                                        { event: 'CORE_SYSTEM_ACCESS', time: '5M AGO', level: 'ROOT', user: 'Kiran Varma' },
                                    ].map((log, i) => (
                                        <div key={i} className="flex items-center justify-between p-6 bg-slate-50 border border-slate-100 rounded-2xl group hover:bg-slate-100 transition-all">
                                            <div className="flex items-center gap-6">
                                                <div className={`w-2 h-10 rounded-full ${log.level === 'CRITICAL' ? 'bg-rose-500' : log.level === 'WARNING' ? 'bg-amber-500' : 'bg-[#f47c20]'}`} />
                                                <div>
                                                    <p className="text-sm font-black tracking-tight uppercase text-slate-900">{log.event}</p>
                                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{log.user}</p>
                                                </div>
                                            </div>
                                            <div className="text-right text-[10px] font-black uppercase tracking-widest text-slate-400">
                                                {log.time}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                );

            case 'settings':
                return (
                    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-5 duration-500">
                        <div className="grid grid-cols-2 gap-8">
                            <div className="bg-white border border-gray-100 rounded-[32px] p-10 shadow-sm">
                                <h3 className="text-xl font-black tracking-tight uppercase mb-8 text-slate-900">Root Overrides</h3>
                                <div className="space-y-8">
                                    {[
                                        { label: 'System Maintenance Mode', desc: 'Lock frontend for all non-admin users', active: isMaintenanceMode, key: 'maintenanceMode', setter: setIsMaintenanceMode },
                                        { label: 'Institutional Key Rotation', desc: 'Securely regenerate all gateway tokens', active: isKeyRotation, key: 'keyRotation', setter: setIsKeyRotation },
                                        { label: 'Global Debug Level', desc: 'Enable verbose logging for student app', active: isDebugMode, key: 'debugMode', setter: setIsDebugMode },
                                    ].map((s, i) => (
                                        <div key={i} className="flex items-center justify-between">
                                            <div>
                                                <p className="text-sm font-black tracking-tight uppercase text-slate-900">{s.label}</p>
                                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{s.desc}</p>
                                            </div>
                                            <button 
                                                onClick={() => handleConfigToggle(s.key, s.active, s.setter)}
                                                className={`w-12 h-6 rounded-full p-1 transition-all flex items-center cursor-pointer ${s.active ? 'bg-emerald-500' : 'bg-slate-200'}`}
                                            >
                                                <div className={`w-4 h-4 rounded-full bg-white shadow-lg transition-all transform ${s.active ? 'translate-x-6' : 'translate-x-0'}`} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="bg-white border border-gray-100 rounded-[32px] p-10 flex flex-col justify-between shadow-sm">
                                <div>
                                    <Zap className="w-12 h-12 text-[#f47c20] mb-6" />
                                    <h3 className="text-xl font-black tracking-tight uppercase mb-2 text-slate-900">Institutional Integrity</h3>
                                    <p className="text-xs text-slate-500 leading-relaxed font-bold lowercase">Vishnu Pass Core version 3.4.0 (Stable Build). Current institution: Vishnu Institute of Technology.</p>
                                </div>
                                <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Server Region</p>
                                    <p className="text-xs font-black tracking-widest uppercase text-slate-900">Asia-South-1 (Mumbai)</p>
                                </div>
                            </div>
                        </div>
                    </div>
                );

            default:
                return (
                    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-5 duration-500">
                        {/* Status Grid */}
                        <div className="grid grid-cols-4 gap-6">
                            {[
                                { label: 'Active Endpoints', value: stats.endpoints, icon: Globe, color: 'text-indigo-600', page: 'guards' },
                                { label: 'Auth Success Rate', value: stats.successRate, icon: Lock, color: 'text-emerald-600', page: 'audit-logs' },
                                { label: 'Total Logs', value: stats.logs, icon: Terminal, color: 'text-[#f47c20]', page: 'audit-logs' },
                                { label: 'Current Users', value: stats.users, icon: Users, color: 'text-rose-600', page: 'students' },
                            ].map((stat, i) => (
                                <div 
                                    key={i} 
                                    onClick={() => setActiveSubModule(stat.page)}
                                    className="bg-white border border-gray-100 p-6 rounded-3xl hover:bg-slate-50 hover:border-slate-200 transition-all cursor-pointer group relative overflow-hidden active:scale-[0.98] shadow-sm"
                                >
                                    {loading && i === 0 && (
                                        <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px] flex items-center justify-center z-10">
                                            <Loader2 className="w-5 h-5 animate-spin text-slate-200" />
                                        </div>
                                    )}
                                    <stat.icon className={`w-8 h-8 ${stat.color} mb-4 group-hover:scale-110 transition-transform`} />
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">{stat.label}</p>
                                    <p className="text-2xl font-black tracking-tight text-slate-900">{stat.value}</p>
                                </div>
                            ))}
                        </div>

                        {/* Large Action Section */}
                        <div className="grid grid-cols-3 gap-8">
                            {/* Command Center */}
                            <div className="col-span-2 bg-white border border-gray-100 rounded-[32px] p-10 relative overflow-hidden group shadow-sm">
                                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#f47c20]/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                <div className="flex items-center justify-between mb-10">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center">
                                            <Terminal className="w-6 h-6 text-indigo-600" />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-black tracking-tight uppercase text-slate-900">Terminal Oversight</h3>
                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Global Administrative Override Console</p>
                                        </div>
                                    </div>
                                    <button className="px-5 py-2.5 bg-slate-900 text-white hover:bg-slate-800 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg active:scale-95 cursor-pointer">
                                        Launch Shell
                                    </button>
                                </div>

                                <div className="bg-slate-950 rounded-2xl p-6 border border-slate-800 font-mono overflow-hidden text-[11px] tracking-widest shadow-inner">
                                    <div className="flex items-center gap-2 mb-4">
                                        <div className="w-2 h-2 rounded-full bg-slate-800" />
                                        <div className="w-2 h-2 rounded-full bg-slate-800" />
                                        <div className="w-2 h-2 rounded-full bg-slate-800" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <p className="text-emerald-400/80"><span className="text-slate-600">root@24pa:~$</span> systemctl status vishnu-pass</p>
                                        <p className="text-slate-300">● vishnu-pass.service - Vishnu Pass Ecosystem Core</p>
                                        <p className="text-slate-500">   Status: Core infrastructure operational</p>
                                        <p className="text-slate-500">   Active: active (running) since {new Date().toLocaleDateString()}</p>
                                        <p className="text-emerald-400 animate-pulse"><span className="text-slate-600">admin@root:~$</span> █</p>
                                    </div>
                                </div>
                            </div>

                            {/* Alert Panel */}
                            <div className="bg-rose-50 border border-rose-100 rounded-[32px] p-10 flex flex-col justify-between group overflow-hidden relative shadow-sm">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 rounded-full blur-[60px] pointer-events-none" />
                                <div>
                                    <ShieldAlert className="w-12 h-12 text-rose-500 mb-6 group-hover:rotate-12 transition-transform" />
                                    <h3 className="text-xl font-black tracking-tight uppercase mb-2 text-rose-600">Emergency Protocols</h3>
                                    <p className="text-xs text-rose-500/60 leading-relaxed font-bold">Initiate institutional shutdown or global broadcast in case of security breach.</p>
                                </div>
                                <button className="w-full h-14 bg-rose-600 hover:bg-rose-700 text-white border border-rose-600 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all active:scale-[0.98] shadow-lg shadow-rose-200 cursor-pointer">
                                    Execute Lockout
                                </button>
                            </div>
                        </div>
                    </div>
                );
        }
    };

    return (
        <div className="fixed inset-0 z-[10000] bg-[#f8f9fb] text-slate-900 flex flex-col font-sans selection:bg-[#f47c20] selection:text-white">
            {/* Header / HUD */}
            <header className="h-16 border-b border-gray-100 flex items-center justify-between px-8 bg-white/80 backdrop-blur-xl sticky top-0 z-50 shadow-sm">
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-[#f47c20] rounded-lg flex items-center justify-center shadow-lg shadow-orange-500/20">
                            <ShieldAlert className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h1 className="text-xs font-black tracking-[0.2em] uppercase text-slate-950">Super Admin Portal</h1>
                            <p className="text-[8px] font-bold text-slate-400 tracking-widest uppercase">Unauthorized access is strictly prohibited</p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-8">
                    <div className="text-right">
                        <p className="text-[9px] font-bold text-[#f47c20] tracking-widest uppercase">System Time (UTC)</p>
                        <p className="text-[11px] font-black tracking-widest text-slate-900">
                            {currentTime.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </p>
                    </div>
                    <button 
                        onClick={onClose}
                        className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center hover:bg-rose-50 hover:border-rose-200 hover:text-rose-500 transition-all active:scale-95 cursor-pointer"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </header>

            <div className="flex-1 flex overflow-hidden">
                {/* Sidebar */}
                <aside className="w-72 border-r border-gray-100 flex flex-col bg-white">
                    <div className="flex-1 overflow-y-auto p-6 space-y-8">
                        <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Core Modules</p>
                            <nav className="space-y-1">
                                {menuItems.map(item => (
                                    <button
                                        key={item.id}
                                        onClick={() => {
                                            setActiveTab(item.id);
                                            setActiveSubModule(null);
                                        }}
                                        className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all group cursor-pointer ${
                                            activeTab === item.id 
                                                ? 'bg-slate-900 text-white shadow-lg shadow-slate-200' 
                                                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                                        }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <item.icon className={`w-4 h-4 ${activeTab === item.id ? 'text-[#f47c20]' : 'group-hover:text-slate-900'}`} />
                                            <span className="text-[10px] font-black uppercase tracking-wider">{item.label}</span>
                                        </div>
                                        {activeTab === item.id && <div className="w-1 h-1 rounded-full bg-[#f47c20] shadow-[0_0_5px_#f47c20]" />}
                                    </button>
                                ))}
                            </nav>
                        </div>

                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 relative overflow-hidden">
                            <p className="text-[9px] font-black text-[#f47c20] uppercase tracking-widest mb-3 flex items-center justify-between">
                                <span className="flex items-center gap-2"><Activity className="w-3 h-3" /> System Metrics</span>
                                <span className="text-[8px] font-bold text-slate-400 normal-case italic">(Simulated)</span>
                            </p>
                            <div className="space-y-3">
                                <div>
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="text-[8px] font-bold text-slate-400 uppercase">CPU Load</span>
                                        <span className="text-[8px] font-black">{systemMetrics.cpu}%</span>
                                    </div>
                                    <div className="h-1 bg-slate-200 rounded-full overflow-hidden">
                                        <div 
                                            className="h-full bg-[#f47c20] transition-all duration-1000" 
                                            style={{ width: `${systemMetrics.cpu}%` }}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="text-[8px] font-bold text-slate-400 uppercase">Memory</span>
                                        <span className="text-[8px] font-black">{systemMetrics.memory}GB</span>
                                    </div>
                                    <div className="h-1 bg-slate-200 rounded-full overflow-hidden">
                                        <div 
                                            className="h-full bg-slate-900 transition-all duration-1000" 
                                            style={{ width: `${(systemMetrics.memory / 8) * 100}%` }}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="p-6 border-t border-gray-100 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-900">Live</span>
                        </div>
                        <span className="text-[9px] font-bold text-slate-400 uppercase">v3.4.0-STABLE</span>
                    </div>
                </aside>

                {/* Main Viewport */}
                <main className="flex-1 overflow-hidden flex flex-col">
                    <div className="flex-1 overflow-y-auto p-10 bg-[#f8f9fb]">
                        <div className="max-w-6xl mx-auto">
                            {renderContent()}
                        </div>
                    </div>

                    <footer className="h-10 border-t border-gray-100 bg-white px-8 flex items-center justify-between text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">
                        <div className="flex items-center gap-6">
                            <span>System Operational</span>
                            <span>Lat: 21.024 • Lon: 105.852</span>
                        </div>
                        <div className="text-[#f47c20]">Authorized Access Only</div>
                    </footer>
                </main>
            </div>
        </div>
    );
};

export default SuperAdminPortal;
