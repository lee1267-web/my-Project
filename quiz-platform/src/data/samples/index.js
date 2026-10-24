// 샘플 퀴즈 목록 (31세트 × 50문제). 새 세트를 만들면 파일을 추가하고 아래 목록에 등록하세요.
// 이 파일은 필요할 때만 불러옵니다(첫 화면 로딩 속도 보호).
import history from './history.js';
import worldhistory from './worldhistory.js';
import general from './general.js';
import science from './science.js';
import capitals from './capitals.js';
import koreageo from './koreageo.js';
import spelling from './spelling.js';
import idioms from './idioms.js';
import english from './english.js';
import songs from './songs.js';
import ballad from './ballad.js';
import classical from './classical.js';
import idols from './idols.js';
import movies from './movies.js';
import kdrama from './kdrama.js';
import animation from './animation.js';
import games from './games.js';
import football from './football.js';
import olympics from './olympics.js';
import math from './math.js';
import animals from './animals.js';
import kfood from './kfood.js';
import proverbs from './proverbs.js';
import flags from './flags.js';
import space from './space.js';
import body from './body.js';
import baseball from './baseball.js';
import brands from './brands.js';
import nonsense from './nonsense.js';
import slang from './slang.js';
import worldgeo from './worldgeo.js';

const LIST = [
  history, worldhistory, general, science, capitals, koreageo, spelling, idioms, english, songs, ballad,
  classical, idols, movies, kdrama, animation, games, football, olympics, math, animals,
  kfood, proverbs, flags, space, body, baseball, brands, nonsense, slang, worldgeo,
];

// 데모 모드에서 쓰는 고정 ID (영숫자 20자)
export const demoIdFor = (key) => `Sample${key.replace(/[^A-Za-z0-9]/g, '')}00000000000000000000`.slice(0, 20);

export const SAMPLE_QUIZZES = LIST.map((q) => ({ ...q, isPublic: true, demoId: demoIdFor(q.key) }));
