import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cron from 'node-cron';
import routes from './routes.js';
import { errorHandler } from './middleware.js';
import { db } from './database.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
};

const registerBaseMiddleware = (appInstance) => {
  appInstance.use(cors(corsOptions));
  appInstance.use(express.json());
  appInstance.use(express.urlencoded({ extended: true }));
};

const registerRoutes = (appInstance) => {
  appInstance.use('/api', routes);

  // Health check endpoint
  appInstance.get('/health', (req, res) => {
    res.json({
      status: 'OK',
      message: 'Pastebin API is running',
      timestamp: new Date().toISOString()
    });
  });
};

const registerNotFound = (appInstance) => {
  // 404 handler
  appInstance.use((req, res) => {
    res.status(404).json({
      success: false,
      message: 'Endpoint not found'
    });
  });
};

const registerErrors = (appInstance) => {
  // Error handler (must be last)
  appInstance.use(errorHandler);
};

const scheduleCleanup = () => {
  // Cron job to clean expired pastes every 5 minutes
  cron.schedule('*/5 * * * *', () => {
    const cleaned = db.cleanExpired();
    if (cleaned > 0) {
      console.log(`[CLEANUP] Removed ${cleaned} expired paste(s) at ${new Date().toISOString()}`);
    }
  });
};

const printBanner = () => {
  console.log(`
╔═══════════════════════════════════════════════════════╗
║                                                       ║
║   🚀 Pastebin API Server Running                     ║
║                                                       ║
║   📡 Port: ${PORT}                                     ║
║   🌍 Environment: ${process.env.NODE_ENV || 'development'}                          ║
║   ⏰ Auto-cleanup: Every 5 minutes                    ║
║                                                       ║
║   📝 Endpoints:                                       ║
║   - POST   /api/upload                                ║
║   - GET    /api/paste/:id                             ║
║   - DELETE /api/paste/:id                             ║
║   - GET    /api/stats                                 ║
║   - GET    /health                                    ║
║                                                       ║
╚═══════════════════════════════════════════════════════╝
  `);
};

registerBaseMiddleware(app);
registerRoutes(app);
registerNotFound(app);
registerErrors(app);
scheduleCleanup();

// Start server
const server = app.listen(PORT, () => {
});

const shutdown = (signal) => {
  try {
    console.log(`[SHUTDOWN] Received ${signal}, closing server...`);
    server.close(() => {
      console.log('[SHUTDOWN] Server closed');
      process.exit(0);
    });
  } catch (err) {
    console.error('[SHUTDOWN] Error during shutdown:', err);
    process.exit(1);
  }
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

// Nodemon uses SIGUSR2 for restarts. Close the server first to avoid EADDRINUSE.
process.once('SIGUSR2', () => {
  try {
    console.log('[SHUTDOWN] Received SIGUSR2 (nodemon restart), closing server...');
    server.close(() => {
      console.log('[SHUTDOWN] Server closed for nodemon restart');
      process.kill(process.pid, 'SIGUSR2');
    });
  } catch (err) {
    console.error('[SHUTDOWN] Error during nodemon restart shutdown:', err);
    process.kill(process.pid, 'SIGUSR2');
  }
});

export default app;
