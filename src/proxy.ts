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

/** 개발 중 자기 컴퓨터에서 접속하는 경우는 IP 제한에서 항상 허용한다. */
const LOCAL_ADDRESSES = new Set(["127.0.0.1", "::1", "localhost"]);

/** 비밀번호를 요구할 화면 경로 */
const PROTECTED_PAGE = "/admin";
/** 비밀번호를 요구할 API 경로들 (읽기는 제외하고 쓰기만 잠근다) */
const WRITE_PROTECTED_APIS = ["/api/documents", "/api/faq"];

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
 * Vercel은 들어오는 x-forwarded-for 를 자기가 확인한 값으로 덮어쓰기 때문에 위조가 막힌다.
 */
function getClientIp(request: NextRequest): string | null {
  const vercelForwarded = request.headers.get("x-vercel-forwarded-for");
  if (vercelForwarded) {
    const first = vercelForwarded.split(",")[0]?.trim();
    if (first) return first;
  }

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
  const allowed =
    clientIp !== null &&
    (LOCAL_ADDRESSES.has(clientIp) ||
      allowList.some((entry) => matchesIp(clientIp, entry)));

  if (allowed) return null;

  console.warn(`사내망 밖에서의 접속을 차단했습니다: ${clientIp ?? "주소 불명"}`);
  return new NextResponse("이 서비스는 병원 내부망에서만 이용할 수 있습니다.", {
    status: 403,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}

// ────────────────────────────── 관리 화면 보호 ──────────────────────────────

/** 이 요청이 비밀번호를 요구해야 하는 대상인가 */
function needsAdminPassword(request: NextRequest): boolean {
  const { pathname } = request.nextUrl;

  // 관리 화면 전체
  if (pathname === PROTECTED_PAGE || pathname.startsWith(`${PROTECTED_PAGE}/`)) {
    return true;
  }

  // 문서·자주 묻는 질문의 저장과 삭제.
  // 읽기(GET)는 직원 화면이 써야 하고 이름·질문만 나가므로 잠그지 않는다.
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

function checkAdminPassword(request: NextRequest): NextResponse | null {
  if (!needsAdminPassword(request)) return null;

  const expected = process.env.ADMIN_PASSWORD ?? "";

  // 비밀번호가 설정되지 않았으면 열어 두지 않고 막는다.
  // 설정을 빠뜨렸을 때 관리 화면이 조용히 공개되는 쪽이 더 위험하다.
  if (!expected) {
    console.error("ADMIN_PASSWORD가 설정되지 않아 관리 화면을 막았습니다.");
    return new NextResponse(
      "관리자 비밀번호가 설정되지 않았습니다. 서버의 ADMIN_PASSWORD 환경변수를 확인해 주세요.",
      { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } }
    );
  }

  const header = request.headers.get("authorization") ?? "";
  if (!header.startsWith("Basic ")) {
    return requestPassword("총무팀 비밀번호를 입력해 주세요.");
  }

  let decoded = "";
  try {
    decoded = atob(header.slice("Basic ".length));
  } catch {
    return requestPassword("비밀번호를 확인할 수 없습니다.");
  }

  // "아이디:비밀번호" 형식으로 들어온다. 아이디는 쓰지 않으므로 비밀번호만 본다.
  const password = decoded.slice(decoded.indexOf(":") + 1);
  if (password !== expected) {
    console.warn("관리 화면 비밀번호가 틀렸습니다.");
    return requestPassword("비밀번호가 올바르지 않습니다.");
  }

  return null;
}

// ────────────────────────────────── 진입점 ──────────────────────────────────

export function proxy(request: NextRequest) {
  return (
    checkIpAllowed(request) ?? checkAdminPassword(request) ?? NextResponse.next()
  );
}

export const config = {
  // 정적 파일까지 검사할 필요는 없으므로 제외한다.
  matcher: "/((?!_next/static|_next/image|favicon.ico).*)",
};
