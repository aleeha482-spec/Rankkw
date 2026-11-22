export type WorkspaceView =
  | 'home'
  | 'features'
  | 'live-tool'
  | 'login'
  | 'register'
  | 'dashboard'
  | 'keywords'
  | 'listings'
  | 'competitor'
  | 'trends'
  | 'topsellers'
  | 'hotproducts'
  | 'tagoptimizer'
  | 'aititletags'
  | 'autopilot'
  | 'ranklift'
  | 'listingpro'
  | 'audit'
  | 'shopanalytics'
  | 'rankchecker'
  | 'category'
  | 'calculator'
  | 'saved'
  | 'profile'
  | 'settings';

export interface UserProfileRecord {
  id: number;
  uid: string;
  email: string;
  displayName: string;
  shopName: string;
  etsyMarketplace: string;
  currency: string;
  createdAt: string;
}

export interface SavedKeywordRecord {
  id: number;
  keyword: string;
  monthlySearches: number;
  competitionLabel: string;
  opportunityScore: number;
  avgPriceUsd: string;
  trend: string;
  notes: string;
  createdAt: string;
}

export interface TrackedCompetitorRecord {
  id: number;
  shopName: string;
  shopUrl: string;
  estimatedPriceRange: string;
  estimatedOrders: string;
  notes: string;
  createdAt: string;
}

export interface SavedListingRecord {
  id: number;
  title: string;
  tagsJson: string;
  description: string;
  priceUsd: string;
  category: string;
  seoScore: number;
  sourceTool: string;
  status: string;
  createdAt: string;
}

export interface SearchHistoryRecord {
  id: number;
  toolName: string;
  query: string;
  summary: string;
  createdAt: string;
}

export interface FavoriteProductRecord {
  id: number;
  title: string;
  category: string;
  priceUsd: string;
  demandLevel: string;
  competitionLevel: string;
  relatedKeywordsJson: string;
  createdAt: string;
}

export interface KeywordItem {
  keyword: string;
  monthlySearches: number;
  competitionScore: number;
  competitionLabel: 'Low' | 'Medium' | 'High';
  competingListingsEst: number;
  opportunityScore: number;
  avgPriceUsd: number;
  trend: 'Rising' | 'Steady' | 'Seasonal';
  buyerIntent: string;
  wordCount: number;
  fitsEtsyTag: boolean;
  sparkline: number[];
}

export interface KeywordResearchResponse {
  seedSummary: {
    keyword: string;
    avgMonthlySearches: number;
    competitionLabel: 'Low' | 'Medium' | 'High';
    competingListingsEst: number;
    opportunityScore: number;
    avgPriceUsd: number;
    trendDirection: 'Rising' | 'Steady' | 'Seasonal';
    ctrPotential: string;
    viewsToFavoritesRatio?: string;
    seasonalPeak: string;
  };
  keywords: KeywordItem[];
}

export interface TrendsDemandResponse {
  topic: string;
  summary: string;
  monthlyDemandCurve: { month: string; interest: number; priorYear: number }[];
  risingSearchTerms: { term: string; growthLabel: string; category: string; estMonthlySearches: number }[];
  popularCategories: { category: string; demandScore: number; avgPriceUsd: number; momentum: string }[];
  seasonalTakeaways: string[];
  sources: { title: string; uri: string }[];
}

export interface HotProductItem {
  title: string;
  category: string;
  priceUsd: number;
  demandLevel: 'Very High' | 'High' | 'Rising';
  competitionLevel: 'Low' | 'Medium' | 'High';
  estMonthlyDemand: number;
  opportunityScore: number;
  whyTrending: string;
  relatedKeywords: string[];
  visualGroup: 'jewelry' | 'leather' | 'ceramic' | 'printable';
}

export interface HotProductsResponse {
  category: string;
  products: HotProductItem[];
}

export interface TagOptimizerResponse {
  focusKeyword: string;
  competingListingsInsight: string;
  missingOpportunities: string[];
  tags: {
    tag: string;
    relevanceScore: number;
    competitionLevel: 'Low' | 'Medium' | 'High';
    reason: string;
  }[];
}

export interface RankLiftResponse {
  beforeScore: number;
  afterScore: number;
  weaknessesFound: string[];
  missingKeywords: string[];
  improvedTitle: string;
  improvedTags: string[];
  rewrittenDescription: string;
  summaryOfChanges: string[];
}

export interface ListingResearchItem {
  title: string;
  shopName: string;
  priceUsd: number;
  estMonthlySales: number;
  estViews: number;
  estFavorites: number;
  listingAgeMonths: number;
  bestsellerBadge: boolean;
  tagsUsed: string[];
  whyItRanks: string;
}

