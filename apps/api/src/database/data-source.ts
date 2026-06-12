import { DataSource } from 'typeorm';
import * as path from 'path';

// dotenv explizit mit absolutem Pfad laden — funktioniert auf Windows + Linux
require('dotenv').config({
  path: path.resolve(__dirname, '../../.env'),
});

// Fallback: auch .env im aktuellen Verzeichnis versuchen
if (!process.env.DATABASE_URL) {
  require('dotenv').config();
}

const dbUrl = process.env.DATABASE_URL;

if (!dbUrl) {
  console.error('❌ DATABASE_URL fehlt in .env!');
  console.error('   Erstelle apps/api/.env mit:');
  console.error('   DATABASE_URL=postgresql://postgres:PASSWORT@localhost:5432/dressa_db');
  process.exit(1);
}

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: dbUrl,
  entities: [
    path.join(__dirname, '../**/*.entity.ts'),
    path.join(__dirname, '../**/*.entity.js'),
  ],
  migrations: [
    path.join(__dirname, './migrations/*.ts'),
    path.join(__dirname, './migrations/*.js'),
  ],
  synchronize: false,
  logging: process.env.NODE_ENV === 'development',
});
