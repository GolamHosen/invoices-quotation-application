import mongoose from "mongoose";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required");
}

const mongoUri = databaseUrl;

// Vercel serverless environments have a restricted Node.js runtime. Some advanced
// DNS features (like custom resolver) aren't available and can cause runtime errors.
// We only attempt custom DNS when the module is explicitly available (local dev).
const mongoDnsServers = process.env.MONGODB_DNS_SERVERS?.split(",")
  .map((server) => server.trim())
  .filter(Boolean);

if (mongoDnsServers?.length) {
  try {
    // Dynamic import to avoid crashing in serverless environments (Vercel)
    // where the 'dns' module may have limited functionality
    const dns = await import("dns");
    dns.setServers(mongoDnsServers);
    console.log("Custom DNS servers configured for MongoDB SRV lookup");
  } catch (err) {
    console.warn(
      "Could not configure custom DNS servers (expected in serverless/Vercel environments):",
      err instanceof Error ? err.message : String(err)
    );
  }
}

/**
 * Cached mongoose connection for serverless environments.
 *
 * In Vercel serverless functions, we cache the Mongoose connection across
 * invocations using a module-level variable. This avoids creating a new
 * connection on every cold start, while still allowing the connection to be
 * reused across warm invocations.
 *
 * The connection is cached globally using globalThis to persist across
 * serverless function instances (warm starts) when running in production
 * (Vercel). In development, we also cache globally so that hot reloads
 * don't create duplicate connections.
 */
let cachedConnection: typeof mongoose | null = null;

const globalForDb = globalThis as typeof globalThis & {
  __mongooseConnection?: typeof mongoose;
};

export async function connectDb() {
  // Return cached connection if available
  if (cachedConnection) {
    // Check if the connection is still active
    if (cachedConnection.connection.readyState === 1) {
      return cachedConnection;
    }
    // If connection state is not connected, reset cache and reconnect
    cachedConnection = null;
    if (globalForDb.__mongooseConnection) {
      globalForDb.__mongooseConnection = undefined;
    }
  }

  // Check global cache (for Vercel warm starts)
  if (globalForDb.__mongooseConnection) {
    const conn = globalForDb.__mongooseConnection;
    if (conn.connection.readyState === 1) {
      cachedConnection = conn;
      return conn;
    }
    // Stale global connection, clear it
    globalForDb.__mongooseConnection = undefined;
  }

  try {
    // Keep Atlas's mongodb+srv URL intact. The driver uses it to discover the
    // current replica-set hosts and to apply the required Atlas connection options.
    const conn = await mongoose.connect(mongoUri, {
      // Connection pool size for serverless: smaller pool to avoid
      // exhausting Atlas free tier connections during concurrent invocations
      maxPoolSize: 10,
      minPoolSize: 0,
      // Reduce server selection timeout to fail fast in serverless
      serverSelectionTimeoutMS: 15000,
      // Socket timeout for long-running queries (e.g., PDF generation)
      socketTimeoutMS: 45000,
      // Heartbeat to detect connection issues
      heartbeatFrequencyMS: 10000,
      // Retry writes on transient errors
      retryWrites: true,
      // Wait queue for operations when all connections are busy
      waitQueueTimeoutMS: 10000,
    });

    console.log("MongoDB connected successfully");

    // Cache the connection both locally and globally for serverless warm starts
    cachedConnection = conn;
    globalForDb.__mongooseConnection = conn;

    // Handle connection events for serverless resilience
    mongoose.connection.on("error", (err) => {
      console.error("MongoDB connection error:", err);
      // Clear caches so next call reconnects
      cachedConnection = null;
      globalForDb.__mongooseConnection = undefined;
    });

    mongoose.connection.on("disconnected", () => {
      console.log("MongoDB disconnected. Will reconnect on next request.");
      // Clear caches so next call reconnects
      cachedConnection = null;
      globalForDb.__mongooseConnection = undefined;
    });

    return conn;
  } catch (err) {
    const hint =
      "MongoDB connection failed. Check the Atlas Network Access allowlist, cluster status, and DATABASE_URL.";
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`${hint} Details: ${message}`);
  }
}

export default mongoose;
