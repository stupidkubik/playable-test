# Runner Playable Clone

Клон playable-креатива по референсу: [playbox.play.plbx.ai/playoff/runner](https://playbox.play.plbx.ai/playoff/runner).

Проект собран как lightweight playable на чистом JS: `Pixi.js` (v8) отвечает за сцену и игровые сущности, DOM/HTML/CSS — за HUD, оверлеи и CTA. Итоговая сборка упаковывается в single HTML.

## Быстрый старт

Требования: Node.js 18+.

```bash
npm install
npm run dev
```

Локальный запуск: `http://localhost:5173`.

## Скрипты

- `npm run dev` — локальный сервер разработки.
- `npm test` — тесты базовой логики (`node --test`).
- `npm run extract:assets` — генерация `src/assets/extractedAssets.js` из `original/file.html`.
- `npm run build` — extraction + сборка `dist/playable.html`.

## Структура проекта

- `index.html` — корневая разметка: canvas, HUD, оверлеи, footer CTA.
- `src/game.js` — runtime-оркестратор: state, цикл, спавн, коллизии, input, звук, переходы экранов.
- `src/gameLogic.js` — чистая логика/константы: конфиги, hitbox, расчёты, spawn sequence.
- `src/renderers/pixiRenderer.js` — Pixi-рендер слоёв (фон, декор, сущности, финиш, FX, tutorial hint).
- `src/uiEffects.js` — DOM-эффекты и анимации UI (end screen, flying collectibles, countdown).
- `src/style.css` — стили HUD/оверлеев/футера/кнопок.
- `src/assets/extractedAssets.js` — сгенерированные data-uri ассеты + frames metadata.
- `scripts/extract-assets.mjs` — извлечение ассетов/кадров из референсного HTML.
- `scripts/build-single-html.mjs` — упаковка в одиночный HTML.
- `test/gameLogic.test.js` — unit-тесты для логики.

## Основная рабочая логика

### 1. Инициализация (`src/game.js`)

- Создаются ссылки на DOM-элементы (`HUD`, оверлеи, кнопки, footer CTA).
- Рассчитывается `GROUND_Y` из высоты игры и `PLAYER_CONFIG.groundOffset`.
- Формируется единый объект `state`:
  - режим игры (`mode`);
  - счет/HP;
  - игрок;
  - массивы сущностей (`enemies`, `obstacles`, `collectibles`, `warningLabels`);
  - `finishLine`;
  - ресурсы (`images`, `audio`);
  - служебные поля игрового цикла и эффектов.

### 2. Состояния игры (`STATES` в `src/gameLogic.js`)

- `loading` — загрузка ассетов.
- `intro` — стартовый экран.
- `running` — основной ран.
- `paused` — tutorial pause (пауза перед первым врагом).
- `end_win` — победа.
- `end_lose` — проигрыш.

Переходами управляет `src/game.js` (`startRun`, `triggerTutorialPause`, `handleWin`, `handleLose`).

### 3. Игровой цикл (`requestAnimationFrame`)

Основной цикл реализован в `src/game.js` через `gameLoop()`:

1. Считается `delta`.
2. Вызывается `update(...)`.
3. Вызывается `render(...)`.
4. Планируется следующий кадр (`requestAnimationFrame`).

В режиме `running` ключевой апдейт идёт через `updateRunning(...)`:

1. Обновление скорости (включая замедление на финише).
2. Обновление дистанции и скролла фона.
3. Спавн сущностей по `SPAWN_SEQUENCE`.
4. Движение сущностей (`updateEntities`).
5. Tutorial trigger (пауза перед первым врагом).
6. Проверка финиша (запуск замедления и разрыв ленты).
7. Коллизии и сбор предметов.
8. Очистка сущностей за пределами экрана.
9. Апдейт игрока (прыжок/анимация/инвулн).

### 4. Спавн и сценарий уровня

В `src/gameLogic.js` сценарий задаётся в `SPAWN_SEQUENCE`:

- каждая запись содержит `type` (`enemy`, `obstacle`, `collectible`, `finish`);
- `distance` задаётся в "экранах" (потом конвертируется в пиксели);
- optional-поля: `yOffset`, `warningLabel`, `pauseForTutorial`.

В `src/game.js`:

- `checkSpawns()` смотрит текущую пройденную дистанцию;
- `shouldSpawn(...)` решает, пора ли заспавнить сущность;
- `spawnEntity(...)` делегирует в конкретные фабрики (`spawnEnemy`, `spawnObstacle`, `spawnCollectible`, `spawnFinishLine`).

### 5. Коллизии и экономика

Логика столкновений разнесена по типам:

- прямоугольные hitbox для игрока/врага/препятствия;
- круговая проверка подбирания коллектаблов (`collectibleIntersects`).

Ключевые функции находятся в `src/gameLogic.js`:

- `playerHitbox(...)`
- `enemyHitbox(...)`
- `obstacleHitbox(...)`
- `collectibleIntersects(...)`
- `getCollectibleValue(...)`

`src/game.js` обновляет:

- `hp` при попадании во врага/препятствие;
- `score` при сборе монет/PayPal-карточки;
- UI через `syncGameHeader()` и `uiEffects`.

### 6. Финиш и замедление

Финиш состоит из двух частей:

- логика (`src/game.js`, объект `state.finishLine`);
- визуал (`src/renderers/pixiRenderer.js`, `syncFinishLayer(...)`).

Механика:

- при достижении `tapeBreakX` запускается `startDeceleration()`;
- скорость плавно падает (`nextDeceleratedSpeed(...)`);
- включается конфетти и помечается `finishLine.tapeBroken = true`;
- после полной остановки запускается `handleWin()`.

Важно для правок:

- если вы меняете визуальное положение стоек/ленты в `src/renderers/pixiRenderer.js`,
- синхронно обновляйте логику точки срабатывания (`finishLine.tapeBreakX`) в `src/game.js`,
- иначе разрыв ленты будет происходить "не там", где она нарисована.

### 7. Рендер (Pixi.js)

Рендерер создаётся в `createPixiRenderer(...)` (`src/renderers/pixiRenderer.js`) и работает по слоям:

- `sky`
- `decor`
- `ground`
- `collectibles`
- `obstacles`
- `finish`
- `enemies`
- `warnings`
- `player`
- `fx`
- `tutorialHint`

Каждый кадр рендерер читает `state` и синхронизирует слой через `sync*Layer(...)`.

Отдельно важно:

- игрок и враг рисуются из sprite-sheet с учётом trimmed frame metadata (`sourceX/sourceY/sourceW/sourceH`);
- это убирает визуальное "плавание" анимации относительно hitbox/позиции.

### 8. UI и DOM-эффекты

DOM отвечает за то, что удобнее/дешевле держать вне Pixi:

- стартовый оверлей;
- win/lose-экраны;
- PayPal reward card;
- countdown;
- footer CTA;
- flying collectible-анимация в HUD.

Логика — в `src/uiEffects.js`, стили — в `src/style.css`.

## Где менять баланс и поведение

Основные конфиги — `src/gameLogic.js`:

- `PLAYER_CONFIG` — позиция, масштаб, прыжок, invincibility.
- `SPEED_CONFIG` — базовая скорость, ускорение врага, замедление на финише.
- `HITBOX_CONFIG` — размеры/сдвиги hitbox'ов.
- `ECONOMY_CONFIG` — стартовый баланс и награды.
- `SPAWN_SEQUENCE` — сценарий спавна по дистанции.

Локальные игровые размеры — `src/game.js`:

- `enemyCollisionScale`
- `collectibleBaseScale`
- `collectibleRenderSize(type)` (например, размер PayPal-карточки в раннере)
- `spawnFinishLine()` и логика `tapeBreakX`

Визуал и позиционирование — `src/renderers/pixiRenderer.js`:

- слои и порядок отрисовки;
- смещения спрайтов;
- позиция/геометрия финишных ворот и ленты;
- эффекты/подсказки.

DOM/UI — `src/style.css`:

- размер шрифтов HUD и end screen;
- позиция footer CTA;
- стили кнопок и оверлеев.

## Часто меняемые точки (шпаргалка)

- Финишные ворота (визуально): `src/renderers/pixiRenderer.js` → `syncFinishLayer(...)`.
- Точка срабатывания финиша: `src/game.js` → `finishLine.tapeBreakX`.
- Размер PayPal-карточки как collectible: `src/game.js` → `collectibleRenderSize("paypalCard")`.
- Размер суммы на большой PayPal-карточке (финальный экран): `src/style.css` → `.paypal-card-amount`.
- Кнопка в футере: `src/style.css` → `.game-footer` и `.footer-cta`.

## Почему рендер анимации выглядит корректно

В исходном референсе кадры атласов trimmed (вырезаны по контенту), поэтому простой `drawImage` по фиксированному размеру даёт артефакты.

В проекте `extract-assets.mjs` сохраняет метаданные исходного прямоугольника (`sourceX/sourceY/sourceW/sourceH`), а Pixi-рендер учитывает их при расчёте `drawX/drawY`. Это сохраняет стабильное положение персонажей в кадре.

## Текущий статус

Реализовано:

- стартовый экран и игровой ран;
- tutorial pause;
- враги, препятствия, коллектаблы, финиш;
- win/lose оверлеи;
- HUD и footer CTA;
- Pixi-рендер сцены и сущностей;
- confetti и flying collectible-эффекты;
- извлечение ассетов из референса и сборка single HTML.

Проект подходит как рабочий прототип для дальнейшей точной подгонки таймингов, позиций, hitbox'ов и визуала под референс.
