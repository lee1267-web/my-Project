// 데모 모드 저장소: Firebase 없이 "이 브라우저의 localStorage"에만 저장합니다.
// ⚠️ 다른 브라우저·기기·시크릿 창과 공유되지 않습니다. (실제 공유는 Firebase 모드에서만 가능)
// Firestore 저장소(firestoreRepo.js)와 같은 함수 이름/동작을 갖도록 만들었습니다.
import { fromStored } from './quizModel.ts';
import { randomId } from '../utils/ids.ts';
import { AppError } from '../utils/errors.ts';
import { LIMITS } from '../utils/constants.ts';
import type { PageQuery, Quiz, QuizFields, QuizRepo } from '../types.ts';

// localStorage 에 저장되는 퀴즈 한 개 (날짜는 ISO 문자열)
interface StoredQuiz extends QuizFields {
  ownerUid: string;
  status: string;
  playCount: number;
  createdAt: string;
  updatedAt: string;
}
type StoredMap = Record<string, StoredQuiz>;

export interface SeedItem {
  id: string;
  fields: QuizFields;
}

// localStorage 와 같은 모양의 저장소 (테스트에서는 가짜 저장소를 넘김)
export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const KEY = 'quizbang.demo.quizzes';
const DELETED_KEY = 'quizbang.demo.deleted';
const SEED_VERSION_KEY = 'quizbang.demo.seedVersion';
export const SAMPLE_OWNER = 'sample-owner';
const URL_OPTS = { demo: true }; // 데모 모드는 브라우저에 저장한 data: 이미지만 허용

