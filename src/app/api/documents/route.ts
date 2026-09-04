import { NextRequest, NextResponse } from "next/server";
import { DOCUMENTS_TABLE, getSupabaseClient, listDocuments } from "@/lib/supabase";

/** 문서 하나가 가질 수 있는 최대 글자 수. 지나치게 큰 PDF가 저장소를 채우는 것을 막는다. */
const MAX_CONTENT_CHARS = 200000;

/**
 * 저장된 복지 문서 목록을 돌려준다.
 *
 * 본문(content)은 일부러 보내지 않는다. 화면은 "문서가 몇 개 준비됐는지"만 알면 되고,
 * 답변 근거로 쓰는 본문은 서버(`/api/chat`)가 직접 읽는다. 브라우저로 전체 문서를
 * 내려보내면 불필요하게 노출될 뿐 아니라 응답도 무거워진다.
 *
 * 정렬은 오래된 것 → 최신 순이다. `/api/chat`이 "가장 나중에 나열된 문서가 최신"이라는
 * 규칙(PRD §5)으로 문서 간 충돌을 판단하므로, 목록 순서를 그 규칙과 일치시킨다.
 */
export async function GET() {
  try {
    return NextResponse.json({ documents: await listDocuments() });
  } catch (error) {
    console.error("문서 목록 조회 중 오류:", error);
    return NextResponse.json(
      { error: "문서 목록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요." },
      { status: 500 }
    );
  }
}

/**
 * 총무팀이 올린 복지 문서를 저장한다.
 *
 * PDF에서 글자를 뽑는 일은 브라우저에서 끝내고, 여기로는 추출된 텍스트만 넘어온다.
 * (PRD §9 개발 단위 2번에서 정한 방식)
 */
export async function POST(request: NextRequest) {
  // text/plain 등으로 위장한 크로스 사이트 요청(CSRF)을 걸러낸다.
  // 진짜 관리 화면은 fetch로 항상 application/json을 보낸다.
  if (!request.headers.get("content-type")?.includes("application/json")) {
    return NextResponse.json(
      { error: "요청 형식이 올바르지 않습니다." },
      { status: 415 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "요청 형식이 올바르지 않습니다." },
      { status: 400 }
    );
  }

  const { name, content } = (body ?? {}) as {
    name?: unknown;
    content?: unknown;
  };

  const documentName = typeof name === "string" ? name.trim() : "";
  const documentContent = typeof content === "string" ? content.trim() : "";

  if (!documentName) {
    return NextResponse.json(
      { error: "문서 이름이 없습니다." },
      { status: 400 }
    );
  }

  // 글자를 하나도 뽑지 못한 PDF는 저장하지 않는다. (PRD §5 예외 상황 처리 규칙)
  if (!documentContent) {
    return NextResponse.json(
      {
        error:
          "이 문서는 읽을 수 없습니다. 텍스트가 포함된 PDF로 다시 올려주세요.",
      },
      { status: 400 }
    );
  }

  if (documentContent.length > MAX_CONTENT_CHARS) {
    return NextResponse.json(
      {
        error: `문서가 너무 깁니다. ${MAX_CONTENT_CHARS.toLocaleString()}자 이하로 나누어 올려주세요.`,
      },
      { status: 400 }
    );
  }

  try {
    const supabase = getSupabaseClient();
    // 같은 이름의 문서를 다시 올리면 새로 쌓지 않고 교체한다 (PRD §7 문서 갱신).
    // 옛 버전이 남아 있으면 상충하는 두 문서가 함께 답변 근거로 들어가기 때문이다.
    const { data, error } = await supabase
      .from(DOCUMENTS_TABLE)
      .upsert(
        {
          name: documentName,
          content: documentContent,
          uploaded_at: new Date().toISOString(),
        },
        { onConflict: "name" }
      )
      .select("id, name, uploaded_at")
      .single();

    if (error) {
      console.error("문서 저장 실패:", error);
      return NextResponse.json(
        { error: "문서를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요." },
        { status: 502 }
      );
    }

    return NextResponse.json({ document: data }, { status: 201 });
  } catch (error) {
    console.error("문서 저장 중 오류:", error);
    return NextResponse.json(
      { error: "문서를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요." },
      { status: 500 }
    );
  }
}
