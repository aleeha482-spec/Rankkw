import 'dotenv/config';
import express from 'express';
import type { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import { requireAuth, type AuthRequest } from './src/middleware/auth.ts';
import {
  addFavoriteProduct,
  addRankHistoryRecord,
  addSavedKeyword,
  addSavedListing,
  addTrackedCompetitor,
  getOrCreateUser,
  getUserWorkspaceData,
  logSearchHistory,
  removeFavoriteProduct,
  removeSavedKeyword,
  removeSavedListing,
  removeTrackedCompetitor,
  updateUserProfile,
} from './src/db/users.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
const MODEL = 'gemini-4-hydrogen';

function getAiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured in environment secrets.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function formatApiError(err: unknown): { status: number; message: string } {
  const raw = err instanceof Error ? err.message : String(err);
  if (raw.includes('GEMINI_API_KEY')) {
    return { status: 500, message: 'Server API key is missing. Add GEMINI_API_KEY in Settings > Secrets.' };
  }
  if (raw.includes('403') || raw.includes('PERMISSION_DENIED') || raw.includes('API_KEY_INVALID')) {
    return { status: 403, message: 'Gemini API key permission denied or invalid. Check Settings > Secrets.' };
  }
  if (raw.includes('429') || raw.includes('RESOURCE_EXHAUSTED')) {
    return { status: 429, message: 'Rate limit reached momentarily. Please wait a few seconds and retry.' };
  }
  if (raw.includes('404') || raw.includes('NOT_FOUND')) {
    return { status: 404, message: 'Requested Gemini model was not found.' };
  }
  return { status: 500, message: raw || 'Failed to complete request.' };
}

function extractJson<T>(rawText: string | undefined): T {
  const text = (rawText ?? '').trim();
  if (!text) {
    throw new Error('Model returned an empty response.');
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenced && fenced[1]) {
      return JSON.parse(fenced[1].trim()) as T;
    }
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      return JSON.parse(text.slice(firstBrace, lastBrace + 1)) as T;
    }
    throw new Error('Could not parse structured JSON from model response.');
  }
}

function trimToWordLimit(input: string, maxLen: number): string {
  const clean = input.replace(/\s+/g, ' ').trim();
  if (clean.length <= maxLen) return clean;
  const words = clean.split(' ');
  let acc = '';
  for (const w of words) {
    const candidate = acc ? `${acc} ${w}` : w;
    if (candidate.length <= maxLen) {
      acc = candidate;
    } else {
      break;
    }
  }
  return acc || clean.slice(0, maxLen).trim();
}

