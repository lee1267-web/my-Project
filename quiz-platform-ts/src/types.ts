// 앱 전체에서 쓰는 데이터 모양(타입) 정의
// JS 버전에서 주석으로만 설명하던 구조를 TypeScript 타입으로 옮겼습니다.

export type QuestionType = 'text' | 'choice';

// 문제 하나 (DB 에 저장되는 모양)
export interface Question {
  id: string;
  type: QuestionType;
  question: string;
  answer: string;
  altAnswers: string[]; // 주관식에서 함께 정답으로 인정하는 답 (객관식은 빈 배열)
  options: string[]; // 객관식 보기 (주관식은 빈 배열)
  imageUrl: string;
  order: number;
}

// 화면·샘플 데이터에서 넘어오는, 아직 정리되지 않은 문제 (id·order 등이 없을 수 있음)
export interface QuestionInput {
  id?: string;
  type: string;
  question?: string;
  answer?: string;
  altAnswers?: string[];
  options?: string[];
  imageUrl?: string;
}

// 퀴즈 작성 폼 / 샘플 퀴즈의 입력 모양
export interface QuizForm {
  title?: string;
  description?: string;
  category?: string;
  subcategory?: string;
  tags?: string[];
  imageUrl?: string;
  isPublic?: boolean;
  questions?: QuestionInput[];
}

// 편집 화면의 상태: 새로 고른 이미지 파일은 아직 업로드 전이라 File 로 들고 있습니다.
export interface EditableQuestion extends QuestionInput {
  imageFile?: File | null;
}

export interface EditorForm extends QuizForm {
  thumbFile?: File | null;
  questions: EditableQuestion[];
}

// 만든 사람이 수정할 수 있는 필드 (DB 저장용)
export interface QuizFields {
  title: string;
  description: string;
  category: string;
  subcategory: string;
  tags: string[];
  imageUrl: string;
  isPublic: boolean;
  questions: Question[];
  questionCount: number;
  searchTokens: string[];
}

// 화면에서 쓰는 퀴즈 (DB 에서 읽어 정리한 결과)
export interface Quiz extends QuizFields {
  id: string;
  status: string;
  ownerUid: string;
  playCount: number;
  createdAt: Date | null;
  updatedAt: Date | null;
}

// 사용자의 답: 입력한 문자열, 건너뛰면 null
export type Answer = string | null;

export type SortKey = 'latest' | 'popular';

// 화면에서 공개 퀴즈 목록을 요청할 때의 조건
export interface ListParams {
  category?: string;
  subcategory?: string;
  search?: string;
  sort?: SortKey;
  cursor?: unknown;
}

// 저장소에 보내는 한 페이지 조회 조건
export interface PageQuery {
  category?: string;
  token?: string; // 검색 토큰 (searchTokens 에 들어 있어야 함)
  sort?: SortKey;
  cursor?: unknown; // 데모: 숫자 위치, Firestore: 마지막 문서
  pageSize?: number;
}

export interface Page {
  items: Quiz[];
  cursor: unknown;
  hasMore: boolean;
}

// 데모 저장소(localStorage)와 Firestore 저장소가 똑같이 따르는 약속
export interface QuizRepo {
  newQuizId(): string;
  getQuiz(id: string, uid?: string | null): Promise<Quiz>;
  listPublicQuizzes(q: PageQuery): Promise<Page>;
  listMyQuizzes(uid: string): Promise<Quiz[]>;
  createQuiz(id: string, fields: QuizFields, uid: string): Promise<string>;
  updateQuiz(id: string, fields: QuizFields, uid: string): Promise<void>;
  deleteQuiz(id: string, uid: string): Promise<void>;
  incrementPlayCount(id: string): Promise<void>;
}

// 이미지 주소 허용 범위 (utils/safeUrl.ts)
export interface UrlOptions {
  demo?: boolean;
  emulator?: boolean;
}
