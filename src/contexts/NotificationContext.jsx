import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { CheckCircle2, XCircle, AlertCircle, Info, X } from 'lucide-react';

const NotificationContext = createContext();

export const useNotification = () => {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error('useNotification must be used within a NotificationProvider');
    }
    return context;
};

const Modal = ({ title, message, type = 'info', onConfirm, onCancel, confirmText = 'OK', cancelText }) => {
    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-300 border border-gray-100">
                <div className="p-8 text-center">
                    <div className="flex justify-center mb-6">
                        <div className={`p-4 rounded-3xl ${type === 'error' ? 'bg-red-50 text-red-500' : 'bg-orange-50 text-[#f47c20]'}`}>
                            {type === 'error' ? <AlertCircle size={32} /> : <Info size={32} />}
                        </div>
                    </div>
                    <h3 className="text-xl font-black text-gray-900 mb-2">{title || 'Attention'}</h3>
                    <p className="text-sm font-bold text-gray-400 leading-relaxed px-2">{message}</p>
                </div>
                <div className="flex border-t border-gray-50">
                    {cancelText && (
                        <button 
                            onClick={onCancel}
                            className="flex-1 px-4 py-5 text-sm font-black text-gray-400 hover:bg-gray-50 transition-colors uppercase tracking-widest border-r border-gray-50"
                        >
                            {cancelText}
                        </button>
                    )}
                    <button 
                        onClick={onConfirm}
                        className="flex-1 px-4 py-5 text-sm font-black text-[#f47c20] hover:bg-orange-50/50 transition-colors uppercase tracking-widest"
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};

const Toast = ({ message, type = 'info', onClose }) => {
    const [progress, setProgress] = useState(100);
    const duration = 4000;

    useEffect(() => {
        const timer = setTimeout(() => {
            onClose();
        }, duration);

        const progressInterval = setInterval(() => {
            setProgress(prev => Math.max(0, prev - (100 / (duration / 10))));
        }, 10);

        return () => {
            clearTimeout(timer);
            clearInterval(progressInterval);
        };
    }, [onClose]);

    const icons = {
        success: <CheckCircle2 className="w-5 h-5 text-emerald-500" />,
        error: <XCircle className="w-5 h-5 text-red-500" />,
        warning: <AlertCircle className="w-5 h-5 text-orange-500" />,
        info: <Info className="w-5 h-5 text-blue-500" />
    };

    const bgColors = {
        success: 'bg-emerald-50/90 border-emerald-100',
        error: 'bg-red-50/90 border-red-100',
        warning: 'bg-orange-50/90 border-orange-100',
        info: 'bg-blue-50/90 border-blue-100'
    };

    const progressColors = {
        success: 'bg-emerald-500',
        error: 'bg-red-500',
        warning: 'bg-orange-500',
        info: 'bg-blue-500'
    };

    return (
        <div className={`fixed top-6 right-6 z-[9999] min-w-[320px] max-w-md animate-in slide-in-from-right duration-300`}>
            <div className={`relative overflow-hidden backdrop-blur-md border rounded-2xl p-4 shadow-xl ${bgColors[type]}`}>
                <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                        {icons[type]}
                    </div>
                    <div className="flex-1">
                        <p className="text-sm font-bold text-gray-900 leading-tight">
                            {message}
                        </p>
                    </div>
                    <button 
                        onClick={onClose}
                        className="flex-shrink-0 p-1 rounded-lg hover:bg-black/5 transition-colors"
                    >
                        <X className="w-4 h-4 text-gray-400" />
                    </button>
                </div>
                
                {/* Progress Bar */}
                <div className="absolute bottom-0 left-0 h-1 w-full bg-black/5">
                    <div 
                        className={`h-full transition-all linear ${progressColors[type]}`}
                        style={{ width: `${progress}%` }}
                    />
                </div>
            </div>
        </div>
    );
};

export const NotificationProvider = ({ children }) => {
    const [notification, setNotification] = useState(null);
    const [modal, setModal] = useState(null);

    const showNotification = useCallback((message, type = 'info') => {
        setNotification({ message, type });
    }, []);

    const hideNotification = useCallback(() => {
        setNotification(null);
    }, []);

    const showModal = useCallback((options) => {
        return new Promise((resolve) => {
            setModal({
                ...options,
                onConfirm: () => {
                    setModal(null);
                    resolve(true);
                },
                onCancel: () => {
                    setModal(null);
                    resolve(false);
                }
            });
        });
    }, []);

    return (
        <NotificationContext.Provider value={{ showNotification, showModal }}>
            {children}
            {notification && (
                <Toast 
                    message={notification.message} 
                    type={notification.type} 
                    onClose={hideNotification} 
                />
            )}
            {modal && (
                <Modal 
                    {...modal}
                />
            )}
        </NotificationContext.Provider>
    );
};
