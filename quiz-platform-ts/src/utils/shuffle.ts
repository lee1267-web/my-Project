// 객관식 보기 순서 섞기
// 만든 사람이 정답을 늘 첫 번째 보기에 넣는 경우가 많아서, 그대로 보여 주면
// "정답은 항상 1번" 같은 패턴이 생깁니다. 풀 때마다 보기 순서를 섞어 이를 없앱니다.

// 시드가 같으면 같은 순서가 나오는 난수 (mulberry32)
export type Random = () => number;

export function seededRandom(seed: number): Random {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let x = a;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

// 문자열 → 32비트 시드 (FNV-1a)
export function hashSeed(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) h = Math.imul(h ^ text.charCodeAt(i), 0x01000193);
  return h >>> 0;
}

function shuffled(indices: number[], rand: Random): number[] {
  const a = [...indices];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

// 문제마다 보기 표시 순서(원래 보기의 번호 배열)를 만듭니다. 주관식은 null.
// 정답 자리는 지금까지 덜 쓰인 자리 가운데에서 무작위로 고르고(한쪽 쏠림 방지),
// 같은 자리가 세 문제 연속 나오지 않게 합니다. 나머지 보기는 무작위로 섞습니다.
// 보기 섞기에 필요한 문제 정보만
export interface Shuffleable {
  type: string;
  answer: string;
  options: string[];
}

export function makeOptionOrders(questions: Shuffleable[], rand: Random): (number[] | null)[] {
  const used: number[] = [];
  const recent: number[] = [];
  return questions.map((q) => {
    if (q.type !== 'choice') return null;
    const answerIdx = q.options.indexOf(q.answer);
    const base = q.options.map((_, i) => i);
    if (answerIdx < 0) return shuffled(base, rand);
    const count = (p: number) => used[p] || 0;
    const blocked = recent.length >= 2 && recent.at(-1) === recent.at(-2) ? recent.at(-1) : -1;
    const open = base.length > 1 ? base.filter((p) => p !== blocked) : base;
    const least = Math.min(...open.map(count));
    const choices = open.filter((p) => count(p) <= least + 1);
    const target = choices[Math.floor(rand() * choices.length)]!;
    const rest = shuffled(base.filter((i) => i !== answerIdx), rand);
    rest.splice(target, 0, answerIdx);
    used[target] = count(target) + 1;
    recent.push(target);
    return rest;
  });
}

// 저장해 둔 순서가 지금 퀴즈와 맞는지 확인 (퀴즈가 바뀌었으면 다시 만들어야 함)
export function validOrders(orders: unknown, questions: Shuffleable[]): orders is (number[] | null)[] {
  if (!Array.isArray(orders) || orders.length !== questions.length) return false;
  return questions.every((q, i) => {
    const o = orders[i];
    if (q.type !== 'choice') return o === null;
    return Array.isArray(o) && o.length === q.options.length
      && [...o].sort((x, y) => x - y).every((v, k) => v === k);
  });
}
