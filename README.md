# Runner Playable Clone

Клон playable-креатива по референсу: [playbox.play.plbx.ai/playoff/runner](https://playbox.play.plbx.ai/playoff/runner).

Проект собран как lightweight playable на чистом JS с `Pixi.js` (v8) для рендера, DOM-оверлеями для UI и сборкой в single HTML.

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
- `npm run extract:assets` - генерация `src/assets/extractedAssets.js` из `original/file.html`.
- `npm run build` - extraction + сборка `dist/playable.html`.

## Структура

- `index.html` - корневая разметка и контейнеры экранов.
- `src/game.js` - игровой цикл, состояние, спавн, коллизии, input, загрузка ассетов.
- `src/gameLogic.js` - чистая логика (константы, hitbox-функции, экономика, spawn).
- `src/renderers/pixiRenderer.js` - рендер сцены/сущностей в Pixi.js.
- `src/uiEffects.js` - DOM/HUD анимации (end screen, flying collectibles, countdown).
- `src/style.css` - стили HUD, оверлеев, футера и эффектов.
- `src/assets/extractedAssets.js` - сгенерированный модуль с data-uri и кадрами.
- `scripts/extract-assets.mjs` - парсинг ассетов и frame-метаданных из `original/file.html`.
- `scripts/build-single-html.mjs` - упаковка в один HTML.
- `original/` - сохранённые исходные HTML-файлы референса.
- `test/gameLogic.test.js` - unit-тесты логики.

## Как работает игра

Основной цикл (`requestAnimationFrame`) в `src/game.js`:

1. Обновление скорости/дистанции.
2. Спавн сущностей по `SPAWN_SEQUENCE`.
3. Движение врагов, препятствий, коллектаблов.
4. Проверка столкновений и апдейт HP/score.
5. Рендер сцены через Pixi + DOM UI/оверлеи.

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
- рендер игрока и врага в `src/renderers/pixiRenderer.js` строится через frame/source metadata атласа.

Результат: анимация заметно стабильнее и ближе к оригиналу.

## Где крутить баланс и поведение

Основные параметры в `src/gameLogic.js`:

- `PLAYER_CONFIG` - прыжок, масштаб, invincibility.
- `SPEED_CONFIG` - скорость бега, замедление, tutorial distance.
- `HITBOX_CONFIG` - размеры hitbox'ов.
- `ECONOMY_CONFIG` - деньги/награды.
- `SPAWN_SEQUENCE` - сценарий появления сущностей.

Визуальные рендер-параметры:

- `src/renderers/pixiRenderer.js` - позиционирование/слои/отрисовка спрайтов и FX.
- `src/style.css` - HUD, оверлеи, футер, CTA и DOM-анимации.
- `src/game.js` - размеры/scale отдельных сущностей (например obstacle/collectible spawn box).

## Текущий статус

Сейчас реализовано:

- стартовый экран, игровой ран, win/lose экраны;
- HUD (жизни/счет), футер, CTA;
- игрок, враг, препятствия, коллектаблы;
- парралакс/сцена и базовая референс-логика;
- Pixi-only рантайм (legacy canvas удалён из рабочего пути);
- tutorial pause / confetti / flying collectible → HUD / музыка из extracted assets.

Проект подходит как тестовый прототип под дальнейшую точную подгонку под референс.
