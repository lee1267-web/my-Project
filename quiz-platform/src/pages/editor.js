// 퀴즈 만들기(/create) 와 수정하기(/edit/:id) 화면
import { h, clear, setTitle } from '../utils/dom.js';
import { CATEGORIES, CATEGORY_KEYS, LIMITS, QUESTION_TYPES, IMAGE_TYPES, getCategory, getSubcategory, categoryLabel } from '../utils/constants.js';
import { validateQuiz, validateImageFile, parseAltAnswers, parseTags } from '../utils/validation.js';
import { getQuiz, saveQuiz, newQuizId } from '../services/quizService.js';
import { ensureSignedIn } from '../services/auth.js';
import { isImageUploadEnabled } from '../services/storageService.js';
import { IS_DEMO } from '../services/config.js';
import { showToast } from '../components/toast.js';
import { confirmDialog } from '../components/modal.js';
import { AppError, toAppError } from '../utils/errors.js';
import { randomId } from '../utils/ids.js';

const DRAFT_PREFIX = 'quizbang.draft.';
let keySeq = 0;
const nextKey = () => `q${++keySeq}`;

function newQuestion(type = 'text') {
  return {
    key: nextKey(),
    id: randomId(8),
    type,
    question: '',
    answer: '',
    altText: '',
    options: type === 'choice' ? ['', '', '', ''] : [],
    correctIndex: -1,
    imageUrl: '',
    imageFile: null,
    imagePreview: '',
  };
}

function emptyForm() {
  return { title: '', description: '', category: '', subcategory: '', tagsText: '', isPublic: true, imageUrl: '', thumbFile: null, thumbPreview: '', questions: [newQuestion('text')] };
}

function formFromQuiz(quiz) {
  return {
    title: quiz.title,
    description: quiz.description,
    category: quiz.category,
    subcategory: quiz.subcategory || '',
    tagsText: (quiz.tags || []).join(', '),
    isPublic: quiz.isPublic,
    imageUrl: quiz.imageUrl,
    thumbFile: null,
    thumbPreview: '',
    questions: quiz.questions.map((q) => ({
      ...newQuestion(q.type),
      id: q.id || randomId(8),
      question: q.question,
      answer: q.answer,
      altText: (q.altAnswers || []).join(', '),
      options: q.type === 'choice' ? [...q.options] : [],
      correctIndex: q.type === 'choice' ? q.options.indexOf(q.answer) : -1,
      imageUrl: q.imageUrl || '',
    })),
  };
}

// 화면 상태 → 저장/검증용 데이터
function toSubmit(form) {
  return {
    title: form.title,
    description: form.description,
    category: form.category,
    subcategory: form.subcategory || '',
    tags: parseTags(form.tagsText),
    isPublic: form.isPublic,
    imageUrl: form.imageUrl,
    thumbFile: form.thumbFile,
    questions: form.questions.map((q) => ({
      id: q.id,
      type: q.type,
      question: q.question,
      answer: q.type === 'choice' ? String(q.options[q.correctIndex] ?? '').trim() : q.answer,
      altAnswers: q.type === 'text' ? parseAltAnswers(q.altText) : [],
      options: q.type === 'choice' ? q.options : [],
      imageUrl: q.imageUrl,
      imageFile: q.imageFile,
    })),
  };
}

