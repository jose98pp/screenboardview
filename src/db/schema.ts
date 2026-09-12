import { pgTable, text, timestamp, jsonb, serial } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(), // Firebase Auth UID
  email: text('email').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const scoreboards = pgTable('scoreboards', {
  id: text('id').primaryKey(), // board.id like sb_soccer_123
  userId: text('user_id'), // optional Firebase UID if user logged in
  title: text('title').notNull(),
  sport: text('sport').notNull(),
  data: jsonb('data').notNull(), // Full ScoreboardData payload
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
