import React from 'react';
import { Home, QrCode, Clock, User, Scan } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

const BottomNav = ({ activeTab, onTabChange }) => {
    const { t } = useLanguage();

    const tabs = [
        { id: 'home', icon: Home, label: t('nav.home').toUpperCase() },
        { id: 'scan', icon: QrCode, label: t('nav.scan').toUpperCase() },
        { id: 'logs', icon: Clock, label: t('nav.logs').toUpperCase() },
        { id: 'profile', icon: User, label: t('nav.profile').toUpperCase() },
    ];

    return (
        <div className="fixed bottom-0 left-0 right-0 px-4 pb-[env(safe-area-inset-bottom,16px)] z-50 pointer-events-none">
            <nav className="max-w-md mx-auto bg-white/80 backdrop-blur-xl border border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.08)] rounded-[32px] flex items-center justify-around p-2 pointer-events-auto mb-4">
                {tabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;

                    return (
                        <button
                            key={tab.id}
                            onClick={() => onTabChange(tab.id)}
                            className="relative flex flex-col items-center justify-center py-2 px-1 min-w-[64px] transition-all duration-300 active:scale-90 group"
                        >
                            <div className={`p-2 rounded-2xl transition-all duration-300 ${isActive ? 'bg-[#f47c20] text-white shadow-lg shadow-[#f47c20]/20' : 'text-gray-400 group-hover:bg-gray-50'
                                }`}>
                                <Icon className="w-5 h-5 flex-shrink-0" />
                            </div>
                            <span className={`text-[9px] font-bold tracking-wider mt-1.5 transition-all duration-300 ${isActive ? 'text-[#f47c20] opacity-100' : 'text-gray-400 opacity-60'
                                }`}>
                                {tab.label}
                            </span>

                            {/* Inactive dot or subtle indicator could go here if needed */}
                        </button>
                    );
                })}
            </nav>
        </div>
    );
};

export default BottomNav;
