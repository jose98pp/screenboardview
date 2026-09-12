import { eq, desc } from 'drizzle-orm';
import { db } from './index.ts';
import { scoreboards } from './schema.ts';
import { ScoreboardData } from '../types';

export async function upsertScoreboardInDb(board: ScoreboardData, userId?: string) {
  try {
    const result = await db.insert(scoreboards)
      .values({
        id: board.id,
        userId: userId || null,
        title: board.title || 'Marcador',
        sport: board.sport || 'general',
        data: board,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: scoreboards.id,
        set: {
          title: board.title || 'Marcador',
          sport: board.sport || 'general',
          data: board,
          userId: userId !== undefined ? userId : scoreboards.userId,
          updatedAt: new Date(),
        },
      })
      .returning();

    return result[0];
  } catch (error) {
    console.error('Database query failed for upsertScoreboard:', error);
    throw new Error('Failed to save scoreboard to Cloud SQL.', { cause: error });
  }
}

export async function getScoreboardFromDb(id: string): Promise<ScoreboardData | null> {
  try {
    const rows = await db.select()
      .from(scoreboards)
      .where(eq(scoreboards.id, id))
      .limit(1);

    if (rows.length === 0) return null;
    return rows[0].data as ScoreboardData;
  } catch (error) {
    console.error('Database query failed for getScoreboard:', error);
    throw new Error('Failed to fetch scoreboard from Cloud SQL.', { cause: error });
  }
}

export async function listScoreboardsFromDb(userId?: string): Promise<ScoreboardData[]> {
  try {
    let query = db.select().from(scoreboards).orderBy(desc(scoreboards.updatedAt));
    const rows = userId
      ? await query.where(eq(scoreboards.userId, userId))
      : await query;

    return rows.map((r) => r.data as ScoreboardData);
  } catch (error) {
    console.error('Database query failed for listScoreboards:', error);
    throw new Error('Failed to list scoreboards from Cloud SQL.', { cause: error });
  }
}

export async function deleteScoreboardFromDb(id: string): Promise<boolean> {
  try {
    await db.delete(scoreboards).where(eq(scoreboards.id, id));
    return true;
  } catch (error) {
    console.error('Database query failed for deleteScoreboard:', error);
    throw new Error('Failed to delete scoreboard from Cloud SQL.', { cause: error });
  }
}
