import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pgConnection = {
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME     || 'hotel_tickets',
  user:     process.env.DB_USER     || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
};

export default {
  development: {
    client: 'pg',
    connection: pgConnection,
    pool: {
      min: 2,
      max: 10,
      acquireTimeoutMillis: 10000,
      afterCreate: (conn, done) => {
        conn.query('SET statement_timeout = 30000;', (err) => done(err, conn));
      }
    },
    migrations: {
      directory: path.resolve(__dirname, 'migrations'),
    },
    seeds: {
      directory: path.resolve(__dirname, 'seeds'),
    }
  },
  test: {
    client: 'sqlite3',
    connection: {
      filename: ':memory:'
    },
    useNullAsDefault: true,
    migrations: {
      directory: path.resolve(__dirname, 'migrations'),
    },
    seeds: {
      directory: path.resolve(__dirname, 'seeds'),
    }
  },
  production: {
    client: 'pg',
    connection: process.env.DATABASE_URL || pgConnection,
    pool: {
      min: 2,
      max: 10,
      acquireTimeoutMillis: 10000,
      afterCreate: (conn, done) => {
        conn.query('SET statement_timeout = 30000;', (err) => done(err, conn));
      }
    },
    migrations: {
      directory: path.resolve(__dirname, 'migrations'),
    },
    seeds: {
      directory: path.resolve(__dirname, 'seeds'),
    }
  },
};
