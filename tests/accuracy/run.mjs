// 챗봇 답변의 문서 근거 정답률을 측정한다 (PRD §3).
// 실행: npm run test:accuracy
// 개발 서버가 떠 있어야 하며, 질문 1건마다 OpenAI 호출 비용이 발생한다.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const BASE_URL = process.env.ACCURACY_BASE_URL ?? "http://localhost:3001";

const spec = JSON.parse(
  fs.readFileSync(path.join(here, "questions.json"), "utf8")
);
const target = spec.목표정답률 ?? 90;
const cases = spec.cases.filter((c) => c.enabled);
const skipped = spec.cases.length - cases.length;

if (cases.length === 0) {
  console.error("측정할 질문이 없습니다. questions.json에서 enabled를 true로 바꿔 주세요.");
  process.exit(1);
}

/** 답변이 기대 조건을 만족하는지 문자열로 대조한다 (AI 채점을 쓰지 않아 결과가 재현된다). */
function grade(answer, testCase) {
  const missing = (testCase.mustInclude ?? []).filter(
    (needle) => !answer.includes(needle)
  );
  const forbidden = (testCase.mustNotInclude ?? []).filter((needle) =>
    answer.includes(needle)
  );
  return { passed: missing.length === 0 && forbidden.length === 0, missing, forbidden };
}

const results = [];

console.log(`대상 서버: ${BASE_URL}`);
console.log(`측정 질문: ${cases.length}건${skipped > 0 ? ` (꺼진 항목 ${skipped}건 제외)` : ""}\n`);

// 문서가 하나도 없으면 챗봇은 모든 질문에 "안내 가능한 문서가 없습니다"로 답한다.
// 이 상태로 채점하면 정답률 0%가 나오는데, 이는 답변이 틀린 것이 아니라
// 측정 자체가 불가능한 상황이다. 숫자를 내놓아 오해를 만드는 대신 여기서 멈춘다.
try {
  const res = await fetch(`${BASE_URL}/api/documents`);
  const { documents } = await res.json();
  if (documents.length === 0) {
    console.error("측정할 수 없습니다: 서버에 준비된 복지 문서가 없습니다.");
    console.error("총무팀 관리 화면(/admin)에서 복지 문서를 먼저 올려 주세요.");
    process.exit(1);
  }
  console.log(`서버에 준비된 문서: ${documents.length}건\n`);
} catch {
  console.error(`서버에 접속하지 못했습니다. 개발 서버가 켜져 있는지 확인해 주세요: ${BASE_URL}\n`);
  process.exit(1);
}

for (const testCase of cases) {
  let answer = "";
  let requestFailed = false;

  try {
    const res = await fetch(`${BASE_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: testCase.question }),
    });
    const data = await res.json();
    answer = data.answer ?? data.error ?? "";
    if (!res.ok) requestFailed = true;
  } catch (error) {
    answer = String(error);
    requestFailed = true;
  }

  const { passed, missing, forbidden } = requestFailed
    ? { passed: false, missing: ["(요청 실패)"], forbidden: [] }
    : grade(answer, testCase);

  results.push({ ...testCase, answer, passed });

  console.log(`${passed ? "✅" : "❌"} [${testCase.id}] ${testCase.question}`);
  console.log(`   답변: ${answer.replace(/\n/g, " ").slice(0, 120)}`);
  if (!passed) {
    if (missing.length) console.log(`   빠진 표현: ${missing.join(", ")}`);
    if (forbidden.length) console.log(`   들어가면 안 되는 표현: ${forbidden.join(", ")}`);
  }
  console.log("");
}

const passedCount = results.filter((r) => r.passed).length;
const rate = Math.round((passedCount / results.length) * 1000) / 10;

console.log("─".repeat(50));
console.log(`정답률: ${rate}% (${passedCount}/${results.length})  |  목표: ${target}%`);

if (cases.length < 10) {
  console.log(
    `⚠ PRD §3은 질문 10~20개를 요구합니다. 현재 ${cases.length}건이므로 questions.json에 실제 문서 기준 질문을 더 채워 주세요.`
  );
}

if (rate < target) {
  console.log(`❌ 목표 정답률에 미달했습니다.`);
  process.exit(1);
}
console.log("✅ 목표 정답률을 만족합니다.");
