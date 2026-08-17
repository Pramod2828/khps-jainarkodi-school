const sqlite3 = require('sqlite3');
const { open } = require('sqlite-async');
const path = require('path');
const mysql = require('mysql2/promise');
const { migratePostgres } = require('./migratePostgres');

let PgPool = null;
try {
  PgPool = require('pg').Pool;
} catch (e) {}

let useSqlite = false;
let dbDriver = 'mysql'; // 'postgres', 'mysql', or 'sqlite'
let pgPool = null;
let mysqlPool = null;
let sqliteDb = null;
let lastDbError = null;
let migrationPromise = null;

// Dynamic getter for PostgreSQL URL
function getPgUrl() {
  const rawPgUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL || '';
  return rawPgUrl.trim().replace(/^['"]|['"]$/g, '');
}

// Lazy getter for PostgreSQL pool
function getPgPool() {
  const url = getPgUrl();
  if (!url) return null;
  if (!pgPool && PgPool) {
    try {
      dbDriver = 'postgres';
      pgPool = new PgPool({
        connectionString: url,
        ssl: { rejectUnauthorized: false }
      });
      console.log('🔌 Cloud PostgreSQL configuration detected.');
    } catch (err) {
      console.error('⚠️ Failed to initialize PostgreSQL pool:', err.message);
      lastDbError = 'PgPool init error: ' + err.message;
    }
  }
  return pgPool;
}

// Ensure schema migration finishes before queries execute
async function ensurePostgresMigrated() {
  const p = getPgPool();
  if (!p) return;
  if (!migrationPromise) {
    console.log('🔄 Executing Cloud PostgreSQL non-destructive schema migration...');
    migrationPromise = migratePostgres(p).catch(e => {
      console.error('Migration notice:', e.message);
      lastDbError = 'Migration notice: ' + e.message;
    });
  }
  await migrationPromise;
}

// Lazy getter for MySQL pool (Local Dev fallback)
function getMysqlPool() {
  if (!mysqlPool) {
    mysqlPool = mysql.createPool({
      host: process.env.DB_HOST || '127.0.0.1',
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'school_jainarkodi',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      timezone: '+05:30',
      dateStrings: true,
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
    });
  }
  return mysqlPool;
}

// Helper to normalize PostgreSQL $1, $2 placeholders and standard functions from MySQL/SQLite syntax
function convertSqlForPg(sql, params = []) {
  let paramIndex = 1;
  let pgSql = sql
    .replace(/\bNOW\(\)/gi, 'CURRENT_TIMESTAMP')
    .replace(/\bCURDATE\(\)/gi, 'CURRENT_DATE');

  pgSql = pgSql.replace(/\?/g, () => `$${paramIndex++}`);

  const pgParams = params.map(p => {
    if (typeof p === 'string' && /^\d+$/.test(p) && p.length < 10) {
      const num = parseInt(p, 10);
      if (!isNaN(num) && String(num) === p) return num;
    }
    return p;
  });

  return { sql: pgSql, params: pgParams };
}

// Universal database pool interface (Cloud PostgreSQL + MySQL + Automatic SQLite Fallback)
const pool = {
  query: async (sql, params = []) => {
    const activePgPool = getPgPool();

    // 1. Strict PostgreSQL Execution Mode if DATABASE_URL/POSTGRES_URL is configured
    if (activePgPool) {
      await ensurePostgresMigrated();
      try {
        const { sql: pgSql, params: pgParams } = convertSqlForPg(sql, params);
        const res = await activePgPool.query(pgSql, pgParams);
        const rows = res.rows || [];
        const isInsert = sql.trim().toUpperCase().startsWith('INSERT');
        const insertId = isInsert && rows[0] && rows[0].id ? rows[0].id : res.oid;
        return [rows, { insertId, affectedRows: res.rowCount }];
      } catch (err) {
        console.error(`⚠️ Cloud PostgreSQL query error: ${err.message} (SQL: ${sql})`);
        lastDbError = err.message;
        throw err; // Strict mode: throw error, never silently fall back to SQLite when PostgreSQL is configured
      }
    }

    // 2. Embedded SQLite Execution Mode
    if (useSqlite || process.env.DB_TYPE === 'sqlite') {
      return await executeSqliteQuery(sql, params);
    }

    // 3. MySQL Execution Mode (Local Dev fallback)
    try {
      const activeMysql = getMysqlPool();
      return await activeMysql.query(sql, params);
    } catch (err) {
      if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND' || err.code === 'ER_ACCESS_DENIED_ERROR') {
        console.warn(`⚠️ MySQL connection unavailable (${err.message}). Switching to Embedded SQLite Database...`);
        useSqlite = true;
        await getSqliteDb();
        return await executeSqliteQuery(sql, params);
      }
      throw err;
    }
  },

  getConnection: async () => {
    const activePgPool = getPgPool();
    if (activePgPool) {
      await ensurePostgresMigrated();
      const client = await activePgPool.connect();
      return {
        query: async (sql, params) => {
          const { sql: pgSql, params: pgParams } = convertSqlForPg(sql, params);
          const res = await client.query(pgSql, pgParams);
          return [res.rows || []];
        },
        beginTransaction: async () => client.query('BEGIN'),
        commit: async () => client.query('COMMIT'),
        rollback: async () => client.query('ROLLBACK'),
        release: () => client.release()
      };
    }

    if (useSqlite || process.env.DB_TYPE === 'sqlite') {
      const sqliteDb = await getSqliteDb();
      return {
        query: async (sql, params) => executeSqliteQuery(sql, params),
        beginTransaction: async () => {
          try { await sqliteDb.exec('BEGIN TRANSACTION;'); } catch(e){}
        },
        commit: async () => {
          try { await sqliteDb.exec('COMMIT;'); } catch(e){}
        },
        rollback: async () => {
          try { await sqliteDb.exec('ROLLBACK;'); } catch(e){}
        },
        release: () => {}
      };
    }

    try {
      const activeMysql = getMysqlPool();
      return await activeMysql.getConnection();
    } catch (err) {
      useSqlite = true;
      const sqliteDb = await getSqliteDb();
      return {
        query: async (sql, params) => executeSqliteQuery(sql, params),
        beginTransaction: async () => {
          try { await sqliteDb.exec('BEGIN TRANSACTION;'); } catch(e){}
        },
        commit: async () => {
          try { await sqliteDb.exec('COMMIT;'); } catch(e){}
        },
        rollback: async () => {
          try { await sqliteDb.exec('ROLLBACK;'); } catch(e){}
        },
        release: () => {}
      };
    }
  }
};

// SQLite Initialization & Helper
async function getSqliteDb() {
  if (!sqliteDb) {
    const { initSqliteDb } = require('./sqliteDb');
    sqliteDb = await initSqliteDb();
  }
  return sqliteDb;
}

async function executeSqliteQuery(sql, params = []) {
  const db = await getSqliteDb();
  const trimmed = sql.trim().toUpperCase();
  
  if (trimmed.startsWith('SELECT')) {
    const rows = await db.all(sql, params);
    return [rows, []];
  } else if (trimmed.startsWith('INSERT')) {
    const result = await db.run(sql, params);
    return [
      { insertId: result.lastID, affectedRows: result.changes },
      { insertId: result.lastID, affectedRows: result.changes }
    ];
  } else {
    const result = await db.run(sql, params);
    return [
      { affectedRows: result.changes },
      { affectedRows: result.changes }
    ];
  }
}

// Test connection helper
async function testConnection() {
  const activePgPool = getPgPool();
  if (activePgPool) {
    await ensurePostgresMigrated();
    try {
      const client = await activePgPool.connect();
      console.log('✅ Cloud PostgreSQL Database connected successfully.');
      client.release();
      lastDbError = null;
      return true;
    } catch (err) {
      console.error('⚠️ Cloud PostgreSQL connection error:', err.message);
      lastDbError = err.message;
      return false;
    }
  }

  if (useSqlite || process.env.DB_TYPE === 'sqlite') {
    await getSqliteDb();
    console.log('✅ Embedded SQLite Database connected successfully.');
    return true;
  }

  try {
    const activeMysql = getMysqlPool();
    const connection = await activeMysql.getConnection();
    console.log('✅ MySQL Database connected successfully to', process.env.DB_NAME);
    connection.release();
    return true;
  } catch (error) {
    console.warn('⚠️ MySQL connection unavailable. Switching to Embedded SQLite Database...');
    useSqlite = true;
    await getSqliteDb();
    return true;
  }
}

function getDbDriverInfo() {
  const activePgPool = getPgPool();
  if (activePgPool) return 'POSTGRESQL';
  if (useSqlite || process.env.DB_TYPE === 'sqlite') return 'SQLITE_EMBEDDED';
  if (mysqlPool) return 'MYSQL';
  return 'SQLITE_EMBEDDED';
}

function getDbError() {
  return lastDbError;
}

module.exports = {
  pool,
  testConnection,
  getDbDriverInfo,
  getDbError
};
