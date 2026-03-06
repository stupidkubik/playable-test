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

## 2026-03-02

- Стабилизирован `landscape` layout: позиционирование игрока и pacing экрана стали предсказуемее на широких вьюпортах.
- Снижен рендер-оверхед в Pixi-слое (часть операций вынесена из горячего пути кадра).
- Stress-режим вынесен в отдельный runtime-модуль:
  - `src/stress/runtime.full.js` для диагностики;
  - `src/stress/runtime.stub.js` для production-сборки.
- Добавлена отдельная сборка `npm run build:stress` (`dist/playable.stress.html`) без загрязнения основного бандла.
- Локальные диагностические артефакты вынесены в `artifacts/local/` и исключены из git.
