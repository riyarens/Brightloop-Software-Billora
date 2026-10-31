import { createApp } from './app';
import { config } from './config';
import prisma from './config/prisma';

const app = createApp();

const startServer = async () => {
  try {
    // Verify database connection
    await prisma.$connect();
    console.log('✅ PostgreSQL database connected successfully.');

    const server = app.listen(config.port, () => {
      console.log(`🚀 BILLORA Server running in ${config.nodeEnv} mode on port ${config.port}`);
      console.log(`📡 Healthcheck available at: http://localhost:${config.port}/api/health`);
    });

    const shutdown = async (signal: string) => {
      console.log(`\nReceived ${signal}. Shutting down gracefully...`);
      server.close(async () => {
        await prisma.$disconnect();
        console.log('Prisma client disconnected.');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
};

startServer();

