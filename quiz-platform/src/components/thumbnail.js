import { h } from '../utils/dom.js';
import { getCategory } from '../utils/constants.js';

// 썸네일. 이미지가 없거나 불러오지 못하면 카테고리별 기본 썸네일을 보여줍니다.
export function thumbnail(quiz, className = '') {
  const cat = getCategory(quiz.category);
  const fallback = h('div', { class: `thumb-fallback thumb-${cat.key}`, 'aria-hidden': 'true' },
    h('span', { class: 'thumb-emoji' }, cat.emoji),
  );
  const box = h('div', { class: `thumb ${className}` });
  if (quiz.imageUrl) {
    const img = h('img', { src: quiz.imageUrl, alt: '', loading: 'lazy', decoding: 'async' });
    img.addEventListener('error', () => img.replaceWith(fallback));
    box.append(img);
  } else {
    box.append(fallback);
  }
  return box;
}
