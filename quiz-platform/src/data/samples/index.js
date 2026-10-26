// 샘플 퀴즈 목록 (70세트 × 50문제). 새 세트를 만들면 파일을 추가하고 아래 목록에 등록하세요.
// 이 파일은 필요할 때만 불러옵니다(첫 화면 로딩 속도 보호).
import { makeOptionOrders, seededRandom, hashSeed } from '../../utils/shuffle.js';
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
import people from './people.js';
import physics from './physics.js';
import chemistry from './chemistry.js';
import basketball from './basketball.js';
import pop from './pop.js';
import inventions from './inventions.js';
import dinosaurs from './dinosaurs.js';
import boardgames from './boardgames.js';
import heritage from './heritage.js';
import disney from './disney.js';
import literature from './literature.js';
import art from './art.js';
import myth from './myth.js';
import philosophy from './philosophy.js';
import computer from './computer.js';
import coding from './coding.js';
import ai from './ai.js';
import economy from './economy.js';
import civics from './civics.js';
import jobs from './jobs.js';
import chosung from './chosung.js';
import oxscience from './oxscience.js';
import oxlife from './oxlife.js';
import biology from './biology.js';
import plants from './plants.js';
import weather from './weather.js';
import worldfood from './worldfood.js';
import health from './health.js';
import nutrition from './nutrition.js';
import cars from './cars.js';
import transport from './transport.js';
import janime from './janime.js';
import sportsrules from './sportsrules.js';
import internet from './internet.js';
import travel from './travel.js';
import hanja from './hanja.js';
import instruments from './instruments.js';
import joseon from './joseon.js';
import puzzle from './puzzle.js';

const LIST = [
  history, worldhistory, general, science, capitals, koreageo, spelling, idioms, english, songs, ballad,
  classical, idols, movies, kdrama, animation, games, football, olympics, math, animals,
  kfood, proverbs, flags, space, body, baseball, brands, nonsense, slang, worldgeo,
  people, physics, chemistry, basketball, pop, inventions, dinosaurs, boardgames, heritage, disney,
  literature, art, myth, philosophy, computer, coding, ai, economy, civics, jobs, chosung, oxscience, oxlife,
  biology, plants, weather, worldfood, health, nutrition, cars, transport,
  janime, sportsrules, internet, travel, hanja, instruments, joseon, puzzle,
];

// 데모 모드에서 쓰는 고정 ID (영숫자 20자)
export const demoIdFor = (key) => `Sample${key.replace(/[^A-Za-z0-9]/g, '')}00000000000000000000`.slice(0, 20);

// 파일에는 정답을 첫 번째 보기에 적은 문제가 많아서, 저장되는 보기 순서도 세트마다 고정된 시드로 섞어 둡니다.
// (풀 때는 play 화면에서 한 번 더 섞음. 편집·미리보기 화면에서도 "정답은 늘 1번" 패턴이 보이지 않게)
const arrange = (s) => {
  const orders = makeOptionOrders(s.questions, seededRandom(hashSeed(s.key)));
  return s.questions.map((q, i) => (orders[i] ? { ...q, options: orders[i].map((k) => q.options[k]) } : q));
};

export const SAMPLE_QUIZZES = LIST.map((q) => ({ ...q, questions: arrange(q), isPublic: true, demoId: demoIdFor(q.key) }));