function cleanTag(raw: string): string {
  const stripped = raw
    .replace(/[^a-zA-Z0-9\s'-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
  return trimToWordLimit(stripped, 20);
}

function extractGroundingSources(response: unknown): { title: string; uri: string }[] {
  const typed = response as {
    candidates?: Array<{
      groundingMetadata?: {
        groundingChunks?: Array<{ web?: { uri?: string; title?: string } }>;
      };
    }>;
  };
  const rawChunks = typed?.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
  const sources: { title: string; uri: string }[] = [];
  const seenUris = new Set<string>();
  for (const chunk of rawChunks) {
    const web = chunk.web;
    if (web?.uri && !seenUris.has(web.uri)) {
      seenUris.add(web.uri);
      sources.push({
        title: web.title || web.uri,
        uri: web.uri,
      });
    }
  }
  return sources.slice(0, 6);
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '12mb' }));

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ ok: true, service: 'craftrank-api' });
  });

  app.get('/api/etsy/status', (_req: Request, res: Response) => {
    res.json({
      etsyOpenApiConnected: Boolean(process.env.ETSY_API_KEY),
      searchGroundingEnabled: Boolean(process.env.GEMINI_API_KEY),
    });
  });

  // =========================================================================
  // Protected PostgreSQL User & Workspace API Routes
  // =========================================================================
  app.get('/api/user/me', requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const uid = req.user!.uid;
      const email = req.user!.email || `${uid}@user.local`;
      const name = typeof req.user!.name === 'string' ? req.user!.name : undefined;
      const user = await getOrCreateUser(uid, email, name);
      const workspace = await getUserWorkspaceData(user.id);
      res.json({ user, workspace });
    } catch (error) {
      console.error('GET /api/user/me failed:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to load profile.' });
    }
  });

  app.patch('/api/user/profile', requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const uid = req.user!.uid;
      const email = req.user!.email || `${uid}@user.local`;
      await getOrCreateUser(uid, email);
      const { displayName, shopName, etsyMarketplace, currency } = req.body ?? {};
      const updated = await updateUserProfile(uid, {
        displayName: typeof displayName === 'string' ? displayName.trim().slice(0, 80) : undefined,
        shopName: typeof shopName === 'string' ? shopName.trim().slice(0, 80) : undefined,
        etsyMarketplace: typeof etsyMarketplace === 'string' ? etsyMarketplace.trim().slice(0, 50) : undefined,
        currency: typeof currency === 'string' ? currency.trim().slice(0, 10) : undefined,
      });
      res.json({ user: updated });
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to update profile.' });
    }
  });

  app.post('/api/user/keywords', requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const user = await getOrCreateUser(req.user!.uid, req.user!.email || `${req.user!.uid}@user.local`);
      const { keyword, monthlySearches = 0, competitionLabel = 'Medium', opportunityScore = 50, avgPriceUsd = '0', trend = 'Steady', notes = '' } = req.body ?? {};
      if (!keyword || typeof keyword !== 'string') {
        res.status(400).json({ error: 'Keyword is required.' });
        return;
      }
      const record = await addSavedKeyword(user.id, {
        keyword: keyword.trim().slice(0, 120),
        monthlySearches: Number(monthlySearches) || 0,
        competitionLabel: String(competitionLabel),
        opportunityScore: Number(opportunityScore) || 50,
        avgPriceUsd: String(avgPriceUsd),
        trend: String(trend),
        notes: String(notes || ''),
      });
      res.json({ record });
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to save keyword.' });
    }
  });

  app.delete('/api/user/keywords/:id', requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const user = await getOrCreateUser(req.user!.uid, req.user!.email || `${req.user!.uid}@user.local`);
      const id = Number(req.params.id);
      if (!Number.isFinite(id)) {
        res.status(400).json({ error: 'Invalid keyword ID.' });
        return;
      }
      await removeSavedKeyword(user.id, id);
      res.json({ ok: true });
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to delete keyword.' });
    }
  });

  app.post('/api/user/competitors', requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const user = await getOrCreateUser(req.user!.uid, req.user!.email || `${req.user!.uid}@user.local`);
      const { shopName, shopUrl = '', estimatedPriceRange = '', estimatedOrders = '', notes = '' } = req.body ?? {};
      if (!shopName || typeof shopName !== 'string') {
        res.status(400).json({ error: 'Shop name is required.' });
        return;
      }
      const record = await addTrackedCompetitor(user.id, {
        shopName: shopName.trim().slice(0, 120),
        shopUrl: String(shopUrl || ''),
        estimatedPriceRange: String(estimatedPriceRange || ''),
        estimatedOrders: String(estimatedOrders || ''),
        notes: String(notes || ''),
      });
      res.json({ record });
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to track competitor.' });
    }
  });

  app.delete('/api/user/competitors/:id', requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const user = await getOrCreateUser(req.user!.uid, req.user!.email || `${req.user!.uid}@user.local`);
      const id = Number(req.params.id);
      if (!Number.isFinite(id)) {
        res.status(400).json({ error: 'Invalid competitor ID.' });
        return;
      }
      await removeTrackedCompetitor(user.id, id);
      res.json({ ok: true });
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to remove competitor.' });
    }
  });

  app.post('/api/user/listings', requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const user = await getOrCreateUser(req.user!.uid, req.user!.email || `${req.user!.uid}@user.local`);
      const {
        title,
        tags = [],
        description = '',
        priceUsd = '29.00',
        category = 'Handmade & Gifts',
        seoScore = 0,
        sourceTool = 'optimizer',
        status = 'saved',
      } = req.body ?? {};
      if (!title || typeof title !== 'string') {
        res.status(400).json({ error: 'Listing title is required.' });
        return;
      }
      const record = await addSavedListing(user.id, {
        title: title.trim().slice(0, 200),
        tagsJson: JSON.stringify(Array.isArray(tags) ? tags.slice(0, 13) : []),
        description: String(description || ''),
        priceUsd: String(priceUsd),
        category: String(category),
        seoScore: Number(seoScore) || 0,
        sourceTool: String(sourceTool),
        status: String(status),
      });
      res.json({ record });
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to save listing.' });
    }
  });

  app.delete('/api/user/listings/:id', requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const user = await getOrCreateUser(req.user!.uid, req.user!.email || `${req.user!.uid}@user.local`);
      const id = Number(req.params.id);
      if (!Number.isFinite(id)) {
        res.status(400).json({ error: 'Invalid listing ID.' });
        return;
      }
      await removeSavedListing(user.id, id);
      res.json({ ok: true });
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to delete listing.' });
    }
  });

  app.post('/api/user/searches', requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const user = await getOrCreateUser(req.user!.uid, req.user!.email || `${req.user!.uid}@user.local`);
      const { toolName = 'Keyword Research', query = '', summary = '' } = req.body ?? {};
      if (!query || typeof query !== 'string') {
        res.status(400).json({ error: 'Query is required.' });
        return;
      }
      const record = await logSearchHistory(user.id, {
        toolName: String(toolName),
        query: query.trim().slice(0, 160),
        summary: String(summary || ''),
      });
      res.json({ record });
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to log search.' });
    }
  });

  app.post('/api/user/ranks', requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const user = await getOrCreateUser(req.user!.uid, req.user!.email || `${req.user!.uid}@user.local`);
      const { target = '', avgPosition = 0, pageOneCount = 0, totalKeywords = 0 } = req.body ?? {};
      if (!target || typeof target !== 'string') {
        res.status(400).json({ error: 'Target is required.' });
        return;
      }
      const record = await addRankHistoryRecord(user.id, {
        target: target.trim().slice(0, 160),
        avgPosition: Number(avgPosition) || 0,
        pageOneCount: Number(pageOneCount) || 0,
        totalKeywords: Number(totalKeywords) || 0,
      });
      res.json({ record });
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to record rank.' });
    }
  });

  app.post('/api/user/favorites', requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const user = await getOrCreateUser(req.user!.uid, req.user!.email || `${req.user!.uid}@user.local`);
      const {
        title,
        category = 'General',
        priceUsd = '25.00',
        demandLevel = 'High',
        competitionLevel = 'Medium',
        relatedKeywords = [],
      } = req.body ?? {};
      if (!title || typeof title !== 'string') {
        res.status(400).json({ error: 'Product title is required.' });
        return;
      }
      const record = await addFavoriteProduct(user.id, {
        title: title.trim().slice(0, 180),
        category: String(category),
        priceUsd: String(priceUsd),
        demandLevel: String(demandLevel),
        competitionLevel: String(competitionLevel),
        relatedKeywordsJson: JSON.stringify(Array.isArray(relatedKeywords) ? relatedKeywords : []),
      });
      res.json({ record });
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to save product.' });
    }
  });

  app.delete('/api/user/favorites/:id', requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const user = await getOrCreateUser(req.user!.uid, req.user!.email || `${req.user!.uid}@user.local`);
      const id = Number(req.params.id);
      if (!Number.isFinite(id)) {
        res.status(400).json({ error: 'Invalid favorite ID.' });
        return;
      }
      await removeFavoriteProduct(user.id, id);
      res.json({ ok: true });
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to delete favorite.' });
    }
  });

  // =========================================================================
  // Etsy SEO & Research Endpoints
  // =========================================================================

  // 1. Etsy Keyword Research
  app.post('/api/etsy/keywords', async (req: Request, res: Response) => {
    try {
      const { seedKeyword, marketplace = 'United States', category = 'All Categories', intent = 'All' } = req.body ?? {};
      if (!seedKeyword || typeof seedKeyword !== 'string' || !seedKeyword.trim()) {
        res.status(400).json({ error: 'Please enter a seed keyword or product idea.' });
        return;
      }

      const ai = getAiClient();
      const prompt = `Analyze the Etsy marketplace keyword "${seedKeyword.trim()}" for the ${marketplace} market (Category: ${category}, Buyer Intent focus: ${intent}).
Return realistic Etsy buyer search estimates:
1. A summary for the primary seed keyword with estimated monthly Etsy search demand, competition level, estimated competing listings count, opportunity score (0-100), average listing price USD, trend direction, CTR potential (e.g. "High (4.2% - 5.8%)"), viewsToFavoritesRatio (e.g. "7.4%"), and seasonal peak window.
2. Exactly 24 distinct, high-intent Etsy long-tail keyword variations that real Etsy shoppers type into Etsy Search. Include low-competition long-tail tags (<= 20 chars where possible), gift-buyer intent phrases, material/personalization modifiers, and core variations.
Each keyword row needs monthlySearches, competitionScore (1-100), competitionLabel ("Low"|"Medium"|"High"), competingListingsEst, opportunityScore (1-100), avgPriceUsd, trend ("Rising"|"Steady"|"Seasonal"), buyerIntent, and sparkline (6 ints 15-100).`;

      const response = await ai.models.generateContent({
        model: MODEL,
        contents: prompt,
        config: {
          systemInstruction:
            'You are an Etsy SEO and marketplace keyword intelligence engine. Output accurate, realistic Etsy shopper search estimates, long-tail keywords, and pricing/competition benchmarks in strict JSON.',
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              seedSummary: {
                type: Type.OBJECT,
                properties: {
                  keyword: { type: Type.STRING },
                  avgMonthlySearches: { type: Type.INTEGER },
                  competitionLabel: { type: Type.STRING },
                  competingListingsEst: { type: Type.INTEGER },
                  opportunityScore: { type: Type.INTEGER },
                  avgPriceUsd: { type: Type.NUMBER },
                  trendDirection: { type: Type.STRING },
                  ctrPotential: { type: Type.STRING },
                  viewsToFavoritesRatio: { type: Type.STRING },
                  seasonalPeak: { type: Type.STRING },
                },
                required: [
                  'keyword',
                  'avgMonthlySearches',
                  'competitionLabel',
                  'competingListingsEst',
                  'opportunityScore',
                  'avgPriceUsd',
                  'trendDirection',
                  'ctrPotential',
                  'viewsToFavoritesRatio',
                  'seasonalPeak',
                ],
              },
              keywords: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    keyword: { type: Type.STRING },
                    monthlySearches: { type: Type.INTEGER },
                    competitionScore: { type: Type.INTEGER },
                    competitionLabel: { type: Type.STRING },
                    competingListingsEst: { type: Type.INTEGER },
                    opportunityScore: { type: Type.INTEGER },
                    avgPriceUsd: { type: Type.NUMBER },
                    trend: { type: Type.STRING },
                    buyerIntent: { type: Type.STRING },
                    sparkline: {
                      type: Type.ARRAY,
                      items: { type: Type.INTEGER },
                    },
                  },
                  required: [
                    'keyword',
                    'monthlySearches',
                    'competitionScore',
                    'competitionLabel',
                    'competingListingsEst',
                    'opportunityScore',
                    'avgPriceUsd',
                    'trend',
                    'buyerIntent',
                    'sparkline',
                  ],
                },
              },
            },
            required: ['seedSummary', 'keywords'],
          },
        },
      });

      const parsed = extractJson<{
        seedSummary: Record<string, unknown>;
        keywords: Array<Record<string, unknown>>;
      }>(response.text);

      const normalizedKeywords = (parsed.keywords ?? []).map((item) => {
        const kw = String(item.keyword ?? '').trim().toLowerCase();
        const words = kw.split(/\s+/).filter(Boolean).length;
        const compLabel =
          item.competitionLabel === 'Low' || item.competitionLabel === 'High'
            ? item.competitionLabel
            : 'Medium';
        const trend =
          item.trend === 'Rising' || item.trend === 'Seasonal' ? item.trend : 'Steady';
        const spark =
          Array.isArray(item.sparkline) && item.sparkline.length >= 4
            ? item.sparkline.slice(0, 6).map((n) => Math.max(10, Math.min(100, Number(n) || 50)))
            : [40, 48, 52, 58, 65, 72];

        return {
          keyword: kw,
          monthlySearches: Math.max(20, Number(item.monthlySearches) || 120),
          competitionScore: Math.max(1, Math.min(100, Number(item.competitionScore) || 50)),
          competitionLabel: compLabel,
          competingListingsEst: Math.max(10, Number(item.competingListingsEst) || 1200),
          opportunityScore: Math.max(1, Math.min(100, Number(item.opportunityScore) || 60)),
          avgPriceUsd: Math.max(1, Math.round((Number(item.avgPriceUsd) || 24.99) * 100) / 100),
          trend,
          buyerIntent: String(item.buyerIntent || 'Gift'),
          wordCount: words,
          fitsEtsyTag: kw.length > 0 && kw.length <= 20,
          sparkline: spark,
        };
      });

      res.json({
        seedSummary: parsed.seedSummary,
        keywords: normalizedKeywords,
      });
    } catch (err) {
      const { status, message } = formatApiError(err);
      res.status(status).json({ error: message });
    }
  });

  // 2. Trends & Demand (with Google Search Grounding)
  app.post('/api/etsy/trends', async (req: Request, res: Response) => {
    try {
      const { topic = 'handmade gifts', timeframe = '12 Months' } = req.body ?? {};
      const ai = getAiClient();
      const prompt = `Analyze Etsy shopper trends and seasonal demand for "${String(topic).trim()}" over ${timeframe} using Google Search for real current consumer & Etsy marketplace trend patterns.
Return ONLY a raw JSON object with this structure:
{
  "topic": "${String(topic).trim()}",
  "summary": "2-sentence overview of current demand momentum and seasonal shifts",
  "monthlyDemandCurve": [
    { "month": "Jan", "interest": 48, "priorYear": 42 },
    { "month": "Feb", "interest": 54, "priorYear": 49 },
    { "month": "Mar", "interest": 58, "priorYear": 52 },
    { "month": "Apr", "interest": 64, "priorYear": 57 },
    { "month": "May", "interest": 72, "priorYear": 64 },
    { "month": "Jun", "interest": 68, "priorYear": 60 },
    { "month": "Jul", "interest": 62, "priorYear": 55 },
    { "month": "Aug", "interest": 66, "priorYear": 58 },
    { "month": "Sep", "interest": 74, "priorYear": 66 },
    { "month": "Oct", "interest": 84, "priorYear": 76 },
    { "month": "Nov", "interest": 98, "priorYear": 89 },
    { "month": "Dec", "interest": 94, "priorYear": 86 }
  ],
  "risingSearchTerms": [
    { "term": "search term", "growthLabel": "+145% YoY", "category": "Category", "estMonthlySearches": 1800 }
  ],
  "popularCategories": [
    { "category": "Category Name", "demandScore": 86, "avgPriceUsd": 34.50, "momentum": "Rising" }
  ],
  "seasonalTakeaways": ["4 concise actionable seasonal takeaways for Etsy sellers"]
}
Include 12 months, 8 risingSearchTerms, and 5 popularCategories.`;

      const response = await ai.models.generateContent({
        model: MODEL,
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        },
      });

      const parsed = extractJson<Record<string, unknown>>(response.text);
      const sources = extractGroundingSources(response);

      res.json({
        topic: String(parsed.topic ?? topic),
        summary: String(parsed.summary ?? ''),
        monthlyDemandCurve: Array.isArray(parsed.monthlyDemandCurve) ? parsed.monthlyDemandCurve : [],
        risingSearchTerms: Array.isArray(parsed.risingSearchTerms) ? parsed.risingSearchTerms : [],
        popularCategories: Array.isArray(parsed.popularCategories) ? parsed.popularCategories : [],
        seasonalTakeaways: Array.isArray(parsed.seasonalTakeaways) ? parsed.seasonalTakeaways : [],
        sources,
      });
    } catch (err) {
      const { status, message } = formatApiError(err);
      res.status(status).json({ error: message });
    }
  });

  // 3. Find Hot Products
  app.post('/api/etsy/hot-products', async (req: Request, res: Response) => {
    try {
      const { category = 'All Categories', priceTier = 'Any', competition = 'Low to Medium', keyword = '' } = req.body ?? {};
      const ai = getAiClient();
      const prompt = `Discover 8 hot, high-demand Etsy product opportunities matching:
Category: ${category}
Price Tier: ${priceTier}
Competition Target: ${competition}
Optional Theme / Keyword: ${keyword || 'Trending evergreen and giftable Etsy items'}

For each product return:
- title (realistic Etsy product concept title)
- category
- priceUsd (number)
- demandLevel ("Very High" | "High" | "Rising")
- competitionLevel ("Low" | "Medium" | "High")
- estMonthlyDemand (integer)
- opportunityScore (1-100)
- whyTrending (1 concise sentence)
- relatedKeywords (4 <= 20 char Etsy tags)
- visualGroup (must be strictly one of: "jewelry", "leather", "ceramic", "printable")`;

      const response = await ai.models.generateContent({
        model: MODEL,
        contents: prompt,
        config: {
          systemInstruction: 'You are an Etsy product discovery analyst. Return 8 realistic, profitable product concepts in strict JSON.',
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              category: { type: Type.STRING },
              products: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    category: { type: Type.STRING },
                    priceUsd: { type: Type.NUMBER },
                    demandLevel: { type: Type.STRING },
                    competitionLevel: { type: Type.STRING },
                    estMonthlyDemand: { type: Type.INTEGER },
                    opportunityScore: { type: Type.INTEGER },
                    whyTrending: { type: Type.STRING },
                    relatedKeywords: { type: Type.ARRAY, items: { type: Type.STRING } },
                    visualGroup: { type: Type.STRING },
                  },
                  required: [
                    'title',
                    'category',
                    'priceUsd',
                    'demandLevel',
                    'competitionLevel',
                    'estMonthlyDemand',
                    'opportunityScore',
                    'whyTrending',
                    'relatedKeywords',
                    'visualGroup',
                  ],
                },
              },
            },
            required: ['category', 'products'],
          },
        },
      });

      const parsed = extractJson<Record<string, unknown>>(response.text);
      res.json(parsed);
    } catch (err) {
      const { status, message } = formatApiError(err);
      res.status(status).json({ error: message });
    }
  });

  // 4. Tag Optimizer
  app.post('/api/etsy/tag-optimizer', async (req: Request, res: Response) => {
    try {
      const { focusKeyword, currentTags = [] } = req.body ?? {};
      if (!focusKeyword || typeof focusKeyword !== 'string' || !focusKeyword.trim()) {
        res.status(400).json({ error: 'Enter a focus keyword to optimize your 13 Etsy tags.' });
        return;
      }

      const ai = getAiClient();
      const prompt = `Focus Keyword: "${focusKeyword.trim()}"
Existing Tags: ${Array.isArray(currentTags) && currentTags.length ? currentTags.join(', ') : '(none provided)'}

Analyze competing Etsy listings for this focus keyword and return:
1. focusKeyword
2. competingListingsInsight: 2-sentence breakdown of what top-ranking listings do in their tags
3. missingOpportunities: 4 specific keyword/intent gaps missing from typical or provided tags
4. tags: EXACTLY 13 unique multi-word Etsy tags strictly <= 20 characters each (lowercase, spaces/hyphens only), each with tag, relevanceScore (70-99), competitionLevel ("Low"|"Medium"|"High"), and reason.`;

      const response = await ai.models.generateContent({
        model: MODEL,
        contents: prompt,
        config: {
          systemInstruction: 'You are an Etsy Tag Optimizer. Every single tag MUST be <= 20 characters, multi-word, and unique.',
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              focusKeyword: { type: Type.STRING },
              competingListingsInsight: { type: Type.STRING },
              missingOpportunities: { type: Type.ARRAY, items: { type: Type.STRING } },
              tags: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    tag: { type: Type.STRING },
                    relevanceScore: { type: Type.INTEGER },
                    competitionLevel: { type: Type.STRING },
                    reason: { type: Type.STRING },
                  },
                  required: ['tag', 'relevanceScore', 'competitionLevel', 'reason'],
                },
              },
            },
            required: ['focusKeyword', 'competingListingsInsight', 'missingOpportunities', 'tags'],
          },
        },
      });

      const parsed = extractJson<{
        focusKeyword: string;
        competingListingsInsight: string;
        missingOpportunities: string[];
        tags: Array<{ tag: string; relevanceScore: number; competitionLevel: string; reason: string }>;
      }>(response.text);

      const seen = new Set<string>();
      const cleanTags = [];
      for (const t of parsed.tags ?? []) {
        const sanitized = cleanTag(String(t.tag ?? ''));
        if (!sanitized || seen.has(sanitized)) continue;
        seen.add(sanitized);
        cleanTags.push({
          tag: sanitized,
          relevanceScore: Math.max(50, Math.min(100, Number(t.relevanceScore) || 85)),
          competitionLevel:
            t.competitionLevel === 'Low' || t.competitionLevel === 'High' ? t.competitionLevel : 'Medium',
          reason: String(t.reason || 'High-intent long-tail modifier'),
        });
        if (cleanTags.length >= 13) break;
      }

      res.json({
        focusKeyword: parsed.focusKeyword || focusKeyword.trim(),
        competingListingsInsight: parsed.competingListingsInsight,
        missingOpportunities: parsed.missingOpportunities ?? [],
        tags: cleanTags,
      });
    } catch (err) {
      const { status, message } = formatApiError(err);
      res.status(status).json({ error: message });
    }
  });

  // 5. Rank Lift (Before-and-After Listing Upgrade)
  app.post('/api/etsy/rank-lift', async (req: Request, res: Response) => {
    try {
      const { listingUrl = '', currentTitle = '', currentTags = [], currentDescription = '' } = req.body ?? {};
      if (!listingUrl.trim() && !currentTitle.trim()) {
        res.status(400).json({ error: 'Provide an Etsy listing URL or your current listing title.' });
        return;
      }

      const ai = getAiClient();
      const prompt = `Perform an Etsy Rank Lift optimization:
Listing URL / Niche Reference: ${listingUrl.trim() || '(none)'}
Current Title: ${currentTitle.trim() || '(infer from listing URL or context)'}
Current Tags: ${Array.isArray(currentTags) && currentTags.length ? currentTags.join(', ') : '(none provided)'}
Current Description: ${currentDescription.trim() || '(none provided)'}

Return:
1. beforeScore (0-100) and afterScore (0-100, higher)
2. weaknessesFound (4 concrete title/tag/description flaws)
3. missingKeywords (5 missed buyer keywords)
4. improvedTitle (<= 140 chars, front-loaded primary keyword)
5. improvedTags (EXACTLY 13 unique multi-word tags <= 20 chars each)
6. rewrittenDescription (complete buyer-ready description)
7. summaryOfChanges (4 bullet improvements).`;

      const response = await ai.models.generateContent({
        model: MODEL,
        contents: prompt,
        config: {
          systemInstruction: 'You are an Etsy Rank Lift SEO specialist. Strictly enforce <= 140 char titles and 13 unique <= 20 char tags.',
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              beforeScore: { type: Type.INTEGER },
              afterScore: { type: Type.INTEGER },
              weaknessesFound: { type: Type.ARRAY, items: { type: Type.STRING } },
              missingKeywords: { type: Type.ARRAY, items: { type: Type.STRING } },
              improvedTitle: { type: Type.STRING },
              improvedTags: { type: Type.ARRAY, items: { type: Type.STRING } },
              rewrittenDescription: { type: Type.STRING },
              summaryOfChanges: { type: Type.ARRAY, items: { type: Type.STRING } },
            },
            required: [
              'beforeScore',
              'afterScore',
              'weaknessesFound',
              'missingKeywords',
              'improvedTitle',
              'improvedTags',
              'rewrittenDescription',
              'summaryOfChanges',
            ],
          },
        },
      });

      const parsed = extractJson<{
        beforeScore: number;
        afterScore: number;
        weaknessesFound: string[];
        missingKeywords: string[];
        improvedTitle: string;
        improvedTags: string[];
        rewrittenDescription: string;
        summaryOfChanges: string[];
      }>(response.text);

      const seen = new Set<string>();
      const cleanTags: string[] = [];
      for (const t of parsed.improvedTags ?? []) {
        const s = cleanTag(String(t));
        if (s && !seen.has(s)) {
          seen.add(s);
          cleanTags.push(s);
        }
        if (cleanTags.length >= 13) break;
      }

      res.json({
        beforeScore: Math.max(10, Math.min(95, Number(parsed.beforeScore) || 48)),
        afterScore: Math.max(70, Math.min(99, Number(parsed.afterScore) || 92)),
        weaknessesFound: parsed.weaknessesFound ?? [],
        missingKeywords: parsed.missingKeywords ?? [],
        improvedTitle: trimToWordLimit(String(parsed.improvedTitle ?? ''), 140),
        improvedTags: cleanTags,
        rewrittenDescription: parsed.rewrittenDescription,
        summaryOfChanges: parsed.summaryOfChanges ?? [],
      });
    } catch (err) {
      const { status, message } = formatApiError(err);
      res.status(status).json({ error: message });
    }
  });

  // 6. Listings Research
  app.post('/api/etsy/listings-research', async (req: Request, res: Response) => {
    try {
      const { query, priceFilter = 'Any', sortFocus = 'Best Performing' } = req.body ?? {};
      if (!query || typeof query !== 'string' || !query.trim()) {
        res.status(400).json({ error: 'Enter a product keyword or niche to research active Etsy listings.' });
        return;
      }

      const ai = getAiClient();
      const prompt = `Conduct an Etsy Listings Research breakdown for "${query.trim()}" (Price Filter: ${priceFilter}, Sort Focus: ${sortFocus}).
Return realistic competitor listing benchmarks reflecting Etsy Page-1 search patterns:
1. avgPriceUsd, medianPriceUsd, priceRange (e.g. "$18.50 - $68.00"), avgMonthlyViews
2. topCommonTags: 10 most frequently shared tags across top listings with frequencyPercent (30-95)
3. listings: 10 distinct realistic competing Etsy listings with title (<= 140 chars), shopName, priceUsd, estMonthlySales, estViews, estFavorites, listingAgeMonths, bestsellerBadge (boolean), tagsUsed (5 representative tags <= 20 chars each), and whyItRanks (1 concise sentence)
4. marketGaps: 4 clear product or positioning gaps uncovered in this listing set.`;

      const response = await ai.models.generateContent({
        model: MODEL,
        contents: prompt,
        config: {
          systemInstruction:
            'You are an Etsy Listings Research intelligence engine. Provide realistic competitive listing benchmarks, pricing distributions, views-to-favorites patterns, and tag structures in strict JSON.',
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              query: { type: Type.STRING },
              avgPriceUsd: { type: Type.NUMBER },
              medianPriceUsd: { type: Type.NUMBER },
              priceRange: { type: Type.STRING },
              avgMonthlyViews: { type: Type.INTEGER },
              topCommonTags: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    tag: { type: Type.STRING },
                    frequencyPercent: { type: Type.INTEGER },
                  },
                  required: ['tag', 'frequencyPercent'],
                },
              },
              listings: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    shopName: { type: Type.STRING },
                    priceUsd: { type: Type.NUMBER },
                    estMonthlySales: { type: Type.INTEGER },
                    estViews: { type: Type.INTEGER },
                    estFavorites: { type: Type.INTEGER },
                    listingAgeMonths: { type: Type.INTEGER },
                    bestsellerBadge: { type: Type.BOOLEAN },
                    tagsUsed: { type: Type.ARRAY, items: { type: Type.STRING } },
                    whyItRanks: { type: Type.STRING },
                  },
                  required: [
                    'title',
                    'shopName',
                    'priceUsd',
                    'estMonthlySales',
                    'estViews',
                    'estFavorites',
                    'listingAgeMonths',
                    'bestsellerBadge',
                    'tagsUsed',
                    'whyItRanks',
                  ],
                },
              },
              marketGaps: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
            },
            required: [
              'query',
              'avgPriceUsd',
              'medianPriceUsd',
              'priceRange',
              'avgMonthlyViews',
              'topCommonTags',
              'listings',
              'marketGaps',
            ],
          },
        },
      });

      const parsed = extractJson<Record<string, unknown>>(response.text);
      res.json(parsed);
    } catch (err) {
      const { status, message } = formatApiError(err);
      res.status(status).json({ error: message });
    }
  });

  // 7. Top Sellers Leaderboard (with Google Search Grounding)
  app.post('/api/etsy/top-sellers', async (req: Request, res: Response) => {
    try {
      const { niche, country = 'All Countries' } = req.body ?? {};
      if (!niche || typeof niche !== 'string' || !niche.trim()) {
        res.status(400).json({ error: 'Enter a product niche or category to rank Top Etsy Sellers.' });
        return;
      }

      const ai = getAiClient();
      const prompt = `Find and analyze top-selling Etsy shops in the "${niche.trim()}" niche (Country filter: ${country}) using Google Search.
Return ONLY a raw JSON object (no commentary outside JSON) with this exact structure:
{
  "niche": "${niche.trim()}",
  "marketTakeaway": "2-sentence insight into what separates the highest-volume shops in this niche",
  "shops": [
    {
      "rank": 1,
      "shopName": "Real or representative Etsy shop name",
      "country": "United States",
      "lifetimeSales": 48500,
      "reviewCount": 12400,
      "rating": 4.9,
      "shopAgeYears": 5,
      "activeListings": 210,
      "avgPriceUsd": 36.50,
      "specialty": "Short summary of what they sell",
      "topWinningProduct": "Their flagship bestseller product type"
    }
  ]
}
Include 10 ranked shops ordered by lifetimeSales descending.`;

      const response = await ai.models.generateContent({
        model: MODEL,
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        },
      });

      const parsed = extractJson<Record<string, unknown>>(response.text);
      const sources = extractGroundingSources(response);

      res.json({
        niche: String(parsed.niche ?? niche.trim()),
        marketTakeaway: String(parsed.marketTakeaway ?? ''),
        shops: Array.isArray(parsed.shops) ? parsed.shops : [],
        sources,
      });
    } catch (err) {
      const { status, message } = formatApiError(err);
      res.status(status).json({ error: message });
    }
  });

  // 8. Etsy Rank Checker
  app.post('/api/etsy/rank-checker', async (req: Request, res: Response) => {
    try {
      const { shopOrListing, keywords } = req.body ?? {};
      if (!shopOrListing || typeof shopOrListing !== 'string' || !shopOrListing.trim()) {
        res.status(400).json({ error: 'Enter your Etsy shop name, listing title, or Etsy URL.' });
        return;
      }
      const keywordList: string[] = Array.isArray(keywords)
        ? keywords.map((k) => String(k).trim()).filter(Boolean).slice(0, 12)
        : [];
      if (keywordList.length === 0) {
        res.status(400).json({ error: 'Enter at least 1 target keyword to check rank position.' });
        return;
      }

      const ai = getAiClient();
      const prompt = `Evaluate Etsy search ranking & visibility for shop/listing "${shopOrListing.trim()}" across these target keywords: ${keywordList.join(', ')}.
Use Google Search to check public visibility of this shop/listing on Etsy and current Page-1 competition for each keyword.
Return ONLY a raw JSON object with this structure:
{
  "shopOrListing": "${shopOrListing.trim()}",
  "rows": [
    {
      "keyword": "exact keyword checked",
      "estimatedPosition": 14,
      "estimatedPage": 1,
      "visibilityStatus": "Page 1",
      "competitionLevel": "Medium",
      "topCompetitorTitle": "Sample Page-1 ranking title style in this keyword",
      "quickFix": "Specific SEO edit to climb higher for this keyword"
    }
  ]
}
visibilityStatus must be one of: "Page 1 Top", "Page 1", "Page 2-3", "Deep / Unranked".`;

      const response = await ai.models.generateContent({
        model: MODEL,
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        },
      });

      const parsed = extractJson<{
        shopOrListing?: string;
        rows?: Array<Record<string, unknown>>;
      }>(response.text);
      const sources = extractGroundingSources(response);

      const rows = (parsed.rows ?? []).map((r) => {
        const pos = Math.max(1, Number(r.estimatedPosition) || 48);
        const page = Math.max(1, Math.ceil(pos / 48));
        const status =
          pos <= 12
            ? 'Page 1 Top'
            : pos <= 48
            ? 'Page 1'
            : pos <= 144
            ? 'Page 2-3'
            : 'Deep / Unranked';
        return {
          keyword: String(r.keyword ?? ''),
          estimatedPosition: pos,
          estimatedPage: page,
          visibilityStatus: status,
          competitionLevel:
            r.competitionLevel === 'Low' || r.competitionLevel === 'High'
              ? r.competitionLevel
              : 'Medium',
          topCompetitorTitle: String(r.topCompetitorTitle ?? ''),
          quickFix: String(r.quickFix ?? ''),
        };
      });

      const avgPosition = rows.length
        ? Math.round(rows.reduce((sum, r) => sum + r.estimatedPosition, 0) / rows.length)
        : 0;
      const pageOneCount = rows.filter((r) => r.estimatedPage === 1).length;

      res.json({
        shopOrListing: String(parsed.shopOrListing ?? shopOrListing.trim()),
        checkedAt: new Date().toISOString(),
        avgPosition,
        pageOneCount,
        rows,
        sources,
      });
    } catch (err) {
      const { status, message } = formatApiError(err);
      res.status(status).json({ error: message });
    }
  });

  // 9. Auto Pilot
  app.post('/api/etsy/autopilot', async (req: Request, res: Response) => {
    try {
      const {
        workingName = '',
        notes = '',
        imageBase64,
        imageMimeType = 'image/jpeg',
      } = req.body ?? {};

      if (!workingName.trim() && !imageBase64) {
        res.status(400).json({ error: 'Upload a product photo or enter a short product name.' });
        return;
      }

      const ai = getAiClient();
      const promptText = `You are Auto Pilot for Etsy Sellers.
Working Product Name: "${workingName.trim() || 'See uploaded product photo'}"
Extra Seller Notes: "${notes.trim() || 'Standard handmade / gift-ready item'}"

Automatically perform Etsy & Google keyword research, competitor price benchmarking, and draft a complete, publish-ready Etsy listing:
1. suggestedCategory: Best Etsy taxonomy path
2. suggestedPriceUsd: Competitive market price in USD based on active Etsy competitors
3. priceRationale: Brief 1-sentence justification for the suggested price
4. title: One high-converting Etsy title <= 140 characters, front-loading top buyer keywords in the first 40 chars
5. tags: EXACTLY 13 unique multi-word Etsy tags, EACH strictly <= 20 characters (lowercase, spaces/hyphens only)
6. description: Structured buyer-ready Etsy description with hook, bullet specs, personalization/care, and shipping note
7. attributes: materials (3 strings), occasion, style, primaryColor
8. targetKeywords: 5 primary search phrases targeted by this draft.`;

      const contentsPayload = imageBase64
        ? {
            parts: [
              {
                inlineData: {
                  mimeType: imageMimeType,
                  data: imageBase64,
                },
              },
              { text: promptText },
            ],
          }
        : promptText;

      const response = await ai.models.generateContent({
        model: MODEL,
        contents: contentsPayload,
        config: {
          systemInstruction:
            'You are an automated Etsy listing architect. Strictly enforce Title <= 140 chars and 13 unique Tags <= 20 chars each.',
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              suggestedCategory: { type: Type.STRING },
              suggestedPriceUsd: { type: Type.NUMBER },
              priceRationale: { type: Type.STRING },
              title: { type: Type.STRING },
              tags: { type: Type.ARRAY, items: { type: Type.STRING } },
              description: { type: Type.STRING },
              attributes: {
                type: Type.OBJECT,
                properties: {
                  materials: { type: Type.ARRAY, items: { type: Type.STRING } },
                  occasion: { type: Type.STRING },
                  style: { type: Type.STRING },
                  primaryColor: { type: Type.STRING },
                },
                required: ['materials', 'occasion', 'style', 'primaryColor'],
              },
              targetKeywords: { type: Type.ARRAY, items: { type: Type.STRING } },
            },
            required: [
              'suggestedCategory',
              'suggestedPriceUsd',
              'priceRationale',
              'title',
              'tags',
              'description',
              'attributes',
              'targetKeywords',
            ],
          },
        },
      });

      const parsed = extractJson<{
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
      }>(response.text);

      const seen = new Set<string>();
      const cleanTags: string[] = [];
      for (const t of parsed.tags ?? []) {
        const cleaned = cleanTag(String(t));
        if (cleaned && !seen.has(cleaned)) {
          seen.add(cleaned);
          cleanTags.push(cleaned);
        }
        if (cleanTags.length >= 13) break;
      }

      res.json({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        createdAt: new Date().toISOString(),
        workingName: workingName.trim() || 'Auto Pilot Product',
        status: 'Pending Review',
        suggestedCategory: parsed.suggestedCategory,
        suggestedPriceUsd: Math.max(1, Math.round((Number(parsed.suggestedPriceUsd) || 29) * 100) / 100),
        priceRationale: parsed.priceRationale,
        title: trimToWordLimit(String(parsed.title ?? ''), 140),
        tags: cleanTags,
        description: parsed.description,
        attributes: parsed.attributes,
        targetKeywords: parsed.targetKeywords ?? [],
      });
    } catch (err) {
      const { status, message } = formatApiError(err);
      res.status(status).json({ error: message });
    }
  });

  // 10. AI Listing Optimizer / Audit / AI Title & Tags / Etsy Listing Pro
  app.post('/api/etsy/optimize-listing', async (req: Request, res: Response) => {
    try {
      const {
        mode = 'generate',
        productIdea = '',
        currentTitle = '',
        currentTags = [],
        currentDescription = '',
        priceUsd = 29,
        targetAudience = '',
        category = 'General Handmade & Gifts',
        imageBase64,
        imageMimeType,
      } = req.body ?? {};

      if (mode === 'generate' && !productIdea.trim() && !imageBase64) {
        res.status(400).json({ error: 'Provide a product description or upload a product photo.' });
        return;
      }
      if (mode === 'audit' && !currentTitle.trim() && (!Array.isArray(currentTags) || currentTags.length === 0)) {
        res.status(400).json({ error: 'Paste your current Etsy title or tags to audit.' });
        return;
      }

      const ai = getAiClient();
      const promptText = `Mode: ${mode}
Category: ${category}
Target Buyer / Occasion: ${targetAudience || 'Etsy gift & aesthetic shoppers'}
Price (USD): $${priceUsd}
Product Details / Idea: ${productIdea || 'See uploaded product photo and existing listing details'}
Current Title: ${currentTitle || '(none provided)'}
Current Tags (${Array.isArray(currentTags) ? currentTags.length : 0}): ${Array.isArray(currentTags) ? currentTags.join(', ') : '(none)'}
Current Description: ${currentDescription || '(none provided)'}

Generate a complete, high-converting Etsy SEO listing package:
1. overallScore (0-100) evaluating current strength.
2. auditFindings: 4 concise, actionable findings across Title, Tags, Description, and Pricing.
3. titleOptions: 3 distinct optimized Etsy titles, EACH strictly <= 140 characters, front-loading the highest-intent buyer keyword in the first 40 characters, readable Title Case, no keyword stuffing.
4. optimizedTags: EXACTLY 13 unique multi-word Etsy tags. CRITICAL RULE: Every single tag MUST be 20 characters or fewer (including spaces), lowercase, letters/numbers/spaces/hyphens only, zero duplicates, zero single-word generic tags.
5. optimizedDescription: hook, 4-5 scannable bullet specs, personalization & care notes, shipping/gift appeal, plus fullText.
6. recommendedAttributes: materials (array of 3), occasion, style, primaryColor.`;

      const contentsPayload = imageBase64
        ? {
            parts: [
              {
                inlineData: {
                  mimeType: imageMimeType || 'image/jpeg',
                  data: imageBase64,
                },
              },
              { text: promptText },
            ],
          }
        : promptText;

      const response = await ai.models.generateContent({
        model: MODEL,
        contents: contentsPayload,
        config: {
          systemInstruction:
            'You are a top 1% Etsy SEO specialist and conversion copywriter. Strictly enforce Etsy rules: Titles <= 140 chars, Tags <= 20 chars each (exactly 13 unique multi-word tags), no keyword stuffing.',
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              overallScore: { type: Type.INTEGER },
              auditFindings: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    area: { type: Type.STRING },
                    severity: { type: Type.STRING },
                    finding: { type: Type.STRING },
                    fix: { type: Type.STRING },
                  },
                  required: ['area', 'severity', 'finding', 'fix'],
                },
              },
              titleOptions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    strategy: { type: Type.STRING },
                    mobileHook: { type: Type.STRING },
                  },
                  required: ['title', 'strategy', 'mobileHook'],
                },
              },
              optimizedTags: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    tag: { type: Type.STRING },
                    reason: { type: Type.STRING },
                    competitionEst: { type: Type.STRING },
                    searchIntent: { type: Type.STRING },
                  },
                  required: ['tag', 'reason', 'competitionEst', 'searchIntent'],
                },
              },
              optimizedDescription: {
                type: Type.OBJECT,
                properties: {
                  hook: { type: Type.STRING },
                  bulletSpecs: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                  },
                  personalizationAndCare: { type: Type.STRING },
                  shippingAndGiftNote: { type: Type.STRING },
                  fullText: { type: Type.STRING },
                },
                required: ['hook', 'bulletSpecs', 'personalizationAndCare', 'shippingAndGiftNote', 'fullText'],
              },
              recommendedAttributes: {
                type: Type.OBJECT,
                properties: {
                  materials: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                  },
                  occasion: { type: Type.STRING },
                  style: { type: Type.STRING },
                  primaryColor: { type: Type.STRING },
                },
                required: ['materials', 'occasion', 'style', 'primaryColor'],
              },
            },
            required: [
              'overallScore',
              'auditFindings',
              'titleOptions',
              'optimizedTags',
              'optimizedDescription',
              'recommendedAttributes',
            ],
          },
        },
      });

      const parsed = extractJson<{
        overallScore: number;
        auditFindings: Array<Record<string, unknown>>;
        titleOptions: Array<{ title: string; strategy: string; mobileHook: string }>;
        optimizedTags: Array<{ tag: string; reason: string; competitionEst: string; searchIntent: string }>;
        optimizedDescription: Record<string, unknown>;
        recommendedAttributes: Record<string, unknown>;
      }>(response.text);

      const normalizedTitles = (parsed.titleOptions ?? []).slice(0, 3).map((t) => {
        const capped = trimToWordLimit(String(t.title ?? ''), 140);
        return {
          title: capped,
          strategy: String(t.strategy ?? 'SEO Balanced'),
          mobileHook: capped.slice(0, 40),
        };
      });

      const seenTags = new Set<string>();
      const normalizedTags: Array<{
        tag: string;
        reason: string;
        competitionEst: 'Low' | 'Medium' | 'High';
        searchIntent: string;
      }> = [];

      for (const item of parsed.optimizedTags ?? []) {
        const sanitized = cleanTag(String(item.tag ?? ''));
        if (!sanitized || seenTags.has(sanitized)) continue;
        seenTags.add(sanitized);
        const comp =
          item.competitionEst === 'Low' || item.competitionEst === 'High'
            ? item.competitionEst
            : 'Medium';
        normalizedTags.push({
          tag: sanitized,
          reason: String(item.reason ?? 'High-intent long-tail modifier'),
          competitionEst: comp,
          searchIntent: String(item.searchIntent ?? 'Buyer search'),
        });
        if (normalizedTags.length >= 13) break;
      }

      res.json({
        overallScore: Math.max(0, Math.min(100, Number(parsed.overallScore) || 75)),
        auditFindings: parsed.auditFindings ?? [],
        titleOptions: normalizedTitles,
        optimizedTags: normalizedTags,
        optimizedDescription: parsed.optimizedDescription,
        recommendedAttributes: parsed.recommendedAttributes,
      });
    } catch (err) {
      const { status, message } = formatApiError(err);
      res.status(status).json({ error: message });
    }
  });

  // 11. Competitor Analysis
  app.post('/api/etsy/competitor', async (req: Request, res: Response) => {
    try {
      const { query, marketplace = 'United States' } = req.body ?? {};
      if (!query || typeof query !== 'string' || !query.trim()) {
        res.status(400).json({ error: 'Enter an Etsy shop name, Etsy listing URL, or product niche.' });
        return;
      }

      const ai = getAiClient();
      const prompt = `Research Etsy competitor or product market: "${query.trim()}" (${marketplace} marketplace).
Use Google Search to check public Etsy shop/listing presence, pricing ranges, customer preferences, and competitor patterns.
Return ONLY a raw JSON object (no markdown commentary outside JSON) with this exact structure:
{
  "targetName": "Clean name of the shop or product niche analyzed",
  "marketPositioning": "2-3 sentence summary of positioning, price tier, and customer appeal",
  "estimatedPriceRange": "$XX - $XX",
  "estimatedMonthlyOrdersRange": "e.g. 120 - 280 orders/mo (benchmark estimate)",
  "conversionDrivers": ["4 concrete reasons buyers convert in this shop/niche"],
  "topKeywordsUsed": [
    { "keyword": "keyword phrase", "strength": "Strong / Core", "gapOpportunity": "Why this keyword performs" }
  ],
  "keywordGaps": [
    { "keyword": "untapped long-tail phrase <= 20 chars", "whyItMatters": "Reason competitors miss it", "estSearches": 480, "difficulty": "Low" }
  ],
  "winningListingBlueprints": ["4 actionable title/photo/offer tactics to outperform"],
  "actionPlan": ["4 step-by-step actions to outrank this competitor"]
}
Include 6 items in topKeywordsUsed and 6 items in keywordGaps.`;

      const response = await ai.models.generateContent({
        model: MODEL,
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        },
      });

      const parsed = extractJson<Record<string, unknown>>(response.text);
      const sources = extractGroundingSources(response);

      res.json({
        targetName: String(parsed.targetName ?? query.trim()),
        marketPositioning: String(parsed.marketPositioning ?? ''),
        estimatedPriceRange: String(parsed.estimatedPriceRange ?? '$18 - $65'),
        estimatedMonthlyOrdersRange: String(parsed.estimatedMonthlyOrdersRange ?? '80 - 220 orders/mo'),
        conversionDrivers: Array.isArray(parsed.conversionDrivers) ? parsed.conversionDrivers : [],
        topKeywordsUsed: Array.isArray(parsed.topKeywordsUsed) ? parsed.topKeywordsUsed : [],
        keywordGaps: Array.isArray(parsed.keywordGaps) ? parsed.keywordGaps : [],
        winningListingBlueprints: Array.isArray(parsed.winningListingBlueprints)
          ? parsed.winningListingBlueprints
          : [],
        actionPlan: Array.isArray(parsed.actionPlan) ? parsed.actionPlan : [],
        sources,
      });
    } catch (err) {
      const { status, message } = formatApiError(err);
      res.status(status).json({ error: message });
    }
  });

  // 12. Category Report & Niche Discovery
  app.post('/api/etsy/niches', async (req: Request, res: Response) => {
    try {
      const {
        category = 'Jewelry & Accessories',
        maxCompetition = 'Low to Medium',
        priceTier = 'Mid ($25 - $75)',
        focus = '',
      } = req.body ?? {};

      const ai = getAiClient();
      const prompt = `Produce a full Etsy Category Report & Sub-Niche Opportunity Breakdown for:
Category: ${category}
Max Competition: ${maxCompetition}
Target Price Tier: ${priceTier}
Seller Focus / Skills: ${focus || 'Any handmade, personalized, print-on-demand, or digital product'}

Return:
1. category, marketNote (2-sentence macro category trend summary)
2. macroMetrics:
   - avgPriceUsd, medianPriceUsd, avgFavoritesPerListing, demandTrend ("Growing"|"Steady"|"Seasonal Spike")
   - priceBrackets: 4 price tier shares summing to 100
   - topCategoryTags: 12 most widely used <= 20 char Etsy tags in this category
3. niches: 8 profitable low-to-medium competition sub-niches.`;

      const response = await ai.models.generateContent({
        model: MODEL,
        contents: prompt,
        config: {
          systemInstruction:
            'You are an Etsy Category & Market Intelligence analyst. Provide macro category price distribution, top shared tags, and 8 specific non-saturated sub-niches.',
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              category: { type: Type.STRING },
              marketNote: { type: Type.STRING },
              macroMetrics: {
                type: Type.OBJECT,
                properties: {
                  avgPriceUsd: { type: Type.NUMBER },
                  medianPriceUsd: { type: Type.NUMBER },
                  avgFavoritesPerListing: { type: Type.INTEGER },
                  demandTrend: { type: Type.STRING },
                  priceBrackets: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        label: { type: Type.STRING },
                        sharePercent: { type: Type.INTEGER },
                      },
                      required: ['label', 'sharePercent'],
                    },
                  },
                  topCategoryTags: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                  },
                },
                required: [
                  'avgPriceUsd',
                  'medianPriceUsd',
                  'avgFavoritesPerListing',
                  'demandTrend',
                  'priceBrackets',
                  'topCategoryTags',
                ],
              },
              niches: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    nicheName: { type: Type.STRING },
                    category: { type: Type.STRING },
                    demandLevel: { type: Type.STRING },
                    competitionLevel: { type: Type.STRING },
                    opportunityScore: { type: Type.INTEGER },
                    avgPriceUsd: { type: Type.NUMBER },
                    seasonalWindow: { type: Type.STRING },
                    whyNow: { type: Type.STRING },
                    seedKeywords: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                    },
                    productAngles: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                    },
                  },
                  required: [
                    'nicheName',
                    'category',
                    'demandLevel',
                    'competitionLevel',
                    'opportunityScore',
                    'avgPriceUsd',
                    'seasonalWindow',
                    'whyNow',
                    'seedKeywords',
                    'productAngles',
                  ],
                },
              },
            },
            required: ['category', 'marketNote', 'macroMetrics', 'niches'],
          },
        },
      });

      const parsed = extractJson<Record<string, unknown>>(response.text);
      res.json(parsed);
    } catch (err) {
      const { status, message } = formatApiError(err);
      res.status(status).json({ error: message });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('/{*path}', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`CraftRank SaaS server running at http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
