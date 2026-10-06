// GEO-аудит страницы: 4 категории - ответ, сущность, доверие, техника.
// Источник: сервер инструментов hitz.agency (https://hitz.agency/tools).
import { brandJsonLd, brandNorm, brandText, documentLink, documentMeta, readHtmlDocument, type HtmlDocument, type JsonLdNode } from './html.ts';
import { fetchBrandPage } from './net.ts';

function geoCategory(label: string, score: number, positive: string, negative: string) {
  const value = Math.max(0, Math.min(100, Math.round(score)));
  return {
    label,
    score: value,
    state: value >= 80 ? 'сильный сигнал' : value >= 55 ? 'нужно усилить' : 'приоритет',
    copy: value >= 80 ? positive : negative,
  };
}

function geoTypes(nodes: JsonLdNode[]): string[] {
  return nodes
    .flatMap((node) => {
      const type = node && node['@type'];
      return Array.isArray(type) ? type : type ? [type] : [];
    })
    .map((type) => String(type).toLowerCase());
}

export async function checkGeoPage(rawUrl: string) {
  const { response, finalUrl, finish } = await fetchBrandPage(rawUrl);
  const contentType = (response.headers.get('Content-Type') || '').toLowerCase();
  if (!response.ok) {
    finish();
    throw new Error('Страница отвечает кодом ' + response.status);
  }
  if (contentType && !contentType.includes('text/html') && !contentType.includes('application/xhtml+xml')) {
    finish();
    throw new Error('По адресу открывается не HTML-страница');
  }

  let document: HtmlDocument;
  try {
    document = await readHtmlDocument(response, finalUrl, 'geo');
  } finally {
    finish();
  }
  if (!document.sourceBytes) throw new Error('По адресу открывается пустая HTML-страница');

  const text = document.paragraphs.join(' ');
  const title = document.title;
  const h1Matches = document.h1s;
  const h1 = h1Matches[0] || '';
  const paragraphs = document.paragraphs;
  const intro = document.intro;
  const headings = document.headings;
  const hasQuestionHeadings = headings.some((value) =>
    /(?:^|\s)(что|как|сколько|почему|когда|где|кто|what|how|why|when|where|cost|price)(?:\s|$)/i.test(value),
  );
  const hasListOrTable = document.hasListOrTable;

  const nodes = brandJsonLd(document.jsonld);
  const types = geoTypes(nodes);
  const entityTypes = ['organization', 'localbusiness', 'professionalservice', 'person', 'product', 'service', 'article', 'webpage'];
  const hasEntitySchema = types.some((type) => entityTypes.includes(type));
  const hasFaqSchema = types.includes('faqpage');
  const hasSchemaName = nodes.some((node) => brandText(node && (node.name || node.headline)).length >= 3);
  const hasSchemaUrl = nodes.some((node) => {
    const value = node && (node.url || node['@id']);
    return typeof value === 'string' && /^https?:\/\//i.test(value);
  });
  const hasSchemaLogo = nodes.some((node) => Boolean(node && (node.logo || node.image)));
  const hasAuthor = Boolean(documentMeta(document, 'author')) || types.includes('person') || nodes.some((node) => Boolean(node && node.author));
  const hasDate =
    Boolean(documentMeta(document, 'article:published_time')) ||
    document.hasTime ||
    nodes.some((node) => Boolean(node && (node.datePublished || node.dateModified)));
  const sameAs = nodes.flatMap((node) => (Array.isArray(node && node.sameAs) ? (node.sameAs as unknown[]) : node && node.sameAs ? [node.sameAs] : []));
  const hasAddress = nodes.some((node) => Boolean(node && node.address));
  const hasEmail = /[\w.+-]+@[\w.-]+\.[a-z]{2,}/i.test(text) || document.hasEmailLink || nodes.some((node) => Boolean(node && node.email));
  const hasPhone = /(?:\+?\d[\d\s().-]{8,}\d)/.test(text) || document.hasPhoneLink || nodes.some((node) => Boolean(node && node.telephone));

  const canonicalRaw = documentLink(document, 'canonical');
  let canonical: URL | null = null;
  try {
    if (canonicalRaw) canonical = new URL(canonicalRaw, finalUrl);
  } catch {}
  const canonicalMatches = Boolean(canonical && canonical.hostname === finalUrl.hostname);
  const ogSiteName = documentMeta(document, 'og:site_name');
  const description = documentMeta(document, 'description') || documentMeta(document, 'og:description');
  const robots = documentMeta(document, 'robots').toLowerCase();
  const languageSample = [h1, ...headings, ...paragraphs].join(' ');
  const lang =
    document.lang ||
    documentMeta(document, 'og:locale').split('_')[0] ||
    (response.headers.get('Content-Language') || '').split(/[-_,;]/)[0] ||
    (/[А-Яа-яЁё]/.test(languageSample) ? 'ru' : '');
  const hasViewport = Boolean(documentMeta(document, 'viewport'));
  const titleH1Aligned = Boolean(title && h1 && (brandNorm(title).includes(brandNorm(h1)) || brandNorm(h1).includes(brandNorm(title))));

  const outboundSources = document.outboundSources;

  const answerScore =
    (h1 ? 15 : 0) +
    (intro.length >= 60 && intro.length <= 500 ? 30 : intro.length >= 25 ? 15 : 0) +
    (hasQuestionHeadings ? 20 : 0) +
    (paragraphs.length >= 4 ? 15 : paragraphs.length >= 2 ? 8 : 0) +
    (hasListOrTable || hasFaqSchema ? 20 : 0);
  const entityScore =
    (hasEntitySchema ? 35 : 0) +
    (hasSchemaName && hasSchemaUrl ? 15 : hasSchemaName ? 8 : 0) +
    (titleH1Aligned ? 15 : 0) +
    (canonicalMatches ? 15 : 0) +
    (ogSiteName ? 10 : 0) +
    (hasSchemaLogo ? 10 : 0);
  const trustScore =
    (hasAuthor ? 20 : 0) +
    (hasDate ? 15 : 0) +
    (outboundSources >= 2 ? 15 : outboundSources === 1 ? 8 : 0) +
    (hasEmail && hasPhone ? 20 : hasEmail || hasPhone ? 10 : 0) +
    (hasAddress || sameAs.length >= 2 ? 15 : hasAddress || sameAs.length ? 8 : 0) +
    (description.length >= 80 ? 15 : description.length >= 40 ? 8 : 0);
  const techniqueScore =
    20 +
    (title ? 15 : 0) +
    (h1Matches.length === 1 ? 20 : h1Matches.length > 1 ? 8 : 0) +
    (canonicalMatches ? 15 : 0) +
    (!robots.includes('noindex') ? 10 : 0) +
    (lang ? 10 : 0) +
    (hasViewport ? 10 : 0);

  const categories = [
    geoCategory('Ответ', answerScore, 'На странице есть понятный ответ и структура для извлечения.', 'Добавьте короткий ответ после H1, вопросные подзаголовки и списки.'),
    geoCategory('Сущность', entityScore, 'Название и тип сущности подтверждены разметкой и метаданными.', 'Свяжите название, тип организации, URL и логотип в Schema.org.'),
    geoCategory('Доверие', trustScore, 'Есть проверяемые сигналы автора, источников и контактов.', 'Добавьте автора, дату, источники, контакты и официальные профили.'),
    geoCategory('Техника', techniqueScore, 'Страница доступна и содержит основные технические сигналы.', 'Проверьте title, один H1, canonical, lang, viewport и запрет noindex.'),
  ];
  const score = Math.round(answerScore * 0.3 + entityScore * 0.25 + trustScore * 0.25 + techniqueScore * 0.2);
  const titleText = score >= 80 ? 'Хорошая база для GEO' : score >= 60 ? 'Страница готова частично' : 'Страницу нужно усилить';
  const summary =
    score >= 80
      ? 'Основные сигналы уже собраны. Усильте категории с самым низким баллом.'
      : score >= 60
        ? 'База есть, но отдельные сигналы мешают странице стать надежным источником.'
        : 'Структура, сущность или доказательства пока недостаточны для уверенного извлечения.';

  return {
    url: rawUrl,
    finalUrl: finalUrl.href,
    status: response.status,
    score,
    truncated: document.truncated || document.structuredDataTruncated,
    contentTruncated: document.truncated,
    structuredDataTruncated: document.structuredDataTruncated,
    title: titleText,
    summary,
    categories,
  };
}
