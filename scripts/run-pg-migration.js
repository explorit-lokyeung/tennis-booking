#!/usr/bin/env node

import { readFileSync } from 'fs';
import pg from 'pg';

const { Client } = pg;

// Supabase PostgreSQL connection
const client = new Client({
  host: 'aws-0-ap-southeast-1.pooler.supabase.com',
  port: 5432,
  database: 'postgres',
  user: 'postgres.xtinvnccabizaweqyszz',
  password: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh0aW52bmNjYWJpemF3ZXF5c3p6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjQyMjgwMCwiZXhwIjoyMDkxOTk4ODAwfQ.3JN0UtFGPBvvbNiqKU7ie8i6FfDxlgnIUZ_cQbIM50g',
  ssl: { rejectUnauthorized: false }
});

async function runMigration(migrationFile) {

  try {
    console.log('🔌 Connecting to Supabase PostgreSQL...');
    await client.connect();
    console.log('✅ Connected successfully');

    console.log(`🚀 Running migration: ${migrationFile}`);
    const sql = readFileSync(migrationFile, 'utf8');

    // Split SQL into individual statements
    const statements = sql
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);

    for (const statement of statements) {
      if (statement.trim()) {
        console.log(`▶️ Executing: ${statement.slice(0, 100)}...`);
        await client.query(statement);
      }
    }

    console.log('✅ Migration completed successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  } finally {
    await client.end();
  }
}

// Main execution
async function main() {
  const migrationFile = process.argv[2];

  if (!migrationFile) {
    console.error('Usage: node run-pg-migration.js <migration-file>');
    process.exit(1);
  }

  try {
    await runMigration(migrationFile);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}