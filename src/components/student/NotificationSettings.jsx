import React, { useState } from 'react';
import { ChevronLeft, Bell, Mail, MessageSquare, DoorOpen, Ticket, AlertTriangle } from 'lucide-react';

const ToggleElement = ({ active, colorClass }) => (
    <div className={`relative w-12 h-7 rounded-full transition-colors duration-300 flex-shrink-0 ${active ? colorClass : 'bg-gray-200'}`}>
        <div className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow-[0_2px_4px_rgba(0,0,0,0.1)] transition-transform duration-300 ${active ? 'translate-x-[22px]' : 'translate-x-[2px]'}`} />
    </div>
);

const NotificationSettings = ({ onBack }) => {
    const [settings, setSettings] = useState({
        push: true,
        email: false,
        sms: true,
        gate: true,
        pass: true,
        security: true
    });

    const [isSaving, setIsSaving] = useState(false);
    const [showToast, setShowToast] = useState(false);

    const handleSave = () => {
        setIsSaving(true);
        // Simulate API call
        setTimeout(() => {
            setIsSaving(false);
            setShowToast(true);
            setTimeout(() => setShowToast(false), 3000);
        }, 800);
    };

    const handleToggle = (setting) => {
        setSettings(prev => ({
            ...prev,
            [setting]: !prev[setting]
        }));
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
                    <h1 className="text-lg font-bold text-[#1a2f4c]">Notification Settings</h1>
                </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto px-5 pb-28">

                {/* Status Message */}
                {showToast && (
                    <div className="mb-4 px-4 py-3 rounded-xl text-sm font-bold animate-in fade-in slide-in-from-top-2 bg-green-50 text-green-600 border border-green-100">
                        Preferences saved successfully!
                    </div>
                )}

                {/* Alert Channels Section */}
                <h2 className="text-[15px] font-bold text-[#1a2f4c] mb-3 mt-2">Alert Channels</h2>
                <div className="bg-white rounded-[24px] shadow-[0_2px_10px_rgba(0,0,0,0.02)] p-2 mb-6 flex flex-col gap-1">

                    {/* Push Notifications */}
                    <div
                        onClick={() => handleToggle('push')}
                        className="flex items-center justify-between p-3 rounded-[16px] active:bg-gray-50 transition-colors cursor-pointer"
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-[12px] bg-orange-50 flex items-center justify-center flex-shrink-0">
                                <Bell className="w-5 h-5 text-[#f47c20]" />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[15px] font-bold text-[#1a2f4c]">Push Notifications</span>
                                <span className="text-[11px] text-gray-400 font-medium">Instant updates on your phone</span>
                            </div>
                        </div>
                        <ToggleElement active={settings.push} colorClass="bg-[#f47c20]" />
                    </div>

                    <div className="h-[1px] bg-gray-50 mx-4" />

                    {/* Email Alerts */}
                    <div
                        onClick={() => handleToggle('email')}
                        className="flex items-center justify-between p-3 rounded-[16px] active:bg-gray-50 transition-colors cursor-pointer"
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-[12px] bg-purple-50 flex items-center justify-center flex-shrink-0">
                                <Mail className="w-5 h-5 text-purple-600" />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[15px] font-bold text-[#1a2f4c]">Email Alerts</span>
                                <span className="text-[11px] text-gray-400 font-medium">Summaries and official logs</span>
                            </div>
                        </div>
                        <ToggleElement active={settings.email} colorClass="bg-purple-600" />
                    </div>

                    <div className="h-[1px] bg-gray-50 mx-4" />

                    {/* SMS Alerts */}
                    <div
                        onClick={() => handleToggle('sms')}
                        className="flex items-center justify-between p-3 rounded-[16px] active:bg-gray-50 transition-colors cursor-pointer"
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-[12px] bg-[#93c572]/10 flex items-center justify-center flex-shrink-0">
                                <MessageSquare className="w-5 h-5 text-[#93c572]" />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[15px] font-bold text-[#1a2f4c]">SMS Alerts</span>
                                <span className="text-[11px] text-gray-400 font-medium">Direct text messages</span>
                            </div>
                        </div>
                        <ToggleElement active={settings.sms} colorClass="bg-[#93c572]" />
                    </div>
                </div>

                {/* Activity Categories Section */}
                <h2 className="text-[15px] font-bold text-[#1a2f4c] mb-3 mt-4">Activity Categories</h2>
                <div className="bg-white rounded-[24px] shadow-[0_2px_10px_rgba(0,0,0,0.02)] p-2 mb-6 flex flex-col gap-1">

                    {/* Gate Entry/Exit */}
                    <div
                        onClick={() => handleToggle('gate')}
                        className="flex items-center justify-between p-3 rounded-[16px] active:bg-gray-50 transition-colors cursor-pointer"
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-[12px] bg-[#1a2f4c]/5 flex items-center justify-center flex-shrink-0">
                                <DoorOpen className="w-5 h-5 text-[#3b4b61]" />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[14px] font-bold text-[#1a2f4c]">Gate Entry/Exit</span>
                            </div>
                        </div>
                        <ToggleElement active={settings.gate} colorClass="bg-[#f47c20]" />
                    </div>

                    <div className="h-[1px] bg-gray-50 mx-4" />

                    {/* New Pass Generated */}
                    <div
                        onClick={() => handleToggle('pass')}
                        className="flex items-center justify-between p-3 rounded-[16px] active:bg-gray-50 transition-colors cursor-pointer"
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-[12px] bg-[#1a2f4c]/5 flex items-center justify-center flex-shrink-0">
                                <Ticket className="w-5 h-5 text-[#3b4b61]" />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[14px] font-bold text-[#1a2f4c]">New Pass Generated</span>
                            </div>
                        </div>
                        <ToggleElement active={settings.pass} colorClass="bg-[#f47c20]" />
                    </div>

                    <div className="h-[1px] bg-gray-50 mx-4" />

                    {/* Security Alerts */}
                    <div
                        onClick={() => handleToggle('security')}
                        className="flex items-center justify-between p-3 rounded-[16px] active:bg-gray-50 transition-colors cursor-pointer"
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-[12px] bg-orange-50 flex items-center justify-center flex-shrink-0">
                                <AlertTriangle className="w-5 h-5 text-[#f47c20]" />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[14px] font-bold text-[#1a2f4c]">Security Alerts</span>
                            </div>
                        </div>
                        <ToggleElement active={settings.security} colorClass="bg-[#f47c20]" />
                    </div>
                </div>

                {/* Save Button */}
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="w-full py-[14px] mt-2 bg-[#f47c20] hover:bg-[#e06d1c] text-white font-bold rounded-[14px] text-[15px] transition-all active:scale-[0.98] shadow-lg shadow-orange-200/50 disabled:opacity-70 flex items-center justify-center"
                >
                    {isSaving ? 'Saving...' : 'Save Preferences'}
                </button>
            </div>
        </div>
    );
};

export default NotificationSettings;
