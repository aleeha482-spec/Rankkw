import { relations } from 'drizzle-orm';
import { integer, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  email: text('email').notNull(),
  displayName: text('display_name').default('Etsy Seller'),
  shopName: text('shop_name').default(''),
  etsyMarketplace: text('etsy_marketplace').default('United States'),
  currency: text('currency').default('USD'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const savedKeywords = pgTable('saved_keywords', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  keyword: text('keyword').notNull(),
  monthlySearches: integer('monthly_searches').default(0).notNull(),
  competitionLabel: text('competition_label').default('Medium').notNull(),
  opportunityScore: integer('opportunity_score').default(50).notNull(),
  avgPriceUsd: text('avg_price_usd').default('0').notNull(),
  trend: text('trend').default('Steady').notNull(),
  notes: text('notes').default(''),
  createdAt: timestamp('created_at').defaultNow(),
});

export const trackedCompetitors = pgTable('tracked_competitors', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  shopName: text('shop_name').notNull(),
  shopUrl: text('shop_url').default(''),
  estimatedPriceRange: text('estimated_price_range').default(''),
  estimatedOrders: text('estimated_orders').default(''),
  notes: text('notes').default(''),
  createdAt: timestamp('created_at').defaultNow(),
});

export const savedListings = pgTable('saved_listings', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  title: text('title').notNull(),
  tagsJson: text('tags_json').notNull(),
  description: text('description').notNull(),
  priceUsd: text('price_usd').default('29.00').notNull(),
  category: text('category').default('Handmade & Gifts').notNull(),
  seoScore: integer('seo_score').default(0).notNull(),
  sourceTool: text('source_tool').default('optimizer').notNull(),
  status: text('status').default('saved').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const searchHistory = pgTable('search_history', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  toolName: text('tool_name').notNull(),
  query: text('query').notNull(),
  summary: text('summary').default(''),
  createdAt: timestamp('created_at').defaultNow(),
});

export const rankHistory = pgTable('rank_history', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  target: text('target').notNull(),
  avgPosition: integer('avg_position').default(0).notNull(),
  pageOneCount: integer('page_one_count').default(0).notNull(),
  totalKeywords: integer('total_keywords').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const favoriteProducts = pgTable('favorite_products', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  title: text('title').notNull(),
  category: text('category').notNull(),
  priceUsd: text('price_usd').default('0').notNull(),
  demandLevel: text('demand_level').default('High').notNull(),
  competitionLevel: text('competition_level').default('Medium').notNull(),
  relatedKeywordsJson: text('related_keywords_json').default('[]').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const usersRelations = relations(users, ({ many }) => ({
  savedKeywords: many(savedKeywords),
  trackedCompetitors: many(trackedCompetitors),
  savedListings: many(savedListings),
  searchHistory: many(searchHistory),
  rankHistory: many(rankHistory),
  favoriteProducts: many(favoriteProducts),
}));

export const savedKeywordsRelations = relations(savedKeywords, ({ one }) => ({
  user: one(users, { fields: [savedKeywords.userId], references: [users.id] }),
}));

export const trackedCompetitorsRelations = relations(trackedCompetitors, ({ one }) => ({
  user: one(users, { fields: [trackedCompetitors.userId], references: [users.id] }),
}));

export const savedListingsRelations = relations(savedListings, ({ one }) => ({
  user: one(users, { fields: [savedListings.userId], references: [users.id] }),
}));

export const searchHistoryRelations = relations(searchHistory, ({ one }) => ({
  user: one(users, { fields: [searchHistory.userId], references: [users.id] }),
}));

export const rankHistoryRelations = relations(rankHistory, ({ one }) => ({
  user: one(users, { fields: [rankHistory.userId], references: [users.id] }),
}));

export const favoriteProductsRelations = relations(favoriteProducts, ({ one }) => ({
  user: one(users, { fields: [favoriteProducts.userId], references: [users.id] }),
}));
