const fs = require('fs');
const path = require('path');

// Support requiring dependencies installed in backend-core
if (!module.paths.includes(path.join(__dirname, '../backend-core/node_modules'))) {
  module.paths.unshift(path.join(__dirname, '../backend-core/node_modules'));
}

const { Pool } = require('pg');
require('dotenv').config({ path: path.join(__dirname, '../backend-core/.env') });

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/skillforge';

async function runMigrations() {
  console.log('🚀 [SkillForge DB Migrations] Starting database migration runner...');
  console.log(`🔌 Connection: ${connectionString.replace(/:([^:@]+)@/, ':****@')}`);

  const isRemoteDb = connectionString.includes('supabase.co') || connectionString.includes('neon.tech') || connectionString.includes('pooler.supabase.com') || process.env.NODE_ENV === 'production';

  const pool = new Pool({
    connectionString,
    ssl: isRemoteDb ? { rejectUnauthorized: false } : false,
  });

  const client = await pool.connect();

  try {
    // 1. Create migration tracking table
    await client.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // 2. Read migration files
    const migrationsDir = path.join(__dirname, 'migrations');
    const files = fs
      .readdirSync(migrationsDir)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    for (const file of files) {
      const { rows } = await client.query('SELECT name FROM _migrations WHERE name = $1', [file]);
      if (rows.length > 0) {
        console.log(`⏭️  Skipping already executed migration: ${file}`);
        continue;
      }

      console.log(`⏳ Executing migration: ${file}...`);
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf-8');

      await client.query('BEGIN');
      await client.query(sql);
      await client.query('INSERT INTO _migrations (name) VALUES ($1)', [file]);
      await client.query('COMMIT');
      console.log(`✅ Completed migration: ${file}`);
    }

    console.log('🎉 [SkillForge DB Migrations] All migrations executed successfully.');
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('❌ [SkillForge DB Migrations] Migration failed:', err);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

if (require.main === module) {
  runMigrations();
}

module.exports = { runMigrations };
