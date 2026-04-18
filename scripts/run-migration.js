#!/usr/bin/env node

import { readFileSync } from 'fs';
import { resolve } from 'path';

const SUPABASE_URL = 'https://xtinvnccabizaweqyszz.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh0aW52bmNjYWJpemF3ZXF5c3p6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjQyMjgwMCwiZXhwIjoyMDkxOTk4ODAwfQ.3JN0UtFGPBvvbNiqKU7ie8i6FfDxlgnIUZ_cQbIM50g';

async function executeSql(sql) {
  // Try direct SQL query endpoint first
  let response = await fetch(`${SUPABASE_URL}/pg/query`, {
    method: 'POST',
    headers: {
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query: sql })
  });

  // If that doesn't work, try the RPC endpoint
  if (!response.ok) {
    console.log('🔄 Trying RPC endpoint...');
    response = await fetch(`${SUPABASE_URL}/rest/v1/rpc`, {
      method: 'POST',
      headers: {
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query: sql })
    });
  }

  if (!response.ok) {
    console.error(`HTTP error! status: ${response.status}`);
    const text = await response.text();
    console.error(text);
    throw new Error(`Failed to execute SQL: ${response.status}`);
  }

  const result = await response.json();
  return result;
}

async function createExecSqlFunction() {
  const createFunctionSql = `
    CREATE OR REPLACE FUNCTION exec_sql(sql text)
    RETURNS json
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
    BEGIN
      EXECUTE sql;
      RETURN '{"ok":true}'::json;
    END;
    $$;
  `;

  try {
    await executeSql(createFunctionSql);
    console.log('✅ exec_sql function created successfully');
  } catch (error) {
    console.log('ℹ️ exec_sql function may already exist, trying to use it directly');
  }
}

async function runMigration(migrationFile) {
  console.log(`🚀 Running migration: ${migrationFile}`);

  const sql = readFileSync(resolve(migrationFile), 'utf8');

  try {
    const result = await executeSql(sql);
    console.log('✅ Migration successful');
    return result;
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  }
}

// Main execution
async function main() {
  const migrationFile = process.argv[2];

  if (!migrationFile) {
    console.error('Usage: node run-migration.js <migration-file>');
    process.exit(1);
  }

  try {
    await createExecSqlFunction();
    await runMigration(migrationFile);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}