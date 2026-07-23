import React, { useState, useEffect, useCallback } from 'react';
import { UserCheck, Save, RotateCcw, AlertCircle } from 'lucide-react';
import { db } from '../../config/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useNotification } from '../../contexts/NotificationContext';

const StudentPermissions = ({ adminData }) => {
    const [saving, setSaving] = useState(false);
    const { showNotification } = useNotification();
    
    const initialSettings = {
        dayscholar: {
            autoApproveOutpass: true,
            allowLateEntry: false,
            nightPassEnabled: false,
            monthlyInLimit: 60,
            monthlyOutLimit: 60
        },
        hosteler: {
            autoApproveOutpass: false,
            allowLateEntry: true,
            nightPassEnabled: true,
            monthlyInLimit: 12,
            monthlyOutLimit: 12
        }
    };

    const [settings, setSettings] = useState(initialSettings);

    const handleToggle = (group, key) => {
        setSettings(prev => ({
            ...prev,
            [group]: {
                ...prev[group],
                [key]: !prev[group][key]
            }
        }));
    };

    const handleSave = async () => {
        if (!adminData?.collegeId) return;
        try {
            setSaving(true);
            
            // Explicitly construct the value object to ensure clean data
            const policiesToSave = {
                dayscholar: {
                    autoApproveOutpass: settings.dayscholar.autoApproveOutpass,
                    allowLateEntry: settings.dayscholar.allowLateEntry,
                    nightPassEnabled: settings.dayscholar.nightPassEnabled,
                    monthlyInLimit: settings.dayscholar.monthlyInLimit,
                    monthlyOutLimit: settings.dayscholar.monthlyOutLimit
                },
                hosteler: {
                    autoApproveOutpass: settings.hosteler.autoApproveOutpass,
                    allowLateEntry: settings.hosteler.allowLateEntry,
                    nightPassEnabled: settings.hosteler.nightPassEnabled,
                    monthlyInLimit: settings.hosteler.monthlyInLimit,
                    monthlyOutLimit: settings.hosteler.monthlyOutLimit
                }
            };

            const settingsRef = doc(db, `colleges/${adminData.collegeId}/settings`, 'student_policies');
            await setDoc(settingsRef, policiesToSave, { merge: true });

            showNotification('Student policies updated successfully.', 'success');
        } catch (err) {
            showNotification(`Failed to save policies: ${err.message}`, 'error');
        } finally {
            setSaving(false);
        }
    };

    // Fetch policies
    const fetchData = useCallback(async () => {
        if (!adminData?.collegeId) return;
        try {
            // 1. Fetch Policies
            const settingsRef = doc(db, `colleges/${adminData.collegeId}/settings`, 'student_policies');
            const docSnap = await getDoc(settingsRef);
            
            if (docSnap.exists()) {
                const val = docSnap.data();
                if (val && typeof val === 'object') {
                    // Robust normalization: support old plural keys and merge with defaults
                    setSettings({
                        dayscholar: {
                            ...initialSettings.dayscholar,
                            ...(val.dayscholar || val.dayscholars || {})
                        },
                        hosteler: {
                            ...initialSettings.hosteler,
                            ...(val.hosteler || val.hostellers || {})
                        }
                    });
                }
            }
        } catch (err) {
            // Don't show error notification on mount, just use defaults
            console.error("Error fetching policies:", err);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [adminData]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);



    return (
        <div className="flex-1 overflow-y-auto p-8 bg-[#f8f9fb]">
            {/* Header */}
            <div className="mb-8 flex items-center justify-between">
                <div>
                    <h1 className="text-[26px] font-bold text-gray-900 mb-1 italic">Student Permissions</h1>
                    <p className="text-sm text-gray-500 font-medium">Manage institutional student permissions and login approval requests.</p>
                </div>
                <div className="flex gap-3">
                    <button onClick={fetchData} className="p-2.5 bg-white border border-gray-100 rounded-xl text-gray-400 hover:text-gray-600 shadow-sm transition-all active:rotate-180 duration-500 cursor-pointer">
                        <RotateCcw className="w-5 h-5" />
                    </button>
                    <button 
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center gap-2 px-6 py-2.5 bg-[#f47c20] text-white font-black rounded-xl text-xs shadow-lg shadow-orange-500/20 hover:bg-[#e06d1c] transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                    >
                        {saving ? (
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <Save className="w-4 h-4" />
                        )}
                        {saving ? 'SAVING...' : 'SAVE POLICIES'}
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-8">
                {/* Group Policy Cards */}
                {['dayscholar', 'hosteler'].map(group => {
                    const groupSettings = settings[group];
                    if (!groupSettings) return null;
                    return (
                        <div key={group} className="bg-white rounded-[32px] border border-gray-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)] p-8">
                        <div className="flex items-center gap-4 mb-8">
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                                group === 'dayscholar' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'
                            }`}>
                                <UserCheck className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="text-lg font-black text-[#1a2b3c] capitalize">{group}</h3>
                                <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Category Policy</p>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100/50">
                                <div>
                                    <p className="font-bold text-[#1a2b3c] text-sm">Auto-Approve Outpass</p>
                                    <p className="text-[11px] text-gray-400 font-medium leading-tight">Skip manual approval for gate exit</p>
                                </div>
                                <button
                                    onClick={() => handleToggle(group, 'autoApproveOutpass')}
                                    className={`w-12 h-6 rounded-full p-1 transition-colors cursor-pointer ${groupSettings.autoApproveOutpass ? 'bg-emerald-500' : 'bg-gray-200'}`}
                                >
                                    <div className={`w-4 h-4 bg-white rounded-full transition-transform ${groupSettings.autoApproveOutpass ? 'translate-x-6' : 'translate-x-0'}`} />
                                </button>
                            </div>

                            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100/50">
                                <div>
                                    <p className="font-bold text-[#1a2b3c] text-sm">Late Entry Permission</p>
                                    <p className="text-[11px] text-gray-400 font-medium leading-tight">Allow entry after standard hours</p>
                                </div>
                                <button
                                    onClick={() => handleToggle(group, 'allowLateEntry')}
                                    className={`w-12 h-6 rounded-full p-1 transition-colors cursor-pointer ${groupSettings.allowLateEntry ? 'bg-orange-500' : 'bg-gray-200'}`}
                                >
                                    <div className={`w-4 h-4 bg-white rounded-full transition-transform ${groupSettings.allowLateEntry ? 'translate-x-6' : 'translate-x-0'}`} />
                                </button>
                            </div>

                            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100/50">
                                <div>
                                    <p className="font-bold text-[#1a2b3c] text-sm">Night Pass Access</p>
                                    <p className="text-[11px] text-gray-400 font-medium leading-tight">Enable overnight stay permissions</p>
                                </div>
                                <button
                                    onClick={() => handleToggle(group, 'nightPassEnabled')}
                                    className={`w-12 h-6 rounded-full p-1 transition-colors cursor-pointer ${groupSettings.nightPassEnabled ? 'bg-indigo-500' : 'bg-gray-200'}`}
                                >
                                    <div className={`w-4 h-4 bg-white rounded-full transition-transform ${groupSettings.nightPassEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
                                </button>
                            </div>

                            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100/50">
                                <p className="font-bold text-[#1a2b3c] text-sm mb-3 text-emerald-600">Monthly In Limit</p>
                                <div className="flex items-center gap-4">
                                    <input 
                                        type="range" 
                                        min="0" 
                                        max="100" 
                                        className="flex-1 accent-emerald-500 cursor-pointer"
                                        value={groupSettings.monthlyInLimit}
                                        onChange={(e) => {
                                            const val = parseInt(e.target.value);
                                            setSettings(prev => ({
                                                ...prev,
                                                [group]: { ...prev[group], monthlyInLimit: val }
                                            }));
                                        }}
                                    />
                                    <span className="w-12 text-center font-black text-emerald-600 bg-white border border-gray-100 py-1 rounded-lg text-xs shadow-sm">
                                        {groupSettings.monthlyInLimit}
                                    </span>
                                </div>
                            </div>

                            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100/50">
                                <p className="font-bold text-[#1a2b3c] text-sm mb-3 text-orange-600">Monthly Out Limit</p>
                                <div className="flex items-center gap-4">
                                    <input 
                                        type="range" 
                                        min="0" 
                                        max="100" 
                                        className="flex-1 accent-orange-500 cursor-pointer"
                                        value={groupSettings.monthlyOutLimit}
                                        onChange={(e) => {
                                            const val = parseInt(e.target.value);
                                            setSettings(prev => ({
                                                ...prev,
                                                [group]: { ...prev[group], monthlyOutLimit: val }
                                            }));
                                        }}
                                    />
                                    <span className="w-12 text-center font-black text-orange-600 bg-white border border-gray-100 py-1 rounded-lg text-xs shadow-sm">
                                        {groupSettings.monthlyOutLimit}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                    );
                })}


            </div>

            {/* Note */}
            <div className="mt-8 flex items-start gap-4 p-6 bg-amber-50 rounded-2xl border border-amber-100/50">
                <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <p className="text-[11px] text-amber-700 font-medium leading-relaxed">
                    <b>Attention:</b> Policy changes applied here will impact the verification status for all security gates. Ensure you have coordinated with the security department before modifying standard outing limits or auto-approval rules.
                </p>
            </div>
        </div>
    );
};

export default StudentPermissions;
