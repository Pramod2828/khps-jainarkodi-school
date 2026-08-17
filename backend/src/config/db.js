const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const { executeSqliteQuery, getSqliteDb } = require('./sqliteDb');

const { migratePostgres } = require('./migratePostgres');

let PgPool = null;
try {
  PgPool = require('pg').Pool;
} catch (e) {}

let useSqlite = false;
let dbDriver = 'mysql'; // 'postgres', 'mysql', or 'sqlite'
let pgPool = null;
let mysqlPool = null;

// Initialize PostgreSQL pool if DATABASE_URL or POSTGRES_URL is set
const pgUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (pgUrl && PgPool) {
  try {
    dbDriver = 'postgres';
    pgPool = new PgPool({
      connectionString: pgUrl,
      ssl: { rejectUnauthorized: false }
    });
    console.log('🔌 Cloud PostgreSQL configuration detected.');
    migratePostgres(pgUrl).catch(e => console.error('Migration notice:', e.message));
  } catch (err) {
    console.warn('⚠️ Failed to initialize PostgreSQL pool:', err.message);
  }
}

if (!pgPool) {
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

// Helper to normalize PostgreSQL $1, $2 placeholders from ? syntax
function convertSqlForPg(sql, params = []) {
  let paramIndex = 1;
  const convertedSql = sql.replace(/\?/g, () => `$${paramIndex++}`);
  return { sql: convertedSql, params };
}

// Universal database pool interface (Cloud PostgreSQL + MySQL + Automatic SQLite Fallback)
const pool = {
  query: async (sql, params = []) => {
    if (useSqlite || process.env.DB_TYPE === 'sqlite') {
      return await executeSqliteQuery(sql, params);
    }

    if (dbDriver === 'postgres' && pgPool) {
      try {
        const { sql: pgSql, params: pgParams } = convertSqlForPg(sql, params);
        const res = await pgPool.query(pgSql, pgParams);
        const rows = res.rows || [];
        const isInsert = sql.trim().toUpperCase().startsWith('INSERT');
        const insertId = isInsert && rows[0] && rows[0].id ? rows[0].id : res.oid;
        return [rows, { insertId, affectedRows: res.rowCount }];
      } catch (err) {
        console.warn(`⚠️ Cloud PostgreSQL query error (${err.message}). Falling back to Embedded SQLite...`);
        useSqlite = true;
        await getSqliteDb();
        return await executeSqliteQuery(sql, params);
      }
    }

    try {
      return await mysqlPool.query(sql, params);
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

    if (dbDriver === 'postgres' && pgPool) {
      try {
        const client = await pgPool.connect();
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

    try {
      return await mysqlPool.getConnection();
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

// Test connection helper
async function testConnection() {
  if (useSqlite || process.env.DB_TYPE === 'sqlite') {
    await getSqliteDb();
    console.log('✅ Embedded SQLite Database connected successfully.');
    return true;
  }

  if (dbDriver === 'postgres' && pgPool) {
    try {
      const client = await pgPool.connect();
      console.log('✅ Cloud PostgreSQL Database connected successfully.');
      client.release();
      return true;
    } catch (err) {
      console.warn('⚠️ Cloud PostgreSQL unavailable. Switching to Embedded SQLite Database...');
      useSqlite = true;
      await getSqliteDb();
      return true;
    }
  }

  try {
    const connection = await mysqlPool.getConnection();
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
  if (useSqlite || process.env.DB_TYPE === 'sqlite') return 'SQLITE_EMBEDDED';
  if (dbDriver === 'postgres' && pgPool) return 'POSTGRESQL';
  if (mysqlPool) return 'MYSQL';
  return 'SQLITE_EMBEDDED';
}

module.exports = {
  pool,
  testConnection,
  getDbDriverInfo
};
