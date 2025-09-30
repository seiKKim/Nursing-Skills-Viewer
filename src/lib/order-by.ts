// src/lib/order-by.ts

import type { Pool } from 'mysql2/promise';

const CANDIDATES = [
  'id',
  'user_id', 'license_id', 'uid', 'seq',
  'updated_at', 'update_at', 'updatedAt',
  'created_at', 'create_at', 'createdAt',
];

export async function pickOrderColumn(pool: Pool, table: string, schema: string) {
  const placeholders = CANDIDATES.map(() => '?').join(',');
  const [rows] = await pool.query<any[]>(
    `
    SELECT COLUMN_NAME
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME IN (${placeholders})
    `,
    [schema, table, ...CANDIDATES]
  );
  if (!Array.isArray(rows) || rows.length === 0) return null;

  // 후보 우선순위대로 첫 번째 매칭 컬럼 선택
  const names = rows.map(r => r.COLUMN_NAME);
  const found = CANDIDATES.find(c => names.includes(c));
  return found ?? null;
}
