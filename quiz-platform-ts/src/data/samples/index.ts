// 샘플 퀴즈 목록 (70세트 × 50문제). 새 세트를 만들면 파일을 추가하고 아래 목록에 등록하세요.
// 이 파일은 필요할 때만 불러옵니다(첫 화면 로딩 속도 보호).
import { makeOptionOrders, seededRandom, hashSeed } from '../../utils/shuffle.ts';
import type { SampleQuestion, SampleSet } from './helpers.ts';
import history from './history.ts';
import worldhistory from './worldhistory.ts';
import general from './general.ts';
import science from './science.ts';
import capitals from './capitals.ts';
import koreageo from './koreageo.ts';
import spelling from './spelling.ts';
import idioms from './idioms.ts';
import english from './english.ts';
import songs from './songs.ts';
import ballad from './ballad.ts';
import classical from './classical.ts';
import idols from './idols.ts';
import movies from './movies.ts';
import kdrama from './kdrama.ts';
import animation from './animation.ts';
import games from './games.ts';
import football from './football.ts';
import olympics from './olympics.ts';
import math from './math.ts';
import animals from './animals.ts';
import kfood from './kfood.ts';
import proverbs from './proverbs.ts';
import flags from './flags.ts';
import space from './space.ts';
import body from './body.ts';
import baseball from './baseball.ts';
import brands from './brands.ts';
import nonsense from './nonsense.ts';
import slang from './slang.ts';
import worldgeo from './worldgeo.ts';
import people from './people.ts';
import physics from './physics.ts';
import chemistry from './chemistry.ts';
import basketball from './basketball.ts';
import pop from './pop.ts';
import inventions from './inventions.ts';
import dinosaurs from './dinosaurs.ts';
import boardgames from './boardgames.ts';
import heritage from './heritage.ts';
import disney from './disney.ts';
import literature from './literature.ts';
import art from './art.ts';
import myth from './myth.ts';
import philosophy from './philosophy.ts';
import computer from './computer.ts';
import coding from './coding.ts';
import ai from './ai.ts';
import economy from './economy.ts';
import civics from './civics.ts';
import jobs from './jobs.ts';
import chosung from './chosung.ts';
import oxscience from './oxscience.ts';
import oxlife from './oxlife.ts';
import biology from './biology.ts';
import plants from './plants.ts';
import weather from './weather.ts';
import worldfood from './worldfood.ts';
import health from './health.ts';
import nutrition from './nutrition.ts';
import cars from './cars.ts';
import transport from './transport.ts';
import janime from './janime.ts';
import sportsrules from './sportsrules.ts';
import internet from './internet.ts';
import travel from './travel.ts';
import hanja from './hanja.ts';
import instruments from './instruments.ts';
import joseon from './joseon.ts';
import puzzle from './puzzle.ts';

const LIST: SampleSet[] = [
  history, worldhistory, general, science, capitals, koreageo, spelling, idioms, english, songs, ballad,
  classical, idols, movies, kdrama, animation, games, football, olympics, math, animals,
  kfood, proverbs, flags, space, body, baseball, brands, nonsense, slang, worldgeo,
  people, physics, chemistry, basketball, pop, inventions, dinosaurs, boardgames, heritage, disney,
  literature, art, myth, philosophy, computer, coding, ai, economy, civics, jobs, chosung, oxscience, oxlife,
  biology, plants, weather, worldfood, health, nutrition, cars, transport,
  janime, sportsrules, internet, travel, hanja, instruments, joseon, puzzle,
];

// 데모 모드에서 쓰는 고정 ID (영숫자 20자)
export const demoIdFor = (key: string): string => `Sample${key.replace(/[^A-Za-z0-9]/g, '')}00000000000000000000`.slice(0, 20);

// 파일에는 정답을 첫 번째 보기에 적은 문제가 많아서, 저장되는 보기 순서도 세트마다 고정된 시드로 섞어 둡니다.
// (풀 때는 play 화면에서 한 번 더 섞음. 편집·미리보기 화면에서도 "정답은 늘 1번" 패턴이 보이지 않게)
const arrange = (s: SampleSet): SampleQuestion[] => {
  const orders = makeOptionOrders(s.questions, seededRandom(hashSeed(s.key)));
  return s.questions.map((q, i) => {
    const order = orders[i];
    return order ? { ...q, options: order.map((k) => q.options[k]!) } : q;
  });
};

// 샘플 세트 + 공개 여부 + 데모 모드용 고정 ID
export interface SampleQuiz extends SampleSet {
  isPublic: true;
  demoId: string;
}

export const SAMPLE_QUIZZES: SampleQuiz[] = LIST.map((q) => ({ ...q, questions: arrange(q), isPublic: true, demoId: demoIdFor(q.key) }));
