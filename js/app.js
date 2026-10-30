import {
  ACTIVITY_LEVELS,
  GOALS,
  MACRO_LABELS,
  validateProfile,
  calcDailyNorm,
  calcMacroShares,
  calcPortion,
  sumEntries,
} from './calc.js';
import { FOODS } from './foods.js';

const STORAGE_KEY = 'calorie-calc:v1';
const SVG_NS = 'http://www.w3.org/2000/svg';

const $ = (id) => document.getElementById(id);

const profileForm = $('profile-form');
const foodForm = $('food-form');

const state = {
  profile: null,
  norm: null,
  entries: [],
};

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved && Array.isArray(saved.entries)) {
      state.profile = saved.profile ?? null;
      state.entries = saved.entries;
    }
  } catch {
    // Хранилище недоступно — работаем без сохранения.
  }
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ profile: state.profile, entries: state.entries }));
  } catch {
    // Хранилище недоступно — работаем без сохранения.
  }
}

function fillSelect(select, options) {
  select.replaceChildren(
    ...Object.entries(options).map(([value, { label }]) => new Option(label, value)),
  );
}

function showErrors(form, errors) {
  form.querySelectorAll('[data-error]').forEach((el) => {
    const message = errors[el.dataset.error] ?? '';
    el.textContent = message;
    const input = form.elements[el.dataset.error];
    if (input) input.classList.toggle('invalid', Boolean(message));
  });
}

const toNumber = (value) => (value === '' ? NaN : Number(value));

function readProfile() {
  const data = new FormData(profileForm);
  return {
    sex: data.get('sex'),
    age: toNumber(data.get('age')),
    height: toNumber(data.get('height')),
    weight: toNumber(data.get('weight')),
    activity: data.get('activity'),
    goal: data.get('goal'),
  };
}

function writeProfile(profile) {
  const { elements } = profileForm;
  elements.sex.value = profile.sex;
  ['age', 'height', 'weight', 'activity', 'goal'].forEach((key) => {
    elements[key].value = profile[key];
  });
}

function applyProfile(profile) {
  const errors = validateProfile(profile);
  showErrors(profileForm, errors);
  if (Object.keys(errors).length > 0) return false;
  state.profile = profile;
  state.norm = calcDailyNorm(profile);
  return true;
}

function createSvg(tag, attrs = {}) {
  const el = document.createElementNS(SVG_NS, tag);
  Object.entries(attrs).forEach(([name, value]) => el.setAttribute(name, value));
  return el;
}

// Плитки БЖУ (граммы и % калорий) и кольцевая диаграмма долей калорий.
function renderMacroChart(prefix, macros) {
  const shares = calcMacroShares(macros);
  Object.entries(shares).forEach(([name, { percent }]) => {
    $(`${prefix}-${name}`).textContent = macros[name];
    $(`${prefix}-${name}-pct`).textContent = percent;
  });

  const slices = Object.entries(shares).filter(([, share]) => share.kcal > 0);
  const totalKcal = slices.reduce((sum, [, share]) => sum + share.kcal, 0);
  const circle = { cx: 60, cy: 60, r: 42 };
  const circumference = 2 * Math.PI * circle.r;
  // Зазор между секторами — по 2 единицы, чтобы они не сливались.
  const gap = slices.length > 1 ? 2 : 0;

  const svg = createSvg('svg', { viewBox: '0 0 120 120', role: 'img' });
  svg.setAttribute('aria-label', slices.length > 0
    ? `Доля калорий: ${slices.map(([name, share]) => `${MACRO_LABELS[name].toLowerCase()} ${share.percent}%`).join(', ')}`
    : 'Доля калорий: нет данных');

  const ring = createSvg('g', { transform: 'rotate(-90 60 60)' });
  if (slices.length === 0) ring.append(createSvg('circle', { ...circle, class: 'pie-track' }));

  let offset = 0;
  slices.forEach(([name, share]) => {
    const length = (share.kcal / totalKcal) * circumference;
    const slice = createSvg('circle', {
      ...circle,
      class: `pie-slice pie-${name}`,
      'stroke-dasharray': `${Math.max(0, length - gap)} ${circumference}`,
      'stroke-dashoffset': -offset,
    });
    const title = createSvg('title');
    title.textContent = `${MACRO_LABELS[name]}: ${macros[name]} г · ${share.kcal} ккал · ${share.percent}% калорий`;
    slice.append(title);
    ring.append(slice);
    offset += length;
  });

  svg.append(ring);
  $(`${prefix}-chart`).replaceChildren(svg);
}

