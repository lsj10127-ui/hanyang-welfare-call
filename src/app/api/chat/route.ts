import { NextRequest, NextResponse } from "next/server";

const MAX_CONTEXT_CHARS = 60000;

interface ChatDocument {
  name: string;
  text: string;
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "서버에 OPENAI_API_KEY가 설정되어 있지 않습니다. .env 파일을 확인해 주세요.",
      },
      { status: 500 }
    );
  }

  const body = await request.json();
  const question =
    typeof body.question === "string" ? body.question.trim() : "";
  const documents: ChatDocument[] = Array.isArray(body.documents)
    ? body.documents
    : [];

  if (!question) {
    return NextResponse.json({ error: "질문을 입력해 주세요." }, { status: 400 });
  }
  if (documents.length === 0) {
    return NextResponse.json(
      { error: "현재 안내 가능한 문서가 없습니다. 총무팀에 문의해 주세요." },
      { status: 400 }
    );
  }

  // 문서는 업로드된 순서대로 전달되며, 목록 마지막 문서가 가장 최근에 올라온 문서다.
  let context = documents
    .map((doc) => `[문서: ${doc.name}]\n${doc.text}`)
    .join("\n\n---\n\n");

  let truncated = false;
  if (context.length > MAX_CONTEXT_CHARS) {
    context = context.slice(0, MAX_CONTEXT_CHARS);
    truncated = true;
  }

  const systemPrompt = `당신은 "한양복지콜"이라는 총무팀 복지 안내 챗봇입니다. 아래 규칙을 반드시 지키세요.
1. 업로드된 문서에 있는 내용만 근거로 답변하고, 문서에 없는 내용은 절대 추측하지 않습니다. 문서에 없는 내용이면 "문서에 없습니다."라고만 답하고, 총무팀 연락처 등 다른 안내는 덧붙이지 않습니다.
2. 날짜·기한·금액 등 숫자가 포함된 정보는 문서에 적힌 표현 그대로만 전달하고, 임의로 요약하거나 다른 값으로 바꿔 말하지 않습니다.
3. 복지와 무관한 질문을 받으면 "복지 관련 질문만 답변할 수 있습니다."라고만 답하고, 다른 답변은 하지 않습니다.
4. 문서마다 서로 다른 내용이 있으면, [문서 내용]에 가장 나중에 나열된(가장 최근에 업로드된) 문서를 기준으로 답변합니다.
5. 항상 정중한 한국어 존댓말을 사용합니다.`;

  const userPrompt = `[문서 내용]\n${context}${
    truncated ? "\n\n(문서 내용이 길어 일부만 표시되었습니다.)" : ""
  }\n\n[질문]\n${question}`;

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.2,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenAI API error:", errorText);
      return NextResponse.json(
        { error: "일시적인 오류로 답변할 수 없습니다. 잠시 후 다시 시도해 주세요." },
        { status: 502 }
      );
    }

    const data = await response.json();
    const answer: string =
      data.choices?.[0]?.message?.content?.trim() ?? "답변을 생성하지 못했습니다.";

    return NextResponse.json({ answer });
  } catch (error) {
    console.error("Chat API request failed:", error);
    return NextResponse.json(
      { error: "일시적인 오류로 답변할 수 없습니다. 잠시 후 다시 시도해 주세요." },
      { status: 500 }
    );
  }
}
