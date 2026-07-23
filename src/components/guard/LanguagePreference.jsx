import React, { useState } from 'react';
import { ArrowLeft, Info, Check } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

const LanguageOption = ({ id, label, native, code, isActive, onClick }) => (
    <div 
        onClick={() => onClick(id)}
        className={`bg-white rounded-[24px] p-5 flex items-center justify-between border-2 transition-all cursor-pointer active:scale-[0.98] ${
            isActive ? 'border-[#f47c20] shadow-[0_4px_20px_rgba(244,124,32,0.08)]' : 'border-transparent shadow-[0_2px_12px_rgba(0,0,0,0.02)]'
        }`}
    >
        <div className="flex items-center gap-4">
            {/* Language Badge */}
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-sm ${
                isActive ? 'bg-[#f47c20] text-white' : 'bg-orange-50 text-[#f47c20]'
            }`}>
                {code}
            </div>
            <div className="flex flex-col">
                <span className="text-base font-black text-[#1a2b3c]">{label}</span>
                <span className="text-[12px] font-bold text-slate-400">{native}</span>
            </div>
        </div>

        {/* Radio Indicator */}
        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
            isActive ? 'border-[#f47c20] bg-[#f47c20]' : 'border-slate-200'
        }`}>
            {isActive && <Check className="w-4 h-4 text-white stroke-[3px]" />}
        </div>
    </div>
);

const LanguagePreference = ({ onBack }) => {
    const { language: currentLang, setLanguage, t } = useLanguage();
    const [selectedLang, setSelectedLang] = useState(currentLang);
    const [isSaving, setIsSaving] = useState(false);

    const languages = [
        { id: 'en', label: 'English', native: 'Default system language', code: 'EN' },
        { id: 'te', label: 'Telugu', native: 'తెలుగు', code: 'TE' },
        { id: 'hi', label: 'Hindi', native: 'हिन्दी', code: 'HI' },
        { id: 'ta', label: 'Tamil', native: 'தமிழ்', code: 'TA' }
    ];

    const handleSave = () => {
        setIsSaving(true);
        // Simulate a small delay for premium feel
        setTimeout(() => {
            setLanguage(selectedLang);
            setIsSaving(false);
            if (onBack) onBack();
        }, 600);
    };

    return (
        <div className="flex flex-col min-h-screen bg-[#fdfdfd] pb-32 font-sans relative">
            {/* Header */}
            <header className="px-6 py-5 flex items-center justify-between bg-white border-b border-gray-50 sticky top-0 z-50">
                <button 
                    onClick={onBack}
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-[#1a2b3c] active:scale-90 transition-transform"
                >
                    <ArrowLeft className="w-6 h-6" />
                </button>
                <h1 className="text-xl font-black text-[#1a2b3c] tracking-tight">{t('guard.language.title')}</h1>
                <div className="w-10" /> {/* Spacer */}
            </header>

            <div className="px-6 pt-10 pb-6">
                <h2 className="text-3xl font-black text-[#1a2f4c] mb-3">{t('guard.language.selectTitle')}</h2>
                <p className="text-[14px] font-bold text-slate-400 leading-relaxed mb-8">
                    {t('guard.language.description')}
                </p>

                {/* Language List */}
                <div className="space-y-4">
                    {languages.map(lang => (
                        <LanguageOption 
                            key={lang.id}
                            {...lang}
                            isActive={selectedLang === lang.id}
                            onClick={setSelectedLang}
                        />
                    ))}
                </div>

                {/* Info Box */}
                <div className="mt-8 bg-[#fef5ec] rounded-[24px] p-5 flex gap-4 border border-[#fef5ec]">
                    <div className="w-10 h-10 rounded-full bg-[#f47c20] flex items-center justify-center flex-shrink-0">
                        <Info className="w-5 h-5 text-white" />
                    </div>
                    <p className="text-[13px] font-bold text-[#1a2b3c] leading-relaxed opacity-80">
                        {t('guard.language.info')}
                    </p>
                </div>
            </div>

            {/* Bottom Save Button */}
            <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-white via-white to-transparent pointer-events-none">
                <button 
                    onClick={handleSave}
                    disabled={isSaving}
                    className="w-full bg-[#f47c20] text-white py-5 rounded-[22px] font-black text-lg shadow-lg shadow-[#f47c20]/20 active:scale-[0.98] transition-all disabled:opacity-50 pointer-events-auto flex items-center justify-center gap-3"
                >
                    {isSaving ? (
                        <>
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            <span>{t('guard.language.saving')}</span>
                        </>
                    ) : (
                        t('guard.language.save')
                    )}
                </button>
            </div>
        </div>
    );
};

export default LanguagePreference;
