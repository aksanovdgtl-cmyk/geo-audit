// Тесты API в Miniflare: GET /api/tools/geo-audit?url=... с подставными страницами.
import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { html, startWorker } from './helpers/worker.mjs';

const STRONG = `<!doctype html>
<html lang="ru">
<head>
  <title>Сколько стоит GEO-продвижение - Example Agency</title>
  <meta name="description" content="Цены на GEO-продвижение: из чего складывается стоимость, сроки работ и что входит в пакет. Разбор на примерах проектов.">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="author" content="Анна Иванова">
  <meta property="og:site_name" content="Example Agency">
  <link rel="canonical" href="https://example.com/geo/price">
  <script type="application/ld+json">{"@context":"https://schema.org","@graph":[
    {"@type":"Organization","name":"Example Agency","url":"https://example.com/","logo":"https://example.com/logo.png",
     "sameAs":["https://www.linkedin.com/company/example","https://t.me/example"],"address":{"@type":"PostalAddress","addressLocality":"Алматы"}},
    {"@type":"Article","headline":"Сколько стоит GEO-продвижение","datePublished":"2026-09-01","author":{"@type":"Person","name":"Анна Иванова"}},
    {"@type":"FAQPage","mainEntity":[]}
  ]}</script>
</head>
<body>
  <h1>Сколько стоит GEO-продвижение</h1>
  <p>GEO-продвижение стоит от 900 долларов в месяц: цена зависит от числа страниц, конкурентов в нише и объема контента.</p>
  <h2>Что входит в стоимость</h2>
  <p>Аудит видимости в нейросетях, карта промтов, доработка страниц и разметки, ежемесячный замер упоминаний.</p>
  <ul><li>Аудит</li><li>Контент</li><li>Замеры</li></ul>
  <h2>Как считается срок</h2>
  <p>Первые изменения в ответах заметны через 6-10 недель, по данным <a href="https://research.example.org/geo">исследования</a> и <a href="https://another.example.net/report">отчета</a>.</p>
  <p>Пишите на <a href="mailto:hello@example.com">hello@example.com</a> или звоните <a href="tel:+77001234567">+7 700 123 45 67</a>.</p>
  <time datetime="2026-09-01">1 сентября 2026</time>
</body>
</html>`;

const WEAK = `<html><head><title>Главная</title></head><body><div>Добро пожаловать</div></body></html>`;

let worker;

before(async () => {
  worker = await startWorker({
    sites: {
      'https://example.com/geo/price': () => html(STRONG),
      'https://weak.example/': () => html(WEAK),
      'https://noindex.example/': () => html(STRONG.replace('<meta name="viewport"', '<meta name="robots" content="noindex"><meta name="viewport"')),
      'https://pdf.example/file': () => new Response('%PDF-1.7', { headers: { 'Content-Type': 'application/pdf' } }),
      'https://down.example/': () => html('Error', { status: 500 }),
      'https://empty.example/': () => html(''),
    },
  });
});

after(() => worker.dispose());

const audit = async (url) => {
  const response = await worker.fetch(`/api/tools/geo-audit?url=${encodeURIComponent(url)}`);
  return { status: response.status, body: await response.json() };
};
const scores = (body) => Object.fromEntries(body.categories.map((c) => [c.label, c.score]));

test('страница со всеми сигналами - сильный результат по 4 категориям', async () => {
  const { status, body } = await audit('https://example.com/geo/price');
  assert.equal(status, 200);
  assert.equal(body.finalUrl, 'https://example.com/geo/price');
  assert.deepEqual(scores(body), { Ответ: 100, Сущность: 100, Доверие: 100, Техника: 100 });
  assert.equal(body.score, 100);
  assert.equal(body.title, 'Хорошая база для GEO');
  assert.ok(body.categories.every((c) => c.state === 'сильный сигнал'));
});

test('пустая по сигналам страница - приоритеты', async () => {
  const { body } = await audit('https://weak.example/');
  assert.ok(body.score < 60, `score ${body.score}`);
  assert.equal(body.title, 'Страницу нужно усилить');
  assert.equal(scores(body).Сущность, 0);
  assert.ok(body.categories.some((c) => c.state === 'приоритет'));
});

test('noindex и canonical на чужой домен снижают технический балл', async () => {
  // та же страница на другом домене: canonical ведет на example.com (-15), плюс meta robots noindex (-10)
  const { body } = await audit('https://noindex.example/');
  assert.equal(scores(body).Техника, 75);
});

test('не HTML, ошибка сервера и пустая страница - 502 с понятной причиной', async () => {
  assert.deepEqual(await audit('https://pdf.example/file'), { status: 502, body: { error: 'По адресу открывается не HTML-страница' } });
  assert.deepEqual(await audit('https://down.example/'), { status: 502, body: { error: 'Страница отвечает кодом 500' } });
  assert.deepEqual(await audit('https://empty.example/'), { status: 502, body: { error: 'По адресу открывается пустая HTML-страница' } });
});
