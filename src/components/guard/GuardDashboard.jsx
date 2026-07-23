import React, { useState } from 'react';
import { Home, History, Users, User, LogOut } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import GuardHome from './Home';
import GuardProfile from './Profile';
import GuardHistory from './GuardHistory';
import SecuritySettings from './SecuritySettings';
import GuardRoster from './Roster';
import NotificationSettings from './NotificationSettings';
import LanguagePreference from './LanguagePreference';
import GuardScanner from './GuardScanner';

const GuardDashboard = ({ onLogout, guardData }) => {
    const { t } = useLanguage();
    const [activeTab, setActiveTab] = useState('home');
    const [isScannerOpen, setIsScannerOpen] = useState(false);

    const renderContent = () => {
        switch (activeTab) {
            case 'home':
                return <GuardHome guardData={guardData} />;
            case 'history':
                return <GuardHistory guardData={guardData} onBack={() => setActiveTab('home')} />;
            case 'roster':
                return <GuardRoster guardData={guardData} onScannerOpen={() => setIsScannerOpen(true)} onBack={() => setActiveTab('home')} />;
            case 'profile':
                return <GuardProfile guardData={guardData} onLogout={onLogout} onNavigate={(tab) => setActiveTab(tab)} />;
            case 'security':
                return <SecuritySettings onBack={() => setActiveTab('profile')} />;
            case 'notifications':
                return <NotificationSettings onBack={() => setActiveTab('profile')} />;
            case 'language':
                return <LanguagePreference onBack={() => setActiveTab('profile')} />;
            default:
                return <GuardHome guardData={guardData} />;
        }
    };

    const isSubTab = ['security', 'notifications', 'language'].includes(activeTab);

    if (isScannerOpen) {
        return <GuardScanner guardData={guardData} onBack={() => setIsScannerOpen(false)} />;
    }

    return (
        <div className="min-h-screen bg-[#f8f9fb] flex flex-col font-sans">
            {/* Main Content Area */}
            <main className={`flex-1 ${isSubTab ? '' : 'pb-24'} overflow-y-auto`}>
                {renderContent()}
            </main>

            {/* Bottom Navigation */}
            {!isSubTab && (
                <div className="fixed bottom-0 left-0 right-0 px-4 pb-[env(safe-area-inset-bottom,16px)] z-50 pointer-events-none">
                    <nav className="max-w-md mx-auto bg-white/80 backdrop-blur-xl border border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.08)] rounded-[32px] flex items-center justify-around p-2 pointer-events-auto mb-4">
                        <button
                            onClick={() => setActiveTab('home')}
                            className="relative flex flex-col items-center justify-center py-2 px-1 min-w-[64px] transition-all duration-300 active:scale-90 group"
                        >
                            <div className={`p-2 rounded-2xl transition-all duration-300 ${activeTab === 'home' ? 'bg-[#f47c20] text-white shadow-lg shadow-[#f47c20]/20' : 'text-gray-400 group-hover:bg-gray-50'
                                }`}>
                                <Home className="w-5 h-5 flex-shrink-0" />
                            </div>
                            <span className={`text-[9px] font-bold uppercase tracking-wider mt-1.5 transition-all duration-300 ${activeTab === 'home' ? 'text-[#f47c20]' : 'text-gray-400 opacity-60'
                                }`}>
                                {t('nav.home')}
                            </span>
                        </button>

                        <button
                            onClick={() => setActiveTab('history')}
                            className="relative flex flex-col items-center justify-center py-2 px-1 min-w-[64px] transition-all duration-300 active:scale-90 group"
                        >
                            <div className={`p-2 rounded-2xl transition-all duration-300 ${activeTab === 'history' ? 'bg-[#f47c20] text-white shadow-lg shadow-[#f47c20]/20' : 'text-gray-400 group-hover:bg-gray-50'
                                }`}>
                                <History className="w-5 h-5 flex-shrink-0" />
                            </div>
                            <span className={`text-[9px] font-bold uppercase tracking-wider mt-1.5 transition-all duration-300 ${activeTab === 'history' ? 'text-[#f47c20]' : 'text-gray-400 opacity-60'
                                }`}>
                                {t('nav.logs')}
                            </span>
                        </button>

                        <button
                            onClick={() => setActiveTab('roster')}
                            className="relative flex flex-col items-center justify-center py-2 px-1 min-w-[64px] transition-all duration-300 active:scale-90 group"
                        >
                            <div className={`p-2 rounded-2xl transition-all duration-300 ${activeTab === 'roster' ? 'bg-[#f47c20] text-white shadow-lg shadow-[#f47c20]/20' : 'text-gray-400 group-hover:bg-gray-50'
                                }`}>
                                <Users className="w-5 h-5 flex-shrink-0" />
                            </div>
                            <span className={`text-[9px] font-bold uppercase tracking-wider mt-1.5 transition-all duration-300 ${activeTab === 'roster' ? 'text-[#f47c20]' : 'text-gray-400 opacity-60'
                                }`}>
                                {t('nav.scan')}
                            </span>
                        </button>

                        <button
                            onClick={() => setActiveTab('profile')}
                            className="relative flex flex-col items-center justify-center py-2 px-1 min-w-[64px] transition-all duration-300 active:scale-90 group"
                        >
                            <div className={`p-2 rounded-2xl transition-all duration-300 ${activeTab === 'profile' ? 'bg-[#f47c20] text-white shadow-lg shadow-[#f47c20]/20' : 'text-gray-400 group-hover:bg-gray-50'
                                }`}>
                                <User className="w-5 h-5 flex-shrink-0" />
                            </div>
                            <span className={`text-[9px] font-bold uppercase tracking-wider mt-1.5 transition-all duration-300 ${activeTab === 'profile' ? 'text-[#f47c20]' : 'text-gray-400 opacity-60'
                                }`}>
                                {t('nav.profile')}
                            </span>
                        </button>
                    </nav>
                </div>
            )}
        </div>
    );
};

export default GuardDashboard;
