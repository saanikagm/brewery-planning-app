"use client";
import { useState, useEffect } from 'react';
import { generateCapacityPlan } from './capacityPlanning';

export default function CapacityPlanTable({ productData }: any) {
    // 1. Setup Local Editable State
    const [liveStartInv, setLiveStartInv] = useState(productData.startInv);
    const [baseSafetyStock, setBaseSafetyStock] = useState(productData.safetyStock);
    const [serviceLevel, setServiceLevel] = useState(95); // Default to 95%

    // Reset local state if the user selects a different beer
    useEffect(() => {
        setLiveStartInv(productData.startInv);
        setBaseSafetyStock(productData.safetyStock);
        setServiceLevel(95);
    }, [productData]);

    // 2. Generate 6 Calendar Dates
    const calendarDates = Array.from({length: 6}).map((_, i) => {
        const d = new Date();
        d.setDate(d.getDate() + (i * 7));
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    });

    // 3. --- STATISTICAL SERVICE LEVEL MATH ---
    // Calculate the effective safety stock based on standard Z-scores
    // Assuming the base safety stock in the DB is for a 95% CSL (Z = 1.645)
    const getZRatio = (sl: number) => {
        if (sl === 99) return 2.33 / 1.645;  // Multiplier: ~1.41
        if (sl === 95) return 1.0;           // Multiplier: 1.00
        if (sl === 90) return 1.28 / 1.645;  // Multiplier: ~0.78
        if (sl === 85) return 1.04 / 1.645;  // Multiplier: ~0.63
        return 1.0;
    };

    const effectiveSafetyStock = baseSafetyStock * getZRatio(serviceLevel);

    // 4. Run the math LIVE with the new effective parameters
    const plan = generateCapacityPlan(productData.name, productData.forecasts, liveStartInv, effectiveSafetyStock);
    const fmt = (num: number) => Number(num).toFixed(1);

    return (
        <div className="overflow-x-auto p-6 bg-white rounded-xl shadow-sm border border-slate-200 mb-8 text-slate-800">
            {/* Header & Interactive Controls */}
            <div className="flex justify-between items-start mb-6">
                <div>
                    <h2 className="text-2xl font-extrabold text-slate-900 mb-2">{plan.productName} - Scenario Planner</h2>
                    <div className="flex space-x-4 text-sm">
                        <span className="bg-blue-50 text-blue-800 px-3 py-1 rounded-md border border-blue-100 font-semibold">
                            Avg Demand: {fmt(plan.avgWeeklyDemand)} bbl/wk
                        </span>
                        <span className={`px-3 py-1 rounded-md border font-semibold ${plan.weeksOnHand < 2 ? 'bg-red-50 text-red-800 border-red-100' : 'bg-emerald-50 text-emerald-800 border-emerald-100'}`}>
                            Current Weeks on Hand: {fmt(plan.weeksOnHand)} WOH
                        </span>
                    </div>
                </div>

                <div className="flex space-x-6 bg-slate-50 p-4 rounded-lg border border-slate-200">
                    {/* Editable Start Inv */}
                    <div className="flex flex-col">
                        <label className="text-xs font-bold text-slate-500 uppercase mb-1">Starting Inv</label>
                        <input
                            type="number"
                            value={liveStartInv}
                            onChange={(e) => setLiveStartInv(Number(e.target.value))}
                            className="w-24 p-2 border border-slate-300 rounded focus:border-blue-500 outline-none font-bold text-lg"
                        />
                    </div>

                    {/* Editable Base Safety Stock */}
                    <div className="flex flex-col">
                        <label className="text-xs font-bold text-slate-500 uppercase mb-1">Base SS (95%)</label>
                        <input
                            type="number"
                            value={baseSafetyStock}
                            onChange={(e) => setBaseSafetyStock(Number(e.target.value))}
                            className="w-24 p-2 border border-slate-300 rounded focus:border-blue-500 outline-none font-bold text-lg"
                        />
                    </div>

                    {/* Cycle Service Level Toggle */}
                    <div className="flex flex-col">
                        <label className="text-xs font-bold text-slate-500 uppercase mb-1">Service Level</label>
                        <div className="flex space-x-1 bg-slate-200 p-1 rounded">
                            {[85, 90, 95, 99].map(sl => (
                                <button
                                    key={sl}
                                    onClick={() => setServiceLevel(sl)}
                                    className={`px-3 py-1 rounded text-sm font-bold transition-colors ${serviceLevel === sl ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                >
                                    {sl}%
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Active Parameter Readout */}
            <div className="mb-6 text-sm bg-blue-50 text-blue-800 p-3 rounded-lg border border-blue-100 flex justify-between items-center">
                <span><strong>Active Scenario:</strong> {serviceLevel}% Target Service Level.</span>
                <span>Effective Safety Stock Minimum: <strong>{fmt(effectiveSafetyStock)} bbl</strong></span>
            </div>

            <table className="min-w-full text-sm text-left border-collapse mb-6">
                <thead>
                    <tr className="bg-slate-50 border-y border-slate-200 text-slate-600 uppercase tracking-wider text-xs">
                        <th className="p-3 border-r border-slate-200 font-semibold">Weekly Flow</th>
                        <th className="p-3 text-center">Wk 0</th>
                        {calendarDates.map((date, i) => <th key={i} className="p-3 text-center text-blue-700">{date}</th>)}
                        <th className="p-3 border-l border-slate-200 text-center">Total</th>
                    </tr>
                </thead>
                <tbody>
                    <tr className="border-b border-slate-100">
                        <td className="p-3 border-r border-slate-200 font-medium text-red-600">➖ Forecasted Demand</td>
                        <td className="p-3 text-center text-slate-400">-</td>
                        {plan.forecasts.map((f, i) => <td key={i} className="p-3 text-center text-red-600">{fmt(f)}</td>)}
                        <td className="p-3 border-l border-slate-200 text-center font-bold text-red-600">{fmt(plan.totalForecast)}</td>
                    </tr>

                    <tr className="border-b border-slate-100">
                        <td className="p-3 border-r border-slate-200 font-medium text-emerald-600">➕ Brews Arriving</td>
                        <td className="p-3 text-center text-slate-400">-</td>
                        {plan.plannedReceipt.map((r, i) => <td key={i} className="p-3 text-center font-bold text-emerald-600">{r > 0 ? r : '-'}</td>)}
                        <td className="p-3 border-l border-slate-200 text-center text-slate-400">-</td>
                    </tr>

                    <tr className="border-b border-slate-200 bg-slate-50">
                        <td className="p-3 border-r border-slate-200 font-bold text-slate-800">📦 Ending Inventory</td>
                        <td className="p-3 text-center font-bold text-slate-900">{fmt(plan.startInv)}</td>
                        {plan.projAvailable.map((p, i) => (
                            <td key={i} className={`p-3 text-center font-bold ${p < plan.safetyStock ? 'text-red-600' : 'text-slate-800'}`}>{fmt(p)}</td>
                        ))}
                        <td className="p-3 border-l border-slate-200 text-center text-slate-400">-</td>
                    </tr>

                    <tr className="border-b-2 border-blue-200 bg-blue-50">
                        <td className="p-4 border-r border-blue-200 font-extrabold text-blue-800 text-base">⚙️ ACTION: Start Brewing</td>
                        <td className="p-4 text-center text-blue-300">-</td>
                        {plan.plannedRelease.map((r, i) => (
                            <td key={i} className="p-4 text-center font-black text-blue-700 text-base">{r > 0 ? `${r} bbl` : '-'}</td>
                        ))}
                        <td className="p-4 border-l border-blue-200 text-center font-bold text-blue-800">
                           {plan.plannedRelease.reduce((a, b) => a + b, 0)} bbl
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    );
}