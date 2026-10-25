import type { UrlOptions } from '../types.ts';

// 화면에 표시해도 되는 이미지 주소인지 검사합니다.
// 보안 규칙은 반복문이 없어 "모든 문제"의 이미지 주소를 검사할 수 없으므로,
// DB 에서 읽은 주소를 화면에 넣기 전에 여기서 한 번 더 거릅니다.
// (외부 추적 서버 주소로 방문자 IP 를 빼내거나, 이상한 주소로 요청을 보내는 것을 막음)

const FIREBASE_STORAGE = /^https:\/\/firebasestorage\.googleapis\.com\/v0\/b\/[a-z0-9._-]+\/o\/quiz-images%2F/;
const EMULATOR_STORAGE = /^http:\/\/127\.0\.0\.1:9199\/v0\/b\/[a-z0-9._-]+\/o\/quiz-images%2F/;
const DEMO_DATA_URL = /^data:image\/(jpeg|png|webp|gif);base64,[A-Za-z0-9+/=]+$/;

export function safeImageUrl(url: unknown, { demo = false, emulator = false }: UrlOptions = {}): string {
  if (typeof url !== 'string' || !url || url.length > 2000) return '';
  if (FIREBASE_STORAGE.test(url)) return url;
  if (emulator && EMULATOR_STORAGE.test(url)) return url;
  if (demo && DEMO_DATA_URL.test(url)) return url;
  return '';
}
