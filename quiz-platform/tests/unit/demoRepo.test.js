import { describe, it, expect, beforeEach } from 'vitest';
import { createDemoRepo } from '../../src/services/demoRepo.js';
import { toEditableFields } from '../../src/services/quizModel.js';

const fields = (over = {}) => toEditableFields({
  title: '테스트 퀴즈', description: '', category: 'general', isPublic: true,
  questions: [{ type: 'text', question: 'q', answer: 'a' }], ...over,
});

let repo;
beforeEach(() => {
  repo = createDemoRepo({ storage: null, seed: [] });
});

describe('데모 저장소 (Firestore 와 같은 동작)', () => {
  it('생성 → 조회', async () => {
    const id = repo.newQuizId();
    await repo.createQuiz(id, fields(), 'u1');
    const q = await repo.getQuiz(id, null);
    expect(q).toMatchObject({ id, title: '테스트 퀴즈', ownerUid: 'u1', playCount: 0, questionCount: 1 });
  });
  it('없는 ID → not-found', async () => {
    await expect(repo.getQuiz('AbCdEfGhIjKlMnOpQrSt', 'u1')).rejects.toMatchObject({ kind: 'not-found' });
  });
  it('비공개 퀴즈는 소유자만 조회', async () => {
    const id = repo.newQuizId();
    await repo.createQuiz(id, fields({ isPublic: false }), 'u1');
    await expect(repo.getQuiz(id, 'u2')).rejects.toMatchObject({ kind: 'forbidden' });
    await expect(repo.getQuiz(id, null)).rejects.toMatchObject({ kind: 'forbidden' });
    expect((await repo.getQuiz(id, 'u1')).isPublic).toBe(false);
    expect((await repo.listPublicQuizzes({})).items).toHaveLength(0);
  });
  it('수정·삭제는 소유자만, 삭제 후에는 deleted', async () => {
    const id = repo.newQuizId();
    await repo.createQuiz(id, fields(), 'u1');
    await expect(repo.updateQuiz(id, fields({ title: '해킹' }), 'u2')).rejects.toMatchObject({ kind: 'forbidden' });
    await repo.updateQuiz(id, fields({ title: '수정됨' }), 'u1');
    expect((await repo.getQuiz(id)).title).toBe('수정됨');
    await expect(repo.deleteQuiz(id, 'u2')).rejects.toMatchObject({ kind: 'forbidden' });
    await repo.deleteQuiz(id, 'u1');
    await expect(repo.getQuiz(id)).rejects.toMatchObject({ kind: 'deleted' });
  });
  it('카테고리·검색·정렬·페이지네이션', async () => {
    for (let i = 0; i < 15; i++) {
      await repo.createQuiz(repo.newQuizId(), fields({ title: `한국사 ${i}`, category: i % 2 ? 'history' : 'general' }), 'u1');
    }
    const p1 = await repo.listPublicQuizzes({ pageSize: 12 });
    expect(p1.items).toHaveLength(12);
    expect(p1.hasMore).toBe(true);
    const p2 = await repo.listPublicQuizzes({ pageSize: 12, cursor: p1.cursor });
    expect(p2.items).toHaveLength(3);
    expect(p2.hasMore).toBe(false);
    expect((await repo.listPublicQuizzes({ category: 'history' })).items.every((q) => q.category === 'history')).toBe(true);
    expect((await repo.listPublicQuizzes({ token: '한국' })).items).toHaveLength(12);
    expect((await repo.listPublicQuizzes({ token: '없음' })).items).toHaveLength(0);
    const target = p1.items[5];
    await repo.incrementPlayCount(target.id);
    await repo.incrementPlayCount(target.id);
    const popular = await repo.listPublicQuizzes({ sort: 'popular' });
    expect(popular.items[0].id).toBe(target.id);
    expect(popular.items[0].playCount).toBe(2);
  });
  it('내 퀴즈 목록은 소유자 것만', async () => {
    await repo.createQuiz(repo.newQuizId(), fields(), 'u1');
    await repo.createQuiz(repo.newQuizId(), fields({ isPublic: false }), 'u1');
    await repo.createQuiz(repo.newQuizId(), fields(), 'u2');
    expect(await repo.listMyQuizzes('u1')).toHaveLength(2);
  });
});
