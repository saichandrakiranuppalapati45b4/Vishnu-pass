import React from 'react';
import { LogOut, Shield, ChevronRight, Bell, Languages, CheckCircle2, LayoutDashboard, History, UserCircle, User } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

const GuardProfile = ({ guardData, onLogout, onNavigate }) => {
    const { language, t } = useLanguage();
    
    const initials = guardData?.full_name
        ? guardData.full_name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
        : 'GP';

    const languageMap = {
        en: 'English',
        te: 'Telugu',
        hi: 'Hindi',
        ta: 'Tamil'
    };

    const menuItems = [
        { icon: <Bell className="w-5 h-5 text-orange-500" />, label: t('guard.profile.notifications'), bg: 'bg-orange-50', tab: 'notifications' },
        { icon: <Shield className="w-5 h-5 text-orange-500" />, label: t('guard.profile.changePassword'), bg: 'bg-orange-50', tab: 'security' },
        { icon: <Languages className="w-5 h-5 text-orange-500" />, label: t('guard.profile.language'), value: languageMap[language] || 'English', bg: 'bg-orange-50', tab: 'language' },
    ];

    return (
        <div className="flex flex-col min-h-screen bg-[#f8f9fb] pb-32">
            {/* Header */}
            <header className="px-6 py-5 flex items-center justify-center bg-white border-b border-gray-50 sticky top-0 z-50">
                <h1 className="text-xl font-black text-[#1a2b3c] tracking-tight">{t('guard.profile.title')}</h1>
            </header>

            <div className="px-6 py-8 flex flex-col items-center">
                {/* Avatar Section */}
                <div className="relative mb-6">
                    <div className="w-32 h-32 rounded-full p-1 bg-gradient-to-b from-[#f47c20] to-[#e06b12] shadow-2xl shadow-orange-500/20">
                        <div className="w-full h-full rounded-full border-4 border-white overflow-hidden bg-slate-100 flex items-center justify-center">
                            {guardData?.photo_url ? (
                                <img src={guardData.photo_url} alt="Profile" className="w-full h-full object-cover" />
                            ) : (
                                <span className="text-3xl font-black text-[#1a2b3c]">{initials}</span>
                            )}
                        </div>
                    </div>
                    <div className="absolute bottom-1 right-1 w-8 h-8 bg-[#f47c20] rounded-full border-4 border-white flex items-center justify-center text-white shadow-lg">
                        <CheckCircle2 className="w-4 h-4" />
                    </div>
                </div>

                {/* Name & ID */}
                <h2 className="text-2xl font-black text-[#1a2b3c] tracking-tight mb-3">
                    Officer {guardData?.full_name?.split(' ')[0] || 'Guard'}
                </h2>
                <div className="px-4 py-1.5 bg-[#fff5ec] rounded-full mb-8">
                    <p className="text-[11px] font-black text-[#f47c20] tracking-widest">
                        {t('guard.profile.id')}: {guardData?.employee_id || 'VP-9982'}
                    </p>
                </div>

                {/* Status Cards */}
                <div className="w-full grid grid-cols-2 gap-4 mb-4">
                    <div className="bg-white p-5 rounded-[24px] shadow-[0_4px_20px_rgba(0,0,0,0.02)] border border-gray-50 flex flex-col items-center text-center">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">{t('guard.profile.assignedGate')}</p>
                        <p className="text-base font-black text-[#f47c20]">{guardData?.guard_gates?.name || 'Gate A-12'}</p>
                    </div>
                    <div className="bg-white p-5 rounded-[24px] shadow-[0_4px_20px_rgba(0,0,0,0.02)] border border-gray-50 flex flex-col items-center text-center">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">{t('guard.profile.shiftStatus')}</p>
                        <p className="text-base font-black text-emerald-500">{t('guard.profile.active')}</p>
                    </div>
                </div>
                <p className="text-[11px] font-bold text-slate-400 mb-8">
                    {t('guard.profile.currentShift')}: <span className="text-slate-500">Morning (06:00 - 14:00)</span>
                </p>

                {/* Settings Menu */}
                <div className="w-full space-y-8">
                    {/* Account Settings */}
                    <div>
                        <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 px-2">{t('guard.profile.accountSettings')}</h3>
                        <div className="bg-white rounded-[32px] overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.02)] border border-gray-50">
                            {menuItems.map((item, idx) => (
                                <button 
                                    key={idx} 
                                    onClick={() => item.tab && onNavigate(item.tab)}
                                    className={`w-full flex items-center justify-between p-5 hover:bg-slate-50 transition-colors ${idx !== menuItems.length - 1 ? 'border-b border-gray-50' : ''}`}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`w-10 h-10 rounded-xl ${item.bg} flex items-center justify-center`}>
                                            {item.icon}
                                        </div>
                                        <span className="text-sm font-bold text-[#1a2b3c]">{item.label}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {item.value && <span className="text-[11px] font-bold text-slate-300">{item.value}</span>}
                                        <ChevronRight className="w-4 h-4 text-slate-300" />
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Sign Out */}
                    <button
                        onClick={onLogout}
                        className="w-full py-5 bg-rose-50 text-rose-500 font-black rounded-[24px] border border-rose-100/50 flex items-center justify-center gap-3 active:scale-[0.98] transition-all text-sm tracking-tight"
                    >
                        <LogOut className="w-5 h-5" />
                        {t('guard.profile.signOut')}
                    </button>
                </div>
            </div>

        </div>
    );
};

export default GuardProfile;
