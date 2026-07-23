import React from 'react';
import { Bell, CheckCircle2, AlertTriangle, Info, Shield, Clock, Trash2, CheckCircle } from 'lucide-react';

const Notifications = () => {
    const [notifications, setNotifications] = React.useState([
        {
            id: 1,
            type: 'security',
            title: 'Successful Login',
            message: 'Admin account logged in from a new IP: 192.168.1.45',
            time: '2 minutes ago',
            read: false,
            icon: Shield,
            color: 'text-blue-500',
            bgColor: 'bg-blue-50'
        },
        {
            id: 2,
            type: 'success',
            title: 'System Branding Updated',
            message: 'The portal logo and background were successfully synchronized with Supabase.',
            time: '1 hour ago',
            read: false,
            icon: CheckCircle2,
            color: 'text-emerald-500',
            bgColor: 'bg-emerald-50'
        },
        {
            id: 3,
            type: 'warning',
            title: 'Department Sync Warning',
            message: '"Mechanical Engineering" department has no active guards assigned.',
            time: '5 hours ago',
            read: true,
            icon: AlertTriangle,
            color: 'text-amber-500',
            bgColor: 'bg-amber-50'
        },
        {
            id: 4,
            type: 'info',
            title: 'Maintenance Reminder',
            message: 'Scheduled maintenance is set for Sunday at 02:00 AM IST.',
            time: '1 day ago',
            read: true,
            icon: Info,
            color: 'text-[#f47c20]',
            bgColor: 'bg-[#fff4eb]'
        }
    ]);

    const markAllRead = () => {
        setNotifications(notifications.map(n => ({ ...n, read: true })));
    };

    const clearAll = () => {
        setNotifications([]);
    };

    return (
        <div className="flex-1 overflow-y-auto p-8 bg-[#f8f9fb]">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-[26px] font-bold text-gray-900 mb-1 italic">Notification Center</h1>
                    <p className="text-sm text-gray-500 font-medium">Keep track of system updates, security alerts, and administrative changes.</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={markAllRead}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-600 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-colors shadow-sm"
                    >
                        <CheckCircle className="w-4 h-4" />
                        Mark all as read
                    </button>
                    <button
                        onClick={clearAll}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-red-500 rounded-xl text-sm font-semibold hover:bg-red-50 hover:border-red-100 transition-colors shadow-sm"
                    >
                        <Trash2 className="w-4 h-4" />
                        Clear all
                    </button>
                </div>
            </div>

            {/* Notifications List */}
            <div className="max-w-4xl space-y-4">
                {notifications.length > 0 ? (
                    notifications.map((notif) => (
                        <div
                            key={notif.id}
                            className={`group relative bg-white rounded-2xl p-5 border transition-all duration-300 shadow-[0_1px_3px_rgba(0,0,0,0.04)] ${!notif.read ? 'border-l-4 border-l-[#f47c20] border-gray-100' : 'border-gray-100 opacity-80'
                                } hover:shadow-md`}
                        >
                            <div className="flex gap-4">
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${notif.bgColor}`}>
                                    <notif.icon className={`w-6 h-6 ${notif.color}`} />
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center justify-between mb-1">
                                        <h3 className={`font-bold text-[15px] ${!notif.read ? 'text-gray-900' : 'text-gray-600'}`}>
                                            {notif.title}
                                            {!notif.read && (
                                                <span className="ml-2 inline-block w-2 h-2 bg-[#f47c20] rounded-full"></span>
                                            )}
                                        </h3>
                                        <div className="flex items-center gap-1.5 text-gray-400">
                                            <Clock className="w-3.5 h-3.5" />
                                            <span className="text-[11px] font-semibold uppercase tracking-wider">{notif.time}</span>
                                        </div>
                                    </div>
                                    <p className="text-sm text-gray-500 font-medium leading-relaxed">
                                        {notif.message}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="bg-white rounded-2xl p-12 border border-gray-100 text-center flex flex-col items-center">
                        <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mb-4">
                            <Bell className="w-8 h-8 text-gray-300" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 mb-1">All clear!</h3>
                        <p className="text-sm text-gray-400 font-medium">You have no new notifications at the moment.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Notifications;
