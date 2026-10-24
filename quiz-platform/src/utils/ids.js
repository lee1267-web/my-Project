// Firestore 자동 ID 와 같은 형식(영문 대소문자+숫자 20자)의 ID 를 만듭니다.
// 62^20 ≈ 7×10^35 가지라서 충돌 가능성은 사실상 없습니다.
const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

export function randomId(length = 20) {
  const bytes = new Uint8Array(length);
  globalThis.crypto.getRandomValues(bytes);
  let id = '';
  for (let i = 0; i < length; i++) {
    // 248 = 62*4 이므로 이 범위를 넘는 값은 버려서 치우침을 없앱니다.
    let b = bytes[i];
    while (b >= 248) {
      const one = new Uint8Array(1);
      globalThis.crypto.getRandomValues(one);
      b = one[0];
    }
    id += CHARS[b % 62];
  }
  return id;
}
