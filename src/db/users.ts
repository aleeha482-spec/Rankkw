import { desc, eq, and } from 'drizzle-orm';
import { db } from './index.ts';
import {
  favoriteProducts,
  rankHistory,
  savedKeywords,
  savedListings,
  searchHistory,
  trackedCompetitors,
  users,
} from './schema.ts';

export async function getOrCreateUser(uid: string, email: string, displayName?: string) {
  try {
    const result = await db
      .insert(users)
      .values({
        uid,
        email,
        displayName: displayName || email.split('@')[0] || 'Etsy Seller',
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: { email },
      })
      .returning();

    return result[0];
  } catch (error) {
    console.error('Database query failed in getOrCreateUser:', error);
    throw new Error('Failed to synchronize user profile.', { cause: error });
  }
}

export async function updateUserProfile(
  uid: string,
  updates: {
    displayName?: string;
    shopName?: string;
    etsyMarketplace?: string;
    currency?: string;
  }
) {
  try {
    const result = await db
      .update(users)
      .set(updates)
      .where(eq(users.uid, uid))
      .returning();
    return result[0];
  } catch (error) {
    console.error('Database query failed in updateUserProfile:', error);
    throw new Error('Failed to update user profile.', { cause: error });
  }
}

export async function getUserWorkspaceData(userId: number) {
  try {
    const [keywords, competitors, listings, searches, ranks, favorites] = await Promise.all([
      db.select().from(savedKeywords).where(eq(savedKeywords.userId, userId)).orderBy(desc(savedKeywords.createdAt)),
      db.select().from(trackedCompetitors).where(eq(trackedCompetitors.userId, userId)).orderBy(desc(trackedCompetitors.createdAt)),
      db.select().from(savedListings).where(eq(savedListings.userId, userId)).orderBy(desc(savedListings.createdAt)),
      db.select().from(searchHistory).where(eq(searchHistory.userId, userId)).orderBy(desc(searchHistory.createdAt)).limit(30),
      db.select().from(rankHistory).where(eq(rankHistory.userId, userId)).orderBy(desc(rankHistory.createdAt)).limit(20),
      db.select().from(favoriteProducts).where(eq(favoriteProducts.userId, userId)).orderBy(desc(favoriteProducts.createdAt)),
    ]);

    return {
      keywords,
      competitors,
      listings,
      searches,
      ranks,
      favorites,
    };
  } catch (error) {
    console.error('Database query failed in getUserWorkspaceData:', error);
    throw new Error('Failed to load workspace records.', { cause: error });
  }
}

export async function addSavedKeyword(
  userId: number,
  data: {
    keyword: string;
    monthlySearches: number;
    competitionLabel: string;
    opportunityScore: number;
    avgPriceUsd: string;
    trend: string;
    notes?: string;
  }
) {
  try {
    const result = await db
      .insert(savedKeywords)
      .values({ userId, ...data })
      .returning();
    return result[0];
  } catch (error) {
    console.error('Database query failed in addSavedKeyword:', error);
    throw new Error('Failed to save keyword.', { cause: error });
  }
}

export async function removeSavedKeyword(userId: number, id: number) {
  try {
    await db
      .delete(savedKeywords)
      .where(and(eq(savedKeywords.id, id), eq(savedKeywords.userId, userId)));
  } catch (error) {
    console.error('Database query failed in removeSavedKeyword:', error);
    throw new Error('Failed to delete saved keyword.', { cause: error });
  }
}

export async function addTrackedCompetitor(
  userId: number,
  data: {
    shopName: string;
    shopUrl?: string;
    estimatedPriceRange?: string;
    estimatedOrders?: string;
    notes?: string;
  }
) {
  try {
    const result = await db
      .insert(trackedCompetitors)
      .values({ userId, ...data })
      .returning();
    return result[0];
  } catch (error) {
    console.error('Database query failed in addTrackedCompetitor:', error);
    throw new Error('Failed to track competitor.', { cause: error });
  }
}

export async function removeTrackedCompetitor(userId: number, id: number) {
  try {
    await db
      .delete(trackedCompetitors)
      .where(and(eq(trackedCompetitors.id, id), eq(trackedCompetitors.userId, userId)));
  } catch (error) {
    console.error('Database query failed in removeTrackedCompetitor:', error);
    throw new Error('Failed to remove competitor.', { cause: error });
  }
}

export async function addSavedListing(
  userId: number,
  data: {
    title: string;
    tagsJson: string;
    description: string;
    priceUsd: string;
    category: string;
    seoScore: number;
    sourceTool: string;
    status: string;
  }
) {
  try {
    const result = await db
      .insert(savedListings)
      .values({ userId, ...data })
      .returning();
    return result[0];
  } catch (error) {
    console.error('Database query failed in addSavedListing:', error);
    throw new Error('Failed to save listing.', { cause: error });
  }
}

export async function removeSavedListing(userId: number, id: number) {
  try {
    await db
      .delete(savedListings)
      .where(and(eq(savedListings.id, id), eq(savedListings.userId, userId)));
  } catch (error) {
    console.error('Database query failed in removeSavedListing:', error);
    throw new Error('Failed to delete listing.', { cause: error });
  }
}

export async function logSearchHistory(
  userId: number,
  data: { toolName: string; query: string; summary?: string }
) {
  try {
    const result = await db
      .insert(searchHistory)
      .values({ userId, ...data })
      .returning();
    return result[0];
  } catch (error) {
    console.error('Database query failed in logSearchHistory:', error);
    throw new Error('Failed to log search history.', { cause: error });
  }
}

export async function addRankHistoryRecord(
  userId: number,
  data: { target: string; avgPosition: number; pageOneCount: number; totalKeywords: number }
) {
  try {
    const result = await db
      .insert(rankHistory)
      .values({ userId, ...data })
      .returning();
    return result[0];
  } catch (error) {
    console.error('Database query failed in addRankHistoryRecord:', error);
    throw new Error('Failed to save rank history.', { cause: error });
  }
}

export async function addFavoriteProduct(
  userId: number,
  data: {
    title: string;
    category: string;
    priceUsd: string;
    demandLevel: string;
    competitionLevel: string;
    relatedKeywordsJson: string;
  }
) {
  try {
    const result = await db
      .insert(favoriteProducts)
      .values({ userId, ...data })
      .returning();
    return result[0];
  } catch (error) {
    console.error('Database query failed in addFavoriteProduct:', error);
    throw new Error('Failed to save product favorite.', { cause: error });
  }
}

export async function removeFavoriteProduct(userId: number, id: number) {
  try {
    await db
      .delete(favoriteProducts)
      .where(and(eq(favoriteProducts.id, id), eq(favoriteProducts.userId, userId)));
  } catch (error) {
    console.error('Database query failed in removeFavoriteProduct:', error);
    throw new Error('Failed to remove favorite product.', { cause: error });
  }
}
