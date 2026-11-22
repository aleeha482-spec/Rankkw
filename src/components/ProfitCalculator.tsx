import { useMemo, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import type { FeeSettings } from '../types';
import {
  calculateEtsyProfit,
  REGION_SCHEDULES,
  type EtsyRegionCode,
  type ProfitInputs,
} from '../utils/profitMath';

const DEFAULT_INPUTS: ProfitInputs = {
  region: 'US',
  itemPrice: 38,
  shippingCharged: 5,
  discountPercent: 0,
  cogs: 9.5,
  shippingCost: 4.75,
  packagingCost: 1.25,
  offsiteAdsRate: 0,
  adCpc: 0.32,
  adConversionRatePercent: 2.8,
  dailyAdBudget: 10,
};

interface ProfitCalculatorProps {
  feeSettings?: FeeSettings;
}

export function ProfitCalculator({ feeSettings }: ProfitCalculatorProps) {
  const [inputs, setInputs] = useState<ProfitInputs>(DEFAULT_INPUTS);

  const schedule = REGION_SCHEDULES[inputs.region];
  const sym = schedule.currencySymbol;
  const result = useMemo(() => {
    const base = calculateEtsyProfit(inputs);
    if (!feeSettings || inputs.region !== 'US') return base;
    // Apply custom fee overrides from User Settings when on US marketplace
    const gross = base.grossOrderRevenue;
    const listingFee = feeSettings.listingFeeFixed;
    const transactionFee = gross * (feeSettings.transactionFeePercent / 100);
    const paymentProcessingFee =
      gross > 0 ? gross * (feeSettings.paymentPercent / 100) + feeSettings.paymentFixed : 0;
    const regulatoryFee = gross * (feeSettings.regulatoryPercent / 100);
    const offsiteAdsFee = base.offsiteAdsFee;
    const totalEtsyFees = listingFee + transactionFee + paymentProcessingFee + regulatoryFee + offsiteAdsFee;
    const netProfitBeforeAds = gross - totalEtsyFees - base.totalProductAndShippingCost;
    const profitMarginBeforeAds = gross > 0 ? (netProfitBeforeAds / gross) * 100 : 0;
    const netProfitAfterEtsyAds = netProfitBeforeAds - base.etsyAdCostPerSale;
    const profitMarginAfterEtsyAds = gross > 0 ? (netProfitAfterEtsyAds / gross) * 100 : 0;
    const breakEvenRoas = netProfitBeforeAds > 0 ? gross / netProfitBeforeAds : Infinity;

    return {
      ...base,
      listingFee,
      transactionFee,
      paymentProcessingFee,
      regulatoryFee,
      totalEtsyFees,
      netProfitBeforeAds,
      profitMarginBeforeAds,
      netProfitAfterEtsyAds,
      profitMarginAfterEtsyAds,
      breakEvenRoas,
    };
  }, [inputs, feeSettings]);

  function updateField<K extends keyof ProfitInputs>(key: K, val: ProfitInputs[K]) {
    setInputs((prev) => ({ ...prev, [key]: val }));
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Etsy Fee, Profit &amp; Ads ROI Calculator
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Calculate exact Etsy listing, {feeSettings?.transactionFeePercent ?? 6.5}% transaction, payment processing, Offsite Ads fees, and break-even Etsy Ads ROAS.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setInputs(DEFAULT_INPUTS)}
          className="h-9 px-3.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 inline-flex items-center gap-1.5 self-start whitespace-nowrap shrink-0 cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset Defaults</span>
        </button>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Inputs */}
        <section className="lg:col-span-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-5">
          <div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">
              01. Shop Region &amp; Pricing
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                  Shop Country / Currency
                </label>
                <select
                  value={inputs.region}
                  onChange={(e) => updateField('region', e.target.value as EtsyRegionCode)}
                  className="w-full h-10 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-violet-600"
                >
                  {Object.values(REGION_SCHEDULES).map((r) => (
                    <option key={r.code} value={r.code}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                  Sale Discount (%)
                </label>
                <input
                  type="number"
                  min={0}
                  max={90}
                  step={1}
                  value={inputs.discountPercent}
                  onChange={(e) => updateField('discountPercent', Number(e.target.value) || 0)}
                  className="w-full h-10 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm font-mono tabular-nums text-slate-900 dark:text-slate-100 focus:outline-none focus:border-violet-600"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                  Listing Price ({sym})
                </label>
                <input
                  type="number"
                  min={0}
                  step={0.5}
                  value={inputs.itemPrice}
                  onChange={(e) => updateField('itemPrice', Number(e.target.value) || 0)}
                  className="w-full h-10 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm font-mono tabular-nums text-slate-900 dark:text-slate-100 focus:outline-none focus:border-violet-600"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                  Shipping Charged to Buyer ({sym})
                </label>
                <input
                  type="number"
                  min={0}
                  step={0.5}
                  value={inputs.shippingCharged}
                  onChange={(e) => updateField('shippingCharged', Number(e.target.value) || 0)}
                  className="w-full h-10 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm font-mono tabular-nums text-slate-900 dark:text-slate-100 focus:outline-none focus:border-violet-600"
                />
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">
              02. Your Fulfillment Costs
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                  Materials / COGS ({sym})
                </label>
                <input
                  type="number"
                  min={0}
                  step={0.25}
                  value={inputs.cogs}
                  onChange={(e) => updateField('cogs', Number(e.target.value) || 0)}
                  className="w-full h-10 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm font-mono tabular-nums text-slate-900 dark:text-slate-100 focus:outline-none focus:border-violet-600"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                  Actual Postage ({sym})
                </label>
                <input
                  type="number"
                  min={0}
                  step={0.25}
                  value={inputs.shippingCost}
                  onChange={(e) => updateField('shippingCost', Number(e.target.value) || 0)}
                  className="w-full h-10 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm font-mono tabular-nums text-slate-900 dark:text-slate-100 focus:outline-none focus:border-violet-600"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                  Packaging ({sym})
                </label>
                <input
                  type="number"
                  min={0}
                  step={0.25}
                  value={inputs.packagingCost}
                  onChange={(e) => updateField('packagingCost', Number(e.target.value) || 0)}
                  className="w-full h-10 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm font-mono tabular-nums text-slate-900 dark:text-slate-100 focus:outline-none focus:border-violet-600"
                />
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              03. Offsite Ads &amp; Etsy Ads Simulation
            </h2>

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5">
                Offsite Ads Attribution
              </label>
              <div className="inline-flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
                {(
                  [
                    [0, 'None (0%)'],
                    [0.15, 'Under $10k/yr (15%)'],
                    [0.12, 'Over $10k/yr (12%)'],
                  ] as const
                ).map(([rate, label]) => (
                  <button
                    key={rate}
                    type="button"
                    onClick={() => updateField('offsiteAdsRate', rate)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap cursor-pointer ${
                      inputs.offsiteAdsRate === rate
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                  Etsy Ads Avg CPC ({sym})
                </label>
                <input
                  type="number"
                  min={0.05}
                  step={0.01}
                  value={inputs.adCpc}
                  onChange={(e) => updateField('adCpc', Number(e.target.value) || 0.05)}
                  className="w-full h-10 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm font-mono tabular-nums text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                  Listing Conv. Rate (%)
                </label>
                <input
                  type="number"
                  min={0.2}
                  max={25}
                  step={0.1}
                  value={inputs.adConversionRatePercent}
                  onChange={(e) => updateField('adConversionRatePercent', Number(e.target.value) || 0.5)}
                  className="w-full h-10 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm font-mono tabular-nums text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                  Daily Ad Budget ({sym})
                </label>
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={inputs.dailyAdBudget}
                  onChange={(e) => updateField('dailyAdBudget', Number(e.target.value) || 1)}
                  className="w-full h-10 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm font-mono tabular-nums text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Right: Results */}
        <div className="lg:col-span-6 space-y-6">
          <section className="grid grid-cols-2 gap-4">
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Organic Net Profit / Sale
              </div>
              <div
                className={`mt-1 text-2xl font-bold font-mono tabular-nums ${
                  result.netProfitBeforeAds >= 0
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-red-600 dark:text-red-400'
                }`}
              >
                {sym}
                {result.netProfitBeforeAds.toFixed(2)}
              </div>
              <div className="mt-1 text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
                {result.profitMarginBeforeAds.toFixed(1)}% Net Margin
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Profit After Etsy Ads / Sale
              </div>
              <div
                className={`mt-1 text-2xl font-bold font-mono tabular-nums ${
                  result.netProfitAfterEtsyAds >= 0
                    ? 'text-slate-900 dark:text-slate-100'
                    : 'text-red-600 dark:text-red-400'
                }`}
              >
                {sym}
                {result.netProfitAfterEtsyAds.toFixed(2)}
              </div>
              <div className="mt-1 text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
                Ad cost/sale: {sym}
                {result.etsyAdCostPerSale.toFixed(2)} ({result.profitMarginAfterEtsyAds.toFixed(1)}%)
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Itemized Etsy Fee &amp; Cost Ledger
            </h2>
            <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              <div className="py-2 flex justify-between font-medium text-slate-900 dark:text-slate-100">
                <span>Gross Order Total (Item + Shipping)</span>
                <span className="font-mono tabular-nums">
                  {sym}
                  {result.grossOrderRevenue.toFixed(2)}
                </span>
              </div>
              <div className="py-2 flex justify-between text-slate-600 dark:text-slate-300">
                <span>Etsy Listing Renewal Fee</span>
                <span className="font-mono tabular-nums">
                  -{sym}
                  {result.listingFee.toFixed(2)}
                </span>
              </div>
              <div className="py-2 flex justify-between text-slate-600 dark:text-slate-300">
                <span>
                  Etsy Transaction Fee (
                  {inputs.region === 'US' && feeSettings ? feeSettings.transactionFeePercent : 6.5}% on total)
                </span>
                <span className="font-mono tabular-nums">
                  -{sym}
                  {result.transactionFee.toFixed(2)}
                </span>
              </div>
              <div className="py-2 flex justify-between text-slate-600 dark:text-slate-300">
                <span>
                  Payment Processing (
                  {inputs.region === 'US' && feeSettings
                    ? feeSettings.paymentPercent
                    : (schedule.paymentPercent * 100).toFixed(0)}
                  % + {sym}
                  {(inputs.region === 'US' && feeSettings
                    ? feeSettings.paymentFixed
                    : schedule.paymentFixed
                  ).toFixed(2)}
                  )
                </span>
                <span className="font-mono tabular-nums">
                  -{sym}
                  {result.paymentProcessingFee.toFixed(2)}
                </span>
              </div>
              {result.regulatoryFee > 0 && (
                <div className="py-2 flex justify-between text-slate-600 dark:text-slate-300">
                  <span>Regulatory Operating Fee</span>
                  <span className="font-mono tabular-nums">
                    -{sym}
                    {result.regulatoryFee.toFixed(2)}
                  </span>
                </div>
              )}
              {result.offsiteAdsFee > 0 && (
                <div className="py-2 flex justify-between text-amber-700 dark:text-amber-400">
                  <span>Offsite Ads Fee ({(inputs.offsiteAdsRate * 100).toFixed(0)}%)</span>
                  <span className="font-mono tabular-nums">
                    -{sym}
                    {result.offsiteAdsFee.toFixed(2)}
                  </span>
                </div>
              )}
              <div className="py-2 flex justify-between font-medium text-slate-800 dark:text-slate-200">
                <span>Total Etsy Fees</span>
                <span className="font-mono tabular-nums">
                  -{sym}
                  {result.totalEtsyFees.toFixed(2)}
                </span>
              </div>
              <div className="py-2 flex justify-between text-slate-600 dark:text-slate-300">
                <span>COGS + Postage + Packaging</span>
                <span className="font-mono tabular-nums">
                  -{sym}
                  {result.totalProductAndShippingCost.toFixed(2)}
                </span>
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Etsy Ads Break-Even &amp; Pricing Target
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <div className="text-slate-500 dark:text-slate-400">Break-Even ROAS</div>
                <div className="text-base font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100 mt-0.5">
                  {Number.isFinite(result.breakEvenRoas)
                    ? `${result.breakEvenRoas.toFixed(2)}x`
                    : 'Unprofitable'}
                </div>
              </div>
              <div>
                <div className="text-slate-500 dark:text-slate-400">Max Affordable CPC</div>
                <div className="text-base font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100 mt-0.5">
                  {sym}
                  {result.maxAffordableCpc.toFixed(2)}
                </div>
              </div>
              <div>
                <div className="text-slate-500 dark:text-slate-400">Price for 40% Margin</div>
                <div className="text-base font-bold font-mono tabular-nums text-violet-600 dark:text-violet-400 mt-0.5">
                  {sym}
                  {result.recommendedPriceFor40Margin.toFixed(2)}
                </div>
              </div>
            </div>
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
              At {sym}
              {inputs.dailyAdBudget}/day budget and {sym}
              {inputs.adCpc.toFixed(2)} CPC: ~
              <span className="font-mono tabular-nums font-medium text-slate-700 dark:text-slate-200">
                {result.estClicksPerDay.toFixed(0)} clicks/day
              </span>{' '}
              → ~
              <span className="font-mono tabular-nums font-medium text-slate-700 dark:text-slate-200">
                {result.estAdOrdersPerDay.toFixed(1)} ad orders/day
              </span>{' '}
              (est. net {sym}
              {result.estDailyNetFromAds.toFixed(2)}/day).
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
