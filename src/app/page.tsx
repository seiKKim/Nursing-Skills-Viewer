// src/app/page.tsx
import Link from 'next/link';

export const dynamic = 'force-dynamic';

type ApiEnvelope<T = any[]> = {
  success: boolean;
  data?: T;
  error?: string;
  page?: number;
  pageSize?: number;
  total?: number;
  totalPages?: number;
};

function buildUrl(path: string) {
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3001';
  return new URL(path, base).toString();
}

async function safeGet<T>(path: string): Promise<T> {
  const url = buildUrl(path);
  const res = await fetch(url, { cache: 'no-store' });
  const text = await res.text();
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}\n${text.slice(0, 400)}`);
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`JSON parse failed. Response preview:\n${text.slice(0, 400)}`);
  }
}

function pretty(v: any) {
  if (v == null) return '';
  if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(v)) {
    const d = new Date(v);
    return isNaN(+d) ? v : d.toISOString().replace('T', ' ').slice(0, 19);
  }
  if (typeof v === 'number') return v.toLocaleString();
  return String(v);
}

function SectionCard({
  title,
  description,
  children,
  right,
}: {
  title: string;
  description?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border shadow-sm bg-white/70 dark:bg-neutral-900/70 backdrop-blur-sm p-5 md:p-6">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-semibold tracking-tight">{title}</h2>
          {description && (
            <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{description}</p>
          )}
        </div>
        {right}
      </div>
      {children}
    </section>
  );
}

function StatCard({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="rounded-2xl border bg-white/70 dark:bg-neutral-900/70 backdrop-blur-sm p-4 shadow-sm">
      <div className="text-xs uppercase tracking-wider text-neutral-500 dark:text-neutral-400">{label}</div>
      <div className="mt-2 text-2xl font-bold">{value}</div>
      {hint && <div className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">{hint}</div>}
    </div>
  );
}

function Pill({ text }: { text: string }) {
  return (
    <span className="inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium
                     bg-white/70 dark:bg-neutral-900/70 text-neutral-700 dark:text-neutral-300">
      {text}
    </span>
  );
}

function Table({ rows }: { rows: Record<string, any>[] }) {
  if (!rows || rows.length === 0) {
    return (
      <div className="border rounded-xl p-6 text-sm text-neutral-500 dark:text-neutral-400 bg-white/60 dark:bg-neutral-900/60">
        데이터가 없습니다.
      </div>
    );
  }
  const cols = Object.keys(rows[0]).filter((c) => c !== 'password'); // 안전: password 숨김

  return (
    <div className="overflow-auto rounded-xl border bg-white/60 dark:bg-neutral-900/60">
      <table className="min-w-full text-sm">
        <thead className="sticky top-0 bg-neutral-50/80 dark:bg-neutral-800/80 backdrop-blur-sm">
          <tr>
            {cols.map((c) => (
              <th
                key={c}
                className="px-4 py-3 text-left font-semibold border-b whitespace-nowrap text-neutral-700 dark:text-neutral-200"
              >
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={i}
              className="odd:bg-white/0 even:bg-neutral-50/50 dark:odd:bg-transparent dark:even:bg-neutral-900/20 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/30 transition-colors"
            >
              {cols.map((c) => (
                <td key={c} className="px-4 py-3 border-b align-top text-neutral-800 dark:text-neutral-200">
                  {pretty(row[c])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* 페이지네이션 UI */
function Pagination({
  page,
  totalPages,
  makeHref,
}: {
  page: number;
  totalPages: number;
  makeHref: (p: number) => string;
}) {
  if (totalPages <= 1) return null;

  const windowSize = 5;
  const start = Math.max(1, page - Math.floor(windowSize / 2));
  const end = Math.min(totalPages, start + windowSize - 1);
  const pages: number[] = [];
  for (let p = start; p <= end; p++) pages.push(p);

  return (
    <div className="flex items-center justify-center gap-2 mt-4">
      <Link
        href={makeHref(Math.max(1, page - 1))}
        className="px-3 py-1.5 rounded-lg border text-sm hover:bg-neutral-50 dark:hover:bg-neutral-800"
        aria-disabled={page === 1}
      >
        이전
      </Link>
      {pages.map((p) => (
        <Link
          key={p}
          href={makeHref(p)}
          className={`px-3 py-1.5 rounded-lg border text-sm ${
            p === page
              ? 'bg-indigo-600 border-indigo-600 text-white'
              : 'hover:bg-neutral-50 dark:hover:bg-neutral-800'
          }`}
        >
          {p}
        </Link>
      ))}
      <Link
        href={makeHref(Math.min(totalPages, page + 1))}
        className="px-3 py-1.5 rounded-lg border text-sm hover:bg-neutral-50 dark:hover:bg-neutral-800"
        aria-disabled={page === totalPages}
      >
        다음
      </Link>
    </div>
  );
}

/* ─────────── 페이지 ─────────── */
export default async function Home({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const page = Number(searchParams?.page ?? '1') || 1;
  const pageSize = Number(searchParams?.pageSize ?? '20') || 20;

  // 필터값 추출
  const school = typeof searchParams?.school === 'string' ? searchParams!.school : '';
  const excludeTest = (typeof searchParams?.excludeTest === 'string' ? searchParams!.excludeTest : '').toLowerCase();
  const q = typeof searchParams?.q === 'string' ? searchParams!.q : '';

  // API 호출용 쿼리스트링 구성
  const qs = new URLSearchParams();
  qs.set('page', String(page));
  qs.set('pageSize', String(pageSize));
  if (school) qs.set('school', school);
  if (excludeTest) qs.set('excludeTest', String(excludeTest));
  if (q) qs.set('q', q);

  // API 호출
  const [usersRes, licensesRes] = await Promise.allSettled([
    safeGet<ApiEnvelope>(`/api/users?${qs.toString()}`),
    safeGet<ApiEnvelope>(`/api/licenses`),
  ]);

  // Users 결과
  const usersError =
    usersRes.status === 'rejected'
      ? usersRes.reason?.message ?? '요청 실패'
      : usersRes.value.success
      ? null
      : usersRes.value.error ?? '알 수 없는 오류';

  const users =
    usersRes.status === 'fulfilled' && usersRes.value.success ? (usersRes.value.data as any[]) : [];

  const usersPage = usersRes.status === 'fulfilled' ? usersRes.value.page ?? page : page;
  const usersTotalPages = usersRes.status === 'fulfilled' ? usersRes.value.totalPages ?? 1 : 1;

  // ✅ 총합/표시 범위 계산
  const usersTotal =
    usersRes.status === 'fulfilled' ? usersRes.value.total ?? users.length : users.length;
  const usersStart = usersTotal === 0 ? 0 : (usersPage - 1) * pageSize + 1;
  const usersEnd = Math.min(usersTotal, usersPage * pageSize);

  // Licenses 결과
  const licensesError =
    licensesRes.status === 'rejected'
      ? licensesRes.reason?.message ?? '요청 실패'
      : licensesRes.value.success
      ? null
      : licensesRes.value.error ?? '알 수 없는 오류';

  const licenses =
    licensesRes.status === 'fulfilled' && licensesRes.value.success ? (licensesRes.value.data as any[]) : [];

  const updatedAt = new Date().toLocaleString();

  // page 변경 링크 생성기 (기존 파라미터 유지)
  const makeHref = (p: number) => {
    const u = new URLSearchParams();
    u.set('page', String(p));
    u.set('pageSize', String(pageSize));
    if (school) u.set('school', school);
    if (excludeTest) u.set('excludeTest', String(excludeTest));
    if (q) u.set('q', q);
    return `/?${u.toString()}`;
  };

  return (
    <div className="min-h-dvh bg-gradient-to-b from-indigo-50 via-white to-white dark:from-neutral-950 dark:via-neutral-950 dark:to-neutral-950">
      {/* Hero */}
      <header className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(99,102,241,0.20),transparent_40%),radial-gradient(circle_at_80%_10%,rgba(168,85,247,0.18),transparent_40%)] pointer-events-none" />
        <div className="mx-auto max-w-7xl px-6 pt-10 pb-8 md:pt-14 md:pb-10">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Pill text="Dashboard" />
                <Pill text="Read-only" />
              </div>
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
                Nursing Skills Viewer
              </h1>
              <p className="mt-2 text-neutral-600 dark:text-neutral-400">
                MariaDB 데이터에서&nbsp;
                <span className="font-medium">user</span> / <span className="font-medium">license</span>
                &nbsp;목록을 즉시 확인하세요.
              </p>
            </div>
            <div className="text-xs md:text-sm text-neutral-500 dark:text-neutral-400">
              마지막 갱신&nbsp;·&nbsp;{updatedAt}
            </div>
          </div>

          {/* Stats */}
          <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard
              label="Users"
              value={usersTotal}
              hint={`page ${usersPage}/${usersTotalPages} · 현재 ${usersStart}-${usersEnd}`}
            />
            <StatCard label="Licenses" value={licenses.length} hint="표시된 항목 수" />
            <StatCard label="DB" value="nursing_skills" hint="읽기 전용 뷰" />
            <StatCard label="환경" value="Local 3001" hint="ENV 절대 URL 호출" />
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-7xl px-6 pb-16 space-y-8">
        <SectionCard
          title="사용자 목록"
          description="페이지네이션 + 검색(학교/키워드/테스트 제외) 지원"
          right={<Pill text={usersError ? 'Error' : 'OK'} />}
        >
          {/* ── 검색 폼 (GET) ── */}
          <form action="/" method="GET" className="mb-4 grid grid-cols-1 md:grid-cols-12 gap-2 items-end">
            {/* 페이지는 검색 시 1로 리셋 */}
            <input type="hidden" name="page" value="1" />

            <div className="md:col-span-3">
              <label className="block text-xs mb-1 text-neutral-600 dark:text-neutral-400">School</label>
              <input
                type="text"
                name="school"
                defaultValue={school}
                placeholder="학교명 (부분 검색)"
                className="w-full rounded-lg border px-3 py-2 text-sm bg-white dark:bg-neutral-900"
              />
            </div>

            <div className="md:col-span-4">
              <label className="block text-xs mb-1 text-neutral-600 dark:text-neutral-400">키워드 (name/email)</label>
              <input
                type="text"
                name="q"
                defaultValue={q}
                placeholder="예: 홍길동, test@example.com"
                className="w-full rounded-lg border px-3 py-2 text-sm bg-white dark:bg-neutral-900"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs mb-1 text-neutral-600 dark:text-neutral-400">페이지 크기</label>
              <select
                name="pageSize"
                defaultValue={String(pageSize)}
                className="w-full rounded-lg border px-3 py-2 text-sm bg-white dark:bg-neutral-900"
              >
                {[10, 20, 50, 100].map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2 flex items-center gap-2">
              <input
                id="excludeTest"
                type="checkbox"
                name="excludeTest"
                value="true"
                defaultChecked={excludeTest === 'true' || excludeTest === '1'}
                className="h-4 w-4"
              />
              <label htmlFor="excludeTest" className="text-sm text-neutral-700 dark:text-neutral-300">
                name에 “테스트” 제외
              </label>
            </div>

            <div className="md:col-span-1 flex gap-2">
              <button
                type="submit"
                className="flex-1 md:flex-none px-4 py-2 rounded-lg text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700"
              >
                검색
              </button>
              <Link
                href="/"
                className="hidden md:inline-block px-4 py-2 rounded-lg text-sm font-medium border hover:bg-neutral-50 dark:hover:bg-neutral-800"
              >
                초기화
              </Link>
            </div>
          </form>

          {/* 결과 요약 */}
          {!usersError && (
            <div className="mb-2 text-sm text-neutral-600 dark:text-neutral-400">
              검색 결과: <span className="font-semibold">{usersTotal.toLocaleString()}</span>명
              {usersTotal > 0 && <> · {usersStart}-{usersEnd} 표시</>}
            </div>
          )}

          {/* 결과 테이블 + 페이지네이션 */}
          {usersError ? (
            <pre className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl p-4 whitespace-pre-wrap">
              {usersError}
            </pre>
          ) : (
            <>
              <Table rows={users} />
              <Pagination page={usersPage} totalPages={usersTotalPages} makeHref={makeHref} />
            </>
          )}
        </SectionCard>

        <SectionCard
          title="라이선스 목록"
          description="license 테이블(샘플 출력)."
          right={<Pill text={licensesError ? 'Error' : 'OK'} />}
        >
          {licensesError ? (
            <pre className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl p-4 whitespace-pre-wrap">
              {licensesError}
            </pre>
          ) : (
            <Table rows={licenses} />
          )}
        </SectionCard>
      </main>
    </div>
  );
}
