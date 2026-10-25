import { describe, it, expect } from 'vitest';
import { safeImageUrl } from '../../src/utils/safeUrl.ts';
import { fromStored } from '../../src/services/quizModel.ts';

const STORAGE = 'https://firebasestorage.googleapis.com/v0/b/proj.firebasestorage.app/o/quiz-images%2Fu%2Fq%2Fa.png?alt=media&token=x';

describe('이미지 주소 허용 목록', () => {
  it('Firebase Storage 업로드 폴더 주소만 허용', () => {
    expect(safeImageUrl(STORAGE)).toBe(STORAGE);
    expect(safeImageUrl('https://evil.example/track.png')).toBe('');
    expect(safeImageUrl('https://firebasestorage.googleapis.com.evil.example/v0/b/x/o/quiz-images%2F')).toBe('');
    expect(safeImageUrl('https://firebasestorage.googleapis.com/v0/b/x/o/other%2Fa.png')).toBe('');
    expect(safeImageUrl('javascript:alert(1)')).toBe('');
    expect(safeImageUrl('http://localhost/x.png')).toBe('');
    expect(safeImageUrl(123)).toBe('');
  });
  it('에뮬레이터·데모 주소는 해당 모드에서만', () => {
    const emu = 'http://127.0.0.1:9199/v0/b/demo.appspot.com/o/quiz-images%2Fu%2Fq%2Fa.png?alt=media&token=x';
    expect(safeImageUrl(emu)).toBe('');
    expect(safeImageUrl(emu, { emulator: true })).toBe(emu);
    const data = 'data:image/jpeg;base64,/9j/4AAQ';
    expect(safeImageUrl(data)).toBe('');
    expect(safeImageUrl(data, { demo: true })).toBe(data);
    expect(safeImageUrl('data:text/html;base64,PHNjcmlwdD4=', { demo: true })).toBe('');
  });
});

describe('DB 데이터 정리 (규칙을 우회해 들어온 이상한 데이터 방어)', () => {
  it('잘못된 형식의 문제를 고치거나 제외하고, 외부 이미지는 지운다', () => {
    const q = fromStored('id', {
      title: 123, category: 'hack', isPublic: 'yes', playCount: -5, imageUrl: 'https://evil.example/a.png',
      questions: [
        { id: 'a', type: 'text', question: '정상', answer: '답', imageUrl: 'https://evil.example/p.gif', altAnswers: 'x' },
        { id: 'b', type: 'choice', question: 'q', answer: 'x', options: 'notalist' },
        { id: 'c', type: 'choice', question: '정상 객관식', answer: '2', options: ['1', '2', 3] },
        null,
        { type: 'weird', question: '유형 이상', answer: 'ok' },
      ],
    });
    expect(q.title).toBe('123');
    expect(q.category).toBe('etc');
    expect(q.isPublic).toBe(false);
    expect(q.playCount).toBe(0);
    expect(q.imageUrl).toBe('');
    expect(q.questions.map((x) => x.question)).toEqual(['정상', '정상 객관식', '유형 이상']);
    expect(q.questions[0]).toMatchObject({ imageUrl: '', altAnswers: [] });
    expect(q.questions[1].options).toEqual(['1', '2']);
    expect(q.questions[2].type).toBe('text');
    expect(q.questionCount).toBe(3);
  });
  it('questions 가 배열이 아니어도 오류 없이 빈 목록', () => {
    expect(fromStored('id', { questions: 'x' }).questions).toEqual([]);
    expect(fromStored('id', {}).questions).toEqual([]);
  });
});
