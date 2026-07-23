import React, { useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { ArrowLeft, Bell, Mail, ShieldAlert, RefreshCw, ChevronRight } from 'lucide-react';

const Toggle = ({ active, onClick }) => (
    <button 
        onClick={onClick}
        className={`w-12 h-6 rounded-full p-1 transition-all duration-300 ${active ? 'bg-[#f47c20]' : 'bg-[#e2e8f0]'}`}
    >
        <div className={`w-4 h-4 bg-white rounded-full transition-transform duration-300 ${active ? 'translate-x-6' : 'translate-x-0'}`} />
    </button>
);

const SettingRow = ({ Icon, label, description, active, onToggle, bg }) => {
    return (
        <div className="flex items-center justify-between p-5 hover:bg-slate-50 transition-colors">
            <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center`}>
                    {React.createElement(Icon, { className: "w-5 h-5 text-[#f47c20]" })}
                </div>
                <div className="flex flex-col">
                    <span className="text-[14px] font-black text-[#1a2b3c]">{label}</span>
                    <span className="text-[11px] font-bold text-slate-400 capitalize">{description}</span>
                </div>
            </div>
            <Toggle active={active} onClick={onToggle} />
        </div>
    );
};

const NotificationSettings = ({ onBack }) => {
    const { t } = useLanguage();
    const [settings, setSettings] = useState({
        push: true,
        email: false,
        verification: true,
        updates: true
    });

    const toggleSetting = (key) => {
        setSettings(prev => ({
            ...prev,
            [key]: !prev[key]
        }));
    };


    return (
        <div className="flex flex-col min-h-screen bg-[#fdfdfd] pb-10 font-sans">
            {/* Header */}
            <header className="px-6 py-5 flex items-center justify-between bg-white border-b border-gray-50 sticky top-0 z-50">
                <button 
                    onClick={onBack}
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-[#1a2b3c] active:scale-90 transition-transform"
                >
                    <ArrowLeft className="w-6 h-6" />
                </button>
                <h1 className="text-xl font-black text-[#1a2b3c] tracking-tight">{t('guard.notifications.title')}</h1>
                <div className="w-10" /> {/* Spacer */}
            </header>

            <div className="px-6 pt-12 pb-8 flex flex-col items-center">
                {/* Icon Section */}
                <div className="w-24 h-24 rounded-full bg-[#fef5ec] flex items-center justify-center mb-8">
                    <div className="w-16 h-16 rounded-full bg-[#ffebd8] flex items-center justify-center text-[#f47c20]">
                        <Bell className="w-8 h-8 fill-current" />
                    </div>
                </div>

                <div className="text-center max-w-[280px] mb-12">
                    <p className="text-[13px] font-bold text-[#475569] leading-relaxed">
                        {t('guard.notifications.subTitle')}
                    </p>
                </div>

                <div className="w-full space-y-10">
                    {/* General Alerts */}
                    <div>
                        <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 px-2">{t('guard.notifications.general')}</h3>
                        <div className="bg-white rounded-[32px] overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.02)] border border-gray-50">
                            <SettingRow 
                                Icon={Bell}
                                label={t('guard.notifications.push')}
                                description={t('guard.notifications.pushDesc')}
                                active={settings.push}
                                onToggle={() => toggleSetting('push')}
                                bg="bg-orange-50"
                            />
                            <div className="h-[1px] bg-gray-50 mx-5" />
                            <SettingRow 
                                Icon={Mail}
                                label={t('guard.notifications.email')}
                                description={t('guard.notifications.emailDesc')}
                                active={settings.email}
                                onToggle={() => toggleSetting('email')}
                                bg="bg-orange-50"
                            />
                        </div>
                    </div>

                    {/* Security Specific */}
                    <div>
                        <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 px-2">{t('guard.notifications.security')}</h3>
                        <div className="bg-white rounded-[32px] overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.02)] border border-gray-50">
                            <SettingRow 
                                Icon={ShieldAlert}
                                label={t('guard.notifications.verification')}
                                description={t('guard.notifications.verificationDesc')}
                                active={settings.verification}
                                onToggle={() => toggleSetting('verification')}
                                bg="bg-orange-50"
                            />
                            <div className="h-[1px] bg-gray-50 mx-5" />
                            <SettingRow 
                                Icon={RefreshCw}
                                label={t('guard.notifications.updates')}
                                description={t('guard.notifications.updatesDesc')}
                                active={settings.updates}
                                onToggle={() => toggleSetting('updates')}
                                bg="bg-orange-50"
                            />
                        </div>
                    </div>

                    {/* Advanced Link */}
                    <button className="w-full flex items-center justify-between p-2 mt-4 hover:opacity-70 transition-opacity">
                        <span className="text-[14px] font-black text-[#f47c20]">Advanced Delivery Settings</span>
                        <ChevronRight className="w-5 h-5 text-[#f47c20]" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default NotificationSettings;
