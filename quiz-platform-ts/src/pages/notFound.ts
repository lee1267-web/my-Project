import { renderErrorView } from '../components/errorView.ts';
import { AppError } from '../utils/errors.ts';

export function render(container: HTMLElement): null {
  renderErrorView(container, new AppError('not-found', '요청하신 페이지가 없어요. 주소를 다시 확인해 주세요.'));
  const title = container.querySelector('.state-title');
  if (title) title.textContent = '페이지를 찾을 수 없어요';
  return null;
}
