// 샘플 퀴즈 목록. 새 세트를 만들면 파일을 추가하고 아래 목록에 등록하세요.
// 이 파일은 필요할 때만 불러옵니다(첫 화면 로딩 속도 보호).
import history from './history.js';
import songs from './songs.js';
import idols from './idols.js';

const LIST = [history, songs, idols];

// 데모 모드에서 쓰는 고정 ID (영숫자 20자)
export const demoIdFor = (key) => `Sample${key.replace(/[^A-Za-z0-9]/g, '')}00000000000000000000`.slice(0, 20);

export const SAMPLE_QUIZZES = LIST.map((q) => ({ ...q, isPublic: true, demoId: demoIdFor(q.key) }));
