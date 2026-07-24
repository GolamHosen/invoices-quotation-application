import mongoose from "mongoose";

const mongoUri = process.env.DATABASE_URL;

let dnsConfigured = false;

/**
 * Configure custom DNS servers for MongoDB SRV lookup (local dev only).
 * Runs once and caches the result.
 */
async function configureDns() {
  if (dnsConfigured) return;
  dnsConfigured = true;

  const mongoDnsServers = process.env.MONGODB_DNS_SERVERS?.split(",")
    .map((server) => server.trim())
    .filter(Boolean);

  if (mongoDnsServers?.length) {
    try {
      const dns = await import("dns");
      dns.setServers(mongoDnsServers);
    } catch {
      // Expected in serverless/Vercel environments
    }
  }
}

/**
 * Cached mongoose connection for serverless environments.
 *
 * We cache the connection both module-locally and on globalThis so that:
 * - Development hot reloads don't create duplicate connections
 * - Vercel warm starts can reuse the connection
 */
let cachedConnection: typeof mongoose | null = null;

const globalForDb = globalThis as typeof globalThis & {
  __mongooseConnection?: typeof mongoose;
};

export async function connectDb() {
  if (!mongoUri) {
    throw new Error("DATABASE_URL environment variable is not set. Check your .env.local file.");
  }

  // Fast path: return cached connection if it's still alive
  if (cachedConnection?.connection.readyState === 1) {
    return cachedConnection;
  }

  // Check global cache (Vercel warm starts)
  if (globalForDb.__mongooseConnection?.connection.readyState === 1) {
    cachedConnection = globalForDb.__mongooseConnection;
    return cachedConnection;
  }

  // Clear stale references
  cachedConnection = null;
  globalForDb.__mongooseConnection = undefined;

  // Configure DNS once
  await configureDns();

  try {
    const conn = await mongoose.connect(mongoUri, {
      // Lean connection pool for serverless
      maxPoolSize: 10,
      minPoolSize: 1,
      // Aggressive timeouts for fast failure — don't block the UI
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000,
      socketTimeoutMS: 30000,
      // Faster heartbeat to detect dead connections
      heartbeatFrequencyMS: 10000,
      // Retry writes on transient errors
      retryWrites: true,
      // Don't wait too long for a connection from the pool
      waitQueueTimeoutMS: 5000,
    });

    // Cache the connection
    cachedConnection = conn;
    globalForDb.__mongooseConnection = conn;

    // Handle connection events for resilience
    mongoose.connection.on("error", () => {
      cachedConnection = null;
      globalForDb.__mongooseConnection = undefined;
    });

    mongoose.connection.on("disconnected", () => {
      cachedConnection = null;
      globalForDb.__mongooseConnection = undefined;
    });

    return conn;
  } catch (err) {
    cachedConnection = null;
    globalForDb.__mongooseConnection = undefined;
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(
      `MongoDB connection failed. Check Atlas Network Access allowlist, cluster status, and DATABASE_URL. Details: ${message}`
    );
  }
}

export default mongoose;
