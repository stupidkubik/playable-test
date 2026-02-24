---
layout: default
title: Runner Playable Clone
---

# Runner Playable Clone

Демо playable-раннера, опубликованное через GitHub Pages (Jekyll).

## Запуск демо

- [Открыть playable](./playable/)

## Что это

- Игровая логика: `src/game.js`, `src/gameLogic.js`
- Рендер: `src/renderers/pixiRenderer.js`
- UI/оверлеи: `src/style.css`, `src/uiEffects.js`

## Технические заметки

- `docs/playable/index.html` генерируется автоматически из `dist/playable.html`
- Для деплоя используется GitHub Actions workflow `.github/workflows/pages.yml`

## Внутренние документы

- [План миграции Pixi](./pixi-migration-plan)
- [Чеклист parity](./pixi-parity-checklist)
