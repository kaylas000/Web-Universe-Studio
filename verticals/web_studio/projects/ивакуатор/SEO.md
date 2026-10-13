# page_seo_manifest — PRJ-04 · Срочная эвакуация (К-13)

## Главная — site/index.html

— url: https://evakuator-khimki.ru/
— title: «Эвакуатор в Москве и Химках 24/7 — вызов от 5 000 ₽» — 51 символ (норма 50–60)
— description: «Срочная эвакуация круглосуточно: сдвижная платформа с лебёдкой, выезд
  до 10 т по Москве и Химкам. Цена называется до подачи. Диспетчер: +7 977 174-20-50»
  — 152 (120–158)
— h1: один — «Эвакуация транспорта Химки и Москва» (Q-09)
— robots: index,follow · canonical: https://evakuator-khimki.ru/
— og:type website, og:title, og:description, og:url, og:locale ru_RU, og:image — site/photo-og.svg
— JSON-LD: LocalBusiness (name, telephone, address Московская обл., Химки, мкр-н
  Клязьма-Старбеево, openingHoursSpecification Mo-Su 00:00-23:59, areaServed Москва / Химки /
  Московская область, priceRange «от 5 000 ₽», hasOfferCatalog) + FAQPage из секции 08
— внутренние ссылки (≥2): навигация index/uslugi/tseny/kontakty, плюс якоря
  #chto-vezem, #podacha, #tsena, #zona, #vyzov и мосты из uslugi/tseny/kontakty назад на index
— внешние служебные: tel:+79771742050, mailto:dispatcher@evakuator-khimki.ru,
  yandex.ru/maps (запрос «Химки ул. Заводская» — кольцо, где Заводская упирается
  в поворот на мост через Ленинградское шоссе, центр карты «Зона выезда»)
— язык: lang="ru" · viewport с viewport-fit=cover (safe-area)
— шрифты: preload двух woff2 с integrity sha384, font-display: swap

## Услуги — site/uslugi.html

— url: https://evakuator-khimki.ru/uslugi/
— title: «Услуги эвакуатора в Москве и Химках — что берём на платформу» — 60 (50–60)
— description: «Поломка, ДТП, перегон: мототехника, легковые и коммерческий транспорт
  до 10 т, авто бизнес-класса. Сдвижная платформа с лебёдкой. Выезд по Москве и области.»
  — 156 (120–158)
— h1: один — «Что мы берём на платформу»
— canonical: https://evakuator-khimki.ru/uslugi/
— JSON-LD: Service (provider LocalBusiness, areaServed, отсылка к главной)
— внутренние ссылки: index.html, tseny.html, kontakty.html + якоря

## Цены — site/tseny.html

— url: https://evakuator-khimki.ru/tseny/
— title: «Цены на эвакуатор в Москве и Химках — подача от 5 000 ₽» — 55 (50–60)
— description: «Подача по графику — бесплатно, срочная подача — от 5 000 ₽. Цена зависит
  от расстояния и сложности погрузки, её называют до выезда. Телефон: +7 977 174-20-50»
  — 157 (120–158)
— h1: один — «Цена называется до выезда»
— canonical: https://evakuator-khimki.ru/tseny/
— JSON-LD: OfferCatalog + AggregateOffer (lowPrice 5000, priceCurrency RUB)
— внутренние ссылки: index.html, uslugi.html, kontakty.html + якорь #rasschet

## Контакты — site/kontakty.html

— url: https://evakuator-khimki.ru/kontakty/
— title: «Контакты эвакуатора в Химках — телефон 24/7 и адрес» — 51 символ (норма 50–60)
— description: «Служба эвакуации в Химках: мкр. Клязьма-Старбеево, выезд по Москве и
  области. Диспетчер круглосуточно, перезвоним за 2 минуты. Телефон: +7 977 174-20-50»
  — 152 (120–158)
— h1: один — «Диспетчер на линии круглосуточно»
— canonical: https://evakuator-khimki.ru/kontakty/
— JSON-LD: LocalBusiness (то же тело, что на главной) + ContactPoint
— внутренние ссылки: index.html, uslugi.html, tseny.html + tel: и mailto:

