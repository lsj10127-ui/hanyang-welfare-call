import { NextResponse, type NextRequest } from "next/server";

/**
 * 요청이 화면에 닿기 전에 두 가지를 확인한다.
 *
 * 1. 관리 화면 보호 — 총무팀 전용 화면과 문서 저장·삭제는 비밀번호를 요구한다.
 * 2. 사내망 제한 (선택) — ALLOWED_IPS 에 값이 있으면 그 주소에서만 접속을 허용한다.
 *
 * 직원 화면(`/`)과 질문 기능은 누구나 쓸 수 있다. 안내하는 복지 문서가 공개해도
 * 되는 내용이라는 판단에 따른 것이다. 다만 문서를 올리고 지우는 일은 다른 문제라
 * 관리 쪽만 따로 잠근다.
 */

/** 개발 중(프로덕션이 아닐 때) 자기 컴퓨터에서 접속하는 경우는 IP 제한에서 허용한다. */
const LOCAL_ADDRESSES = new Set(["127.0.0.1", "::1", "localhost"]);

/** 비밀번호를 요구할 화면 경로 */
const PROTECTED_PAGE = "/admin";
/**
 * 문서 API는 읽기(GET)도 관리 화면 전용으로 잠근다. 직원 화면(`/`)은 서버
 * 컴포넌트에서 Supabase를 직접 읽으므로 이 API가 필요 없고, 관리 화면은
 * 브라우저가 캐시해 둔 비밀번호를 자동으로 붙여 보내므로 그대로 동작한다.
 * 반대로 FAQ는 직원 화면의 `ChatPanel`이 브라우저에서 직접 불러와야 하므로
 * 읽기는 열어 두고 쓰기(등록·삭제)만 잠근다.
 */
const FULLY_PROTECTED_APIS = ["/api/documents"];
const WRITE_PROTECTED_APIS = ["/api/faq"];

// ────────────────────────────── 사내망 IP 제한 ──────────────────────────────

