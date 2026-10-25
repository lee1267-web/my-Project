import { h } from '../utils/dom.ts';
import { IS_DEMO, USE_EMULATORS, IS_CONFIG_OK } from '../services/config.ts';

// 데모 모드 / 에뮬레이터 모드일 때 화면 위에 항상 안내를 보여줍니다.
export function renderModeBanner(container: HTMLElement): void {
  if (IS_DEMO) {
    container.append(
      h('div', { class: 'mode-banner mode-demo', role: 'note' },
        h('strong', {}, '데모 모드'),
        ' · 퀴즈가 이 브라우저에만 저장되며 다른 사람·기기와 공유되지 않습니다. 실제 공유는 Firebase 설정 후 가능합니다.',
      ),
    );
  } else if (USE_EMULATORS && IS_CONFIG_OK) {
    container.append(
      h('div', { class: 'mode-banner mode-emulator', role: 'note' },
        h('strong', {}, '로컬 에뮬레이터 모드'),
        ' · 내 컴퓨터의 Firebase Emulator 에 연결되어 있습니다. 테스트 데이터는 실제 서비스에 저장되지 않습니다.',
      ),
    );
  }
}
