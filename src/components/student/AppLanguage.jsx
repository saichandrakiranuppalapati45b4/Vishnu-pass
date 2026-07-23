import React, { useState } from 'react';
import { ChevronLeft, CheckCircle2, Languages, Globe, Type, Info } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

const AppLanguage = ({ onBack, currentLanguage, onLanguageChange }) => {
    // Current selected language state
    const [selectedLang, setSelectedLang] = useState(currentLanguage || 'en');
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState(null);
    const { t } = useLanguage();

    const languages = [
        {
            id: 'en',
            name: 'English (US)',
            native: 'Default language',
            icon: Globe,
            iconColor: 'text-[#f47c20]',
            iconBg: 'bg-orange-50'
        },
        {
            id: 'te',
            name: 'Telugu',
            native: 'తెలుగు',
            icon: Languages,
            iconColor: 'text-pink-600',
            iconBg: 'bg-pink-50'
        },
        {
            id: 'hi',
            name: 'Hindi',
            native: 'हिन्दी',
            icon: Type,
            iconColor: 'text-green-600',
            iconBg: 'bg-green-50'
        },
        {
            id: 'ta',
            name: 'Tamil',
            native: 'தமிழ்',
            icon: Languages, // Reusing icon for simplicity, could be distinct
            iconColor: 'text-orange-600',
            iconBg: 'bg-orange-50'
        }
    ];

    const handleSave = () => {
        setSaving(true);
        setMessage(null);

        // Simulate an API/Settings update
        setTimeout(() => {
            setSaving(false);
            if (onLanguageChange) {
                onLanguageChange(selectedLang);
            }
            setMessage({ type: 'success', text: t('settings.success') });

            setTimeout(() => {
                setMessage(null);
                onBack(); // Optional: Navigate back slightly after saving
            }, 1000);
        }, 800);
    };

    return (
        <div className="flex-1 flex flex-col bg-[#f8f9fb] overflow-hidden">
            {/* Header */}
            <div className="bg-[#f8f9fb] px-5 pt-12 pb-4">
                <div className="flex items-center gap-3">
                    <button
                        onClick={onBack}
                        className="w-8 h-8 flex items-center justify-center text-gray-700 hover:text-gray-900 transition-colors active:scale-95"
                    >
                        <ChevronLeft className="w-6 h-6" />
                    </button>
                    <h1 className="text-xl font-bold text-[#1a2f4c]">{t('settings.languageTitle')}</h1>
                </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto px-5 pb-28">

                {/* Status Message */}
                {message && (
                    <div className={`mb-4 px-4 py-3 rounded-xl text-sm font-bold animate-in fade-in slide-in-from-top-2 ${message.type === 'success' ? 'bg-green-50 text-green-600 border border-green-100' : 'bg-red-50 text-red-600 border border-red-100'
                        }`}>
                        {message.text}
                    </div>
                )}

                {/* Custom Gradient Hero Card */}
                <div className="w-full rounded-2xl p-5 mb-8 bg-gradient-to-br from-[#e46e27] via-[#c6446e] to-[#a32b85] shadow-lg shadow-pink-900/10">
                    <div className="flex items-start gap-4">
                        <Languages className="w-8 h-8 text-white flex-shrink-0 mt-1" />
                        <div className="flex flex-col">
                            <h2 className="text-lg font-bold text-white mb-2">Vishnu Pass Settings</h2>
                            <p className="text-sm font-medium text-white/90 leading-relaxed">
                                Select your preferred language for the Vishnu Pass student portal experience.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Available Languages Label */}
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">
                    Available Languages
                </h3>

                {/* Languages List */}
                <div className="flex flex-col gap-3 mb-6">
                    {languages.map((lang) => {
                        const Icon = lang.icon;
                        const isSelected = selectedLang === lang.id;

                        return (
                            <div
                                key={lang.id}
                                onClick={() => setSelectedLang(lang.id)}
                                className={`flex items-center p-4 rounded-xl cursor-pointer transition-all active:scale-[0.99] border relative overflow-hidden ${isSelected
                                    ? 'bg-white border-[#f47c20] shadow-sm'
                                    : 'bg-white border-gray-100 hover:border-gray-200'
                                    }`}
                            >
                                {/* Icon Container */}
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 mr-4 ${lang.iconBg}`}>
                                    <Icon className={`w-6 h-6 ${lang.iconColor}`} />
                                </div>

                                {/* Label Container */}
                                <div className="flex flex-col flex-1">
                                    <span className="text-[17px] font-black text-[#1a2f4c] mb-0.5">
                                        {lang.name}
                                    </span>
                                    <span className="text-xs font-medium text-gray-400">
                                        {lang.native}
                                    </span>
                                </div>

                                {/* Radio visually */}
                                <div className={`flex-shrink-0 w-6 h-6 rounded-full border-[2px] flex items-center justify-center ml-2 transition-colors ${isSelected ? 'border-[#f47c20]' : 'border-gray-300'
                                    }`}>
                                    {isSelected && (
                                        <div className="w-3.5 h-3.5 rounded-full bg-[#f47c20]"></div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Info Note Box */}
                <div className="bg-[#f5f7fa] rounded-xl p-4 flex items-start gap-3 border border-gray-100/50">
                    <Info className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                    <p className="text-xs font-medium text-gray-500 leading-relaxed">
                        Changes will be applied immediately to your dashboard, notifications, and course materials within the Vishnu Pass app.
                    </p>
                </div>
                {/* Save Button */}
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="w-full py-[14px] mt-6 bg-[#f47c20] hover:bg-[#e06d1c] text-white font-bold rounded-[14px] text-[15px] transition-all active:scale-[0.98] shadow-lg shadow-orange-200/50 disabled:opacity-70 flex items-center justify-center gap-2"
                >
                    {saving ? (
                        t('settings.saving')
                    ) : (
                        <>
                            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                            <span>{t('settings.save')}</span>
                        </>
                    )}
                </button>
            </div>
        </div>
    );
};

export default AppLanguage;
