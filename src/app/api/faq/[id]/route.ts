import { NextResponse, type NextRequest } from "next/server";
import { FAQ_TABLE, getSupabaseClient } from "@/lib/supabase";

/** 총무팀이 등록한 자주 묻는 질문을 지운다. */
export async function DELETE(
  _request: NextRequest,
  context: RouteContext<"/api/faq/[id]">
) {
  const { id } = await context.params;

  if (!id) {
    return NextResponse.json(
      { error: "삭제할 질문을 찾을 수 없습니다." },
      { status: 400 }
    );
  }

  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from(FAQ_TABLE)
      .delete()
      .eq("id", id)
      .select("id");

    if (error) {
      console.error("자주 묻는 질문 삭제 실패:", error);
      return NextResponse.json(
        { error: "질문을 삭제하지 못했습니다. 잠시 후 다시 시도해 주세요." },
        { status: 502 }
      );
    }

    // 이미 지워졌거나 없는 질문을 지웠다고 알리지 않는다.
    if (!data || data.length === 0) {
      return NextResponse.json(
        { error: "이미 삭제되었거나 존재하지 않는 질문입니다." },
        { status: 404 }
      );
    }

    return NextResponse.json({ deletedId: id });
  } catch (error) {
    console.error("자주 묻는 질문 삭제 중 오류:", error);
    return NextResponse.json(
      { error: "질문을 삭제하지 못했습니다. 잠시 후 다시 시도해 주세요." },
      { status: 500 }
    );
  }
}
