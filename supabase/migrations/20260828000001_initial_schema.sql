-- 한양복지콜 초기 스키마.
-- Docker가 없어 `supabase db pull`로 자동 생성하지 못해, 실제 운영 DB에 조회한
-- 스키마·RLS 상태를 그대로 옮겨 적었다 (2026-08-31 확인).

-- 복지 문서 저장 테이블. 같은 이름(name)으로 다시 올리면 교체되도록 UNIQUE를 건다.
create table if not exists public.welfare_documents (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  content text not null,
  uploaded_at timestamptz not null default now()
);

-- 자주 묻는 질문 테이블. 같은 질문을 중복 등록하지 못하도록 UNIQUE를 건다.
create table if not exists public.faq_questions (
  id uuid primary key default gen_random_uuid(),
  question text not null unique,
  created_at timestamptz not null default now()
);

-- RLS를 켜고 정책은 하나도 만들지 않는다.
-- 정책이 없으면 anon/authenticated 키로는 이 두 테이블에 아무것도 할 수 없다.
-- 서버가 쓰는 SUPABASE_SECRET_KEY(service_role)는 설계상 RLS를 우회하므로,
-- 실제 방어선은 "이 키가 절대 브라우저로 나가지 않는다"는 전제다(src/lib/supabase.ts).
alter table public.welfare_documents enable row level security;
alter table public.faq_questions enable row level security;