export function createDemoRepo({ storage = globalThis.localStorage, seed = [], seedVersion = '1' }: { storage?: KeyValueStore | null; seed?: SeedItem[]; seedVersion?: string } = {}): QuizRepo {
  const memory: Record<string, string> = {};
  const store: KeyValueStore = storage || {
    getItem: (k) => memory[k] ?? null,
    setItem: (k, v) => { memory[k] = String(v); },
  };

  function load<T>(key: string, fallback: T): T {
    try {
      const raw = store.getItem(key);
      return raw ? (JSON.parse(raw) as T) : fallback;
    } catch {
      return fallback;
    }
  }
  function save(key: string, value: unknown): void {
    try {
      store.setItem(key, JSON.stringify(value));
    } catch (err) {
      // toAppError 가 code 를 보고 "저장 공간이 가득 찼습니다" 안내로 바꿉니다.
      throw Object.assign(new Error('저장 공간 부족', { cause: err }), { code: 'demo/quota' });
    }
  }

  function all(): StoredMap {
    let data = load<StoredMap | null>(KEY, null);
    // 처음 실행했거나 샘플 퀴즈 내용이 바뀌었으면 샘플을 넣거나 새 내용으로 갱신합니다.
    // (플레이 수와 처음 등록 시각은 유지, 사용자가 만든 퀴즈는 건드리지 않음)
    let version: string | null = null;
    try { version = store.getItem(SEED_VERSION_KEY); } catch { /* 무시 */ }
    if (!data || version !== seedVersion) {
      const map: StoredMap = data || {};
      const now = Date.now();
      seed.forEach((s, i) => {
        const old = map[s.id];
        const at = new Date(now - (i + 1) * 60000).toISOString();
        map[s.id] = {
          ...s.fields, ownerUid: SAMPLE_OWNER, status: 'active',
          playCount: old?.playCount || 0, createdAt: old?.createdAt || at, updatedAt: old ? new Date(now).toISOString() : at,
        };
      });
      save(KEY, map);
      try { store.setItem(SEED_VERSION_KEY, seedVersion); } catch { /* 무시 */ }
      data = map;
    }
    return data;
  }

  const tick = () => new Promise<void>((r) => setTimeout(r, 0)); // 실제 네트워크처럼 비동기로 동작

  return {
    newQuizId: () => randomId(20),

    async getQuiz(id: string, uid?: string | null): Promise<Quiz> {
      await tick();
      const data = all()[id];
      if (!data) {
        if (load<Record<string, string>>(DELETED_KEY, {})[id]) throw new AppError('deleted', '제작자가 삭제한 퀴즈입니다.');
        throw new AppError('not-found', '퀴즈를 찾을 수 없습니다. 데모 모드에서는 이 브라우저에서 만든 퀴즈만 열 수 있습니다.');
      }
      // Firestore 보안 규칙과 같은 조건으로 비공개 퀴즈를 막습니다.
      const visible = (data.isPublic && data.status === 'active') || (uid && data.ownerUid === uid);
      if (!visible) throw new AppError('forbidden', '비공개 퀴즈입니다. 제작자만 볼 수 있습니다.');
      return fromStored(id, data, URL_OPTS);
    },

    async listPublicQuizzes({ category, token, sort = 'latest', cursor = 0, pageSize = LIMITS.pageSize }: PageQuery) {
      await tick();
      const field = sort === 'popular' ? 'playCount' : 'createdAt';
      const list = Object.entries(all())
        .filter(([, q]) => q.isPublic && q.status === 'active')
        .filter(([, q]) => !category || q.category === category)
        .filter(([, q]) => !token || (q.searchTokens || []).includes(token))
        .sort(([, a], [, b]) => {
          const av = field === 'playCount' ? a.playCount : Date.parse(a.createdAt);
          const bv = field === 'playCount' ? b.playCount : Date.parse(b.createdAt);
          return bv - av || Date.parse(b.createdAt) - Date.parse(a.createdAt);
        });
      const start = typeof cursor === 'number' ? cursor : 0;
      const page = list.slice(start, start + pageSize);
      return {
        items: page.map(([id, q]) => fromStored(id, q, URL_OPTS)),
        cursor: start + page.length,
        hasMore: start + page.length < list.length,
      };
    },

    async listMyQuizzes(uid: string) {
      await tick();
      return Object.entries(all())
        .filter(([, q]) => q.ownerUid === uid)
        .map(([id, q]) => fromStored(id, q, URL_OPTS))
        .sort((a, b) => (b.updatedAt?.getTime() ?? 0) - (a.updatedAt?.getTime() ?? 0));
    },

    async createQuiz(id: string, fields: QuizFields, uid: string) {
      await tick();
      const data = all();
      if (data[id]) throw new AppError('unknown', '이미 존재하는 ID 입니다.');
      const now = new Date().toISOString();
      data[id] = { ...fields, ownerUid: uid, status: 'active', playCount: 0, createdAt: now, updatedAt: now };
      save(KEY, data);
      return id;
    },

    async updateQuiz(id: string, fields: QuizFields, uid: string) {
      await tick();
      const data = all();
      const current = data[id];
      if (!current) throw new AppError('not-found', '퀴즈를 찾을 수 없습니다.');
      if (current.ownerUid !== uid) throw new AppError('forbidden', '본인이 만든 퀴즈만 수정할 수 있습니다.');
      data[id] = { ...current, ...fields, updatedAt: new Date().toISOString() };
      save(KEY, data);
    },

    async deleteQuiz(id: string, uid: string) {
      await tick();
      const data = all();
      const current = data[id];
      if (!current) throw new AppError('not-found', '퀴즈를 찾을 수 없습니다.');
      if (current.ownerUid !== uid) throw new AppError('forbidden', '본인이 만든 퀴즈만 삭제할 수 있습니다.');
      delete data[id];
      save(KEY, data);
      const deleted = load<Record<string, string>>(DELETED_KEY, {});
      deleted[id] = new Date().toISOString();
      save(DELETED_KEY, deleted);
    },

    async incrementPlayCount(id: string) {
      await tick();
      const data = all();
      const current = data[id];
      if (!current) return;
      current.playCount = (current.playCount || 0) + 1;
      save(KEY, data);
    },
  };
}
