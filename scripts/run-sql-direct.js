#!/usr/bin/env node

import { execSync } from 'child_process';
import { readFileSync } from 'fs';

const SUPABASE_URL = 'https://xtinvnccabizaweqyszz.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh0aW52bmNjYWJpemF3ZXF5c3p6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjQyMjgwMCwiZXhwIjoyMDkxOTk4ODAwfQ.3JN0UtFGPBvvbNiqKU7ie8i6FfDxlgnIUZ_cQbIM50g';

function runSqlWithCurl(sql) {
  // Escape SQL for shell
  const escapedSql = sql.replace(/'/g, "\\'").replace(/"/g, '\\"');

  const curlCommand = `curl -s -X POST "${SUPABASE_URL}/rest/v1/rpc/exec_sql" \\
    -H "apikey: ${SERVICE_ROLE_KEY}" \\
    -H "Authorization: Bearer ${SERVICE_ROLE_KEY}" \\
    -H "Content-Type: application/json" \\
    -d '{"sql":"${escapedSql}"}'`;

  try {
    const result = execSync(curlCommand, { encoding: 'utf8' });
    return JSON.parse(result);
  } catch (error) {
    console.error('Error executing SQL:', error.message);
    throw error;
  }
}

// Try to create exec_sql function first
console.log('🔧 Creating exec_sql function...');
const createFunctionSql = `CREATE OR REPLACE FUNCTION exec_sql(sql text) RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$ BEGIN EXECUTE sql; RETURN '{"ok":true}'::json; END; $$;`;

try {
  runSqlWithCurl(createFunctionSql);
  console.log('✅ exec_sql function created');
} catch (error) {
  console.log('❌ Failed to create exec_sql function, trying direct approach...');
}

// Run migration
const migrationFile = process.argv[2];
if (!migrationFile) {
  console.error('Usage: node run-sql-direct.js <migration-file>');
  process.exit(1);
}

console.log(`🚀 Running migration: ${migrationFile}`);
const sql = readFileSync(migrationFile, 'utf8');

try {
  const result = runSqlWithCurl(sql);
  console.log('✅ Migration successful:', result);
} catch (error) {
  console.error('❌ Migration failed:', error.message);
  process.exit(1);
}