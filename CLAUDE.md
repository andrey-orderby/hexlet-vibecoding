# CLAUDE.md

Учебный проект Hexlet: калькулятор калорий на чистом HTML/CSS/JS (дневная норма, БЖУ, вода, дневник питания). Подробности — в `README.md`.

## Ограничения

- Без сборки, `package.json` и зависимостей — не добавлять без явной просьбы.
- ES-модули: через `file://` не работает, нужен сервер.
- Весь пользовательский текст, комментарии и названия тестов — на русском.

## Запуск и тесты

```bash
python3 -m http.server 8080
```

Приложение — http://localhost:8080, тесты — http://localhost:8080/tests/. Headless-прогон (сервер запущен):

```bash
node -e "require('playwright').chromium.launch().then(async b=>{const p=await b.newPage();await p.goto('http://localhost:8080/tests/');await p.waitForFunction(()=>window.testResults);const r=await p.evaluate(()=>window.testResults);await b.close();const f=r.filter(t=>!t.ok);f.forEach(t=>console.log('✗',t.name,t.message));console.log(r.length-f.length+'/'+r.length);process.exit(f.length?1:0)})"
```

## Правила

- Логика расчёта — только в `js/calc.js` (чистые функции, без DOM) и с тестом в `tests/calc.test.js`. `js/app.js` — DOM и `localStorage`.
- Округление: ккал — до целого, граммы — до 0,1; ожидания тестов на это завязаны.
- Сменил формат сохраняемых данных — подними версию ключа `calorie-calc:v1`.
- DOM — через `createElement` + `textContent`, без `innerHTML` (названия продуктов вводит пользователь).
- Цвета — только CSS-переменные с парой для тёмной темы; `--protein` / `--fat` / `--carbs` проверены на дальтонизм — меняя, перепроверяй.
- После изменений: тесты + проверка в браузере (консоль без ошибок); обнови `README.md`.
- Не коммитить токен из `GITHUB_MCP_PAT` (`.mcp.json`). `temp.txt` к приложению не относится.
