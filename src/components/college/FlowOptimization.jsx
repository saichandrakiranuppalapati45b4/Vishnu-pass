import React, { useState, useEffect } from 'react';
import { ArrowLeft, Download, CheckCircle2, Zap, Clock, Sparkles, UserPlus, Smartphone, Truck, Info, ChevronRight, Loader2 } from 'lucide-react';
import { supabase } from '../../config/supabase';

const RecommendationCard = ({ icon, title, description, impact, action, colorClass }) => {
    const Icon = icon;
    return (
        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-all group">
            <div className="flex items-start gap-4">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 ${colorClass}`}>
                    <Icon className="w-7 h-7" />
                </div>
                <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                        <h4 className="font-black text-gray-900 text-[15px]">{title}</h4>
                        <span className={`text-[10px] font-black uppercase tracking-widest ${impact === 'HIGH IMPACT' ? 'text-orange-500' : impact === 'MEDIUM IMPACT' ? 'text-blue-500' : 'text-emerald-500'}`}>
                            {impact}
                        </span>
                    </div>
                    <p className="text-gray-400 text-xs font-bold leading-relaxed mb-4">{description}</p>
                    <button className="text-[11px] font-black text-[#f47c20] hover:underline flex items-center gap-1 group-hover:gap-2 transition-all cursor-pointer">
                        {action} <ChevronRight className="w-3 h-3" />
                    </button>
                </div>
            </div>
        </div>
    );
};

const FlowOptimization = ({ onBack, collegeData }) => {
    const hours = ['12AM', '4AM', '8AM', '12PM', '4PM', '8PM', '11PM'];
    const [gates, setGates] = useState([]);
    const [heatmapData, setHeatmapData] = useState({});
    const [metrics, setMetrics] = useState({
        avgWaitTime: 1.2,
        projectedWaitTime: 0.8,
        improvementPercent: 33,
        predictedVisitors: 450
    });
    const [loading, setLoading] = useState(true);

    const fetchAnalytics = async (showLoading = true) => {
        if (showLoading) setLoading(true);
        try {
            // 1. Fetch Gates
            const { data: gatesData } = await supabase
                .from('guard_gates')
                .select('*')
                .order('name');

            const gList = gatesData || [];
            setGates(gList);

            if (gList.length === 0) {
                setLoading(false);
                return;
            }

            // 2. Fetch last 24h logs
            const yesterday = new Date();
            yesterday.setHours(yesterday.getHours() - 24);

            const { data: logsData } = await supabase
                .from('movement_logs')
                .select('*')
                .gte('created_at', yesterday.toISOString());

            const logs = logsData || [];

            // 3. Process Heatmap (24h x N gates)
            const matrix = {};
            gList.forEach(gate => {
                matrix[gate.name] = Array(24).fill(0); 
            });

            logs.forEach(log => {
                const gateIdentifier = log.access_point_id || log.gateId || gList[0]?.name;
                if (gateIdentifier && matrix[gateIdentifier]) {
                    const hour = new Date(log.created_at || Date.now()).getHours();
                    matrix[gateIdentifier][hour]++;
                }
            });

            // Find max intensity for scaling colors
            let maxIntensity = 1;
            Object.values(matrix).forEach(row => {
                row.forEach(val => { if (val > maxIntensity) maxIntensity = val; });
            });

            // Scale to 0-1
            const scaledMatrix = {};
            Object.keys(matrix).forEach(gateId => {
                scaledMatrix[gateId] = matrix[gateId].map(val => val / maxIntensity);
            });

            setHeatmapData(scaledMatrix);

            // 4. Calculate Metrics
            const totalLogs = logs.length;
            const avgScansPerHour = totalLogs / 24;
            const density = avgScansPerHour / (Math.max(1, gList.length) * 5);
            const baseWait = 2.5;
            const currentWait = Math.min(15, baseWait + (density * 10));
            const projected = Math.max(1.5, currentWait * 0.4);

            setMetrics({
                avgWaitTime: currentWait.toFixed(1),
                projectedWaitTime: projected.toFixed(1),
                improvementPercent: ((1 - (projected / currentWait)) * 100).toFixed(0),
                predictedVisitors: Math.max(100, Math.round(totalLogs * 1.25))
            });

        } catch (err) {
            console.error("Error fetching analytics in flow optimization:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAnalytics();
    }, []);

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center bg-[#f8f9fb]">
                <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-8 h-8 text-[#f47c20] animate-spin" />
                    <p className="text-sm font-black text-gray-500 uppercase tracking-widest">Crunching real-time flow data...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-y-auto p-8 bg-[#f8f9fb]">
            {/* Header */}
            <div className="mb-10 flex items-center justify-between">
                <div className="flex items-center gap-6">
                    <button
                        onClick={onBack}
                        className="w-12 h-12 bg-white border border-gray-100 rounded-2xl flex items-center justify-center text-gray-900 shadow-sm hover:shadow-md transition-all active:scale-95 cursor-pointer"
                    >
                        <ArrowLeft className="w-6 h-6" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-black text-gray-900 tracking-tight italic mb-1">Gate Flow Optimization</h1>
                        <p className="text-sm text-gray-400 font-bold">Real-time insights and AI-driven recommendations to reduce gate congestion.</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button className="flex items-center gap-2 px-6 py-3 bg-[#f1f5f9] text-gray-700 font-black rounded-2xl text-xs hover:bg-gray-200 transition-colors cursor-pointer">
                        <Download className="w-4 h-4 text-gray-400" />
                        EXPORT ANALYSIS
                    </button>
                    <button className="flex items-center gap-2 px-6 py-3 bg-[#f47c20] text-white font-black rounded-2xl text-xs shadow-lg shadow-orange-500/20 hover:bg-[#e06d1c] transition-colors cursor-pointer">
                        <CheckCircle2 className="w-4 h-4 text-white/80" />
                        APPLY RECOMMENDATIONS
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-3 gap-8">
                {/* Heatmap Section */}
                <div className="col-span-3 bg-white rounded-[40px] border border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.04)] p-8">
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center">
                                <Zap className="w-5 h-5 text-[#f47c20]" />
                            </div>
                            <h3 className="font-black text-gray-900 text-[17px]">Traffic Heatmap: Gate Usage Intensity (Last 24h)</h3>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-orange-50"></div>
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Low</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-orange-200"></div>
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Medium</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">High</span>
                            </div>
                        </div>
                    </div>

                    <div className="relative">
                        {/* Grid Labels */}
                        <div className="grid grid-cols-7 ml-20 mb-4 items-center">
                            {hours.map(h => (
                                <span key={h} className="text-[10px] font-black text-gray-400 text-center tracking-widest">{h}</span>
                            ))}
                        </div>

                        {/* Data Rows */}
                        <div className="space-y-3">
                            {gates.map((gate) => (
                                <div key={gate.id} className="flex items-center gap-4">
                                    <span className="w-16 text-right text-[11px] font-black text-gray-400 uppercase tracking-widest truncate" title={gate.name}>{gate.name}</span>
                                    <div className="flex-1 grid grid-cols-24 h-10 gap-1" style={{ gridTemplateColumns: 'repeat(24, minmax(0, 1fr))' }}>
                                        {Array.from({ length: 24 }).map((_, j) => {
                                            const intensity = heatmapData[gate.name]?.[j] || 0;
                                            const bgClass = intensity > 0.7 ? 'bg-orange-500' : intensity > 0.3 ? 'bg-orange-200' : 'bg-orange-50';
                                            return <div key={j} className={`rounded-md ${bgClass} opacity-80 hover:opacity-100 transition-opacity cursor-pointer`} title={`${gate.name} - ${j}:00 (${Math.round(intensity * 100)}% density)`}></div>;
                                        })}
                                    </div>
                                </div>
                            ))}
                            {gates.length === 0 && (
                                <p className="text-sm text-gray-400 text-center mt-4 font-medium">No gates found to display heatmap.</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Left Column: Metrics */}
                <div className="space-y-8">
                    <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm p-8">
                        <div className="flex items-center gap-2 mb-8">
                            <Clock className="w-5 h-5 text-orange-500" />
                            <h3 className="font-black text-gray-900 text-[17px]">Efficiency Metrics</h3>
                        </div>

                        <div className="space-y-10">
                            <div>
                                <div className="flex items-center justify-between mb-3">
                                    <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Avg. Wait Time</p>
                                    <p className="text-2xl font-black text-gray-900">{metrics.avgWaitTime} min</p>
                                </div>
                                <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                                    <div className="h-full bg-orange-200 transition-all duration-1000" style={{ width: `${(metrics.avgWaitTime / 15) * 100}%` }} />
                                </div>
                                <p className="text-[10px] font-bold text-gray-400 mt-2">Current Status <span className={`font-black ${parseFloat(metrics.avgWaitTime) > 10 ? 'text-red-500' : 'text-orange-500'}`}>({parseFloat(metrics.avgWaitTime) > 10 ? 'High Congestion' : 'Normal Flow'})</span></p>
                            </div>

                            <div>
                                <div className="flex items-center justify-between mb-3">
                                    <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Projected Wait Time</p>
                                    <p className="text-2xl font-black text-orange-500">{metrics.projectedWaitTime} min</p>
                                </div>
                                <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                                    <div className="h-full bg-orange-500 transition-all duration-1000" style={{ width: `${(metrics.projectedWaitTime / 15) * 100}%` }} />
                                </div>
                                <p className="text-[10px] font-bold text-emerald-500 mt-2 italic flex items-center gap-1">
                                    <Sparkles className="w-3 h-3" /> Estimated Improvement: -{metrics.improvementPercent}%
                                </p>
                            </div>

                            <div className="p-5 bg-orange-50/50 rounded-3xl border border-orange-100 relative overflow-hidden group">
                                <Sparkles className="absolute -bottom-2 -right-2 w-16 h-16 text-[#f47c20]/5 group-hover:scale-110 transition-transform" />
                                <div className="flex gap-3 relative z-10">
                                    <Info className="w-4 h-4 text-[#f47c20] flex-shrink-0" />
                                    <p className="text-[11px] font-black text-gray-600 leading-relaxed uppercase tracking-wider">
                                        AI Predicts <span className="text-orange-500 font-black">{metrics.predictedVisitors}+ visitors</span> during the morning peak tomorrow.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: AI Recommendations */}
                <div className="col-span-2 bg-white rounded-[40px] border border-gray-100 shadow-sm p-8">
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-[#f47c20]" />
                            <h3 className="font-black text-gray-900 text-[17px]">AI-Driven Recommendations</h3>
                        </div>
                        <span className="px-3 py-1 bg-orange-50 text-[#f47c20] text-[10px] font-black uppercase tracking-widest rounded-lg">
                            {parseFloat(metrics.avgWaitTime) > 7 ? '3 PRIORITY ITEMS' : 'OPTIMAL FLOW DETECTED'}
                        </span>
                    </div>

                    <div className="space-y-4">
                        <RecommendationCard
                            icon={UserPlus}
                            title="Deploy Extra Guard at Peak Gates"
                            impact="HIGH IMPACT"
                            description={`Based on the ${metrics.avgWaitTime}m wait time, increasing personnel will clear vehicle queuing 40% faster.`}
                            action="Auto-schedule Staff"
                            colorClass="bg-orange-50 text-orange-500"
                        />
                        <RecommendationCard
                            icon={Smartphone}
                            title="Enable Auto-Scanning for Pre-Approved"
                            impact="MEDIUM IMPACT"
                            description="Allow trusted recurring visitors to use QR lanes automatically to bypass manual check-ins."
                            action="Configure Lane 3"
                            colorClass="bg-blue-50 text-blue-500"
                        />
                        <RecommendationCard
                            icon={Truck}
                            title="Reroute Deliveries to Service Gate"
                            impact="EFFICIENCY"
                            description="Current congestion at main gates can be reduced by 15% if courier traffic is redirected."
                            action="Send Notice to Carriers"
                            colorClass="bg-emerald-50 text-emerald-500"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FlowOptimization;
