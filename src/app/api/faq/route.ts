import { NextRequest, NextResponse } from "next/server";
import { FAQ_TABLE, getSupabaseClient, listFaqQuestions } from "@/lib/supabase";

/** 질문 한 건의 최대 길이. 버튼으로 보여줄 것이므로 짧게 제한한다. */
const MAX_QUESTION_CHARS = 100;
/** 첫 화면에 늘어놓을 수 있는 최대 개수 */
const MAX_QUESTIONS = 12;

/** 자주 묻는 질문 목록을 돌려준다. 직원 화면에서 쓰므로 잠그지 않는다. */
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
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "요청 형식이 올바르지 않습니다." },
      { status: 400 }
    );
  }

  const { question } = (body ?? {}) as { question?: unknown };
  const trimmed = typeof question === "string" ? question.trim() : "";

  if (!trimmed) {
    return NextResponse.json({ error: "질문을 입력해 주세요." }, { status: 400 });
  }
  if (trimmed.length > MAX_QUESTION_CHARS) {
    return NextResponse.json(
      { error: `질문은 ${MAX_QUESTION_CHARS}자 이하로 입력해 주세요.` },
      { status: 400 }
    );
  }

  try {
    const existing = await listFaqQuestions();
    if (existing.length >= MAX_QUESTIONS) {
      return NextResponse.json(
        {
          error: `질문은 최대 ${MAX_QUESTIONS}개까지 등록할 수 있습니다. 기존 질문을 지운 뒤 추가해 주세요.`,
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
      .insert({ question: trimmed })
      .select("id, question, created_at")
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