function renderNorm() {
  const { norm } = state;
  $('norm-result').hidden = !norm;
  if (!norm) return;
  $('norm-target').textContent = norm.target;
  $('norm-bmr').textContent = norm.bmr;
  $('norm-tdee').textContent = norm.tdee;
  renderMacroChart('norm', norm.macros);
}

function renderDiary() {
  const list = $('diary-list');
  list.replaceChildren(
    ...state.entries.map((entry) => {
      const item = document.createElement('li');
      item.className = 'diary-item';

      const info = document.createElement('div');
      const name = document.createElement('div');
      name.className = 'diary-name';
      name.textContent = entry.name;
      const meta = document.createElement('div');
      meta.className = 'diary-meta';
      meta.textContent = `${entry.grams} г · Б ${entry.protein} · Ж ${entry.fat} · У ${entry.carbs}`;
      info.append(name, meta);

      const kcal = document.createElement('span');
      kcal.className = 'diary-kcal';
      kcal.textContent = `${entry.kcal} ккал`;

      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'diary-remove';
      remove.textContent = '×';
      remove.setAttribute('aria-label', `Удалить «${entry.name}»`);
      remove.addEventListener('click', () => {
        state.entries = state.entries.filter((e) => e.id !== entry.id);
        saveState();
        renderDiary();
      });

      item.append(info, kcal, remove);
      return item;
    }),
  );
  $('diary-empty').hidden = state.entries.length > 0;

  const total = sumEntries(state.entries);
  $('total-kcal').textContent = total.kcal;
  renderMacroChart('total', total);

  const bar = $('progress-bar');
  const note = $('progress-note');
  if (!state.norm) {
    $('total-target').textContent = '—';
    bar.style.width = '0';
    bar.classList.remove('over');
    note.textContent = 'Рассчитайте норму, чтобы видеть прогресс';
    return;
  }

  const { target } = state.norm;
  const left = target - total.kcal;
  $('total-target').textContent = target;
  bar.style.width = `${Math.min(100, (total.kcal / target) * 100)}%`;
  bar.classList.toggle('over', left < 0);
  note.textContent = left >= 0
    ? `Осталось ${left} ккал`
    : `Превышение нормы на ${-left} ккал`;
}

function findFood(name) {
  const query = name.trim().toLowerCase();
  return FOODS.find((food) => food.name.toLowerCase() === query);
}

function readFood() {
  const data = new FormData(foodForm);
  const per100 = {
    kcal: toNumber(data.get('kcal')),
    protein: Number(data.get('protein')) || 0,
    fat: Number(data.get('fat')) || 0,
    carbs: Number(data.get('carbs')) || 0,
  };
  return { name: data.get('name').trim(), grams: toNumber(data.get('grams')), per100 };
}

function validateFood({ name, grams, per100 }) {
  const errors = {};
  if (!name) errors.name = 'Введите название';
  if (!Number.isFinite(grams) || grams <= 0) errors.grams = 'Больше 0';
  if (!Number.isFinite(per100.kcal) || per100.kcal < 0) errors.kcal = 'Укажите ккал';
  return errors;
}

function init() {
  fillSelect($('activity-select'), ACTIVITY_LEVELS);
  fillSelect($('goal-select'), GOALS);
  $('activity-select').value = 'light';
  $('goal-select').value = 'maintain';

  $('food-list').replaceChildren(...FOODS.map((food) => new Option(food.name)));

  loadState();
  if (state.profile) {
    writeProfile(state.profile);
    applyProfile(state.profile);
  }
  renderNorm();
  renderDiary();

  profileForm.addEventListener('submit', (event) => {
    event.preventDefault();
    if (applyProfile(readProfile())) saveState();
    renderNorm();
    renderDiary();
  });

  foodForm.elements.name.addEventListener('input', (event) => {
    const food = findFood(event.target.value);
    if (!food) return;
    ['kcal', 'protein', 'fat', 'carbs'].forEach((key) => {
      foodForm.elements[key].value = food[key];
    });
  });

  foodForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const food = readFood();
    const errors = validateFood(food);
    showErrors(foodForm, errors);
    if (Object.keys(errors).length > 0) return;

    state.entries.push({
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      name: food.name,
      grams: food.grams,
      ...calcPortion(food.grams, food.per100),
    });
    saveState();
    renderDiary();

    ['name', 'kcal', 'protein', 'fat', 'carbs'].forEach((key) => {
      foodForm.elements[key].value = '';
    });
    foodForm.elements.grams.value = 100;
    foodForm.elements.name.focus();
  });

  $('clear-diary').addEventListener('click', () => {
    if (state.entries.length === 0) return;
    if (!window.confirm('Удалить все записи из дневника?')) return;
    state.entries = [];
    saveState();
    renderDiary();
  });
}

init();
