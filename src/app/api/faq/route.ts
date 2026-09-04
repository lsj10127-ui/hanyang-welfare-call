import { NextRequest, NextResponse } from "next/server";
import {
  DEFAULT_FAQ_CATEGORY,
  FAQ_TABLE,
  getSupabaseClient,
  listFaqQuestions,
} from "@/lib/supabase";

/** 질문 한 건의 최대 길이. 버튼으로 보여줄 것이므로 짧게 제한한다. */
const MAX_QUESTION_CHARS = 100;
/** 카테고리 이름의 최대 길이. 버튼으로 보여줄 것이므로 짧게 제한한다. */
const MAX_CATEGORY_CHARS = 20;
/**
 * 카테고리 하나당 늘어놓을 수 있는 최대 개수.
 *
 * 예전에는 전체 질문 수를 12개로 제한했지만, 카테고리별로 나눠서 보여주는
 * 지금 화면 구조에서는 카테고리 하나에 너무 많은 칩이 쌓이는 것만 막으면 된다.
 */
const MAX_QUESTIONS_PER_CATEGORY = 3;

/** 자주 묻는 질문 목록을 돌려준다. 어차피 직원 화면 칩으로 공개될 정보라 잠그지 않는다. */
export async function GET() {
  try {
    return NextResponse.json({ questions: await listFaqQuestions() });
  } catch (error) {
    console.error("자주 묻는 질문 조회 실패:", error);
    return NextResponse.json(
      { error: "질문 목록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요." },
      { status: 502 }
    );
  }
}

/** 총무팀이 자주 묻는 질문을 등록한다. */
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

  const { question, category } = (body ?? {}) as {
    question?: unknown;
    category?: unknown;
  };
  const trimmed = typeof question === "string" ? question.trim() : "";
  const trimmedCategory =
    typeof category === "string" && category.trim()
      ? category.trim()
      : DEFAULT_FAQ_CATEGORY;

  if (!trimmed) {
    return NextResponse.json({ error: "질문을 입력해 주세요." }, { status: 400 });
  }
  if (trimmed.length > MAX_QUESTION_CHARS) {
    return NextResponse.json(
      { error: `질문은 ${MAX_QUESTION_CHARS}자 이하로 입력해 주세요.` },
      { status: 400 }
    );
  }
  if (trimmedCategory.length > MAX_CATEGORY_CHARS) {
    return NextResponse.json(
      { error: `카테고리는 ${MAX_CATEGORY_CHARS}자 이하로 입력해 주세요.` },
      { status: 400 }
    );
  }

  try {
    const existing = await listFaqQuestions();
    const inSameCategory = existing.filter(
      (item) => item.category === trimmedCategory
    );
    if (inSameCategory.length >= MAX_QUESTIONS_PER_CATEGORY) {
      return NextResponse.json(
        {
          error: `"${trimmedCategory}" 카테고리에는 질문을 최대 ${MAX_QUESTIONS_PER_CATEGORY}개까지 등록할 수 있습니다. 기존 질문을 지운 뒤 추가해 주세요.`,
        },
        { status: 400 }
      );
    }
    if (existing.some((item) => item.question === trimmed)) {
      return NextResponse.json(
        { error: "이미 등록된 질문입니다." },
        { status: 409 }
      );
    }

    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from(FAQ_TABLE)
      .insert({ question: trimmed, category: trimmedCategory })
      .select("id, question, category, created_at")
      .single();

    if (error) {
      console.error("자주 묻는 질문 저장 실패:", error);
      return NextResponse.json(
        { error: "질문을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요." },
        { status: 502 }
      );
    }

    return NextResponse.json({ question: data }, { status: 201 });
  } catch (error) {
    console.error("자주 묻는 질문 저장 중 오류:", error);
    return NextResponse.json(
      { error: "질문을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요." },
      { status: 500 }
    );
  }
}
