import { renderErrorView } from '../components/errorView.js';
import { AppError } from '../utils/errors.js';

export function render(container) {
  renderErrorView(container, new AppError('not-found', '요청하신 페이지가 없어요. 주소를 다시 확인해 주세요.'));
  container.querySelector('.state-title').textContent = '페이지를 찾을 수 없어요';
  return null;
}
