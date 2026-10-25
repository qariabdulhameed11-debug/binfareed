import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { env } from './env';

let memoryServer: MongoMemoryServer | null = null;
let isUsingMemoryServer = false;

export async function connectDatabase(): Promise<{ uri: string; isMemory: boolean }> {
  try {
    let mongoUri = env.MONGODB_URI.trim();

    if (mongoose.connection.readyState >= 1) {
      return { uri: mongoUri || 'cached', isMemory: isUsingMemoryServer };
    }

    if (!mongoUri) {
      if (env.NODE_ENV === 'production') {
        throw new Error('CRITICAL: MONGODB_URI environment variable is required in production.');
      }
      console.log('[DB] No MONGODB_URI configured. Starting embedded MongoDB server for local development/testing...');
      memoryServer = await MongoMemoryServer.create();
      mongoUri = memoryServer.getUri();
      isUsingMemoryServer = true;
    }

    mongoose.set('strictQuery', true);
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 10000,
    });

    console.log(`[DB] Connected to MongoDB (${isUsingMemoryServer ? 'Embedded Memory Server' : 'MongoDB Atlas / External Cluster'})`);
    return { uri: mongoUri, isMemory: isUsingMemoryServer };
  } catch (error) {
    console.error('[DB] Database connection error:', error);
    throw error;
  }
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect();
  if (memoryServer) {
    await memoryServer.stop();
    memoryServer = null;
  }
}
