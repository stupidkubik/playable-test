# Runner Playable Clone

Клон playable-креатива по референсу: [playbox.play.plbx.ai/playoff/runner](https://playbox.play.plbx.ai/playoff/runner).

Проект сделан как lightweight playable на чистом JS:

- `Pixi.js` (v8) рендерит игровую сцену и сущности;
- DOM/CSS отвечают за HUD, оверлеи и CTA;
- сборка упаковывается в single HTML (`dist/playable.html`).

## Быстрый старт

Требования: `Node.js 18+`.

```bash
npm install
npm run dev
```

Локальный запуск: `http://localhost:5173`.

## Скрипты

- `npm run dev` — локальный dev-server.
- `npm test` — unit-тесты (`node --test`).
- `npm run build` — single-html сборка в `dist/playable.html`.
- `npm run build:pages` — сборка + копирование в `docs/playable/index.html` для GitHub Pages.

## Структура проекта

- `index.html` — корневая разметка (canvas, HUD, overlays, footer CTA).
- `src/game.js` — runtime-оркестратор (state, game loop, spawn/collision, input, audio, transitions).
- `src/gameLogic.js` — чистая логика/константы (конфиги, hitbox, spawn distance, finish gate geometry).
- `src/viewport.js` — адаптер viewport/layout для runtime.
- `src/layout/layoutEngine.js` — layout-движок: aspect-bucket, camera/world transform, UI/gameplay tokens, CSS vars.
- `src/renderers/pixiRenderer.js` — Pixi-рендер слоев, sprite pooling, finish/tape, combo popups, tutorial hint.
- `src/uiEffects.js` — DOM-эффекты (end screen, countdown, flying collectibles).
- `src/style.css` — стили fullscreen shell, HUD, overlays, footer.
- `src/assets/*.js` — локальные ассеты (images/audio/frames), включая split-модули `imagesCritical/imagesDeferred`, `audioMusic/audioSfx`.
- `scripts/build-single-html.mjs` — упаковка ассетов, Pixi runtime и проекта в один HTML.
- `test/gameLogic.test.js` — unit-тесты логики.

## Runtime: актуальная логика

### 1. Инициализация и staged preload (`src/game.js`)

При старте:

1. Поднимается `viewportManager` и подписка на layout-изменения.
2. Инициализируется `state` (режим, игрок, сущности, очки, аудио, эффекты).
3. Ресурсы грузятся в 2 фазы:
   - critical: минимальный набор картинок + music;
   - deferred: остальная графика + sfx в фоне.
4. После critical-пакета можно запускать игровой цикл, deferred-пакет догружается параллельно.

Это снижает time-to-interactive в dev/runtime и отдельно прогревает музыку.

### 2. Полноэкранный адаптивный layout (`src/layout/layoutEngine.js`, `src/viewport.js`)

Layout engine на каждом resize/orientation-change считает:

- `bucket` формата (`portrait_*`, `landscape_*`);
- `cameraViewWorldRect` и `cameraTransform`;
- `uiTokens` (HUD/footer/overlay размеры, шрифты, паддинги);
- `gameplayTokens` (позиция игрока, groundY, spawn/cleanup параметры, tutorial text Y);
- CSS variables и data-атрибуты (`data-layout-*`) для DOM-слоя.

Камера тянет мир на весь viewport без искажения пропорций спрайтов; UI адаптируется отдельными токенами.

### 3. Состояния игры (`STATES` в `src/gameLogic.js`)

- `loading`
- `intro`
- `running`
- `paused` (tutorial pause)
- `end_win`
- `end_lose`

Переходы управляются `startRun`, `triggerTutorialPause`, `resumeFromTutorial`, `handleWin`, `handleLose`.

### 4. Игровой цикл (`requestAnimationFrame`)

`gameLoop()` в `src/game.js`:

1. считает `delta`;
2. вызывает `update(...)`;
3. вызывает `render(...)`;
4. планирует следующий кадр.

В `running`:

- обновляется скорость и deceleration на финише;
- двигаются сущности и фон;
- выполняется spawn;
- проверяются коллизии/сбор;
- удаляются сущности за cleanup-границей;
- апдейтится игрок (прыжок/инвулн/анимация).

### 5. Spawn и cleanup

Сценарий уровня задает `SPAWN_SEQUENCE` (`src/gameLogic.js`).

Дистанция спавна (`distance`) переводится в пиксели через runtime-метрики:

- в `landscape` используется фиксированное окно вокруг игрока (стабильный pacing);
- в `portrait` окно зависит от camera/world размера и bucket.

Дополнительно при смене layout есть `resizeCooldownMs`, чтобы избежать burst-спавна в момент resize/orientation switch.

### 6. Коллизии, экономика, combo popups

- hitbox игрока/врага/препятствия и collectible-intersection считаются в `src/gameLogic.js`;
- экономика (`ECONOMY_CONFIG`): стартовый баланс, номиналы наград, HP;
- при серии сборов показываются мотивационные popups (`Perfect/Awesome/Fantastic`);
- streak сбрасывается при получении урона.

### 7. Финиш, лента и конфетти

- геометрия финишных ворот и ленты централизована в `computeFinishGateGeometry(...)`;
- при пересечении break-line запускается deceleration и анимация разрыва ленты;
- конфетти делается сериями залпов: основной burst + отложенные follow-up burst-ы.

### 8. Рендер Pixi (`src/renderers/pixiRenderer.js`)

Слои:

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
- `comboPopups`
- `tutorialHint`

Текущие оптимизации:

- object pool для часто меняющихся сущностей;
- early-return и кэш параметров для sky/decor при неизменном кадре;
- culling декора вне видимого окна;
- prewarm текстур/текстовых нод перед рантаймом.

### 9. DOM-слой (`src/uiEffects.js`, `src/style.css`)

DOM управляет:

- HUD (сердца и счет);
- стартовым overlay;
- win/lose overlay;
- reward card + countdown + CTA;
- footer CTA.

CSS завязан на layout variables (`--layout-*`, `--game-viewport-*`) и поддерживает fullscreen для portrait/landscape.

## Perf debug режим

В `src/game.js` есть встроенный perf-логгер.

Включение:

- query: `?debugPerf=1`
- или `localStorage.setItem("playable:debugPerf", "1")`
- или глобально: `window.__PLAYABLE_DEBUG_PERF__ = true`

Настройка порогов:

- `debugPerfFrameMs`
- `debugPerfSpawnMs`
- `debugPerfGapMs`

Логгер пишет предупреждения по slow frame и slow `checkSpawns()`.

## Где менять поведение

### Баланс и геймплей (`src/gameLogic.js`)

- `PLAYER_CONFIG`
- `SPEED_CONFIG`
- `HITBOX_CONFIG`
- `ECONOMY_CONFIG`
- `FINISH_CONFIG`
- `SPAWN_SEQUENCE`

### Runtime-параметры (`src/game.js`)

- размеры/масштабы runtime-сущностей;
- поведение combo/confetti;
- правила spawn/collision/reset;
- логика переходов состояний.

### Адаптив и компоновка (`src/layout/layoutEngine.js`, `src/style.css`)

- bucket-правила и camera caps;
- player base X по форматам;
- spawn/cleanup window токены;
- HUD/footer/end-overlay размеры и типографика.

### Визуал сцены (`src/renderers/pixiRenderer.js`)

- порядок слоев;
- позиционирование декора;
- анимация финишной ленты;
- tutorial/combo текст.

## Тесты

`npm test` покрывает критичную часть `src/gameLogic.js`:

- базовая геометрия коллизий;
- spawn conversion/check;
- jump math;
- finish gate geometry.

## Публикация на GitHub Pages

В проекте настроены:

- `_config.yml`
- `docs/index.md`
- `.github/workflows/pages.yml`
- `scripts/prepare-pages.mjs`

В `Settings -> Pages` выбирается `Source: GitHub Actions`, дальше деплой идет через push в `main`.