## Галерея — site/galereya.html

— url: https://evakuator-khimki.ru/galereya/
— title: «Галерея техники — эвакуаторы Москва и Химки, фото автопарка» — 62 (50–60)
— description: «Автопарк эвакуаторов: сдвижные платформы с лебёдкой и манипуляторы до 10 т.
  Фото техники, которая выезжает на подачу по Москве и Московской области.» — 143 (120–158)
— h1: один — «Галерея техники»
— canonical: https://evakuator-khimki.ru/galereya/
— JSON-LD: ImageGallery (фото автопарка)
— внутренние ссылки: index.html, uslugi.html, tseny.html, kontakty.html

## Лендинг по локации — site/evakuator-himki.html

— url: https://evakuator-khimki.ru/evakuator-himki/
— title: «Эвакуатор Химки — вызов от 5 000 ₽, работаем круглосуточно» — 57 (50–60)
— description: «Срочная эвакуация в Химках круглосуточно: сдвижная платформа с лебёдкой, выезд
  до 10 т. Подача от 31 минуты, цена до выезда. Диспетчер: +7 977 174-20-50» — 150 (120–158)
— h1: один — «Эвакуатор Химки» (Q-09)
— robots: index,follow · canonical: https://evakuator-khimki.ru/evakuator-himki/
— og:type website, og:title/og:description/og:url, og:locale ru_RU, og:image — site/photo-og.svg
— JSON-LD: LocalBusiness (то же @id #business, areaServed — Химки первым) + FAQPage из секции 08
  (5 вопросов, включая «До каких районов Химок выезжаете?»)
— внутренние ссылки (≥2): шапка index/uslugi/tseny/kontakty, подвал «Эвакуация по городам»,
  статья evakuaciya-himki.html (подвал и ссылка «Разбор»), якоря #tsena/#zona/…
— внешние служебные: tel:+79771742050, yandex.ru/maps (база)

## Статья по локации — site/evakuaciya-himki.html

— url: https://evakuator-khimki.ru/evakuaciya-himki/
— title: «Эвакуатор Химки: сколько стоит и как вызвать — разбор» — 53 (50–60)
— description: «Эвакуация в Химках: вызов от 5 000 ₽, подача от 31 минуты,
  платформа с лебёдкой до 10 т. Как заказать эвакуатор и подготовить машину к погрузке.» — 145
  (120–158)
— h1: один — «Эвакуатор Химки: сколько стоит и как вызвать»
— robots: index,follow · canonical: https://evakuator-khimki.ru/evakuaciya-himki/
— og:type article, og:title/og:description/og:url, og:locale ru_RU, og:image — site/photo-og.svg
— JSON-LD: BlogPosting (author Organization, publisher LocalBusiness #business,
  datePublished 2026-10-09) + FAQPage из секции 07 (5 вопросов)
— внутренние ссылки: шапка на разделы, лендинг evakuator-himki.html (hero, секция 05, секция 08)
— внешние служебные: tel:+79771742050, mailto:dispatcher@evakuator-khimki.ru

## Новый город (памятка)

Для страницы по новому городу скопируйте site/evakuaciya-himki.html в evakuaciya-<город>.html
и замените: title, description, og:*, canonical, JSON-LD (BlogPosting headline + FAQPage),
H1 в секции 01, kicker/lede/факты, H2 секций 02–06 и текст (адреса, районы, подача),
FAQ секции 07, адрес в секции 08 и номера/годы. Затем обновите site/sitemap.xml, SEO.md,
SOURCES.md и версию ассетов.

## Служебные

— 404.html: noindex,follow, кнопка возврата на index.html с data-analytics-event
— robots.txt: sitemap.xml, разрешено всё, кроме /workspace/
— sitemap.xml: семь URL (index, uslugi, tseny, kontakty, galereya, evakuator-himki,
  evakuaciya-himki) с lastmod; 404 без noindex в sitemap не попадает
— og:image: site/photo-og.svg — 1200×630, нарисована (SVG), вес < 40 КБ
