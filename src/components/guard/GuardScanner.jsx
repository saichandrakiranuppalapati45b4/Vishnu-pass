import React, { useState, useRef } from 'react';
import { ChevronLeft, ShieldCheck, Loader2, Fingerprint, Camera, ShieldAlert } from 'lucide-react';
import { Scanner } from '@yudiel/react-qr-scanner';
import { verifyQrToken } from '../../lib/functions';
import VerificationResult from '../student/VerificationResult'; // Can adapt for guard

const GuardScanner = ({ guardData, onBack }) => {
    const [status, setStatus] = useState('scanning'); // scanning, processing, completed
    const [error, setError] = useState(null);
    const [scanResult, setScanResult] = useState(null);
    const scanLock = useRef(false);

    const handleScan = async (result) => {
        if (!result || scanLock.current) return;
        
        const rawValue = typeof result === 'string' ? result : (result[0]?.rawValue || result?.text || result?.rawValue);
        if (!rawValue) return;

        try {
            scanLock.current = true;
            setStatus('processing');
            setError(null);

            // Call cloud function to verify token
            const response = await verifyQrToken({
                token: rawValue,
                gateId: guardData.gate_id,
                movementType: 'IN' // Default to IN, or we can add a toggle if needed
            });

            const data = response.data;
            if (data.status === 'VALID') {
                setScanResult({
                    student: data.student,
                    status: 'completed',
                    warning: data.student.warning,
                    verifiedAt: new Date().toISOString()
                });
                setStatus('completed');
            } else {
                setScanResult({
                    status: 'rejected',
                    error: data.message,
                    verifiedAt: new Date().toISOString()
                });
                setStatus('completed');
            }
        } catch (err) {
            setError(err?.message || "Verification failed");
            setStatus('scanning');
        } finally {
            // We do not release scanLock immediately if successful, to prevent double scans
            if (status !== 'completed') {
                setTimeout(() => {
                    scanLock.current = false;
                }, 2000);
            }
        }
    };

    if (status === 'completed' && scanResult) {
        // Reuse VerificationResult or build a custom one
        return (
            <VerificationResult 
                studentData={scanResult.student || { full_name: 'Unknown', student_id: 'Unknown' }}
                gateName={guardData?.guard_gates?.name || 'Gate'}
                verifiedAt={scanResult.verifiedAt}
                onNextScan={() => {
                    setScanResult(null);
                    setStatus('scanning');
                    scanLock.current = false;
                }}
                warning={scanResult.warning}
                status={scanResult.status}
                hideNavBar={true}
                customError={scanResult.error}
            />
        );
    }

    return (
        <div className="flex-1 flex flex-col bg-[#f8f9fb] overflow-hidden relative font-sans min-h-screen">
            <header className="px-6 py-10 flex justify-between items-center relative z-20">
                <button
                    onClick={onBack}
                    className="w-12 h-12 rounded-2xl bg-white border border-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-900 hover:bg-gray-50 transition-all shadow-sm active:scale-95"
                >
                    <ChevronLeft className="w-6 h-6" />
                </button>
                <div className="px-8 py-3 rounded-full bg-white border border-gray-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] text-gray-900 font-black text-[12px] tracking-[0.2em] uppercase">
                    Security Scanner
                </div>
                <div className="w-12 h-12" /> {/* Spacer */}
            </header>

            <div className="flex-1 flex flex-col items-center justify-center px-6 relative z-30 pb-20">
                <div className="w-full bg-white rounded-[40px] p-8 shadow-[0_20px_50px_rgba(0,0,0,0.04)] border border-gray-50 relative overflow-hidden">
                    <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-[#f47c20] to-[#e06b12]" />

                    <div className="flex flex-col items-center text-center">
                        <div className={`flex items-center gap-2 mb-4 px-4 py-2 rounded-xl border ${
                            status === 'processing' ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'
                        }`}>
                            {status === 'processing' ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <ShieldCheck className="w-4 h-4" />
                            )}
                            <span className="text-xs font-black uppercase tracking-wider">
                                {status === 'processing' ? 'Verifying Token...' : 'Scanner Ready'}
                            </span>
                        </div>

                        {error && (
                            <div className="mb-4 px-4 py-3 bg-red-50 border border-red-100 rounded-xl w-full">
                                <p className="text-xs font-bold text-red-600 break-words">{error}</p>
                            </div>
                        )}

                        <div className="w-full aspect-square relative rounded-[32px] overflow-hidden border-2 border-[#f47c20]/20 shadow-xl mb-6 bg-gray-900">
                            <div className={`absolute inset-0 border-4 transition-colors duration-300 z-30 pointer-events-none ${
                                status === 'processing' ? 'border-amber-500/30' : 'border-emerald-500/30'
                            }`} />
                            <div className="absolute top-6 left-6 w-8 h-8 border-t-4 border-l-4 border-[#f47c20] rounded-tl-2xl z-20" />
                            <div className="absolute top-6 right-6 w-8 h-8 border-t-4 border-r-4 border-[#f47c20] rounded-tr-2xl z-20" />
                            <div className="absolute bottom-6 left-6 w-8 h-8 border-b-4 border-l-4 border-[#f47c20] rounded-bl-2xl z-20" />
                            <div className="absolute bottom-6 right-6 w-8 h-8 border-b-4 border-r-4 border-[#f47c20] rounded-br-2xl z-20" />
                            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#f47c20] to-transparent z-20 animate-[scan_3s_ease-in-out_infinite]" />

                            <div className="absolute inset-0 flex items-center justify-center bg-gray-900 z-10">
                                <div className="flex flex-col items-center gap-3">
                                    <Loader2 className="w-8 h-8 text-[#f47c20] animate-spin opacity-50" />
                                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Initialising Opticals...</p>
                                </div>
                            </div>

                            <Scanner
                                onScan={handleScan}
                                onError={(err) => {
                                    const msg = typeof err === 'string' ? err : err?.message || 'Permission denied or not found';
                                    setError(`Camera error: ${msg}`);
                                }}
                                constraints={{
                                    facingMode: "environment"
                                }}
                                components={{ tracker: false, finder: false, audio: true, torch: true }}
                                styles={{
                                    container: { width: '100%', height: '100%', background: 'black', position: 'relative', zIndex: 20 },
                                    video: { objectFit: 'cover', width: '100%', height: '100%' },
                                }}
                            />

                            {status === 'processing' && (
                                <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-30 flex flex-col items-center justify-center text-gray-900 gap-4">
                                    <Loader2 className="w-10 h-10 text-[#f47c20] animate-spin" />
                                    <p className="text-xs font-black tracking-[0.2em] uppercase">
                                        Validating Identity...
                                    </p>
                                </div>
                            )}
                        </div>

                        <p className="text-xs font-bold text-gray-400 mb-6 tracking-wide uppercase">
                            Align Student Virtual ID within the frame
                        </p>
                    </div>
                </div>
            </div>

            <style>{`
                .font-sans { font-family: 'Outfit', 'Inter', sans-serif; }
                @keyframes scan {
                    0%, 100% { top: 10%; opacity: 0.2; }
                    50% { top: 90%; opacity: 0.9; }
                }
            `}</style>
        </div>
    );
};

export default GuardScanner;
