import { h, formatDate } from '../utils/dom.js';
import { categoryLabel } from '../utils/constants.js';
import { thumbnail } from './thumbnail.js';

export function quizCard(quiz) {
  return h('li', { class: 'quiz-card-item' },
    h('a', { href: `/quiz/${quiz.id}`, class: 'quiz-card' },
      thumbnail(quiz, 'card-thumb'),
      h('div', { class: 'card-body' },
        h('span', { class: 'badge badge-category' }, categoryLabel(quiz.category, quiz.subcategory)),
        h('h3', { class: 'card-title' }, quiz.title),
        quiz.description ? h('p', { class: 'card-desc' }, quiz.description) : h('p', { class: 'card-desc muted' }, '설명이 없는 퀴즈입니다.'),
        quiz.tags?.length ? h('p', { class: 'tag-list' }, quiz.tags.map((t) => h('span', { class: 'tag' }, `#${t}`))) : null,
        h('p', { class: 'card-meta' },
          h('span', {}, `문제 ${quiz.questionCount}개`),
          h('span', {}, `플레이 ${quiz.playCount.toLocaleString('ko-KR')}회`),
          quiz.createdAt ? h('span', {}, formatDate(quiz.createdAt)) : null,
        ),
      ),
    ),
  );
}

export function skeletonCards(n = 6) {
  return Array.from({ length: n }, () =>
    h('li', { class: 'quiz-card-item', 'aria-hidden': 'true' },
      h('div', { class: 'quiz-card skeleton' },
        h('div', { class: 'thumb card-thumb sk-block' }),
        h('div', { class: 'card-body' },
          h('div', { class: 'sk-line sk-short' }), h('div', { class: 'sk-line' }), h('div', { class: 'sk-line' }),
        ),
      ),
    ),
  );
}
