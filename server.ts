import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { requireAuth, optionalAuth, AuthRequest } from './src/middleware/auth.ts';
import { getOrCreateUser } from './src/db/users.ts';
import {
  upsertScoreboardInDb,
  getScoreboardFromDb,
  listScoreboardsFromDb,
  deleteScoreboardFromDb,
} from './src/db/scoreboards.ts';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', database: 'cloudsql-postgresql' });
  });

  // Sync authenticated user
  app.post('/api/auth/sync', requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.user?.uid || !req.user?.email) {
        return res.status(400).json({ error: 'Missing user credentials' });
      }
      const user = await getOrCreateUser(req.user.uid, req.user.email);
      res.json({ success: true, user });
    } catch (error: any) {
      console.error('Error syncing user:', error);
      res.status(500).json({ error: 'Failed to synchronize user profile' });
    }
  });

  // List scoreboards
  app.get('/api/scoreboards', optionalAuth, async (req: AuthRequest, res) => {
    try {
      const userId = req.user?.uid;
      const boards = await listScoreboardsFromDb(userId);
      res.json(boards);
    } catch (error: any) {
      console.error('Failed to list scoreboards:', error);
      res.status(500).json({ error: 'Failed to retrieve scoreboards from Cloud SQL' });
    }
  });

  // Get specific scoreboard by ID (Public for OBS Overlays & Controllers)
  app.get('/api/scoreboards/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const board = await getScoreboardFromDb(id);
      if (!board) {
        return res.status(404).json({ error: 'Scoreboard not found' });
      }
      res.json(board);
    } catch (error: any) {
      console.error('Failed to fetch scoreboard:', error);
      res.status(500).json({ error: 'Failed to retrieve scoreboard from Cloud SQL' });
    }
  });

  // Save / Upsert scoreboard
  app.post('/api/scoreboards', optionalAuth, async (req: AuthRequest, res) => {
    try {
      const board = req.body;
      if (!board || !board.id) {
        return res.status(400).json({ error: 'Invalid scoreboard data: missing ID' });
      }

      const userId = req.user?.uid;
      if (userId && req.user?.email) {
        // Ensure user exists in db
        try {
          await getOrCreateUser(userId, req.user.email);
        } catch (uErr) {
          console.warn('Notice syncing user profile:', uErr);
        }
      }

      const saved = await upsertScoreboardInDb(board, userId);
      res.json({ success: true, board: saved });
    } catch (error: any) {
      console.error('Failed to save scoreboard:', error);
      res.status(500).json({ error: 'Failed to save scoreboard to Cloud SQL' });
    }
  });

  // Delete scoreboard
  app.delete('/api/scoreboards/:id', optionalAuth, async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      await deleteScoreboardFromDb(id);
      res.json({ success: true, id });
    } catch (error: any) {
      console.error('Failed to delete scoreboard:', error);
      res.status(500).json({ error: 'Failed to delete scoreboard from Cloud SQL' });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
