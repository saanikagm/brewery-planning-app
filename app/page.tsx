"use client";
import { supabase } from '../lib/supabase';
import CapacityPlanTable from './CapacityPlanTable';
import { generateCapacityPlan } from './capacityPlanning';
import { useEffect, useMemo, useState } from "react";

type ForecastRow = {
  ProductName?: string;
  Week1?: string; Week2?: string; Week3?: string; Week4?: string;
  Week5?: string; Week6?: string; Week7?: string; Week8?: string;
};

type InventoryRow = {
  name: string;
  startInv: number;
  safetyStock: number;
};

function toNumber(value?: string) {
  if (!value) return 0;
  const num = Number(value.toString().replace(/,/g, "").trim());
  return Number.isNaN(num) ? 0 : num;
}

export default function Home() {
  const [activeTab, setActiveTab] = useState("operations");
  const [rows, setRows] = useState<ForecastRow[]>([]);
  const [inventoryDB, setInventoryDB] = useState<InventoryRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedOpsProduct, setSelectedOpsProduct] = useState("Bulbous Flowers");

  useEffect(() => {
    setRows([
        { ProductName: "Bulbous Flowers", Week1: "120", Week2: "130", Week3: "110", Week4: "140", Week5: "150", Week6: "130", Week7: "160", Week8: "125" },
        { ProductName: "The Coachman", Week1: "45", Week2: "50", Week3: "40", Week4: "55", Week5: "60", Week6: "45", Week7: "50", Week8: "55" },
        { ProductName: "The Harlot", Week1: "80", Week2: "85", Week3: "90", Week4: "80", Week5: "75", Week6: "85", Week7: "95", Week8: "90" }
    ]);
    setInventoryDB([
        { name: 'Bulbous Flowers', startInv: 80.0, safetyStock: 15.45 },
        { name: 'The Coachman', startInv: 43.1, safetyStock: 8.39 },
        { name: 'The Harlot', startInv: 21.2, safetyStock: 10.00 },
    ]);
    setLoading(false);
  }, []);

  const products = useMemo(() => [...new Set(rows.map((r) => r.ProductName).filter(Boolean))].sort() as string[], [rows]);

  // --- MASTER SCHEDULE LOGIC ---
  const MAX_CAPACITY = 500;
  const masterSchedule = useMemo(() => {
      if (rows.length === 0) return null;

      // Changed to 6 weeks
      const weeklyTotals = [0,0,0,0,0,0];
      const productBreakdown: Record<string, number[]> = {};

      products.forEach(p => {
          const prodRows = rows.filter(r => r.ProductName === p);
          // Pass all 8 weeks to the math file so it can calculate the 6 weeks of releases
          const wf = [0,0,0,0,0,0,0,0];
          prodRows.forEach(r => {
              wf[0]+=toNumber(r.Week1); wf[1]+=toNumber(r.Week2); wf[2]+=toNumber(r.Week3); wf[3]+=toNumber(r.Week4);
              wf[4]+=toNumber(r.Week5); wf[5]+=toNumber(r.Week6); wf[6]+=toNumber(r.Week7); wf[7]+=toNumber(r.Week8);
          });
          const inv = inventoryDB.find(i => i.name === p) || { startInv: 50, safetyStock: 10 };

          const plan = generateCapacityPlan(p, wf, inv.startInv, inv.safetyStock);
          productBreakdown[p] = plan.plannedRelease;

          plan.plannedRelease.forEach((release, i) => {
              weeklyTotals[i] += release;
          });
      });

      return { weeklyTotals, productBreakdown };
  }, [rows, products, inventoryDB]);


  // --- INDIVIDUAL SCENARIO LOGIC ---
  const opsProductData = useMemo(() => {
    if (!selectedOpsProduct || rows.length === 0 || inventoryDB.length === 0) return null;
    const prodRows = rows.filter(r => r.ProductName === selectedOpsProduct);
    const weeklyForecasts = [0,0,0,0,0,0,0,0];
    prodRows.forEach(r => {
        weeklyForecasts[0]+=toNumber(r.Week1); weeklyForecasts[1]+=toNumber(r.Week2); weeklyForecasts[2]+=toNumber(r.Week3); weeklyForecasts[3]+=toNumber(r.Week4);
        weeklyForecasts[4]+=toNumber(r.Week5); weeklyForecasts[5]+=toNumber(r.Week6); weeklyForecasts[6]+=toNumber(r.Week7); weeklyForecasts[7]+=toNumber(r.Week8);
    });
    const inventoryData = inventoryDB.find(inv => inv.name === selectedOpsProduct) || { startInv: 50.0, safetyStock: 10.0 };
    return { name: selectedOpsProduct, forecasts: weeklyForecasts, startInv: inventoryData.startInv, safetyStock: inventoryData.safetyStock };
  }, [rows, selectedOpsProduct, inventoryDB]);

  // Changed to 6 weeks
  const calendarDates = Array.from({length: 6}).map((_, i) => {
      const d = new Date(); d.setDate(d.getDate() + (i * 7));
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  });

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 p-8 font-sans">
      <div className="max-w-[1400px] mx-auto">
        <h1 className="text-4xl font-extrabold mb-8">Brewery Planning Platform</h1>

        <div className="flex space-x-8 mb-8 border-b border-slate-300">
          <button onClick={() => setActiveTab("forecast")} className={`pb-3 text-lg font-semibold ${activeTab === "forecast" ? "border-b-4 border-blue-600 text-blue-700" : "text-slate-500"}`}>📊 Demand Forecast</button>
          <button onClick={() => setActiveTab("operations")} className={`pb-3 text-lg font-semibold ${activeTab === "operations" ? "border-b-4 border-purple-600 text-purple-700" : "text-slate-500"}`}>⚙️ Operations & Capacity</button>
        </div>

        {!loading && activeTab === "operations" && masterSchedule && (
          <div className="animate-fadeIn">

            <div className="bg-slate-900 text-white p-6 rounded-xl shadow-lg mb-10">
                <h2 className="text-2xl font-bold mb-1 flex justify-between">
                    <span>Total Facility Load vs Capacity</span>
                    <span className="text-purple-400">{MAX_CAPACITY} bbl / week</span>
                </h2>
                <p className="text-slate-400 mb-6 text-sm">Aggregated production schedule across all product lines.</p>

                {/* Changed grid columns from 8 to 6 */}
                <div className="grid grid-cols-6 gap-4">
                    {masterSchedule.weeklyTotals.map((total, i) => {
                        const pct = Math.round((total / MAX_CAPACITY) * 100);
                        const isOver = total > MAX_CAPACITY;
                        return (
                            <div key={i} className="bg-slate-800 p-3 rounded-lg border border-slate-700 flex flex-col items-center">
                                <span className="text-xs text-slate-400 mb-2">{calendarDates[i]}</span>
                                <span className={`text-xl font-black mb-1 ${isOver ? 'text-red-400' : 'text-emerald-400'}`}>{total}</span>
                                <span className="text-xs text-slate-500 font-bold">{pct}% Full</span>

                                <div className="mt-3 w-full border-t border-slate-600 pt-2 space-y-1">
                                    {Object.entries(masterSchedule.productBreakdown).map(([prod, releases]) => {
                                        if (releases[i] > 0) {
                                            return <div key={prod} className="text-[10px] text-slate-300 flex justify-between space-x-2"><span>{prod}</span> <span className="font-bold">{releases[i]}</span></div>
                                        }
                                        return null;
                                    })}
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>

            <h3 className="text-xl font-bold text-slate-800 mb-4">Interactive Scenario Planning</h3>
            <div className="mb-6 max-w-md">
              <select value={selectedOpsProduct} onChange={(e) => setSelectedOpsProduct(e.target.value)} className="w-full p-3 rounded-lg border-2 border-purple-200 focus:border-purple-600 outline-none text-lg font-semibold text-slate-800">
                {products.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>

            {opsProductData && <CapacityPlanTable productData={opsProductData} />}

          </div>
        )}
      </div>
    </main>
  );
}