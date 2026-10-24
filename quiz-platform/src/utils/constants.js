// 앱 전체에서 공유하는 상수입니다.
// ⚠️ 이 값들을 바꾸면 firestore.rules / storage.rules 의 같은 값도 함께 바꿔야 합니다.

export const LIMITS = {
  titleMax: 100,
  descriptionMax: 500,
  questionMax: 300,
  answerMax: 100,
  optionMax: 100,
  altAnswersMax: 5,
  optionsMin: 2,
  optionsMax: 6,
  questionsMin: 1,
  questionsMax: 100,
  imageMaxBytes: 2 * 1024 * 1024, // 2MB
  pageSize: 12,
};

export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

// key 는 DB 에 저장되는 값, label 은 화면에 보이는 이름입니다.
export const CATEGORIES = [
  { key: 'general', label: '상식', emoji: '💡' },
  { key: 'history', label: '역사', emoji: '🏛️' },
  { key: 'music', label: '음악', emoji: '🎵' },
  { key: 'idol', label: '아이돌·K-POP', emoji: '🎤' },
  { key: 'movie', label: '영화·드라마', emoji: '🎬' },
  { key: 'anime', label: '애니메이션', emoji: '🌟' },
  { key: 'game', label: '게임', emoji: '🎮' },
  { key: 'sports', label: '스포츠', emoji: '⚽' },
  { key: 'science', label: '과학', emoji: '🔬' },
  { key: 'geography', label: '지리', emoji: '🗺️' },
  { key: 'language', label: '언어', emoji: '📚' },
  { key: 'etc', label: '기타', emoji: '🧩' },
];

export const CATEGORY_KEYS = CATEGORIES.map((c) => c.key);

export function getCategory(key) {
  return CATEGORIES.find((c) => c.key === key) || CATEGORIES[CATEGORIES.length - 1];
}

// 문제 유형. 새 유형(예: 'audio')을 추가하려면 여기에 등록하고
// components/questionEditor.js, pages/play.js, utils/grading.js 를 확장하세요.
export const QUESTION_TYPES = [
  { key: 'text', label: '주관식 (직접 입력)' },
  { key: 'choice', label: '객관식 (보기 선택)' },
];

// Firestore 자동 ID(20자 영숫자) 형식
export const QUIZ_ID_PATTERN = /^[A-Za-z0-9]{20}$/;
