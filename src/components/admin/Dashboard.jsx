import React, { useState, useEffect } from 'react';
import { Search, Bell, Users, Shield, ShieldCheck, UserCheck, ShieldAlert, UserPlus, BarChart2, Settings, LogOut, Plus, RotateCcw } from 'lucide-react';
// Supabase removed
import DashboardContent from './DashboardContent';
import StudentManagement from './StudentManagement';
import GuardManagement from './GuardManagement';
import Reports from './Reports';
import AdminManagement from './AdminManagement';
import StudentProfile from './StudentProfile';
import RegisterStudent from './RegisterStudent';
import ChangePassword from './ChangePassword';
import Notifications from './Notifications';
import SettingsPage from './SettingsPage';
import FlowOptimization from './FlowOptimization';
import AuditLogs from './AuditLogs';
import AdminProfile from './AdminProfile';
import Permissions from './Permissions';
import StudentPermissions from './StudentPermissions';

const navItems = [
    { key: 'dashboard', label: 'Dashboard', icon: 'grid' },
    { key: 'students', label: 'Student Management', icon: 'users' },
    { key: 'guards', label: 'Guard Management', icon: 'shield' },
    { key: 'reports', label: 'Reports', icon: 'bar-chart' },
    { key: 'admin', label: 'Admin Management', icon: 'users' },
    { key: 'permissions', label: 'Permissions', icon: 'shield-check' },
    { key: 'student-permissions', label: 'Student Permission', icon: 'user-check' },
    { key: 'settings', label: 'Settings', icon: 'settings' },
];

const NavIcon = ({ type, className }) => {
    switch (type) {
        case 'grid':
            return (
                <div className={`grid grid-cols-2 gap-0.5 w-[18px] h-[18px] ${className}`}>
                    <div className="bg-current rounded-[2px]" />
                    <div className="bg-current rounded-[2px]" />
                    <div className="bg-current rounded-[2px]" />
                    <div className="bg-current rounded-[2px] opacity-40" />
                </div>
            );
        case 'users': return <Users className={`w-[18px] h-[18px] ${className}`} />;
        case 'shield': return <Shield className={`w-[18px] h-[18px] ${className}`} />;
        case 'shield-check': return <ShieldCheck className={`w-[18px] h-[18px] ${className}`} />;
        case 'user-check': return <UserCheck className={`w-[18px] h-[18px] ${className}`} />;
        case 'shield-alert': return <ShieldAlert className={`w-[18px] h-[18px] ${className}`} />;
        case 'user-plus': return <UserPlus className={`w-[18px] h-[18px] ${className}`} />;
        case 'bar-chart': return <BarChart2 className={`w-[18px] h-[18px] ${className}`} />;
        case 'settings': return <Settings className={`w-[18px] h-[18px] ${className}`} />;
        case 'history': return <RotateCcw className={`w-[18px] h-[18px] ${className}`} />;
        default: return null;
    }
};

