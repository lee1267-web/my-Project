// 채점 로직. 화면 코드와 분리해 두어 테스트하기 쉽게 만들었습니다.
import type { Answer } from '../types.ts';

// 채점에 필요한 문제 정보만 (Question 전체가 아니어도 됨)
export interface Gradable {
  type: string;
  answer: string;
  altAnswers?: string[];
}

export interface ResultDetail<Q extends Gradable> {
  question: Q;
  userAnswer: Answer;
  skipped: boolean;
  correct: boolean;
}

// 주관식 비교용 정규화: 대소문자, 띄어쓰기, 전각/반각 차이를 무시합니다.
//   "서울 특별시" == "서울특별시",  "BTS" == "bts"
export function normalizeAnswer(value: unknown): string {
  return String(value ?? '')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/\s+/g, '')
    .trim();
}

export const SKIPPED = null; // 건너뛴 문제의 답

export function isCorrect(question: Gradable, userAnswer: Answer | undefined): boolean {
  if (userAnswer === SKIPPED || userAnswer === undefined) return false;
  if (question.type === 'choice') {
    // 객관식은 보기 문장을 정확히 비교합니다(앞뒤 공백만 무시).
    return String(userAnswer).trim() === String(question.answer).trim();
  }
  const given = normalizeAnswer(userAnswer);
  if (!given) return false;
  const accepted = [question.answer, ...(question.altAnswers || [])].map(normalizeAnswer).filter(Boolean);
  return accepted.includes(given);
}

// answers: 문제 순서대로 사용자의 답 (건너뜀은 null)
export function computeResult<Q extends Gradable>(questions: Q[], answers: (Answer | undefined)[]) {
  const details: ResultDetail<Q>[] = questions.map((q, i) => {
    const userAnswer: Answer = answers[i] ?? SKIPPED;
    return {
      question: q,
      userAnswer,
      skipped: userAnswer === SKIPPED,
      correct: isCorrect(q, userAnswer),
    };
  });
  const total = questions.length;
  const correctCount = details.filter((d) => d.correct).length;
  const skippedCount = details.filter((d) => d.skipped).length;
  const wrongCount = total - correctCount; // 건너뛴 문제도 오답으로 셉니다.
  const accuracy = total === 0 ? 0 : Math.round((correctCount / total) * 1000) / 10; // 소수 첫째 자리
  const score = total === 0 ? 0 : Math.round((correctCount / total) * 100); // 100점 만점
  return { total, correctCount, wrongCount, skippedCount, accuracy, score, details };
}
