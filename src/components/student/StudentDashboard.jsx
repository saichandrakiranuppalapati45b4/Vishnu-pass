import React, { useState, useEffect } from 'react';
import Home from './Home';
import BottomNav from './BottomNav';
import ScanScreen from './ScanScreen';
import EntryLogs from './EntryLogs';
import ProfileScreen from './ProfileScreen';
import Notifications from './Notifications';
import ActivationScreen from './ActivationScreen';
import { LogOut, X, Download } from 'lucide-react';
import DailyDigitalPass from './DailyDigitalPass';

const StudentDashboard = ({ studentData: initialStudentData, onLogout }) => {
    const [activeTab, setActiveTab] = useState('home');
    const [studentData, setStudentData] = useState(initialStudentData);
    const [selectedPass, setSelectedPass] = useState(null);

    useEffect(() => {
        setStudentData(initialStudentData);

        const handleChangeTab = (e) => {
            if (e.detail) setActiveTab(e.detail);
        };

        const handleViewPass = (e) => {
            if (e.detail) setSelectedPass(e.detail);
        };

        window.addEventListener('changeTab', handleChangeTab);
        window.addEventListener('viewPass', handleViewPass);

        return () => {
            window.removeEventListener('changeTab', handleChangeTab);
            window.removeEventListener('viewPass', handleViewPass);
        };
    }, [initialStudentData]);

    const handleStatusChange = (newStatus) => {
        setStudentData(prev => ({ ...prev, status: newStatus }));
    };

    if (studentData?.status === 'Pending' || studentData?.status === 'Under Review') {
        return (
            <div className="flex flex-col h-screen bg-white max-w-md mx-auto relative shadow-2xl overflow-hidden border-x border-gray-100">
                <ActivationScreen studentData={studentData} onStatusChange={handleStatusChange} onLogout={onLogout} />
            </div>
        );
    }

    const renderContent = () => {
        switch (activeTab) {
            case 'home':
                return <Home studentData={studentData} onNotificationClick={() => setActiveTab('notifications')} />;
            case 'scan':
                return <ScanScreen studentData={studentData} onBack={() => setActiveTab('home')} />;
            case 'logs':
                return <EntryLogs studentData={studentData} />;
            case 'profile':
                return <ProfileScreen studentData={studentData} onLogout={onLogout} />;
            case 'notifications':
                return <Notifications studentData={studentData} onBack={() => setActiveTab('home')} />;
            default:
                return <Home studentData={studentData} onNotificationClick={() => setActiveTab('notifications')} />;
        }
    };

    return (
        <div className="flex flex-col h-screen bg-white max-w-md mx-auto relative shadow-2xl overflow-hidden border-x border-gray-50">
            {/* Main View Area */}
            <div className="flex-1 flex flex-col overflow-hidden bg-[#f8f9fb]">
                {renderContent()}
            </div>

            {/* Pass Detail Overlay */}
            {selectedPass && (
                <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center p-4 animate-in fade-in duration-300">
                    <div className="w-full flex justify-end max-w-[400px] mb-4">
                        <button
                            onClick={() => setSelectedPass(null)}
                            className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-white border border-white/20 active:scale-95"
                        >
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    <div className="scale-[0.85] sm:scale-100 origin-center">
                        <DailyDigitalPass
                            studentData={studentData}
                            gateName={selectedPass.guard_gates?.name}
                            verifiedAt={selectedPass.created_at}
                            photoUrl={studentData.photo_url}
                            isExpired={selectedPass.status === 'expired'}
                        />
                    </div>

                    <div className="mt-8 flex gap-4">
                        <button
                            className="px-8 py-3 bg-white text-gray-900 rounded-2xl font-black text-sm uppercase tracking-widest flex items-center gap-2 shadow-xl shadow-black/20"
                            onClick={() => {/* Download implementation if needed later */ }}
                        >
                            <Download className="w-4 h-4" /> Save Pass
                        </button>
                    </div>
                </div>
            )}

            {/* Navigation */}
            <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
        </div>
    );
};

export default StudentDashboard;