const Dashboard = ({ onLogout, branding, onBrandingUpdate, adminData, activePage, onNavigate }) => {
    const [selectedStudentId, setSelectedStudentId] = useState(null);
    const [selectedAdminId, setSelectedAdminId] = useState(null);
    const [userEmail, setUserEmail] = useState('admin@vishnu.edu');

    useEffect(() => {
        if (adminData && adminData.email) {
            setUserEmail(adminData.email);
        }
    }, [adminData]);

    const handleBrandingUpdate = (key, value) => {
        onBrandingUpdate(key, value);
    };

    const renderContent = () => {
        switch (activePage) {
            case 'students':
                return <StudentManagement adminData={adminData} onNavigate={(page, id) => {
                    if (id) setSelectedStudentId(id);
                    onNavigate(page);
                }} />;
            case 'guards':
                return <GuardManagement adminData={adminData} />;
            case 'reports':
                return <Reports adminData={adminData} />;
            case 'admin':
                return <AdminManagement 
                    currentAdmin={adminData}
                    onNavigate={(page, id) => {
                        if (id) setSelectedAdminId(id);
                        onNavigate(page);
                    }} 
                />;
            case 'admin-profile':
                return <AdminProfile adminData={adminData} adminId={selectedAdminId} onBack={() => onNavigate('admin')} />;
            case 'permissions':
                return <Permissions adminData={adminData} />;
            case 'student-permissions':
                return <StudentPermissions adminData={adminData} />;
            case 'settings':
                return <SettingsPage adminData={adminData} onNavigate={onNavigate} branding={branding} onBrandingUpdate={handleBrandingUpdate} />;
            case 'register-student':
                return <RegisterStudent adminData={adminData} onCancel={() => onNavigate('students')} />;
            case 'student-profile':
                return <StudentProfile adminData={adminData} studentId={selectedStudentId} onBack={() => onNavigate('students')} />;
            case 'change-password':
                return <ChangePassword adminData={adminData} onBack={() => onNavigate('settings')} />;
            case 'audit-logs':
                return <AuditLogs adminData={adminData} onBack={() => onNavigate('admin')} />;
            case 'notifications':
                return <Notifications adminData={adminData} onBack={() => onNavigate('dashboard')} />;
            case 'flow-optimization':
                return <FlowOptimization adminData={adminData} onBack={() => onNavigate('dashboard')} />;
            case 'dashboard':
            default:
                return <DashboardContent adminData={adminData} onNavigate={(page, id) => {
                    if (id) setSelectedStudentId(id);
                    onNavigate(page);
                }} />;
        }
    };

    return (
        <div className="flex h-screen bg-[#f8f9fb] font-sans">
            {/* Sidebar */}
            <aside className="w-[240px] bg-white border-r border-gray-100 flex flex-col flex-shrink-0">
                {/* Logo */}
                <div className="p-5 flex items-center gap-3 border-b border-gray-100">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {branding.portalLogo ? (
                            <img src={branding.portalLogo} alt="Portal Logo" className="w-full h-full object-cover" />
                        ) : (
                            <svg width="22" height="22" viewBox="0 0 100 100" fill="none">
                                <defs><path id="c" d="M 50 15 L 75 28 L 65 44 L 50 35 L 35 44 L 25 28 Z" /></defs>
                                <use href="#c" fill="#f47c20" />
                                <use href="#c" fill="#f47c20" opacity="0.7" transform="rotate(120 50 50)" />
                                <use href="#c" fill="#f47c20" opacity="0.7" transform="rotate(240 50 50)" />
                            </svg>
                        )}
                    </div>
                    <div>
                        <h2 className="font-bold text-[15px] text-gray-900 leading-tight">Vishnu Pass</h2>
                        <p className="text-[11px] text-gray-400 font-medium">Admin Portal</p>
                    </div>
                </div>

                {/* Nav */}
                <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
                    {navItems.map((item) => (
                        <button
                            key={item.key}
                            onClick={() => onNavigate(item.key)}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[14px] transition-colors text-left ${activePage === item.key
                                ? 'bg-[#fff4eb] text-[#f47c20] font-semibold'
                                : 'text-gray-500 hover:bg-gray-50 font-medium'
                                }`}
                        >
                            <NavIcon type={item.icon} />
                            {item.label}
                        </button>
                    ))}
                </nav>

                {/* User Info */}
                <div className="p-4 border-t border-gray-100">
                    <div className="flex items-center gap-3 px-2 py-2">
                        <div className="w-9 h-9 rounded-full bg-gray-200 overflow-hidden flex-shrink-0 border border-gray-300">
                            <div className="w-full h-full bg-[#e8d5c4] flex items-end justify-center">
                                <div className="w-5 h-5 bg-[#5a3e2b] rounded-t-full" />
                            </div>
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900 truncate">{branding.adminName || 'Admin User'}</p>
                            <p className="text-[11px] text-gray-400 font-medium truncate">{userEmail}</p>
                        </div>
                        <button onClick={onLogout} title="Logout" className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                            <LogOut className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main */}
            <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
                {/* Topbar */}
                <header className="h-16 px-8 flex items-center justify-between border-b border-gray-100 bg-white sticky top-0 z-10">
                    <div className="relative flex-1 max-w-md">
                        <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            placeholder="Search for students, passes or logs..."
                            className="pl-10 pr-4 py-2.5 bg-[#f4f6f8] border border-gray-100 rounded-xl text-sm w-full focus:outline-none focus:ring-2 focus:ring-[#f47c20]/20 transition-all font-medium placeholder:text-gray-400"
                        />
                    </div>
                    <div className="flex items-center gap-3 ml-6">
                        <button
                            onClick={() => setActivePage('notifications')}
                            className={`p-2.5 rounded-xl transition-all duration-300 relative ${activePage === 'notifications'
                                ? 'text-[#f47c20] bg-[#fff4eb] shadow-sm'
                                : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                                }`}
                        >
                            <Bell className="w-5 h-5 transition-transform duration-300 group-hover:rotate-12" />
                            <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
                        </button>
                    </div>
                </header>

                {/* Page Content */}
                {renderContent()}
            </main>
        </div>
    );
};

export default Dashboard;
