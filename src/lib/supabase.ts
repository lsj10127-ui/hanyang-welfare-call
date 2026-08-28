import { createClient } from "@supabase/supabase-js";

/**
 * 서버 전용 Supabase 클라이언트.
 *
 * secret 키는 RLS를 우회하므로 절대 브라우저로 내보내면 안 된다.
 * 이 파일은 서버 라우트에서만 import 한다. (환경변수에 NEXT_PUBLIC_ 접두사를 쓰지 않는 이유)
 */
export function getSupabaseClient() {
  const url = process.env.SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;

  if (!url || !secretKey) {
    throw new Error(
      "SUPABASE_URL 또는 SUPABASE_SECRET_KEY가 설정되어 있지 않습니다. .env 파일을 확인해 주세요."
    );
  }

  return createClient(url, secretKey, {
    auth: { persistSession: false },
  });
}

/** welfare_documents 테이블의 한 행 */
export interface WelfareDocument {
  id: string;
  name: string;
  content: string;
  uploaded_at: string;
}

export const DOCUMENTS_TABLE = "welfare_documents";

/** 목록에 쓰는 문서 정보 (본문 제외) */
export type DocumentSummary = Pick<
  WelfareDocument,
  "id" | "name" | "uploaded_at"
>;

/**
 * 저장된 문서 목록을 오래된 것 → 최신 순으로 읽는다.
 *
 * `/api/chat`이 "가장 나중에 나열된 문서가 최신"이라는 규칙(PRD §5)으로 문서 간
 * 충돌을 판단하므로, 정렬 기준을 이 함수 한 곳에 모아 어긋나지 않게 한다.
 */
export async function listDocuments(): Promise<DocumentSummary[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from(DOCUMENTS_TABLE)
    .select("id, name, uploaded_at")
    .order("uploaded_at", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

/**
 * 답변 근거로 쓸 문서를 본문까지 읽는다. 정렬 기준은 `listDocuments`와 같다.
 *
 * 본문은 브라우저로 내려보내지 않고 서버에서만 쓴다. 브라우저가 보낸 문서를 그대로
 * 믿으면 누구든 가짜 "복지 규정"을 넣어 답변을 조작할 수 있기 때문이다.
 */
export async function listDocumentsWithContent(): Promise<WelfareDocument[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from(DOCUMENTS_TABLE)
    .select("id, name, content, uploaded_at")
    .order("uploaded_at", { ascending: true });

  if (error) throw error;
  return data ?? [];
}
