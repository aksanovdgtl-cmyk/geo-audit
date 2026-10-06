# GEO Page Audit

**GEO-аудит страницы** · [English](#english) · [Русский](#русский)

[![test](https://github.com/aksanovdgtl-cmyk/geo-audit/actions/workflows/test.yml/badge.svg)](https://github.com/aksanovdgtl-cmyk/geo-audit/actions/workflows/test.yml) [![License: MIT](https://img.shields.io/badge/license-MIT-22f360.svg)](LICENSE) [![Live tool](https://img.shields.io/badge/live-hitz.agency-232323.svg)](https://hitz.agency/en/tools/geo-audit)

## English

Score how ready a web page is to become a source for AI answers. The audit loads one URL, reads its HTML and structured data and returns a 0-100 score with four categories: answer, entity, trust and technical signals. It is a quick self-check of on-page GEO (generative engine optimization) signals, not a replacement for a full audit.

- **Live tool:** [hitz.agency/en/tools/geo-audit](https://hitz.agency/en/tools/geo-audit) (Russian: [hitz.agency/tools/geo-audit](https://hitz.agency/tools/geo-audit))
- **This repository:** the same page and the same server check that run on hitz.agency, ready to self-host on Cloudflare Workers.

### What is scored

Each category is scored from 0 to 100. The total is a weighted sum: answer 30%, entity 25%, trust 25%, technical 20%.

**Answer** (can an AI lift a ready answer from the page)

| Signal | Points |
|---|---|
| The page has an H1 | 15 |
| The first paragraph after the H1 (within about 7 KB of HTML) is 60-500 characters (25+ gives 15) | 30 |
| An H2 or H3 is phrased as a question (what, how, why, when, where, cost, price and Russian equivalents) | 20 |
| At least 4 paragraphs of 35+ characters (2-3 give 8) | 15 |
| A list or table, or FAQPage markup | 20 |

**Entity** (is it clear who or what the page is about)

| Signal | Points |
|---|---|
| Schema.org type Organization, LocalBusiness, ProfessionalService, Person, Product, Service, Article or WebPage | 35 |
| A name and an absolute URL or `@id` in the markup (name only gives 8) | 15 |
| Title and H1 match | 15 |
| Canonical points to the same host | 15 |
| `og:site_name` is set | 10 |
| A logo or image in the markup | 10 |

**Trust** (are there verifiable signals)

| Signal | Points |
|---|---|
| An author: `meta name="author"`, a Person node or `author` in the markup | 20 |
| A date: `article:published_time`, a `<time>` element or `datePublished` / `dateModified` | 15 |
| Links to 2 or more other sites (1 gives 8) | 15 |
| Email and phone on the page or in the markup (one of them gives 10) | 20 |
| An address, or 2 or more `sameAs` profiles (one gives 8) | 15 |
| A meta description (or `og:description`) of 80+ characters (40+ gives 8) | 15 |

**Technical**

| Signal | Points |
|---|---|
| The page answers with HTML | 20 |
| A `<title>` | 15 |
| Exactly one H1 (several give 8) | 20 |
| Canonical points to the same host | 15 |
| No `noindex` in meta robots | 10 |
| Language: `lang`, `og:locale`, `Content-Language` or Cyrillic text | 10 |
| A viewport meta tag | 10 |

Category state: 80+ is a strong signal, 55-79 needs work, below 55 is a priority. Total: 80+ is a good base for GEO, 60-79 partly ready, below 60 needs strengthening.

### API

```http
GET /api/tools/geo-audit?url=https://example.com/page
```

```json
{
  "url": "https://example.com/page",
  "finalUrl": "https://example.com/page",
  "status": 200,
  "score": 74,
  "truncated": false,
  "contentTruncated": false,
  "structuredDataTruncated": false,
  "title": "Страница готова частично",
  "summary": "База есть, но отдельные сигналы мешают странице стать надежным источником.",
  "categories": [
    { "label": "Ответ", "score": 65, "state": "нужно усилить", "copy": "Добавьте короткий ответ после H1, вопросные подзаголовки и списки." },
    { "label": "Сущность", "score": 90, "state": "сильный сигнал", "copy": "Название и тип сущности подтверждены разметкой и метаданными." }
  ]
}
```

`categories` always has 4 items: Ответ (answer), Сущность (entity), Доверие (trust), Техника (technical). Texts are in Russian, as on hitz.agency; the English page translates them in the browser. Add `lang=en` for English error messages.

| Status | When |
|---|---|
| 400 | no `url`; not http(s); login or password in the URL; non-standard port; IP address, localhost or a host that resolves to a private network |
| 403 | browser request from another origin |
| 429 | more than 10 requests per minute from one IP, or 300 in total |
| 502 | the page returned an error code, is not HTML, is empty, timed out (5 seconds) or redirected too many times |

### Limits and safety

The first 160 KB of HTML are analyzed (`contentTruncated` tells when the page was longer). JSON-LD is collected from the whole page, up to 384,000 characters (`structuredDataTruncated`). HTML is streamed through HTMLRewriter, so the page is never stored. Only public websites are fetched: before every request, including up to 3 redirects, the hostname is resolved through DNS over HTTPS and rejected if it points to a private, loopback, link-local or reserved address. The user agent is `HITZ-GEO-Audit/1.0 (+https://hitz.agency)`; change it in `src/core/net.ts` for your own copy.

### Related guides (in Russian)

- [Что такое GEO в 2026: гайд по оптимизации под нейросети](https://hitz.agency/blog/chto-takoe-geo-2026)
- [Чанки: как нейросеть режет страницу и что цитирует](https://hitz.agency/blog/chanki-i-izvlekaemyy-otvet)
- [Когда нужен AEO-аудит: 5 симптомов и самопроверка](https://hitz.agency/blog/kogda-nuzhen-aeo-audit)
- [Как попасть в ответы ChatGPT: гайд для бизнеса 2026](https://hitz.agency/blog/kak-popast-v-otvety-chatgpt)

### Run locally

Requires Node.js 22.18 or newer.

```sh
npm install
npm run dev
```

Open http://localhost:8787 for the Russian interface or http://localhost:8787/en/ for English. The page calls the API on the same origin: `GET /api/tools/geo-audit`.

### Deploy to Cloudflare Workers

```sh
npx wrangler login
npm run deploy
```

One Worker serves `public/` as static assets and answers `/api/tools/geo-audit`. The free Workers plan is enough. HTML is parsed with [HTMLRewriter](https://developers.cloudflare.com/workers/runtime-apis/html-rewriter/), which is built into the Workers runtime.

### Tests

`npm test` runs unit tests and API tests. API tests build the Worker with Wrangler and run it in Miniflare, the local Cloudflare runtime. DNS lookups and site responses come from fixtures, so no request leaves your machine. `npm run check` type-checks the TypeScript.

### Project structure

```text
public/              page (Russian at /, English at /en/), styles, scripts, fonts
src/worker.ts        Worker entry: /api/* goes to the API, everything else to static assets
src/api.ts           route, Origin check, rate limit, error messages
src/core/            the checks themselves (net.ts, html.ts, geo.ts)
test/                unit tests and API tests in Miniflare
provenance.json      where each file comes from on hitz.agency, with checksums
CITATION.cff         citation metadata
```

### More free GEO tools by HITZ

| Tool | Live version | Source |
|---|---|---|
| AI Crawler Access Checker | [hitz.agency/en/tools/ai-crawler-check](https://hitz.agency/en/tools/ai-crawler-check) | [ai-crawler-check](https://github.com/aksanovdgtl-cmyk/ai-crawler-check) |
| llms.txt Checker and Generator | [hitz.agency/en/tools/llms-txt](https://hitz.agency/en/tools/llms-txt) | [llms-txt-generator](https://github.com/aksanovdgtl-cmyk/llms-txt-generator) |
| Prompt Map Generator | [hitz.agency/en/tools/prompt-map](https://hitz.agency/en/tools/prompt-map) | [geo-prompt-map](https://github.com/aksanovdgtl-cmyk/geo-prompt-map) |
| Brand Entity Check | [hitz.agency/en/tools/brand-entity](https://hitz.agency/en/tools/brand-entity) | [brand-entity-check](https://github.com/aksanovdgtl-cmyk/brand-entity-check) |
| Schema / JSON-LD Checker | [hitz.agency/en/tools/schema-check](https://hitz.agency/en/tools/schema-check) | [jsonld-schema-check](https://github.com/aksanovdgtl-cmyk/jsonld-schema-check) |

Catalog with guides: [hitz-geo-tools](https://github.com/aksanovdgtl-cmyk/hitz-geo-tools) · [hitz.agency/en/tools](https://hitz.agency/en/tools)

### How to cite

Use **Cite this repository** on GitHub ([CITATION.cff](CITATION.cff)) or:

> HITZ. GEO Page Audit. https://hitz.agency/en/tools/geo-audit

A link to the live tool is appreciated when you mention it in an article or a talk. The MIT license only requires keeping the copyright notice in copies of the code.

### About HITZ

[HITZ](https://hitz.agency/en) is a GEO agency based in Almaty and Tashkent. We help brands get mentioned and cited in answers from ChatGPT, Gemini, Perplexity, Claude, Google AI Overviews and Yandex Alice. This tool is part of our free [GEO toolkit](https://hitz.agency/en/tools).

### License

[MIT](LICENSE) © 2026 HITZ. The fonts in `public/assets/fonts` are under the SIL Open Font License 1.1. The HITZ name and logo are not covered by the MIT license.

---

## Русский

Оценка того, насколько страница готова стать источником для ответов нейросетей. Аудит загружает один адрес, читает HTML и структурированные данные и ставит балл от 0 до 100 по четырем категориям: ответ, сущность, доверие, техника. Это быстрая самопроверка GEO-сигналов страницы (generative engine optimization), а не замена полного аудита.

- **Онлайн-версия:** [hitz.agency/tools/geo-audit](https://hitz.agency/tools/geo-audit) (английская: [hitz.agency/en/tools/geo-audit](https://hitz.agency/en/tools/geo-audit))
- **Этот репозиторий:** та же страница и та же серверная проверка, что работают на hitz.agency. Можно развернуть у себя в Cloudflare Workers.

### Что оценивается

Каждая категория оценивается от 0 до 100. Итог считается с весами: ответ 30%, сущность 25%, доверие 25%, техника 20%.

**Ответ** (может ли нейросеть забрать со страницы готовый ответ)

| Сигнал | Баллы |
|---|---|
| На странице есть H1 | 15 |
| Первый абзац после H1 (в пределах примерно 7 КБ HTML) длиной 60-500 символов (от 25 символов: 15) | 30 |
| H2 или H3 сформулирован вопросом (что, как, сколько, почему, когда, где, кто и английские аналоги) | 20 |
| Не меньше 4 абзацев от 35 символов (2-3 абзаца: 8) | 15 |
| Список или таблица либо разметка FAQPage | 20 |

**Сущность** (понятно ли, о ком или о чем страница)

| Сигнал | Баллы |
|---|---|
| Тип Schema.org: Organization, LocalBusiness, ProfessionalService, Person, Product, Service, Article или WebPage | 35 |
| Название и абсолютный URL или `@id` в разметке (только название: 8) | 15 |
| Title и H1 совпадают | 15 |
| Canonical ведет на тот же хост | 15 |
| Указан `og:site_name` | 10 |
| Логотип или изображение в разметке | 10 |

**Доверие** (есть ли проверяемые сигналы)

| Сигнал | Баллы |
|---|---|
| Автор: `meta name="author"`, узел Person или `author` в разметке | 20 |
| Дата: `article:published_time`, элемент `<time>` или `datePublished` / `dateModified` | 15 |
| Ссылки на 2 и больше других сайта (одна: 8) | 15 |
| Почта и телефон на странице или в разметке (что-то одно: 10) | 20 |
| Адрес или 2 и больше профиля в `sameAs` (один: 8) | 15 |
| Meta description (или `og:description`) от 80 символов (от 40: 8) | 15 |

**Техника**

| Сигнал | Баллы |
|---|---|
| Страница отвечает HTML | 20 |
| Есть `<title>` | 15 |
| Ровно один H1 (несколько: 8) | 20 |
| Canonical ведет на тот же хост | 15 |
| Нет `noindex` в meta robots | 10 |
| Язык: `lang`, `og:locale`, `Content-Language` или кириллица в тексте | 10 |
| Есть meta viewport | 10 |

Состояние категории: от 80 сильный сигнал, 55-79 нужно усилить, ниже 55 приоритет. Итог: от 80 «Хорошая база для GEO», 60-79 «Страница готова частично», ниже 60 «Страницу нужно усилить».

### API

```http
GET /api/tools/geo-audit?url=https://example.com/page
```

Ответ: исходный и итоговый адрес, код ответа, балл, вывод, пояснение и массив `categories` из четырех категорий (Ответ, Сущность, Доверие, Техника) с баллом, состоянием и рекомендацией. Пример в английском разделе. С параметром `lang=en` ошибки приходят по-английски.

| Код | Когда |
|---|---|
| 400 | нет `url`; не http(s); логин или пароль в адресе; нестандартный порт; IP-адрес, localhost или имя, которое указывает во внутреннюю сеть |
| 403 | запрос браузера с чужого домена |
| 429 | больше 10 запросов в минуту с одного IP или 300 на всех |
| 502 | страница ответила кодом ошибки, это не HTML, она пустая, не ответила за 5 секунд или перенаправлений слишком много |

### Лимиты и безопасность

Разбираются первые 160 КБ HTML (`contentTruncated` сообщает, что страница длиннее). JSON-LD собирается со всей страницы, до 384 000 символов (`structuredDataTruncated`). HTML читается потоком через HTMLRewriter и нигде не сохраняется. Загружаются только публичные сайты: перед каждым запросом, включая до 3 перенаправлений, имя сайта проверяется через DNS over HTTPS, частные, локальные, служебные и зарезервированные адреса отклоняются. User agent: `HITZ-GEO-Audit/1.0 (+https://hitz.agency)`, для своей копии его можно сменить в `src/core/net.ts`.

### Разборы по теме

- [Что такое GEO в 2026: гайд по оптимизации под нейросети](https://hitz.agency/blog/chto-takoe-geo-2026)
- [Чанки: как нейросеть режет страницу и что цитирует](https://hitz.agency/blog/chanki-i-izvlekaemyy-otvet)
- [Когда нужен AEO-аудит: 5 симптомов и самопроверка](https://hitz.agency/blog/kogda-nuzhen-aeo-audit)
- [Как попасть в ответы ChatGPT: гайд для бизнеса 2026](https://hitz.agency/blog/kak-popast-v-otvety-chatgpt)

### Запуск

Нужен Node.js 22.18 или новее.

```sh
npm install
npm run dev
```

Откройте http://localhost:8787 (русский интерфейс) или http://localhost:8787/en/ (английский). Страница обращается к API на своем домене: `GET /api/tools/geo-audit`.

### Публикация в Cloudflare Workers

```sh
npx wrangler login
npm run deploy
```

Один Worker отдает статику из `public/` и отвечает на `/api/tools/geo-audit`. Бесплатного тарифа Workers достаточно. HTML разбирается через [HTMLRewriter](https://developers.cloudflare.com/workers/runtime-apis/html-rewriter/), он встроен в среду Workers.

### Проверки

`npm test` запускает модульные тесты и тесты API. Для тестов API Worker собирается Wrangler и работает в Miniflare, локальной среде Cloudflare. DNS и ответы сайтов подставляются из фикстур: запросы в интернет не уходят. `npm run check` проверяет типы TypeScript.

### Структура

```text
public/              страница (русская на /, английская на /en/), стили, скрипты, шрифты
src/worker.ts        вход Worker: /api/* в API, остальное в статику
src/api.ts           маршрут, проверка Origin, лимит запросов, тексты ошибок
src/core/            сами проверки (net.ts, html.ts, geo.ts)
test/                модульные тесты и тесты API в Miniflare
provenance.json      откуда взят каждый файл на hitz.agency, контрольные суммы
CITATION.cff         данные для цитирования
```

### Другие бесплатные инструменты HITZ

| Инструмент | Онлайн | Исходный код |
|---|---|---|
| Проверка доступа AI-краулеров | [hitz.agency/tools/ai-crawler-check](https://hitz.agency/tools/ai-crawler-check) | [ai-crawler-check](https://github.com/aksanovdgtl-cmyk/ai-crawler-check) |
| Проверка и генератор llms.txt | [hitz.agency/tools/llms-txt](https://hitz.agency/tools/llms-txt) | [llms-txt-generator](https://github.com/aksanovdgtl-cmyk/llms-txt-generator) |
| Генератор карты промтов | [hitz.agency/tools/prompt-map](https://hitz.agency/tools/prompt-map) | [geo-prompt-map](https://github.com/aksanovdgtl-cmyk/geo-prompt-map) |
| Проверка сущности бренда | [hitz.agency/tools/brand-entity](https://hitz.agency/tools/brand-entity) | [brand-entity-check](https://github.com/aksanovdgtl-cmyk/brand-entity-check) |
| Проверка и генератор Schema / JSON-LD | [hitz.agency/tools/schema-check](https://hitz.agency/tools/schema-check) | [jsonld-schema-check](https://github.com/aksanovdgtl-cmyk/jsonld-schema-check) |

Каталог с разборами: [hitz-geo-tools](https://github.com/aksanovdgtl-cmyk/hitz-geo-tools) · [hitz.agency/tools](https://hitz.agency/tools)

### Как сослаться

Кнопка GitHub **Cite this repository** ([CITATION.cff](CITATION.cff)) или строка:

> HITZ. GEO-аудит страницы. https://hitz.agency/tools/geo-audit

Если упоминаете инструмент в статье или докладе, будем рады ссылке на онлайн-версию. Лицензия MIT требует только сохранить уведомление об авторстве в копиях кода.

### О HITZ

[HITZ](https://hitz.agency/) - GEO-агентство из Алматы и Ташкента. Помогаем брендам попадать в ответы ChatGPT, Gemini, Perplexity, Claude, Google AI Overviews и Алисы. Инструмент входит в набор [бесплатных GEO-инструментов](https://hitz.agency/tools).

### Лицензия

[MIT](LICENSE) © 2026 HITZ. Шрифты в `public/assets/fonts` распространяются по SIL Open Font License 1.1. Название и логотип HITZ под лицензию MIT не подпадают.
