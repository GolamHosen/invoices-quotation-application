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

const globalForDb = globalThis as typeof globalThis & {
  __mongooseConnection?: typeof mongoose;
};

export async function connectDb() {
  if (globalForDb.__mongooseConnection) {
    return globalForDb.__mongooseConnection;
  }

  try {
    // Keep Atlas's mongodb+srv URL intact. The driver uses it to discover the
    // current replica-set hosts and to apply the required Atlas connection options.
    const conn = await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 15000,
    });

    console.log("MongoDB connected successfully");

    if (process.env.NODE_ENV !== "production") {
      globalForDb.__mongooseConnection = conn;
    }

    return conn;
  } catch (err) {
    const hint =
      "MongoDB connection failed. Check the Atlas Network Access allowlist, cluster status, and DATABASE_URL.";
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`${hint} Details: ${message}`);
  }
}

export default mongoose;
