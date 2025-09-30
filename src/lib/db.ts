// src/lib/db.ts

import mysql from 'mysql2/promise';

let pool: mysql.Pool | undefined;

export function getPool() {
  if (!pool) {
    pool = mysql.createPool({
      host: process.env.DB_HOST!,
      port: Number(process.env.DB_PORT ?? 3306),
      user: process.env.DB_USER!,
      password: process.env.DB_PASS!,
      database: process.env.DB_NAME!,
      // 필요 시 SSL 사용 (방화벽이 열려있고 SSL 미요구면 0으로)
      ssl: process.env.DB_SSL === '1' ? { rejectUnauthorized: false } : undefined,

      waitForConnections: true,
      connectionLimit: Number(process.env.DB_CONN_LIMIT ?? 5),
      maxIdle: 5,
      idleTimeout: 60_000,
      connectTimeout: 10_000,
      queueLimit: 0,
    });
  }
  return pool;
}
