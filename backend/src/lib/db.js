// src/lib/db.js
import mongoose from 'mongoose';

let cached = global._mongooseConn;
if (!cached) cached = global._mongooseConn = { conn: null, promise: null };

export async function connectDB() {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    const uri = process.env.MONGO_URI;
    if (!uri) throw new Error('MONGO_URI missing from env');

    mongoose.set('strictQuery', true);

    cached.promise = mongoose
      .connect(uri, { dbName: process.env.MONGO_DB || 'eco' })
      .then((m) => {
        const { host, name } = m.connection;
        console.log(`✅ MongoDB connected: ${host}/${name}`);
        return m;
      })
      .catch((err) => {
        console.error('❌ MongoDB connection error:', err.message);
        throw err;
      });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}
