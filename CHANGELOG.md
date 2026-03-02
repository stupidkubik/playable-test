# Changelog

## 2026-03-02

- Стабилизирован `landscape` layout: позиционирование игрока и pacing экрана стали предсказуемее на широких вьюпортах.
- Снижен рендер-оверхед в Pixi-слое (часть операций вынесена из горячего пути кадра).
- Stress-режим вынесен в отдельный runtime-модуль:
  - `src/stress/runtime.full.js` для диагностики;
  - `src/stress/runtime.stub.js` для production-сборки.
- Добавлена отдельная сборка `npm run build:stress` (`dist/playable.stress.html`) без загрязнения основного бандла.
- Локальные диагностические артефакты вынесены в `artifacts/local/` и исключены из git.
