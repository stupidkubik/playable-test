# Runner Playable Clone

Клон playable-креатива по референсу: `https://playbox.play.plbx.ai/playoff/runner`.

Текущий фокус: собрать проект, максимально близкий к референсу, на базе извлеченных ассетов из `file.html`.

## Текущее состояние

- Базовый игровой цикл работает: бег, прыжок, препятствия, сбор монет, столкновения, конец рана.
- Есть локальный сервер, тесты логики и сборка в единый HTML.
- В проект уже подтянуты ключевые ассеты (спрайт персонажа, врага, часть UI, часть SFX), но еще не все ассеты из референса подключены в саму игру.

## Структура проекта

- `index.html` - точка входа.
- `src/game.js` - рендер, игровой цикл, работа с ассетами и UI.
- `src/gameLogic.js` - изолированная игровая логика для тестов.
- `src/style.css` - стили интерфейса.
- `src/assets/extractedAssets.js` - сгенерированный модуль с data-uri ассетами.
- `scripts/extract-assets.mjs` - извлечение ассетов из `file.html`.
- `scripts/dev-server.mjs` - локальный dev-сервер.
- `scripts/build-single-html.mjs` - сборка single-file HTML.
- `test/gameLogic.test.js` - тесты игровой логики.

## Команды

```bash
npm run dev
```

Локальный запуск: `http://localhost:5173`.

```bash
npm test
```

Запуск тестов.

```bash
npm run extract:assets
```

Повторная генерация `src/assets/extractedAssets.js` из `file.html`.

```bash
npm run build
```

Сборка финального файла: `dist/playable.html`.

## Ассеты: уже в проекте

Ниже список ассетов, которые уже экспортируются в `src/assets/extractedAssets.js` и используются в текущей версии проекта.

### Images

- `playerSheet` (`_S`) - спрайтшит игрока.
- `enemySheet` (`rq`) - спрайтшит врага.
- `failBanner` (`Dq`) - баннер FAIL.
- `tutorialHand` (`Yq`) - hand-иконка туториала.
- `hudCounter` (`Oq`) - верхний счетчик.
- `collectibleIcon` (`Mp`) - иконка основной монеты.
- `backdropPortrait` (`Fl`) - фон футера (portrait).
- `backdropLandscape` (`Kl`) - фон футера (landscape).

### Audio

- `jump` (`Bq`)
- `hit` (`Nq`)
- `collect` (`wq`)

### Frames

- `playerRun`: 8 кадров (`run_0..run_7`)
- `playerJump`: 10 кадров (`jump_0..jump_9`)
- `playerHurt`: 5 кадров (`hurt_0..hurt_4`)
- `enemyRun`: 14 кадров (`frame_0..frame_13`)

## Ассеты: еще нужно подключить из референса

Эти ассеты есть в `file.html`, но пока не интегрированы в `src/assets/extractedAssets.js` и/или текущий рендер.

### Дополнительные SFX и музыка

- `hurt` (`Qq`)
- `step` (`Pq`)
- `win` (`Jq`)
- `lose` (`Gq`)
- `music` (`Wq`)

### Коллектаблы и UI-элементы

- `Ep` - изображение PayPal-карточки (второй тип collectible).
- `Lq` - иконка второго collectible (используется в fly-анимации).
- `jq` - light/glow-эффект карточки.

### Сцена/окружение

- `gq` - большой фон сцены.
- `Eq`, `Vq` - деревья.
- `Mq` - фонарь.
- `mq`, `Sq`, `qq` - кусты.
- `nq`, `aq` - glow/overlay для сцены.

### Финишная зона/дорожка

- `hq`, `cq`, `uq`, `dq`, `fq` - элементы паттерна и лент финишной линии.

### Частицы/визуальные эффекты

- `bq`, `yq`, `xq`, `vq`, `Cq`, `Uq` - набор мелких текстур частиц.

## Что делать дальше

1. Дорасширить `scripts/extract-assets.mjs` на все ассеты выше.
2. Подключить их в `src/game.js` (фон, декор, второй collectible, частицы, музыка и недостающие SFX).
3. После каждой итерации сверять поведение с референсом и прогонять `npm test`.