export interface ListingsResearchResponse {
  query: string;
  avgPriceUsd: number;
  medianPriceUsd: number;
  priceRange: string;
  avgMonthlyViews: number;
  topCommonTags: { tag: string; frequencyPercent: number }[];
  listings: ListingResearchItem[];
  marketGaps: string[];
}

export interface TopSellerShop {
  rank: number;
  shopName: string;
  country: string;
  lifetimeSales: number;
  reviewCount: number;
  rating: number;
  shopAgeYears: number;
  activeListings: number;
  avgPriceUsd: number;
  specialty: string;
  topWinningProduct: string;
}

export interface TopSellersResponse {
  niche: string;
  marketTakeaway: string;
  shops: TopSellerShop[];
  sources: { title: string; uri: string }[];
}

export interface RankCheckRow {
  keyword: string;
  estimatedPosition: number;
  estimatedPage: number;
  visibilityStatus: 'Page 1 Top' | 'Page 1' | 'Page 2-3' | 'Deep / Unranked';
  competitionLevel: 'Low' | 'Medium' | 'High';
  topCompetitorTitle: string;
  quickFix: string;
}

export interface RankCheckerResponse {
  shopOrListing: string;
  checkedAt: string;
  avgPosition: number;
  pageOneCount: number;
  rows: RankCheckRow[];
  sources: { title: string; uri: string }[];
}

export interface RankHistoryEntry {
  id: string;
  target: string;
  checkedAt: string;
  avgPosition: number;
  pageOneCount: number;
  totalKeywords: number;
}

export interface AutoPilotDraft {
  id: string;
  createdAt: string;
  workingName: string;
  photoPreview?: string | null;
  status: 'Pending Review' | 'Approved';
  suggestedCategory: string;
  suggestedPriceUsd: number;
  priceRationale: string;
  title: string;
  tags: string[];
  description: string;
  attributes: {
    materials: string[];
    occasion: string;
    style: string;
    primaryColor: string;
  };
  targetKeywords: string[];
}

export interface AuditFinding {
  area: 'Title' | 'Tags' | 'Description' | 'Pricing';
  severity: 'good' | 'warning' | 'critical';
  finding: string;
  fix: string;
}

export interface TitleOption {
  title: string;
  strategy: string;
  mobileHook: string;
}

export interface OptimizedTag {
  tag: string;
  reason: string;
  competitionEst: 'Low' | 'Medium' | 'High';
  searchIntent: string;
}

export interface ListingOptimizationResponse {
  overallScore: number;
  auditFindings: AuditFinding[];
  titleOptions: TitleOption[];
  optimizedTags: OptimizedTag[];
  optimizedDescription: {
    hook: string;
    bulletSpecs: string[];
    personalizationAndCare: string;
    shippingAndGiftNote: string;
    fullText: string;
  };
  recommendedAttributes: {
    materials: string[];
    occasion: string;
    style: string;
    primaryColor: string;
  };
}

export interface CompetitorKeywordRow {
  keyword: string;
  strength: string;
  gapOpportunity: string;
}

export interface CompetitorGapRow {
  keyword: string;
  whyItMatters: string;
  estSearches: number;
  difficulty: 'Low' | 'Medium' | 'High';
}

export interface CompetitorAnalysisResponse {
  targetName: string;
  marketPositioning: string;
  estimatedPriceRange: string;
  estimatedMonthlyOrdersRange: string;
  conversionDrivers: string[];
  topKeywordsUsed: CompetitorKeywordRow[];
  keywordGaps: CompetitorGapRow[];
  winningListingBlueprints: string[];
  actionPlan: string[];
  sources: { title: string; uri: string }[];
}

export interface NicheItem {
  nicheName: string;
  category: string;
  demandLevel: 'High' | 'Very High' | 'Moderate';
  competitionLevel: 'Low' | 'Medium' | 'High';
  opportunityScore: number;
  avgPriceUsd: number;
  seasonalWindow: string;
  whyNow: string;
  seedKeywords: string[];
  productAngles: string[];
}

export interface CategoryReportResponse {
  category: string;
  marketNote: string;
  macroMetrics: {
    avgPriceUsd: number;
    medianPriceUsd: number;
    avgFavoritesPerListing: number;
    demandTrend: 'Growing' | 'Steady' | 'Seasonal Spike';
    priceBrackets: { label: string; sharePercent: number }[];
    topCategoryTags: string[];
  };
  niches: NicheItem[];
}

export interface SavedListing {
  id: string;
  savedAt: string;
  title: string;
  tags: string[];
  description: string;
  priceUsd: number;
  category: string;
  notes?: string;
}

export interface TagIssue {
  index: number;
  tag: string;
  issues: string[];
  suggestion?: string;
}

export interface FeeSettings {
  transactionFeePercent: number;
  listingFeeFixed: number;
  paymentPercent: number;
  paymentFixed: number;
  regulatoryPercent: number;
}
