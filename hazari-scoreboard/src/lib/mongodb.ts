import { MongoClient } from "mongodb";

declare global {
  // eslint-disable-next-line no-var
  var hazariMongoClientPromise: Promise<MongoClient> | undefined;
}

export default function getMongoClient() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not configured");
  const clientPromise = globalThis.hazariMongoClientPromise ?? new MongoClient(uri).connect();
  if (process.env.NODE_ENV !== "production") globalThis.hazariMongoClientPromise = clientPromise;
  return clientPromise;
}