function parseAllowList(): string[] {
  return (process.env.ALLOWED_IPS ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

/**
 * 요청을 보낸 실제 클라이언트 IP를 찾는다.
 *
 * ⚠ IP 제한은 Vercel 같은 플랫폼 뒤에서만 실제로 안전하다.
 * IP를 알려 주는 헤더는 보내는 쪽이 마음대로 적을 수 있어서, 아무 방어 없이 믿으면
 * "나는 허용된 IP다"라고 적어 보내는 것만으로 통과된다.
 * Vercel은 들어오는 x-vercel-forwarded-for 를 자기가 확인한 값으로 덮어쓰기 때문에
 * 위조가 막힌다. `x-forwarded-for`/`x-real-ip`는 누구나 마음대로 적을 수 있으므로
 * 프로덕션에서는 신뢰하지 않고, 로컬 개발 환경에서만 폴백으로 허용한다.
 */
function getClientIp(request: NextRequest): string | null {
  const vercelForwarded = request.headers.get("x-vercel-forwarded-for");
  if (vercelForwarded) {
    const first = vercelForwarded.split(",")[0]?.trim();
    if (first) return first;
  }

  if (process.env.NODE_ENV === "production") return null;

  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return request.headers.get("x-real-ip")?.trim() || null;
}

function ipv4ToNumber(ip: string): number | null {
  const parts = ip.split(".");
  if (parts.length !== 4) return null;

  let result = 0;
  for (const part of parts) {
    const value = Number(part);
    if (!Number.isInteger(value) || value < 0 || value > 255) return null;
    result = result * 256 + value;
  }
  return result;
}

/** IP가 허용 목록의 한 항목(단일 주소 또는 CIDR 대역)에 드는지 판단한다. */
function matchesIp(ip: string, allowed: string): boolean {
  if (!allowed.includes("/")) return ip === allowed;

  const [range, bitsText] = allowed.split("/");
  const bits = Number(bitsText);
  if (!Number.isInteger(bits) || bits < 0 || bits > 32) return false;

  const ipNumber = ipv4ToNumber(ip);
  const rangeNumber = ipv4ToNumber(range);
  if (ipNumber === null || rangeNumber === null) return false;

  const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
  return (ipNumber & mask) === (rangeNumber & mask);
}

function checkIpAllowed(request: NextRequest): NextResponse | null {
  const allowList = parseAllowList();
  // 허용 목록이 비어 있으면 제한 기능을 쓰지 않는 것으로 본다.
  if (allowList.length === 0) return null;

  const clientIp = getClientIp(request);
  const isLocalDev =
    process.env.NODE_ENV !== "production" &&
    clientIp !== null &&
    LOCAL_ADDRESSES.has(clientIp);
  const allowed =
    isLocalDev ||
    (clientIp !== null && allowList.some((entry) => matchesIp(clientIp, entry)));

  if (allowed) return null;

  console.warn(`사내망 밖에서의 접속을 차단했습니다: ${clientIp ?? "주소 불명"}`);
  return new NextResponse("이 서비스는 병원 내부망에서만 이용할 수 있습니다.", {
    status: 403,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}

// ──────────────────────── 다른 사이트발 쓰기 요청 차단(CSRF) ────────────────────────

/**
 * 관리 화면 쓰기 요청이 다른 사이트에서 브라우저를 통해 흘러들어온 것인지 확인한다.
 *
 * HTTP Basic 인증은 쿠키가 아니라서 SameSite 보호를 받지 못한다. 총무팀이 `/admin`에
 * 로그인된 상태로 악성 페이지를 열면, 그 페이지가 `enctype="text/plain"` 폼으로 문서
 * 저장·삭제 API를 대신 호출할 수 있다 — 브라우저가 캐시해 둔 비밀번호를 자동으로 붙여서.
 * 브라우저는 이런 크로스 오리진 상태 변경 요청에 Origin 헤더를 반드시 붙이므로,
 * 이 오리진이 우리 사이트와 다르면 막는다. Origin이 아예 없으면 브라우저가 아닌
 * 요청(curl 등)이므로 비밀번호 검사에 맡긴다.
 */
function checkSameOrigin(request: NextRequest): NextResponse | null {
  if (!needsAdminPassword(request)) return null;
  if (request.method === "GET" || request.method === "HEAD") return null;

  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) {
    console.warn(`다른 출처에서 온 쓰기 요청을 차단했습니다: ${origin}`);
    return new NextResponse("허용되지 않은 요청입니다.", {
      status: 403,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
  return null;
}

// ──────────────────────── 질문 API 남용 방지(레이트 리밋) ────────────────────────

/**
 * `/api/chat`은 인증 없이 누구나 부를 수 있는 공개 엔드포인트라, 요청을 무제한으로
 * 반복하면 OpenAI 비용이 무방비로 소진된다. IP별로 1분에 일정 횟수만 허용한다.
 *
 * 메모리 기반이라 서버(함수 인스턴스)가 여러 개면 완벽히 공유되지 않지만,
 * 이 앱 규모에서는 무방비보다 훨씬 나은 완화책이다.
 */
const CHAT_RATE_LIMIT = new Map<string, { count: number; windowStart: number }>();
const CHAT_MAX_REQUESTS = 10;
const CHAT_WINDOW_MS = 60 * 1000;

function checkChatRateLimit(request: NextRequest): NextResponse | null {
  if (request.method !== "POST") return null;
  if (!request.nextUrl.pathname.startsWith("/api/chat")) return null;

  const ip = getClientIp(request) ?? "unknown";
  const now = Date.now();
  const entry = CHAT_RATE_LIMIT.get(ip);

  if (!entry || now - entry.windowStart >= CHAT_WINDOW_MS) {
    CHAT_RATE_LIMIT.set(ip, { count: 1, windowStart: now });
    return null;
  }

  if (entry.count >= CHAT_MAX_REQUESTS) {
    console.warn(`/api/chat 요청이 많아 잠시 제한했습니다: ${ip}`);
    return new NextResponse(
      "질문이 너무 잦습니다. 잠시 후 다시 시도해 주세요.",
      { status: 429, headers: { "Content-Type": "text/plain; charset=utf-8" } }
    );
  }

  entry.count += 1;
  return null;
}

// ────────────────────────────── 관리 화면 보호 ──────────────────────────────

/**
 * 관리 화면 비밀번호 실패 횟수를 IP별로 기록한다. 서버(함수 인스턴스)가 재시작되면
 * 초기화되고, 인스턴스가 여러 개면 완벽히 공유되지 않는다 — 그래도 무방비보다는
 * 훨씬 낫고, 이 앱 규모에서는 충분한 완화책이다.
 */
const FAILED_ATTEMPTS = new Map<string, { count: number; lockedUntil: number }>();
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000;

function isLockedOut(key: string): boolean {
  const entry = FAILED_ATTEMPTS.get(key);
  if (!entry) return false;
  if (Date.now() >= entry.lockedUntil) {
    FAILED_ATTEMPTS.delete(key);
    return false;
  }
  return entry.count >= MAX_ATTEMPTS;
}

function recordFailure(key: string): void {
  const entry = FAILED_ATTEMPTS.get(key) ?? { count: 0, lockedUntil: 0 };
  entry.count += 1;
  entry.lockedUntil = Date.now() + LOCKOUT_MS;
  FAILED_ATTEMPTS.set(key, entry);
}

function recordSuccess(key: string): void {
  FAILED_ATTEMPTS.delete(key);
}

/** 이 요청이 비밀번호를 요구해야 하는 대상인가 */
function needsAdminPassword(request: NextRequest): boolean {
  const { pathname } = request.nextUrl;

  // 관리 화면 전체
  if (pathname === PROTECTED_PAGE || pathname.startsWith(`${PROTECTED_PAGE}/`)) {
    return true;
  }

  // 문서 API는 읽기(GET 포함) 전체가 관리 화면 전용이다.
  if (FULLY_PROTECTED_APIS.some((prefix) => pathname.startsWith(prefix))) {
    return true;
  }

  // 자주 묻는 질문은 등록·삭제(쓰기)만 잠근다. 질문 목록 자체는 직원 화면 칩으로
  // 공개될 정보라 읽기는 열어 둔다.
  if (
    request.method !== "GET" &&
    WRITE_PROTECTED_APIS.some((prefix) => pathname.startsWith(prefix))
  ) {
    return true;
  }

  return false;
}

/** 브라우저 로그인 창을 띄우는 응답 */
function requestPassword(message: string): NextResponse {
  return new NextResponse(message, {
    status: 401,
    headers: {
      // 이 헤더가 있어야 브라우저가 아이디·비밀번호 입력창을 띄운다.
      // HTTP 헤더 값에는 한글을 넣을 수 없으므로 realm은 영문으로 적는다.
      "WWW-Authenticate": 'Basic realm="Welfare Admin", charset="UTF-8"',
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}

/**
 * 두 문자열이 같은지, 걸리는 시간이 값에 따라 달라지지 않는 방식으로 비교한다.
 *
 * 일반적인 `===` 비교는 첫 번째로 다른 문자에서 바로 멈추기 때문에, 이론적으로는
 * 응답 시간 차이로 비밀번호를 한 글자씩 알아낼 수 있다. 두 값을 해시로 바꿔
 * 비교하면 원래 문자열 길이나 내용과 무관하게 항상 같은 시간이 걸린다.
 */
async function equalsSafely(a: string, b: string): Promise<boolean> {
  const enc = new TextEncoder();
  const [ha, hb] = await Promise.all([
    crypto.subtle.digest("SHA-256", enc.encode(a)),
    crypto.subtle.digest("SHA-256", enc.encode(b)),
  ]);
  const va = new Uint8Array(ha);
  const vb = new Uint8Array(hb);
  let diff = 0;
  for (let i = 0; i < va.length; i++) diff |= va[i] ^ vb[i];
  return diff === 0;
}

async function checkAdminPassword(
  request: NextRequest
): Promise<NextResponse | null> {
  if (!needsAdminPassword(request)) return null;

  const clientIp = getClientIp(request) ?? "unknown";

  // 최근에 5번 넘게 틀렸으면 비밀번호를 맞게 보내도 15분간 거절한다.
  // 무차별 대입(사전 공격)으로 짧은 시간에 수많은 비밀번호를 시도하는 것을 막는다.
  if (isLockedOut(clientIp)) {
    console.warn(`관리 화면 비밀번호 시도가 많아 잠갔습니다: ${clientIp}`);
    return new NextResponse(
      "비밀번호를 여러 번 틀려 잠시 접근이 제한됩니다. 15분 후 다시 시도해 주세요.",
      { status: 429, headers: { "Content-Type": "text/plain; charset=utf-8" } }
    );
  }

  const expected = process.env.ADMIN_PASSWORD ?? "";

  // 비밀번호가 설정되지 않았으면 열어 두지 않고 막는다.
  // 설정을 빠뜨렸을 때 관리 화면이 조용히 공개되는 쪽이 더 위험하다.
  if (!expected) {
    console.error("ADMIN_PASSWORD가 설정되지 않아 관리 화면을 막았습니다.");
    return new NextResponse(
      "현재 이용할 수 없습니다.",
      { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } }
    );
  }

  const header = request.headers.get("authorization") ?? "";
  if (!header.startsWith("Basic ")) {
    return requestPassword("총무팀 비밀번호를 입력해 주세요.");
  }

  let decoded = "";
  try {
    const bytes = Uint8Array.from(atob(header.slice("Basic ".length)), (c) =>
      c.charCodeAt(0)
    );
    // atob은 UTF-8을 모르고 바이트를 그대로 문자로 되돌리므로, 한글 등이 섞인
    // 비밀번호가 항상 불일치로 판정되지 않도록 TextDecoder로 다시 해석한다.
    decoded = new TextDecoder().decode(bytes);
  } catch {
    return requestPassword("비밀번호를 확인할 수 없습니다.");
  }

  // "아이디:비밀번호" 형식으로 들어온다. 아이디는 쓰지 않으므로 비밀번호만 본다.
  const password = decoded.slice(decoded.indexOf(":") + 1);
  if (!(await equalsSafely(password, expected))) {
    recordFailure(clientIp);
    console.warn(`관리 화면 비밀번호가 틀렸습니다: ${clientIp}`);
    return requestPassword("비밀번호가 올바르지 않습니다.");
  }

  recordSuccess(clientIp);
  return null;
}

// ────────────────────────────────── 진입점 ──────────────────────────────────

export async function proxy(request: NextRequest) {
  return (
    checkIpAllowed(request) ??
    checkSameOrigin(request) ??
    (await checkAdminPassword(request)) ??
    checkChatRateLimit(request) ??
    NextResponse.next()
  );
}

export const config = {
  // 정적 파일까지 검사할 필요는 없으므로 제외한다.
  matcher: "/((?!_next/static|_next/image|favicon.ico).*)",
};
