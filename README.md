# Runner Playable Clone

Стартовый проект для клона playable runner (`https://playbox.play.plbx.ai/playoff/runner`) с логикой, написанной с нуля.

## Что внутри

- Canvas-игра с core-механикой: бег, прыжок, препятствия, коллизии, счёт, game over.
- Извлечение ассетов из `file.html` (спрайты, UI-изображения, SFX) в модуль `src/assets/extractedAssets.js`.
- Локальный dev-server без внешних зависимостей.
- Node-тесты для игровой логики.
- Скрипт сборки в единый HTML: `dist/playable.html`.

## Быстрый старт

```bash
npm run dev
```

Открыть в браузере: `http://localhost:5173`

## Тесты

```bash
npm test
```

## Сборка single-file HTML

```bash
npm run build
```

`build` автоматически перегенерирует ассеты из `file.html` перед упаковкой.

После сборки проверь размер файла:

```bash
ls -lh dist/playable.html
```

## Следующий этап по ТЗ

1. Извлечь и подключить реальные ассеты из референса (спрайты персонажа, фона, врагов, SFX).
2. Довести анимации и поведение до максимально близкого к оригиналу.
3. Добавить рескин (новый персонаж + фон).
4. Задеплоить `dist/playable.html` на GitHub Pages или Vercel.
