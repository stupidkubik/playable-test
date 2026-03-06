# Changelog

## 2026-03-06

- Оптимизирован загрузочный asset pipeline:
  - добавлены стадии `loaded/decoded/gpuReady/usable`;
  - декод ассетов вынесен в deferred-path с idle-yield;
  - prewarm рендера и UI переведён в безопасный post-boot режим.
- Убраны лишние layout-обновления: no-op `measure/notify` теперь пропускаются, CSS vars и `data-*` применяются инкрементально.
- Повышена устойчивость старта: warmup-ошибки больше не валят `boot`, добавлен явный лог `runtime initialization failed`.
- Исправлена single-html сборка: трансформ больше не вырезает helper-функции asset warmup из `dist/playable.html`.
- Добавлено дробление renderer prewarm по idle-слайсам (`batch=1`) для снижения длинных main-thread пиков в low-tier профиле.
- Упрощён деплой-пайплайн под single-file: удалён Service Worker runtime и связанная сборочная обвязка (`dist/pages` теперь включает только `index.html` и `.nojekyll`).
- Анимация fly-to-HUD переведена в единый Pixi/WebGL пайплайн:
  - добавлен отдельный `hudFx` слой в рендерере;
  - эффекты полёта призов обновляются в game-state и рендерятся через sprite-pool;
  - legacy DOM fly-layer и связанный CSS удалены; fallback остаётся через `hudPulse`, если эффект не удалось заспавнить.
- Введён фазовый контроллер DOM-анимаций (`loading/intro/gameplay/end`) для системного снижения compositor-пиков:
  - бесконечные DOM-анимации (`intro-hand`, `footer-cta`, `end CTA`) теперь включаются только в релевантных фазах;
  - gameplay-фаза больше не запускает тяжелые циклические UI-анимации поверх WebGL;
  - `hud` pulse в `uiEffects` ограничен фазой и минимальным интервалом, чтобы не перезапускать CSS-анимацию в каждом тике.
- Добавлен системный SFX runtime-governor для снижения фризов на iOS и low-tier устройствах:
  - `playSound` переведён на policy-driven playback (глобальный/key/group cooldown);
  - введён voice-pool для SFX (без агрессивного `currentTime=0` на одном и том же элементе);
  - `hit/hurt` объединены через общий `damage`-групповой cooldown, чтобы не запускать двойной звук в один тик;
  - добавлен runtime-профиль аудио (`default`/`constrained`, override через `?audioProfile=`) и расширенная диагностика причин дропа звука в stress-событиях.

## 2026-03-02

- Стабилизирован `landscape` layout: позиционирование игрока и pacing экрана стали предсказуемее на широких вьюпортах.
- Снижен рендер-оверхед в Pixi-слое (часть операций вынесена из горячего пути кадра).
- Stress-режим вынесен в отдельный runtime-модуль:
  - `src/stress/runtime.full.js` для диагностики;
  - `src/stress/runtime.stub.js` для production-сборки.
- Добавлена отдельная сборка `npm run build:stress` (`dist/playable.stress.html`) без загрязнения основного бандла.
- Локальные диагностические артефакты вынесены в `artifacts/local/` и исключены из git.
