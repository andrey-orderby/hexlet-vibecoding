// Чистые функции расчёта калорий — без DOM, чтобы их можно было тестировать.

export const ACTIVITY_LEVELS = {
  minimal: { factor: 1.2, label: 'Минимальная (сидячая работа, без спорта)' },
  light: { factor: 1.375, label: 'Лёгкая (тренировки 1–3 раза в неделю)' },
  moderate: { factor: 1.55, label: 'Средняя (тренировки 3–5 раз в неделю)' },
  high: { factor: 1.725, label: 'Высокая (тренировки 6–7 раз в неделю)' },
  extreme: { factor: 1.9, label: 'Очень высокая (физическая работа + спорт)' },
};

export const GOALS = {
  lose: { factor: 0.85, label: 'Похудеть (−15%)' },
  maintain: { factor: 1, label: 'Поддерживать вес' },
  gain: { factor: 1.15, label: 'Набрать массу (+15%)' },
};

// Доли калорий на белки / жиры / углеводы.
export const MACRO_SPLIT = { protein: 0.3, fat: 0.3, carbs: 0.4 };

// Калорийность 1 г макронутриента.
export const KCAL_PER_GRAM = { protein: 4, fat: 9, carbs: 4 };

export const LIMITS = {
  age: [14, 100],
  height: [100, 250],
  weight: [30, 300],
};

const isInRange = (value, [min, max]) => Number.isFinite(value) && value >= min && value <= max;

export function validateProfile({ sex, age, height, weight, activity, goal }) {
  const errors = {};
  if (sex !== 'male' && sex !== 'female') errors.sex = 'Выберите пол';
  if (!isInRange(age, LIMITS.age)) errors.age = `Возраст от ${LIMITS.age[0]} до ${LIMITS.age[1]} лет`;
  if (!isInRange(height, LIMITS.height)) errors.height = `Рост от ${LIMITS.height[0]} до ${LIMITS.height[1]} см`;
  if (!isInRange(weight, LIMITS.weight)) errors.weight = `Вес от ${LIMITS.weight[0]} до ${LIMITS.weight[1]} кг`;
  if (!(activity in ACTIVITY_LEVELS)) errors.activity = 'Выберите уровень активности';
  if (!(goal in GOALS)) errors.goal = 'Выберите цель';
  return errors;
}

// Базовый обмен веществ по формуле Миффлина — Сан Жеора.
export function calcBmr({ sex, age, height, weight }) {
  const base = 10 * weight + 6.25 * height - 5 * age;
  return sex === 'male' ? base + 5 : base - 161;
}

export function calcMacros(kcal) {
  return Object.fromEntries(
    Object.entries(MACRO_SPLIT).map(([name, share]) => [
      name,
      Math.round((kcal * share) / KCAL_PER_GRAM[name]),
    ]),
  );
}

export function calcDailyNorm(profile) {
  const bmr = calcBmr(profile);
  const tdee = bmr * ACTIVITY_LEVELS[profile.activity].factor;
  const target = Math.round(tdee * GOALS[profile.goal].factor);
  return {
    bmr: Math.round(bmr),
    tdee: Math.round(tdee),
    target,
    macros: calcMacros(target),
  };
}

// Пищевая ценность порции по значениям на 100 г.
export function calcPortion(grams, per100) {
  const ratio = grams / 100;
  const round1 = (n) => Math.round(n * 10) / 10;
  return {
    kcal: Math.round(per100.kcal * ratio),
    protein: round1((per100.protein ?? 0) * ratio),
    fat: round1((per100.fat ?? 0) * ratio),
    carbs: round1((per100.carbs ?? 0) * ratio),
  };
}

export function sumEntries(entries) {
  const total = entries.reduce(
    (acc, e) => ({
      kcal: acc.kcal + e.kcal,
      protein: acc.protein + e.protein,
      fat: acc.fat + e.fat,
      carbs: acc.carbs + e.carbs,
    }),
    { kcal: 0, protein: 0, fat: 0, carbs: 0 },
  );
  const round1 = (n) => Math.round(n * 10) / 10;
  return {
    kcal: Math.round(total.kcal),
    protein: round1(total.protein),
    fat: round1(total.fat),
    carbs: round1(total.carbs),
  };
}
