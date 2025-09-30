// src/app/api/licenses/route.ts

import { NextResponse } from 'next/server';
import { getPool } from '@/lib/db'; // ← 경로 교정: src/ 하위에 lib/db.ts가 있는 구조

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic'; // (선택) 프리렌더/캐시 방지

export async function GET() {
  try {
    const pool = getPool();

    // 정렬 컬럼이 확실치 않으므로 정렬 없이 제한만 둡니다.
    const [rows] = await pool.query('SELECT * FROM `license` LIMIT 100');

    return NextResponse.json({ success: true, data: rows });
  } catch (err: any) {
    // 서버 콘솔에는 자세히 남기고
    console.error('[GET /api/licenses] error:', err);

    // 클라이언트에는 안전한 메시지만 전달
    return NextResponse.json(
      {
        success: false,
        error: err?.message ?? 'DB error',
      },
      { status: 500 }
    );
  }
}
