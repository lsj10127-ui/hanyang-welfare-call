-- FAQ 질문을 카테고리별로 묶어 직원 화면에서 주제를 먼저 고를 수 있게 한다.
alter table public.faq_questions
  add column if not exists category text not null default '기타';
