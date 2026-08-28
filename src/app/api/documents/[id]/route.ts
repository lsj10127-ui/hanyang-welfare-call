import { NextResponse, type NextRequest } from "next/server";
import { DOCUMENTS_TABLE, getSupabaseClient } from "@/lib/supabase";

/**
 * 저장된 복지 문서를 삭제한다.
 *
 * 총무팀이 더 이상 안내하지 않는 제도의 문서를 걷어내는 용도다.
 * 남겨두면 폐지된 제도가 계속 답변 근거로 쓰이기 때문에 실제로 지운다.
 */
export async function DELETE(
  _request: NextRequest,
  context: RouteContext<"/api/documents/[id]">
) {
  const { id } = await context.params;

  if (!id) {
    return NextResponse.json(
      { error: "삭제할 문서를 찾을 수 없습니다." },
      { status: 400 }
    );
  }

  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from(DOCUMENTS_TABLE)
      .delete()
      .eq("id", id)
      .select("id");

    if (error) {
      console.error("문서 삭제 실패:", error);
      return NextResponse.json(
        { error: "문서를 삭제하지 못했습니다. 잠시 후 다시 시도해 주세요." },
        { status: 502 }
      );
    }

    // 이미 지워졌거나 없는 문서를 지웠다고 알리지 않는다.
    if (!data || data.length === 0) {
      return NextResponse.json(
        { error: "이미 삭제되었거나 존재하지 않는 문서입니다." },
        { status: 404 }
      );
    }

    return NextResponse.json({ deletedId: id });
  } catch (error) {
    console.error("문서 삭제 중 오류:", error);
    return NextResponse.json(
      { error: "문서를 삭제하지 못했습니다. 잠시 후 다시 시도해 주세요." },
      { status: 500 }
    );
  }
}
