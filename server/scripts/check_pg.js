import knex from 'knex';
import knexConfig from '../../knexfile.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const db = knex(knexConfig.production);
console.log('Client:', db.client.config.client);
console.log('Config:', db.client.config);
console.log('isPg:', db.client.config.client === 'pg' || db.client.config.client === 'postgresql');
process.exit(0);
