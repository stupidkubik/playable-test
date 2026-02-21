# Runner Playable Clone

Клон playable-креатива по референсу: [playbox.play.plbx.ai/playoff/runner](https://playbox.play.plbx.ai/playoff/runner).

Проект собран как легкий vanilla JS-раннер с одним canvas, локальными тестами логики и сборкой в single HTML.

## Быстрый старт

Требования: Node.js 18+.

```bash
npm install
npm run dev
```

Локальный запуск: `http://localhost:5173`.

## Скрипты

- `npm run dev` - локальный сервер разработки.
- `npm test` - тесты базовой логики (`node --test`).
- `npm run extract:assets` - генерация `src/assets/extractedAssets.js` из `file.html`.
- `npm run build` - extraction + сборка `dist/playable.html`.

## Структура

- `index.html` - корневая разметка и контейнеры экранов.
- `src/game.js` - игровой цикл, рендер, события, UI, загрузка ассетов.
- `src/gameLogic.js` - чистая логика (константы, hitbox-функции, экономика, spawn).
- `src/style.css` - стили HUD, оверлеев, футера и эффектов.
- `src/assets/extractedAssets.js` - сгенерированный модуль с data-uri и кадрами.
- `scripts/extract-assets.mjs` - парсинг ассетов и frame-метаданных из `file.html`.
- `scripts/build-single-html.mjs` - упаковка в один HTML.
- `test/gameLogic.test.js` - unit-тесты логики.

## Как работает игра

Основной цикл (`requestAnimationFrame`) в `src/game.js`:

1. Обновление скорости/дистанции.
2. Спавн сущностей по `SPAWN_SEQUENCE`.
3. Движение врагов, препятствий, коллектаблов.
4. Проверка столкновений и апдейт HP/score.
5. Рендер сцены, сущностей, HUD и оверлеев.

Ключевые состояния (`STATES`):

- `loading`
- `intro`
- `running`
- `paused` (tutorial pause)
- `end_win`
- `end_lose`

## Рендер спрайтов и почему это важно

В исходном референсе кадры в атласах **trimmed**: каждый кадр хранится не целиком, а вырезан по контенту.

Если игнорировать trim-метаданные и просто рисовать каждый кадр в фиксированную ширину/высоту, появляются артефакты:

- визуальное сжатие/растяжение модели;
- «плавание» головы и корпуса по горизонтали.

В проекте это исправлено:

- `extract-assets.mjs` теперь вытаскивает для каждого кадра:
  - `sourceX`, `sourceY`
  - `sourceW`, `sourceH`
- рендер игрока и врага в `game.js` строится через virtual source box с якорем по низу/центру.

Результат: анимация заметно стабильнее и ближе к оригиналу.

## Где крутить баланс и поведение

Основные параметры в `src/gameLogic.js`:

- `PLAYER_CONFIG` - прыжок, масштаб, invincibility.
- `SPEED_CONFIG` - скорость бега, замедление, tutorial distance.
- `HITBOX_CONFIG` - размеры hitbox'ов.
- `ECONOMY_CONFIG` - деньги/награды.
- `SPAWN_SEQUENCE` - сценарий появления сущностей.

Визуальные рендер-параметры в `src/game.js`:

- `playerRenderHeightMultiplier`
- `enemyCollisionScale`
- `enemyRenderScaleMultiplier`
- параметры окружения/фона/декора.

## Текущий статус

Сейчас реализовано:

- стартовый экран, игровой ран, win/lose экраны;
- HUD (жизни/счет), футер, CTA;
- игрок, враг, препятствия, коллектаблы;
- парралакс/сцена и базовая референс-логика.

Проект подходит как тестовый прототип под дальнейшую точную подгонку под референс.
