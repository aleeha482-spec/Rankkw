export type EtsyRegionCode = 'US' | 'UK' | 'CA' | 'AU' | 'EU';

export interface RegionFeeSchedule {
  code: EtsyRegionCode;
  label: string;
  currencySymbol: string;
  paymentPercent: number;
  paymentFixed: number;
  regulatoryPercent: number;
}

export const REGION_SCHEDULES: Record<EtsyRegionCode, RegionFeeSchedule> = {
  US: {
    code: 'US',
    label: 'United States (USD)',
    currencySymbol: '$',
    paymentPercent: 0.03,
    paymentFixed: 0.25,
    regulatoryPercent: 0,
  },
  UK: {
    code: 'UK',
    label: 'United Kingdom (GBP)',
    currencySymbol: '£',
    paymentPercent: 0.04,
    paymentFixed: 0.20,
    regulatoryPercent: 0.0032,
  },
  CA: {
    code: 'CA',
    label: 'Canada (CAD)',
    currencySymbol: 'CA$',
    paymentPercent: 0.03,
    paymentFixed: 0.25,
    regulatoryPercent: 0,
  },
  AU: {
    code: 'AU',
    label: 'Australia (AUD)',
    currencySymbol: 'A$',
    paymentPercent: 0.03,
    paymentFixed: 0.25,
    regulatoryPercent: 0,
  },
  EU: {
    code: 'EU',
    label: 'European Union (EUR)',
    currencySymbol: '€',
    paymentPercent: 0.04,
    paymentFixed: 0.30,
    regulatoryPercent: 0.004,
  },
};

export interface ProfitInputs {
  region: EtsyRegionCode;
  itemPrice: number;
  shippingCharged: number;
  discountPercent: number;
  cogs: number;
  shippingCost: number;
  packagingCost: number;
  offsiteAdsRate: 0 | 0.12 | 0.15;
  adCpc: number;
  adConversionRatePercent: number;
  dailyAdBudget: number;
}

export interface ProfitBreakdown {
  grossOrderRevenue: number;
  discountedItemPrice: number;
  listingFee: number;
  transactionFee: number;
  paymentProcessingFee: number;
  regulatoryFee: number;
  offsiteAdsFee: number;
  totalEtsyFees: number;
  totalProductAndShippingCost: number;
  netProfitBeforeAds: number;
  profitMarginBeforeAds: number;
  etsyAdCostPerSale: number;
  netProfitAfterEtsyAds: number;
  profitMarginAfterEtsyAds: number;
  breakEvenRoas: number;
  maxAffordableCpc: number;
  estClicksPerDay: number;
  estAdOrdersPerDay: number;
  estDailyNetFromAds: number;
  recommendedPriceFor40Margin: number;
}

export function calculateEtsyProfit(input: ProfitInputs): ProfitBreakdown {
  const schedule = REGION_SCHEDULES[input.region];
  const discountFactor = Math.max(0, Math.min(0.95, input.discountPercent / 100));
  const discountedItemPrice = Math.max(0, input.itemPrice * (1 - discountFactor));
  const grossOrderRevenue = discountedItemPrice + Math.max(0, input.shippingCharged);

  const listingFee = 0.20;
  const transactionFee = grossOrderRevenue * 0.065;
  const paymentProcessingFee =
    grossOrderRevenue > 0 ? grossOrderRevenue * schedule.paymentPercent + schedule.paymentFixed : 0;
  const regulatoryFee = grossOrderRevenue * schedule.regulatoryPercent;
  const offsiteAdsFee = grossOrderRevenue * input.offsiteAdsRate;

  const totalEtsyFees =
    listingFee + transactionFee + paymentProcessingFee + regulatoryFee + offsiteAdsFee;

  const totalProductAndShippingCost =
    Math.max(0, input.cogs) + Math.max(0, input.shippingCost) + Math.max(0, input.packagingCost);

  const netProfitBeforeAds = grossOrderRevenue - totalEtsyFees - totalProductAndShippingCost;
  const profitMarginBeforeAds =
    grossOrderRevenue > 0 ? (netProfitBeforeAds / grossOrderRevenue) * 100 : 0;

  const convRate = Math.max(0.001, input.adConversionRatePercent / 100);
  const etsyAdCostPerSale = input.adCpc / convRate;
  const netProfitAfterEtsyAds = netProfitBeforeAds - etsyAdCostPerSale;
  const profitMarginAfterEtsyAds =
    grossOrderRevenue > 0 ? (netProfitAfterEtsyAds / grossOrderRevenue) * 100 : 0;

  const breakEvenRoas =
    netProfitBeforeAds > 0 ? grossOrderRevenue / netProfitBeforeAds : Infinity;

  const maxAffordableCpc = Math.max(0, netProfitBeforeAds * convRate);
  const estClicksPerDay = input.adCpc > 0 ? input.dailyAdBudget / input.adCpc : 0;
  const estAdOrdersPerDay = estClicksPerDay * convRate;
  const estDailyNetFromAds = estAdOrdersPerDay * netProfitBeforeAds - input.dailyAdBudget;

  // Solve Price P (before discount, with shippingCharged included in P_total) for 40% net margin before ads
  const variableFeeRate =
    0.065 + schedule.paymentPercent + schedule.regulatoryPercent + input.offsiteAdsRate;
  const fixedCosts = totalProductAndShippingCost + listingFee + schedule.paymentFixed;
  const targetMargin = 0.40;
  const denom = 1 - variableFeeRate - targetMargin;
  const neededGross = denom > 0 ? fixedCosts / denom : 0;
  const recommendedPriceFor40Margin = Math.max(
    0,
    (neededGross - Math.max(0, input.shippingCharged)) / Math.max(0.1, 1 - discountFactor)
  );

  return {
    grossOrderRevenue,
    discountedItemPrice,
    listingFee,
    transactionFee,
    paymentProcessingFee,
    regulatoryFee,
    offsiteAdsFee,
    totalEtsyFees,
    totalProductAndShippingCost,
    netProfitBeforeAds,
    profitMarginBeforeAds,
    etsyAdCostPerSale,
    netProfitAfterEtsyAds,
    profitMarginAfterEtsyAds,
    breakEvenRoas,
    maxAffordableCpc,
    estClicksPerDay,
    estAdOrdersPerDay,
    estDailyNetFromAds,
    recommendedPriceFor40Margin,
  };
}
