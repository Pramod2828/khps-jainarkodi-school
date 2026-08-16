const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const { executeSqliteQuery, getSqliteDb } = require('./sqliteDb');

let useSqlite = false;

const mysqlPool = mysql.createPool({
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

// Universal database pool interface (MySQL + Automatic SQLite Fallback)
const pool = {
  query: async (sql, params = []) => {
    if (useSqlite || process.env.DB_TYPE === 'sqlite') {
      return await executeSqliteQuery(sql, params);
    }

    try {
      return await mysqlPool.query(sql, params);
    } catch (err) {
      if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND' || err.code === 'ER_ACCESS_DENIED_ERROR') {
        console.warn(`⚠️ MySQL connection unavailable (${err.message}). Switching to Embedded SQLite Database (No XAMPP required!)...`);
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
    console.log('✅ Embedded SQLite Database connected successfully (Zero XAMPP Dependency).');
    return true;
  }

  try {
    const connection = await mysqlPool.getConnection();
    console.log('✅ MySQL Database connected successfully to', process.env.DB_NAME);
    connection.release();
    return true;
  } catch (error) {
    console.warn('⚠️ MySQL connection unavailable. Switching to Embedded SQLite Database (Zero XAMPP Dependency)...');
    useSqlite = true;
    await getSqliteDb();
    return true;
  }
}

module.exports = {
  pool,
  testConnection
};
