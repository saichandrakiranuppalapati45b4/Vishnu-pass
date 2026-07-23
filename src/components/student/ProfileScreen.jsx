import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, GraduationCap, Mail, Bell, Globe, LogOut, CheckCircle2, Pen, Lock } from 'lucide-react';
import SecurityPassword from './SecurityPassword';
import NotificationSettings from './NotificationSettings';
import AppLanguage from './AppLanguage';
import VirtualIdCard from './VirtualIdCard';
import { useLanguage } from '../../contexts/LanguageContext';

const ProfileScreen = ({ studentData, onLogout }) => {
    const [subPage, setSubPage] = useState(null);
    const { language, setLanguage, t } = useLanguage();

    const languageMap = {
        en: 'English',
        te: 'Telugu',
        hi: 'Hindi',
        ta: 'Tamil'
    };

    const initials = studentData?.full_name
        ? studentData.full_name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
        : '??';

    const deptShort = studentData?.departments?.name
        ? studentData.departments.name.split(' ').map(w => w[0]).join('').toUpperCase()
        : 'DEPT';

    const yearLabel = `${studentData?.year_of_study || '1'}${studentData?.year_of_study == 1 ? 'st' :
        studentData?.year_of_study == 2 ? 'nd' :
            studentData?.year_of_study == 3 ? 'rd' : 'th'
        } Year`;

    // If on a sub-page, render that instead
    if (subPage === 'security') {
        return <SecurityPassword onBack={() => setSubPage(null)} />;
    }
    if (subPage === 'notifications') {
        return <NotificationSettings onBack={() => setSubPage(null)} />;
    }
    if (subPage === 'language') {
        return <AppLanguage
            currentLanguage={language}
            onLanguageChange={(lang) => setLanguage(lang)}
            onBack={() => setSubPage(null)}
        />;
    }

    if (subPage === 'vid') {
        return (
            <div className="flex-1 flex flex-col bg-[#f8f9fb] overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-5 pt-8 pb-4">
                    <button 
                        onClick={() => setSubPage(null)}
                        className="p-2 -ml-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors active:bg-gray-200"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <h1 className="text-[16px] font-bold text-gray-600">Personal Information</h1>
                    <div className="w-9"></div>
                </div>
                <div className="flex-1 overflow-y-auto px-3 sm:px-5 pt-4">
                    <VirtualIdCard studentData={studentData} />
                </div>
            </div>
        );
    }

    const settingsItems = [
        { icon: Lock, label: t('profile.security') || 'Security & Password', value: '', chevron: true, action: () => setSubPage('security') },
        { icon: Bell, label: t('profile.notifications') || 'Notifications', value: '', chevron: true, action: () => setSubPage('notifications') },
        { icon: Globe, label: t('profile.language') || 'App Language', value: languageMap[language] || 'English', chevron: true, action: () => setSubPage('language') },
    ];

    return (
        <div className="flex-1 flex flex-col bg-[#f8f9fb] overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-8 pb-4">
                <button className="p-2 -ml-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors active:bg-gray-200">
                    <ChevronLeft className="w-5 h-5" />
                </button>
                <h1 className="text-[16px] font-bold text-gray-600">{t('profile.title') || 'Student Profile'}</h1>
                <button className="p-2 -mr-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors active:bg-gray-200">
                    <Pen className="w-4 h-4" />
                </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto pb-28">
                
                {/* Profile Header Info */}
                <div className="flex flex-col items-center px-5 mt-2">
                    <button 
                        onClick={() => setSubPage('vid')}
                        className="relative mb-4 hover:scale-105 active:scale-95 transition-transform"
                    >
                        <div className="w-[104px] h-[104px] rounded-full shadow-sm overflow-hidden bg-[#fad6bd]">
                            {studentData?.photo_url ? (
                                <img src={studentData.photo_url} alt="Profile" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-[#f47c20] font-black text-3xl">
                                    {initials}
                                </div>
                            )}
                        </div>
                        <div className="absolute bottom-1 right-1 w-[26px] h-[26px] bg-[#f47c20] rounded-full border-[3px] border-[#f8f9fb] flex items-center justify-center">
                            <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                        </div>
                    </button>
                    
                    <h2 className="text-[20px] font-black text-[#1a2b3c] leading-tight">
                        {studentData?.full_name || 'Vishnu Vardhan'}
                    </h2>
                    <p className="text-[#f47c20] font-bold text-[12px] mt-1.5 uppercase tracking-wide">
                        ID: {studentData?.student_id || 'V21CS102'}
                    </p>
                    
                    <div className="flex items-center gap-2.5 mt-3.5">
                        <span className="bg-[#fff0e6] text-[#f47c20] text-[10px] font-extrabold px-3 py-1.5 rounded-full uppercase tracking-wider">
                            {deptShort === 'DEPT' ? 'CSE' : deptShort}
                        </span>
                        <span className="bg-[#fff0e6] text-[#f47c20] text-[10px] font-extrabold px-3 py-1.5 rounded-full uppercase tracking-wider">
                            {studentData?.year_of_study ? yearLabel : '3rd Year'}
                        </span>
                    </div>
                </div>

                {/* Personal Information */}
                <div className="px-5 mt-8">
                    <p className="text-[11px] font-black text-gray-500 uppercase tracking-widest mb-3 pl-1">
                        Personal Information
                    </p>
                    <div className="bg-white rounded-2xl p-2 shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-gray-50 rounded-2xl space-y-1">
                        {/* Department */}
                        <div className="flex items-center gap-4 p-3 rounded-xl">
                            <div className="w-10 h-10 rounded-xl bg-[#fff0e6] flex items-center justify-center flex-shrink-0">
                                <GraduationCap className="w-5 h-5 text-[#f47c20]" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-[11px] text-gray-400 font-bold mb-0.5">Department</p>
                                <p className="text-[13px] font-bold text-gray-800 truncate">
                                    {studentData?.departments?.name || 'Computer Science and Engineering'}
                                </p>
                            </div>
                        </div>
                        
                        {/* Email */}
                        <div className="flex items-center gap-4 p-3 rounded-xl">
                            <div className="w-10 h-10 rounded-xl bg-[#fff0e6] flex items-center justify-center flex-shrink-0">
                                <Mail className="w-5 h-5 text-[#f47c20]" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-[11px] text-gray-400 font-bold mb-0.5">University Email</p>
                                <p className="text-[13px] font-bold text-gray-800 truncate">
                                    {studentData?.email || 'v.vardhan@university.edu'}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Account Settings */}
                <div className="px-5 mt-6">
                    <p className="text-[11px] font-black text-gray-500 uppercase tracking-widest mb-3 pl-1">
                        {t('profile.accountSettings') || 'Account Settings'}
                    </p>
                    <div className="bg-white rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-gray-50 overflow-hidden divide-y divide-gray-50">
                        {settingsItems.map((item, i) => {
                            const Icon = item.icon;
                            return (
                                <button
                                    key={i}
                                    onClick={item.action}
                                    className="w-full flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors active:bg-gray-100"
                                >
                                    <Icon className="w-[18px] h-[18px] text-gray-600 flex-shrink-0" />
                                    <span className="flex-1 text-[13px] font-bold text-gray-800 text-left">{item.label}</span>
                                    {item.value && (
                                        <span className="text-[12px] font-medium text-gray-400 mr-2">{item.value}</span>
                                    )}
                                    {item.chevron && (
                                        <ChevronRight className="w-4 h-4 text-gray-400" />
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Sign Out */}
                <div className="px-5 mt-7 mb-6">
                    <button
                        onClick={onLogout}
                        className="w-full py-4 bg-[#fff5f5] hover:bg-[#ffebeb] text-[#f43f5e] text-[13px] font-bold rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-all"
                    >
                        <LogOut className="w-4 h-4" />
                        {t('profile.signOut') || 'Sign Out'}
                    </button>
                </div>
                
            </div>
        </div>
    );
};

export default ProfileScreen;
