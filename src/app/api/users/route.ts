// src/app/api/users/route.ts

import { NextResponse } from 'next/server';
import { getPool } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const pool = getPool();
    const { searchParams } = new URL(req.url);

    const page = Math.max(1, Number(searchParams.get('page') || '1'));
    const pageSizeRaw = Number(searchParams.get('pageSize') || '20');
    const pageSize = Math.min(Math.max(1, pageSizeRaw), 100); // 1~100 제한

    const school = searchParams.get('school')?.trim();
    const excludeTest = (searchParams.get('excludeTest') || '').toLowerCase();
    const q = searchParams.get('q')?.trim();

    const where: string[] = [];
    const params: any[] = [];

    if (school) {
      // 부분 검색도 허용
      where.push('`school` LIKE ?');
      params.push(`%${school}%`);
    }
    if (excludeTest === '1' || excludeTest === 'true') {
      where.push('`name` NOT LIKE ?');
      params.push('%테스트%');
    }
    if (q) {
      where.push('( `name` LIKE ? OR `email` LIKE ? )');
      params.push(`%${q}%`, `%${q}%`);
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const offset = (page - 1) * pageSize;

    // 총 개수
    const [countRows] = await pool.query<any[]>(
      `SELECT COUNT(*) AS total FROM \`user\` ${whereSql}`,
      params
    );
    const total = countRows?.[0]?.total ?? 0;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    // 데이터 페이지
    const [rows] = await pool.query<any[]>(
      `SELECT * FROM \`user\` ${whereSql} LIMIT ? OFFSET ?`,
      [...params, pageSize, offset]
    );

    // password 제거
    const sanitized = rows.map(({ password, ...rest }) => rest);

    return NextResponse.json({
      success: true,
      data: sanitized,
      page,
      pageSize,
      total,
      totalPages,
    });
  } catch (err: any) {
    console.error('[GET /api/users] error:', err);
    return NextResponse.json(
      { success: false, error: err?.message ?? 'DB error' },
      { status: 500 }
    );
  }
}
