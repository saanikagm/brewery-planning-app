export function generateCapacityPlan(name: string, forecasts: number[], startInv: number, safetyStock: number) {
    let projAvailable = [];
    let plannedReceipt = [];
    let plannedRelease = [];

    let currentInv = startInv;
    const batchSize = 50;
    const leadTime = 2;

    // 1. Calculate Inventory and Receipts using all 8 weeks of real forecast data
    for (let i = 0; i < 8; i++) {
        let demand = forecasts[i] || 0;
        let projectedInv = currentInv - demand;
        let receipt = 0;

        if (projectedInv < safetyStock) {
            let gap = safetyStock - projectedInv;
            let batches = Math.ceil(gap / batchSize);
            receipt = batches * batchSize;
        }

        plannedReceipt.push(receipt);
        currentInv = projectedInv + receipt;
        projAvailable.push(currentInv);
    }

    // 2. Calculate Planned Releases for ONLY 6 weeks
    // (Because we only have receipts out to week 8, we can only plan releases out to week 6)
    for (let i = 0; i < 6; i++) {
        plannedRelease.push(plannedReceipt[i + leadTime] || 0);
    }

    // 3. Trim all arrays to exactly 6 weeks for a clean UI
    const displayForecasts = forecasts.slice(0, 6);
    const displayAvailable = projAvailable.slice(0, 6);
    const displayReceipts = plannedReceipt.slice(0, 6);

    // 4. Calculate metrics based on the 6-week view
    const totalForecast = displayForecasts.reduce((a, b) => a + b, 0);
    const avgWeeklyDemand = totalForecast / 6;
    const weeksOnHand = avgWeeklyDemand > 0 ? (startInv / avgWeeklyDemand) : 99;

    return {
        productName: name,
        totalForecast,
        avgWeeklyDemand,
        weeksOnHand,
        startInv,
        safetyStock,
        forecasts: displayForecasts,
        projAvailable: displayAvailable,
        plannedReceipt: displayReceipts,
        plannedRelease
    };
}