// 임시 저장은 이 브라우저(localStorage)에만 합니다. 이미지 파일은 저장되지 않습니다.
function readDraft(key) {
  try {
    const raw = localStorage.getItem(DRAFT_PREFIX + key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
function writeDraft(key, form) {
  const data = {
    savedAt: new Date().toISOString(),
    form: {
      ...form, thumbFile: null, thumbPreview: '',
      questions: form.questions.map((q) => ({ ...q, imageFile: null, imagePreview: '' })),
    },
  };
  localStorage.setItem(DRAFT_PREFIX + key, JSON.stringify(data));
}
function removeDraft(key) {
  try { localStorage.removeItem(DRAFT_PREFIX + key); } catch { /* 무시 */ }
}

export async function render(container, ctx) {
  const editId = ctx.params.id || null;
  const draftKey = editId ? `edit.${editId}` : 'new';
  let existing = null;

  container.append(h('div', { class: 'container page-loading' }, h('p', { class: 'loading-text' }, '퀴즈를 불러오는 중...')));
  if (editId) {
    existing = await getQuiz(editId);
    const uid = await ensureSignedIn();
    if (ctx.isStale()) return null;
    if (existing.ownerUid !== uid) throw new AppError('forbidden', '본인이 만든 퀴즈만 수정할 수 있습니다.');
  }
  clear(container);
  setTitle(editId ? '퀴즈 수정' : '퀴즈 만들기');

  let form = existing ? formFromQuiz(existing) : emptyForm();
  // 홈에서 보던 분류로 들어온 경우 미리 채움 (/create?cat=music&sub=ballad)
  if (!existing && CATEGORY_KEYS.includes(ctx.query.cat)) {
    form.category = ctx.query.cat;
    if (getSubcategory(form.category, ctx.query.sub)) form.subcategory = ctx.query.sub;
  }
  let dirty = false;
  let saving = false;
  let pendingQuizId = null;
  const imagesEnabled = isImageUploadEnabled();
  const objectUrls = new Set();
  const markDirty = () => { dirty = true; };

  // ── 공통 도우미 ──
  const errorSlot = (path) => h('p', { class: 'field-error', 'data-error-for': path, id: `err-${path.replace(/\./g, '-')}`, role: 'alert', hidden: true });
  const counter = (input, max) => {
    const el = h('span', { class: 'counter', 'aria-hidden': 'true' });
    const update = () => {
      const n = input.value.length; // 보안 규칙과 같은 방식(이모지는 2글자)
      el.textContent = `${n}/${max}`;
      el.classList.toggle('over', n > max);
    };
    input.addEventListener('input', update);
    update();
    return el;
  };
  const makeObjectUrl = (file) => {
    const url = URL.createObjectURL(file);
    objectUrls.add(url);
    return url;
  };

  // ── 기본 정보 ──
  const titleInput = h('input', { id: 'f-title', class: 'input', type: 'text', maxlength: String(LIMITS.titleMax + 20), placeholder: '예) 한국사 핵심 인물 퀴즈', value: form.title, 'aria-describedby': 'err-title', required: true });
  titleInput.addEventListener('input', () => { form.title = titleInput.value; markDirty(); });
  const descInput = h('textarea', { id: 'f-desc', class: 'input textarea', rows: '3', maxlength: String(LIMITS.descriptionMax + 50), placeholder: '어떤 퀴즈인지 간단히 소개해 주세요.', 'aria-describedby': 'err-description' });
  descInput.value = form.description;
  descInput.addEventListener('input', () => { form.description = descInput.value; markDirty(); });
  const catSelect = h('select', { id: 'f-category', class: 'select', 'aria-describedby': 'err-category', required: true },
    h('option', { value: '' }, '카테고리를 선택하세요'),
    CATEGORIES.map((c) => h('option', { value: c.key, selected: form.category === c.key }, `${c.emoji} ${c.label}`)),
  );
  catSelect.addEventListener('change', () => {
    form.category = catSelect.value;
    form.subcategory = ''; // 카테고리가 바뀌면 세부 분류를 다시 고르게 함
    renderSubOptions();
    markDirty();
  });

  // 세부 분류(장르): 고른 카테고리에 맞는 목록만 보여줍니다.
  const subSelect = h('select', { id: 'f-sub', class: 'select', 'aria-describedby': 'err-subcategory' });
  function renderSubOptions() {
    clear(subSelect);
    if (!form.category) {
      subSelect.append(h('option', { value: '' }, '먼저 카테고리를 고르세요'));
      subSelect.disabled = true;
      return;
    }
    subSelect.disabled = false;
    subSelect.append(
      h('option', { value: '' }, '선택 안 함'),
      ...getCategory(form.category).subs.map((x) => h('option', { value: x.key, selected: form.subcategory === x.key }, x.label)),
    );
  }
  subSelect.addEventListener('change', () => { form.subcategory = subSelect.value; markDirty(); });
  renderSubOptions();

  const tagsInput = h('input', { id: 'f-tags', class: 'input', type: 'text', placeholder: '예) 2000년대, OST, 명곡', value: form.tagsText, 'aria-describedby': 'tags-hint err-tags' });
  tagsInput.addEventListener('input', () => { form.tagsText = tagsInput.value; markDirty(); });

  const publicInput = h('input', { id: 'f-public', type: 'checkbox', class: 'switch-input', checked: form.isPublic });
  const publicHint = h('p', { class: 'hint', id: 'public-hint' });
  const updatePublicUi = () => {
    publicHint.textContent = form.isPublic
      ? '공개: 홈 목록에 표시되고, 링크를 받은 누구나 풀 수 있어요.'
      : '비공개: 나만 볼 수 있어요. 목록에 나오지 않고 링크로도 다른 사람은 열 수 없어요.';
    saveBtn.textContent = form.isPublic ? (editId ? '수정 내용 저장' : '저장하고 공개하기') : '비공개로 저장';
  };
  publicInput.addEventListener('change', () => { form.isPublic = publicInput.checked; markDirty(); updatePublicUi(); });

  const thumbArea = h('div', { class: 'image-field' });
  function renderThumb() {
    clear(thumbArea);
    if (!imagesEnabled) {
      thumbArea.append(h('p', { class: 'hint' }, '이미지 업로드가 꺼져 있어요. 이미지 없이도 카테고리별 기본 썸네일이 표시됩니다. (사이트 관리자: README 의 "Storage 설정" 참고)'));
      return;
    }
    const src = form.thumbPreview || form.imageUrl;
    if (src) {
      thumbArea.append(
        h('img', { src, alt: '썸네일 미리보기', class: 'image-preview' }),
        h('button', { type: 'button', class: 'btn btn-ghost btn-sm', onclick: () => { form.thumbFile = null; form.thumbPreview = ''; form.imageUrl = ''; markDirty(); renderThumb(); } }, '이미지 삭제'),
      );
    }
    thumbArea.append(imagePicker('f-thumb', '썸네일 이미지 선택', (file) => {
      form.thumbFile = file;
      form.thumbPreview = makeObjectUrl(file);
      markDirty();
      renderThumb();
    }, 'thumb'), errorSlot('thumb'));
  }

  function imagePicker(id, label, onPick, errorPath) {
    const input = h('input', { id, type: 'file', accept: IMAGE_TYPES.join(','), class: 'file-input' });
    input.addEventListener('change', () => {
      const file = input.files?.[0];
      if (!file) return;
      const problem = validateImageFile(file);
      const slot = input.parentElement?.querySelector(`[data-error-for="${errorPath}"]`) || container.querySelector(`[data-error-for="${errorPath}"]`);
      if (problem) {
        input.value = '';
        if (slot) { slot.textContent = problem; slot.hidden = false; }
        showToast(problem, 'error');
        return;
      }
      if (slot) slot.hidden = true;
      onPick(file);
    });
    return h('label', { class: 'file-label', for: id },
      h('span', { class: 'btn btn-ghost btn-sm', 'aria-hidden': 'true' }, label),
      h('span', { class: 'sr-only' }, label),
      input,
      h('span', { class: 'hint' }, `JPG·PNG·WEBP·GIF, ${LIMITS.imageMaxBytes / 1024 / 1024}MB 미만`),
    );
  }

  // ── 문제 목록 ──
  const questionList = h('ol', { class: 'question-list' });
  const questionCountLabel = h('span', { class: 'badge' });
  const addTextBtn = h('button', { type: 'button', class: 'btn btn-ghost', onclick: () => addQuestion('text') }, '+ 주관식 문제');
  const addChoiceBtn = h('button', { type: 'button', class: 'btn btn-ghost', onclick: () => addQuestion('choice') }, '+ 객관식 문제');

  function addQuestion(type) {
    if (form.questions.length >= LIMITS.questionsMax) return;
    const q = newQuestion(type);
    form.questions.push(q);
    markDirty();
    renderQuestions();
    container.querySelector(`#q-${q.key}-text`)?.focus();
  }

  function moveQuestion(index, delta) {
    const target = index + delta;
    if (target < 0 || target >= form.questions.length) return;
    const [q] = form.questions.splice(index, 1);
    form.questions.splice(target, 0, q);
    markDirty();
    renderQuestions();
    // 같은 버튼에 포커스를 유지해 키보드로 연속 이동 가능
    const btn = container.querySelector(`[data-move="${delta < 0 ? 'up' : 'down'}"][data-qkey="${q.key}"]`);
    (btn && !btn.disabled ? btn : container.querySelector(`#q-${q.key}-text`))?.focus();
    showToast(`문제를 ${target + 1}번으로 옮겼어요`);
  }

  async function removeQuestion(index) {
    const q = form.questions[index];
    const hasContent = q.question.trim() || q.answer.trim() || q.options.some((o) => o.trim());
    if (hasContent && !(await confirmDialog({ title: '문제 삭제', message: `${index + 1}번 문제를 삭제할까요? 입력한 내용이 사라집니다.`, confirmText: '삭제', danger: true }))) return;
    form.questions.splice(index, 1);
    markDirty();
    renderQuestions();
    const next = form.questions[Math.min(index, form.questions.length - 1)];
    (next ? container.querySelector(`#q-${next.key}-text`) : addTextBtn).focus();
  }

  function renderQuestions() {
    clear(questionList);
    form.questions.forEach((q, i) => questionList.append(questionCard(q, i)));
    questionCountLabel.textContent = `${form.questions.length}/${LIMITS.questionsMax}`;
    const full = form.questions.length >= LIMITS.questionsMax;
    addTextBtn.disabled = full;
    addChoiceBtn.disabled = full;
  }

  function questionCard(q, i) {
    const total = form.questions.length;
    const p = `questions.${i}`;
    const typeSelect = h('select', { class: 'select select-sm', 'aria-label': `${i + 1}번 문제 유형` },
      QUESTION_TYPES.map((t) => h('option', { value: t.key, selected: q.type === t.key }, t.label)),
    );
    typeSelect.addEventListener('change', () => {
      q.type = typeSelect.value;
      if (q.type === 'choice' && q.options.length < 2) {
        q.options = ['', '', '', ''];
        q.correctIndex = -1;
      }
      markDirty();
      renderQuestions();
      container.querySelector(`#q-${q.key}-type`)?.focus();
    });
    typeSelect.id = `q-${q.key}-type`;

    const textArea = h('textarea', { id: `q-${q.key}-text`, class: 'input textarea', rows: '2', placeholder: '문제를 입력하세요. 예) 조선을 세운 왕은?', 'aria-describedby': `err-${p.replace(/\./g, '-')}-question` });
    textArea.value = q.question;
    textArea.addEventListener('input', () => { q.question = textArea.value; markDirty(); });

    const head = h('div', { class: 'q-head' },
      h('h3', { class: 'q-number' }, `문제 ${i + 1}`),
      typeSelect,
      h('div', { class: 'q-tools' },
        h('button', { type: 'button', class: 'icon-btn', 'aria-label': `${i + 1}번 문제를 위로 이동`, title: '위로', disabled: i === 0, dataset: { move: 'up', qkey: q.key }, onclick: () => moveQuestion(i, -1) }, '↑'),
        h('button', { type: 'button', class: 'icon-btn', 'aria-label': `${i + 1}번 문제를 아래로 이동`, title: '아래로', disabled: i === total - 1, dataset: { move: 'down', qkey: q.key }, onclick: () => moveQuestion(i, 1) }, '↓'),
        h('button', { type: 'button', class: 'icon-btn icon-danger', 'aria-label': `${i + 1}번 문제 삭제`, title: '삭제', disabled: total === 1, onclick: () => removeQuestion(i) }, '✕'),
      ),
    );

    const body = [
      h('label', { class: 'label', for: textArea.id }, '문제 내용 ', h('span', { class: 'req' }, '*')),
      textArea,
      counter(textArea, LIMITS.questionMax),
      errorSlot(`${p}.question`),
    ];

    if (imagesEnabled) {
      const imgBox = h('div', { class: 'image-field' });
      const renderImg = () => {
        clear(imgBox);
        const src = q.imagePreview || q.imageUrl;
        if (src) {
          imgBox.append(
            h('img', { src, alt: `${i + 1}번 문제 이미지 미리보기`, class: 'image-preview' }),
            h('button', { type: 'button', class: 'btn btn-ghost btn-sm', onclick: () => { q.imageFile = null; q.imagePreview = ''; q.imageUrl = ''; markDirty(); renderImg(); } }, '이미지 삭제'),
          );
        }
        imgBox.append(imagePicker(`q-${q.key}-img`, '문제 이미지 첨부 (선택)', (file) => {
          q.imageFile = file;
          q.imagePreview = makeObjectUrl(file);
          markDirty();
          renderImg();
        }, `${p}.image`), errorSlot(`${p}.image`));
      };
      renderImg();
      body.push(imgBox);
    }

    if (q.type === 'text') {
      const answerInput = h('input', { id: `q-${q.key}-answer`, class: 'input', type: 'text', placeholder: '정답 (예: 이성계)', value: q.answer, maxlength: String(LIMITS.answerMax + 20) });
      answerInput.addEventListener('input', () => { q.answer = answerInput.value; markDirty(); });
      const altInput = h('input', { id: `q-${q.key}-alt`, class: 'input', type: 'text', placeholder: '예: 태조, 태조 이성계', value: q.altText });
      altInput.addEventListener('input', () => { q.altText = altInput.value; markDirty(); });
      body.push(
        h('div', { class: 'grid-2' },
          h('div', {},
            h('label', { class: 'label', for: answerInput.id }, '정답 ', h('span', { class: 'req' }, '*')),
            answerInput,
            errorSlot(`${p}.answer`),
          ),
          h('div', {},
            h('label', { class: 'label', for: altInput.id }, '다른 인정 답안 (선택)'),
            altInput,
            h('p', { class: 'hint' }, `쉼표(,)로 구분, 최대 ${LIMITS.altAnswersMax}개. 채점 시 띄어쓰기·대소문자는 무시돼요.`),
            errorSlot(`${p}.altAnswers`),
          ),
        ),
      );
    } else {
      const optionsBox = h('fieldset', { class: 'options-field' },
        h('legend', { class: 'label' }, '보기 ', h('span', { class: 'req' }, '*'), h('span', { class: 'hint inline' }, ' — 왼쪽 동그라미를 눌러 정답을 고르세요')),
      );
      q.options.forEach((opt, oi) => {
        const radio = h('input', { type: 'radio', name: `correct-${q.key}`, class: 'radio', checked: q.correctIndex === oi, 'aria-label': `보기 ${oi + 1}을 정답으로 선택` });
        radio.addEventListener('change', () => { q.correctIndex = oi; markDirty(); });
        const optInput = h('input', { type: 'text', class: 'input', value: opt, placeholder: `보기 ${oi + 1}`, 'aria-label': `${i + 1}번 문제 보기 ${oi + 1}`, maxlength: String(LIMITS.optionMax + 20) });
        optInput.addEventListener('input', () => { q.options[oi] = optInput.value; markDirty(); });
        const removeBtn = h('button', {
          type: 'button', class: 'icon-btn', 'aria-label': `보기 ${oi + 1} 삭제`, disabled: q.options.length <= LIMITS.optionsMin,
          onclick: () => {
            q.options.splice(oi, 1);
            if (q.correctIndex === oi) q.correctIndex = -1;
            else if (q.correctIndex > oi) q.correctIndex--;
            markDirty();
            renderQuestions();
          },
        }, '✕');
        optionsBox.append(h('div', { class: 'option-row' }, radio, optInput, removeBtn));
      });
      optionsBox.append(
        h('button', {
          type: 'button', class: 'btn btn-ghost btn-sm', disabled: q.options.length >= LIMITS.optionsMax,
          onclick: () => { q.options.push(''); markDirty(); renderQuestions(); },
        }, `+ 보기 추가 (최대 ${LIMITS.optionsMax}개)`),
        errorSlot(`${p}.options`),
        errorSlot(`${p}.answer`),
      );
      body.push(optionsBox);
    }

    return h('li', { class: 'question-card card', dataset: { key: q.key } }, head, ...body);
  }

  // ── 오류 표시 ──
  function showErrors(errors) {
    container.querySelectorAll('.field-error').forEach((el) => {
      const msg = errors[el.dataset.errorFor];
      el.textContent = msg || '';
      el.hidden = !msg;
    });
    container.querySelectorAll('[aria-invalid]').forEach((el) => el.removeAttribute('aria-invalid'));
    const fieldFor = {
      title: titleInput, description: descInput, category: catSelect, subcategory: subSelect, tags: tagsInput,
    };
    for (const path of Object.keys(errors)) {
      let el = fieldFor[path];
      const m = path.match(/^questions\.(\d+)\.(\w+)$/);
      if (m) {
        const q = form.questions[Number(m[1])];
        if (!q) continue;
        el = m[2] === 'question' ? container.querySelector(`#q-${q.key}-text`)
          : m[2] === 'answer' && q.type === 'text' ? container.querySelector(`#q-${q.key}-answer`)
          : m[2] === 'altAnswers' ? container.querySelector(`#q-${q.key}-alt`)
          : container.querySelector(`[data-key="${q.key}"] .option-row input[type="text"]`);
      }
      el?.setAttribute('aria-invalid', 'true');
    }
  }

  function focusFirstError() {
    const first = container.querySelector('.field-error:not([hidden])');
    if (!first) return;
    const field = first.closest('.field, .question-card, fieldset')?.querySelector('[aria-invalid="true"]')
      || container.querySelector('[aria-invalid="true"]');
    (field || first).scrollIntoView({ behavior: 'smooth', block: 'center' });
    field?.focus({ preventScroll: true });
  }

  // ── 하단 버튼 ──
  const saveBtn = h('button', { type: 'submit', class: 'btn btn-primary', form: 'quiz-form' }, '저장');
  const draftBtn = h('button', { type: 'button', class: 'btn btn-ghost', onclick: saveDraft }, '임시 저장');
  const previewBtn = h('button', { type: 'button', class: 'btn btn-ghost', onclick: openPreview }, '미리보기');
  const cancelBtn = h('button', { type: 'button', class: 'btn btn-text', onclick: cancelEdit }, '작성 취소');
  const formError = h('p', { class: 'form-error', role: 'alert', hidden: true });

  function saveDraft() {
    try {
      writeDraft(draftKey, form);
      const hasFiles = form.thumbFile || form.questions.some((q) => q.imageFile);
      showToast(hasFiles ? '임시 저장했어요. (새로 고른 이미지 파일은 임시 저장되지 않아요)' : '이 브라우저에 임시 저장했어요.', 'success', 4000);
    } catch {
      showToast('임시 저장에 실패했어요. 브라우저 저장 공간을 확인해 주세요.', 'error');
    }
  }

  async function cancelEdit() {
    if (dirty || readDraft(draftKey)) {
      const ok = await confirmDialog({
        title: '작성 취소',
        message: '작성 중인 내용과 임시 저장본이 모두 사라집니다. 취소할까요?',
        confirmText: '작성 취소', cancelText: '계속 작성', danger: true,
      });
      if (!ok) return;
    }
    removeDraft(draftKey);
    dirty = false;
    ctx.navigate(editId ? '/my' : '/');
  }

  function openPreview() {
    const data = toSubmit(form);
    const cat = CATEGORIES.find((c) => c.key === data.category);
    const close = h('button', { type: 'button', class: 'btn btn-primary' }, '닫기');
    const dialog = h('dialog', { class: 'dialog dialog-wide', 'aria-labelledby': 'preview-title' },
      h('p', { class: 'eyebrow' }, '미리보기 · 정답이 표시됩니다'),
      h('h2', { id: 'preview-title', class: 'dialog-title' }, data.title.trim() || '(제목 없음)'),
      h('p', { class: 'muted' }, `${cat ? categoryLabel(data.category, data.subcategory, { sep: ' > ' }) : '카테고리 미선택'} · 문제 ${data.questions.length}개 · ${data.isPublic ? '공개' : '비공개'}`),
      data.tags.length ? h('p', { class: 'tag-list' }, data.tags.map((t) => h('span', { class: 'tag' }, `#${t}`))) : null,
      data.description.trim() ? h('p', { class: 'preview-desc' }, data.description) : null,
      h('ol', { class: 'preview-list' },
        data.questions.map((q, i) => {
          const pv = form.questions[i].imagePreview || q.imageUrl;
          return h('li', { class: 'preview-item' },
            h('p', { class: 'preview-q' }, q.question.trim() || '(문제 내용 없음)'),
            pv ? h('img', { src: pv, alt: '', class: 'preview-img' }) : null,
            q.type === 'choice'
              ? h('ul', { class: 'preview-options' }, q.options.filter((o) => o.trim()).map((o) => h('li', { class: o.trim() === q.answer ? 'is-answer' : '' }, o, o.trim() === q.answer ? ' ✔ 정답' : '')))
              : h('p', { class: 'preview-answer' }, `정답: ${q.answer.trim() || '(미입력)'}${q.altAnswers.length ? ` / 인정: ${q.altAnswers.join(', ')}` : ''}`),
          );
        }),
      ),
      h('div', { class: 'dialog-actions' }, close),
    );
    close.addEventListener('click', () => dialog.close());
    dialog.addEventListener('close', () => dialog.remove());
    document.body.append(dialog);
    dialog.showModal();
    close.focus();
  }

  async function submit(e) {
    e.preventDefault();
    if (saving) return; // 중복 제출 방지
    const data = toSubmit(form);
    const { valid, errors } = validateQuiz(data);
    showErrors(errors);
    formError.hidden = true;
    if (!valid) {
      const n = Object.keys(errors).length;
      showToast(`입력 내용을 확인해 주세요. (${n}곳)`, 'error');
      formError.textContent = errors.questions || `빨간 글씨로 표시된 ${n}곳을 고쳐 주세요.`;
      formError.hidden = false;
      focusFirstError();
      return;
    }
    saving = true;
    [saveBtn, draftBtn, previewBtn, cancelBtn, addTextBtn, addChoiceBtn].forEach((b) => { b.disabled = true; });
    saveBtn.classList.add('is-loading');
    saveBtn.setAttribute('aria-busy', 'true');
    const label = saveBtn.textContent;
    try {
      // 새 퀴즈는 ID 를 한 번만 받아 두고, 저장을 다시 시도해도 같은 ID 를 씁니다.
      if (!existing && !pendingQuizId) pendingQuizId = await newQuizId();
      const id = await saveQuiz(data, existing, (msg) => { saveBtn.textContent = msg; }, { quizId: pendingQuizId });
      removeDraft(draftKey);
      dirty = false;
      showToast(editId ? '수정 내용을 저장했어요.' : '퀴즈를 저장했어요!', 'success');
      ctx.navigate(`/quiz/${id}?saved=1`);
    } catch (err) {
      const appErr = toAppError(err);
      formError.textContent = `저장하지 못했어요: ${appErr.message}`;
      formError.hidden = false;
      showToast('저장에 실패했어요.', 'error');
      saving = false;
      saveBtn.textContent = label;
      saveBtn.classList.remove('is-loading');
      saveBtn.removeAttribute('aria-busy');
      [saveBtn, draftBtn, previewBtn, cancelBtn].forEach((b) => { b.disabled = false; });
      renderQuestions();
    }
  }

  // ── 임시 저장본 안내 ──
  const draftBanner = h('div', { class: 'container' });
  const draft = readDraft(draftKey);
  if (draft?.form) {
    const when = new Date(draft.savedAt).toLocaleString('ko-KR');
    const box = h('div', { class: 'notice notice-info draft-notice', role: 'region', 'aria-label': '임시 저장본' },
      h('p', {}, `${when}에 임시 저장한 내용이 있어요.`),
      h('div', { class: 'notice-actions' },
        h('button', {
          type: 'button', class: 'btn btn-primary btn-sm',
          onclick: () => {
            form = { ...emptyForm(), ...draft.form, questions: draft.form.questions.map((q) => ({ ...newQuestion(q.type), ...q, key: nextKey() })) };
            if (!form.questions.length) form.questions = [newQuestion('text')];
            titleInput.value = form.title; descInput.value = form.description;
            catSelect.value = form.category; publicInput.checked = form.isPublic;
            tagsInput.value = form.tagsText || ''; renderSubOptions();
            titleInput.dispatchEvent(new Event('input')); descInput.dispatchEvent(new Event('input'));
            updatePublicUi(); renderThumb(); renderQuestions();
            box.remove();
            showToast('임시 저장본을 불러왔어요.');
          },
        }, '불러오기'),
        h('button', { type: 'button', class: 'btn btn-ghost btn-sm', onclick: () => { removeDraft(draftKey); box.remove(); } }, '삭제'),
      ),
    );
    draftBanner.append(box);
  }

  const formEl = h('form', { id: 'quiz-form', class: 'container editor', novalidate: true },
    h('section', { class: 'card editor-section', 'aria-labelledby': 'sec-basic' },
      h('h2', { id: 'sec-basic', class: 'section-title' }, '기본 정보'),
      h('div', { class: 'field' },
        h('label', { class: 'label', for: 'f-title' }, '퀴즈 제목 ', h('span', { class: 'req' }, '*')),
        titleInput, counter(titleInput, LIMITS.titleMax), errorSlot('title'),
      ),
      h('div', { class: 'field' },
        h('label', { class: 'label', for: 'f-desc' }, '설명 (선택)'),
        descInput, counter(descInput, LIMITS.descriptionMax), errorSlot('description'),
      ),
      h('div', { class: 'grid-2' },
        h('div', { class: 'field' },
          h('label', { class: 'label', for: 'f-category' }, '카테고리 ', h('span', { class: 'req' }, '*')),
          catSelect, errorSlot('category'),
        ),
        h('div', { class: 'field' },
          h('label', { class: 'label', for: 'f-sub' }, '세부 분류 (선택)'),
          subSelect,
          h('p', { class: 'hint' }, '예) 음악 → 발라드. 세부 분류로도 검색돼요.'),
          errorSlot('subcategory'),
        ),
      ),
      h('div', { class: 'field' },
        h('label', { class: 'label', for: 'f-tags' }, '태그 (선택)'),
        tagsInput,
        h('p', { class: 'hint', id: 'tags-hint' }, `쉼표(,)로 구분, 최대 ${LIMITS.tagsMax}개. 태그 단어로도 검색돼요.`),
        errorSlot('tags'),
      ),
      h('div', { class: 'grid-2' },
        h('div', { class: 'field' },
          h('span', { class: 'label' }, '공개 여부'),
          h('label', { class: 'switch', for: 'f-public' }, publicInput, h('span', { class: 'switch-track', 'aria-hidden': 'true' }), h('span', {}, '공개 퀴즈로 저장')),
          publicHint,
        ),
      ),
      h('div', { class: 'field' }, h('span', { class: 'label' }, '썸네일 이미지 (선택)'), thumbArea),
    ),
    h('section', { class: 'editor-section', 'aria-labelledby': 'sec-q' },
      h('div', { class: 'section-head' },
        h('h2', { id: 'sec-q', class: 'section-title' }, '문제 '), questionCountLabel,
      ),
      errorSlot('questions'),
      questionList,
      h('div', { class: 'add-buttons' }, addTextBtn, addChoiceBtn),
    ),
    formError,
    h('div', { class: 'action-bar' },
      h('div', { class: 'action-bar-inner' }, cancelBtn, h('span', { class: 'spacer' }), draftBtn, previewBtn, saveBtn),
    ),
  );
  formEl.addEventListener('submit', submit);

  container.append(
    h('div', { class: 'container page-head' },
      h('h1', { class: 'page-title' }, editId ? '퀴즈 수정' : '새 퀴즈 만들기'),
      h('p', { class: 'muted' }, editId
        ? '내용을 고친 뒤 저장하면 같은 공유 링크에 바로 반영됩니다.'
        : `* 표시는 필수 항목입니다. 저장하면 고유한 공유 링크가 만들어져요.${IS_DEMO ? ' (데모 모드: 이 브라우저에만 저장)' : ''}`),
    ),
    draftBanner,
    formEl,
  );
  updatePublicUi();
  renderThumb();
  renderQuestions();

  // 저장하지 않고 떠나려 할 때 확인
  ctx.setLeaveGuard(() => !dirty || saving || window.confirm('저장하지 않은 내용이 있어요. 페이지를 떠날까요?\n(임시 저장을 누르면 이 브라우저에 보관됩니다)'));
  const onBeforeUnload = (e) => {
    if (dirty && !saving) {
      e.preventDefault();
      e.returnValue = '';
    }
  };
  window.addEventListener('beforeunload', onBeforeUnload);
  return () => {
    window.removeEventListener('beforeunload', onBeforeUnload);
    objectUrls.forEach((u) => URL.revokeObjectURL(u));
  };
}
