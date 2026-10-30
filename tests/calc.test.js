import {
  validateProfile,
  calcBmr,
  calcMacros,
  calcMacroShares,
  calcDailyNorm,
  calcPortion,
  sumEntries,
} from '../js/calc.js';

const male = { sex: 'male', age: 30, height: 175, weight: 70, activity: 'light', goal: 'maintain' };
const female = { sex: 'female', age: 25, height: 165, weight: 60, activity: 'moderate', goal: 'lose' };

export const tests = {
  'calcBmr: мужчина по Миффлину — Сан Жеору'(assert) {
    assert.equal(calcBmr(male), 1648.75);
  },
  'calcBmr: женщина по Миффлину — Сан Жеору'(assert) {
    assert.equal(calcBmr(female), 1345.25);
  },
  'calcDailyNorm: поддержание веса, лёгкая активность'(assert) {
    assert.deepEqual(calcDailyNorm(male), {
      bmr: 1649,
      tdee: 2267,
      target: 2267,
      macros: { protein: 170, fat: 76, carbs: 227 },
    });
  },
  'calcDailyNorm: похудение отнимает 15%'(assert) {
    const norm = calcDailyNorm(female);
    assert.equal(norm.tdee, 2085);
    assert.equal(norm.target, 1772);
  },
  'calcDailyNorm: набор массы добавляет 15%'(assert) {
    assert.equal(calcDailyNorm({ ...male, goal: 'gain' }).target, 2607);
  },
  'calcMacros: делит калории 30/30/40'(assert) {
    assert.deepEqual(calcMacros(2000), { protein: 150, fat: 67, carbs: 200 });
  },
  'calcMacroShares: доли калорий нормы 30/30/40'(assert) {
    assert.deepEqual(calcMacroShares({ protein: 150, fat: 67, carbs: 200 }), {
      protein: { kcal: 600, percent: 30 },
      fat: { kcal: 603, percent: 30 },
      carbs: { kcal: 800, percent: 40 },
    });
  },
  'calcMacroShares: проценты в сумме дают 100'(assert) {
    const shares = calcMacroShares({ protein: 1, fat: 1, carbs: 1 });
    assert.deepEqual(Object.values(shares).map((s) => s.percent), [24, 53, 23]);
  },
  'calcMacroShares: пустой дневник'(assert) {
    assert.deepEqual(calcMacroShares({ protein: 0, fat: 0, carbs: 0 }), {
      protein: { kcal: 0, percent: 0 },
      fat: { kcal: 0, percent: 0 },
      carbs: { kcal: 0, percent: 0 },
    });
  },
  'calcPortion: пересчёт со 100 г на порцию'(assert) {
    const per100 = { kcal: 110, protein: 4.2, fat: 1.1, carbs: 21.3 };
    assert.deepEqual(calcPortion(150, per100), { kcal: 165, protein: 6.3, fat: 1.7, carbs: 32 });
  },
  'calcPortion: БЖУ необязательны'(assert) {
    assert.deepEqual(calcPortion(50, { kcal: 200 }), { kcal: 100, protein: 0, fat: 0, carbs: 0 });
  },
  'sumEntries: суммирует записи'(assert) {
    const total = sumEntries([
      { kcal: 165, protein: 6.3, fat: 1.7, carbs: 32 },
      { kcal: 137, protein: 29.8, fat: 1.8, carbs: 0.5 },
    ]);
    assert.deepEqual(total, { kcal: 302, protein: 36.1, fat: 3.5, carbs: 32.5 });
  },
  'sumEntries: пустой дневник'(assert) {
    assert.deepEqual(sumEntries([]), { kcal: 0, protein: 0, fat: 0, carbs: 0 });
  },
  'validateProfile: корректный профиль без ошибок'(assert) {
    assert.deepEqual(validateProfile(male), {});
  },
  'validateProfile: ловит неверные значения'(assert) {
    const errors = validateProfile({ sex: '', age: 5, height: NaN, weight: 500, activity: 'x', goal: 'y' });
    assert.deepEqual(Object.keys(errors).sort(), ['activity', 'age', 'goal', 'height', 'sex', 'weight']);
  },
};
