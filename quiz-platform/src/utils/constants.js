// 앱 전체에서 공유하는 상수입니다.
// ⚠️ 이 값들을 바꾸면 firestore.rules / storage.rules 의 같은 값도 함께 바꿔야 합니다.

export const LIMITS = {
  titleMax: 100,
  descriptionMax: 500,
  questionMax: 300,
  answerMax: 100,
  optionMax: 100,
  altAnswersMax: 5,
  optionsMin: 2,
  optionsMax: 6,
  questionsMin: 1,
  questionsMax: 100,
  imageMaxBytes: 2 * 1024 * 1024, // 2MB
  tagsMax: 5,
  tagMax: 15,
  pageSize: 12,
};

export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

// 카테고리(대분류)와 세부 분류(장르)
//  - key: DB 에 저장되는 값 (영문, 바꾸면 기존 데이터와 어긋나므로 주의)
//  - label: 화면에 보이는 이름
//  - aliases: 검색어 별칭. 예) "노래"로 검색하면 음악 퀴즈가 나옴
//  - subs: 세부 분류. 예) 음악 > 발라드
const sub = (key, label, aliases = []) => ({ key, label, aliases });

export const CATEGORIES = [
  {
    key: 'general', label: '상식', emoji: '💡', aliases: ['상식', '일반상식', '교양', '퀴즈'],
    subs: [sub('life', '생활 상식'), sub('nonsense', '넌센스', ['난센스']), sub('current', '시사'), sub('food', '음식', ['요리']), sub('brand', '브랜드·로고', ['브랜드', '로고'])],
  },
  {
    key: 'history', label: '역사', emoji: '🏛️', aliases: ['역사', '사회'],
    subs: [sub('korean', '한국사', ['국사']), sub('world', '세계사'), sub('people', '역사 인물', ['인물', '위인'])],
  },
  {
    key: 'music', label: '음악', emoji: '🎵', aliases: ['음악', '노래', '가요', '뮤직', '송', 'music', 'song'],
    subs: [
      sub('ballad', '발라드', ['ballad']), sub('dance', '댄스'), sub('hiphop', '힙합·랩', ['힙합', '랩', 'hiphop']),
      sub('rnb', 'R&B', ['알앤비']), sub('rock', '록·밴드', ['록', '락', '밴드']), sub('trot', '트로트', ['뽕짝']),
      sub('indie', '인디'), sub('ost', 'OST', ['오에스티', '드라마ost']), sub('pop', '팝송', ['팝', 'pop']),
      sub('folk', '동요·민요', ['동요', '민요', '전래동요']), sub('classical', '클래식', ['클래식음악']), sub('jazz', '재즈'),
    ],
  },
  {
    key: 'idol', label: '아이돌·K-POP', emoji: '🎤', aliases: ['아이돌', '케이팝', 'kpop', 'k-pop', '노래', '가요', '가수'],
    subs: [
      sub('gen1', '1세대'), sub('gen2', '2세대'), sub('gen3', '3세대'), sub('gen4', '4세대'), sub('gen5', '5세대'),
      sub('boy', '보이그룹', ['남돌', '보그']), sub('girl', '걸그룹', ['여돌', '걸그']), sub('solo', '솔로 가수', ['솔로']),
    ],
  },
  {
    key: 'movie', label: '영화·드라마', emoji: '🎬', aliases: ['영화', '드라마', '방송', '예능', 'movie', 'drama'],
    subs: [sub('kmovie', '한국 영화'), sub('fmovie', '외국 영화', ['할리우드', '해외영화']), sub('kdrama', '한국 드라마', ['k드라마']), sub('fdrama', '해외 드라마', ['미드']), sub('variety', '예능'), sub('quotes', '명대사')],
  },
  {
    key: 'anime', label: '애니메이션', emoji: '🌟', aliases: ['애니', '애니메이션', '만화', '웹툰', 'anime'],
    subs: [sub('japan', '일본 애니', ['일본애니메이션']), sub('disney', '디즈니·픽사', ['디즈니', '픽사']), sub('korea', '한국 애니'), sub('webtoon', '웹툰'), sub('comics', '만화책')],
  },
  {
    key: 'game', label: '게임', emoji: '🎮', aliases: ['게임', '겜', 'game', '보드게임'],
    subs: [
      sub('rpg', 'RPG', ['알피지', 'mmorpg']), sub('fps', 'FPS·슈팅', ['fps', '슈팅', '총게임']), sub('strategy', '전략', ['rts', 'aos']),
      sub('mobile', '모바일 게임', ['모바일']), sub('console', '닌텐도·콘솔', ['닌텐도', '콘솔', '플스']), sub('esports', 'e스포츠', ['이스포츠', '롤']),
      sub('board', '보드게임'), sub('retro', '고전 게임', ['고전게임', '추억의게임']),
    ],
  },
  {
    key: 'sports', label: '스포츠', emoji: '⚽', aliases: ['스포츠', '운동', '체육', 'sports'],
    subs: [sub('soccer', '축구', ['풋볼']), sub('baseball', '야구'), sub('basketball', '농구'), sub('volleyball', '배구'), sub('olympics', '올림픽'), sub('golf', '골프'), sub('fight', '격투기', ['복싱', 'ufc'])],
  },
  {
    key: 'science', label: '과학', emoji: '🔬', aliases: ['과학', '수학', '자연', 'science'],
    subs: [sub('general', '과학 일반'), sub('physics', '물리'), sub('chemistry', '화학'), sub('biology', '생물'), sub('space', '우주·지구', ['우주', '지구과학']), sub('math', '수학'), sub('nature', '동물·자연', ['동물', '식물'])],
  },
  {
    key: 'geography', label: '지리', emoji: '🗺️', aliases: ['지리', '나라', '여행', '세계'],
    subs: [sub('capitals', '세계 수도', ['수도']), sub('flags', '국기'), sub('korea', '한국 지리', ['우리나라']), sub('world', '세계 지리'), sub('travel', '여행지')],
  },
  {
    key: 'language', label: '언어', emoji: '📚', aliases: ['언어', '국어', '한국어', '말'],
    subs: [sub('spelling', '맞춤법', ['띄어쓰기']), sub('idioms', '사자성어', ['고사성어']), sub('english', '영어', ['영단어', 'english']), sub('proverbs', '속담'), sub('slang', '신조어', ['줄임말'])],
  },
  {
    key: 'etc', label: '기타', emoji: '🧩', aliases: ['기타'],
    subs: [sub('celeb', '연예인'), sub('youtube', '유튜브·인터넷', ['유튜버', '밈']), sub('random', '아무거나')],
  },
];

export const CATEGORY_KEYS = CATEGORIES.map((c) => c.key);

export function getSubcategory(categoryKey, subKey) {
  if (!subKey) return null;
  return CATEGORIES.find((c) => c.key === categoryKey)?.subs.find((x) => x.key === subKey) || null;
}

export function getCategory(key) {
  return CATEGORIES.find((c) => c.key === key) || CATEGORIES[CATEGORIES.length - 1];
}

// 문제 유형. 새 유형(예: 'audio')을 추가하려면 여기에 등록하고
// components/questionEditor.js, pages/play.js, utils/grading.js 를 확장하세요.
export const QUESTION_TYPES = [
  { key: 'text', label: '주관식 (직접 입력)' },
  { key: 'choice', label: '객관식 (보기 선택)' },
];

// Firestore 자동 ID(20자 영숫자) 형식
export const QUIZ_ID_PATTERN = /^[A-Za-z0-9]{20}$/;
