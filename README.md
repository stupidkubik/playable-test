# Runner Playable Clone

Клон playable-креатива по референсу: [playbox.play.plbx.ai/playoff/runner](https://playbox.play.plbx.ai/playoff/runner).

Проект сделан как lightweight playable на чистом JS:

- `Pixi.js` (v8) рендерит игровую сцену и сущности;
- DOM/CSS отвечают за HUD, оверлеи и CTA;
- сборка упаковывается в single HTML (`dist/playable.html`).

Краткая история изменений: [CHANGELOG.md](./CHANGELOG.md).

## Содержание

- [Быстрый старт](#быстрый-старт)
- [Скрипты](#скрипты)
- [Структура проекта](#структура-проекта)
- [Runtime: актуальная логика](#runtime-актуальная-логика)
- [Perf debug режим](#perf-debug-режим)
- [Stress режим](#stress-режим)
- [Где менять поведение](#где-менять-поведение)
- [Тесты](#тесты)
- [Публикация на GitHub Pages](#публикация-на-github-pages)

## Быстрый старт

Требования: `Node.js 18+`.

```bash
npm install
npm run dev
```

Локальный запуск: `http://localhost:5173`.

## Скрипты

- `npm run dev` — локальный dev-server.
- `npm run stress` — запуск dev-server в режиме стресс-теста (с готовыми query-параметрами).
- `npm run stress:heavy` — агрессивный профиль для воспроизведения фризов (больше спавна, больше сущностей, без 30 FPS cap в landscape).
- `npm test` — unit-тесты (`node --test`).
- `npm run build` — single-html сборка в `dist/playable.html` + автоматическая проверка лимита `< 5 MB` и запрета runtime-догрузок.
- `npm run verify:bundle` — отдельная проверка готового `dist/playable.html` (размер + forbidden runtime references).
- `npm run build:stress` — single-html сборка c полным stress-runtime (для профилирования в билде, выходной файл `dist/playable.stress.html`).
- `npm run build:pages` — сборка + подготовка Pages-артефакта в `dist/pages/` (корневой `index.html` + `.nojekyll`).

## Структура проекта

- `index.html` — корневая разметка (canvas, HUD, overlays, footer CTA).
- `src/game.js` — runtime-оркестратор (state, game loop, spawn/collision, input, audio, transitions).
- `src/gameLogic.js` — чистая логика/константы (конфиги, hitbox, spawn distance, finish gate geometry).
- `src/viewport.js` — адаптер viewport/layout для runtime.
- `src/layout/layoutEngine.js` — layout-движок: aspect-bucket, camera/world transform, UI/gameplay tokens, CSS vars.
- `src/renderers/pixiRenderer.js` — Pixi-рендер слоев, sprite pooling, finish/tape, combo popups, tutorial hint.
- `src/uiEffects.js` — DOM-эффекты (end screen, countdown, flying collectibles).
- `src/stress/runtime.full.js` — полный stress/runtime профайлер.
- `src/stress/runtime.stub.js` — no-op stub для чистого production bundle.
- `src/style.css` — стили fullscreen shell, HUD, overlays, footer.
- `src/assets/*.js` — локальные ассеты (images/audio/frames), включая split-модули `imagesCritical/imagesDeferred`, `audioMusic/audioSfx`.
- `scripts/build-single-html.mjs` — упаковка ассетов, Pixi runtime и проекта в один HTML.
- `scripts/prepare-pages-artifact.mjs` — подготовка deploy-артефакта для GitHub Pages в `dist/pages/`.
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

SFX теперь проходят через системный runtime-governor:

- policy-driven playback (global/key/group cooldown);
- primary backend: WebAudio (`AudioBufferSource` one-shot + unlock/resume по user gesture);
- fallback backend: HTMLAudio voice-pool (если WebAudio недоступен или буфер не декодирован);
- runtime-профиль `default|constrained` (автодетект), с ручным override через query `?audioProfile=constrained`.

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

## Stress режим

В `src/game.js` есть runtime stress-профайлер для поиска hot spots во время игры:

- измеряет `frame/update/render` и секции (`checkSpawns`, `checkCollisions`, `cleanupEntities`, `updateEntities` и др.);
- показывает HUD с live-метриками, hotspot и активными alerts;
- пишет журнал stress-событий (trigger/resolved alerts, summary) в report;
- фиксирует freeze-окна в `running`, когда `distanceTraveled` не меняется дольше `120ms`;
- отделяет `in-run` stalls от переходных (`distance-reset`/`mode-transition`) через transition grace;
- добавляет корреляцию `freeze -> nearbyEvents` (collision/hit/pause/resume/sound-start);
- по завершении теста сохраняет отчет в `window.__PLAYABLE_STRESS_REPORT__`.

Быстрый запуск:

```bash
npm run stress
npm run stress:heavy
```

По сборке:

- `npm run build` использует `src/stress/runtime.stub.js` (stress-код не попадает в прод-бандл);
- `npm run build:stress` включает `src/stress/runtime.full.js` и пишет артефакт в `dist/playable.stress.html`.

## Локальные артефакты

- Локальные stress-отчеты, видео и временные файлы складываются в `artifacts/local/`.
- `artifacts/local/` не коммитится в репозиторий (добавлен в `.gitignore`).
- `dist/playable.stress.html` тоже считается локальным диагностическим артефактом и не коммитится.

Скрипт выводит URL с параметрами, например:

- `stress=1` — включить stress-режим;
- `stressDurationSec=90` — длительность прогона;
- `stressViewport=932x430` — фиксированный viewport;
- `stressFrameBudgetMs=16.67` — целевой frame budget (по умолчанию для 60 FPS).

Полезные runtime-объекты:

- `window.__PLAYABLE_STRESS_REPORT__` — финальный JSON-отчёт;
- `window.__PLAYABLE_GET_STRESS_REPORT__()` — получить отчёт в любой момент;
- `window.__PLAYABLE_STRESS_EVENTS__` — журнал событий stress-режима (после завершения).

Полезные блоки в JSON-отчете:

- `report.freeze.windows` — детектированные freeze-окна;
- `report.freeze.windows[*].classification` — `in-run` или `transition`;
- `report.freeze.windows[*].nearbyEvents` — события рядом с freeze-окном;
- `report.summary.freezeWindows` / `freezeTotalMs` — stalls именно в `running`;
- `report.summary.transitionFreezeWindows` / `transitionFreezeTotalMs` — переходные stalls;
- `report.summary.maxRunningStallMs` — максимальный stall по всем окнам.

Дополнительные ENV для `npm run stress`:

- `STRESS_VIEWPORT_W`, `STRESS_VIEWPORT_H`
- `STRESS_DURATION_SEC`
- `STRESS_FRAME_BUDGET_MS`
- `STRESS_MUTE_AUDIO`
- `STRESS_AUTO_RESTART`
- `STRESS_INVINCIBLE`
- `STRESS_INFINITE_LIVES`
- `STRESS_PAUSE_AUTO_RESUME_SEC`
- `STRESS_PROFILE` (`default`/`heavy`)
- `STRESS_DOWNLOAD_REPORT` (по умолчанию `1`)
- `STRESS_LOG` (по умолчанию `1`)
- `STRESS_ALERTS` (по умолчанию `1`)
- `STRESS_ALERT_FRAME_P95_MS`
- `STRESS_ALERT_FRAME_P99_MS`
- `STRESS_ALERT_SECTION_P95_MS`
- `STRESS_ALERT_OVER_BUDGET_PCT`
- `STRESS_ALERT_DROPPED_FRAMES`
- `STRESS_LANDSCAPE_UNCAP`
- `STRESS_SPAWN_BURST_SCALE`
- `STRESS_SPAWN_DISTANCE_SCALE`
- `STRESS_EXTRA_ENEMIES`
- `STRESS_EXTRA_OBSTACLES`
- `STRESS_EXTRA_COLLECTIBLES`
- `STRESS_ENTITY_CAP`

Текущий тестовый режим по умолчанию:

- 60 FPS target;
- столкновения включены (не invincible);
- бесконечные жизни (`STRESS_INFINITE_LIVES=1`);
- tutorial pause авто-возобновляется через `2s` (`STRESS_PAUSE_AUTO_RESUME_SEC=2`).

Рекомендации по использованию stress-режима:

- прогонять не меньше 60-90 секунд на каждом целевом формате;
- использовать фиксированные viewport-профили (например `932x430`, `915x412`, `667x375`) для сопоставимых результатов;
- смотреть не только `max`, но и `p95/p99` (именно они показывают системные фризы);
- сравнивать отчеты до/после изменений на одном и том же девайсе и с теми же параметрами;
- держать overhead профайлера низким: без детального per-frame логирования и сетевых запросов в кадре.

Рекомендации по alerts:

- стартовые пороги: `frame p95 <= 38ms`, `frame p99 <= 48ms`, `section p95 <= 8ms`;
- тревожный сигнал: `overBudgetSharePct > 20%` или быстро растущий `droppedFrames`;
- при частых alert-triggered смотреть `report.sections` и `report.logs` — это самый быстрый путь до корневой причины.
- если обычный `stress` чистый, запускать `stress:heavy`: он лучше вскрывает проблемы рендера/спавна на длинном прогоне.

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

Публикация идет как статический сайт (без шага `jekyll-build-pages`):

- `dist/playable.html` — собранный single-html playable.
- `dist/pages/index.html` — корневая страница deploy-артефакта (копия `dist/playable.html`).
- `.github/workflows/pages.yml` — CI для сборки и деплоя, загружает артефакт из `./dist/pages`.
- `scripts/prepare-pages-artifact.mjs` — подготовка `dist/pages/*` перед upload.

В артефакт добавляется `.nojekyll`, чтобы GitHub Pages не запускал Jekyll-обработку.
В `Settings -> Pages` должен быть выбран `Source: GitHub Actions`; деплой запускается по push в `main`.
