import { useMemo, useState } from 'react';
import { useAppStore } from '../../state/useAppStore.js';
import { landmarks } from '../../data/landmarks.js';
import { currentRoute, routeSegments } from '../../data/routes.js';
import { travelGuide, travelLandmarkMeta, travelMapPoints } from '../../data/travelGuide.js';
import { reviewLocales } from '../../data/reviewLocales.js';

const homeCopy = {
  en: {
    nav: [
      { id: 'destinations', label: 'Destinations' },
      { id: 'planner', label: 'Route Planner' },
      { id: 'reviews', label: 'Reviews' },
      { id: 'drive', label: '3D Drive' },
    ],
    search: {
      title: 'Plan your Italy route',
      destination: 'Destination',
      destinationValue: 'Milan to Pompeii',
      style: 'Travel style',
      styleValue: 'Architecture + 3D preview',
      duration: 'Duration',
      durationValue: '3 days',
      action: 'Start route preview',
    },
    pages: {
      destinations: {
        eyebrow: 'Destinations',
        title: 'Browse six mock stops across Italy',
        body: 'Each destination includes coordinates, mock ratings, local notes, and a direct entry into the 3D guide.',
      },
      planner: {
        eyebrow: 'Route schema',
        title: 'Mock route data today, real road intelligence later',
        body: 'Route points now carry road type, speed limit, traffic state, surface, bridge, tunnel, and layer fields so OSM, DEM, PostGIS, and traffic APIs can fill the same contract later.',
      },
      reviews: {
        eyebrow: 'Reviews',
        title: 'Compare mock reviews before entering 3D',
        body: 'The current review cards are local mock data. Later they can be replaced with crawled travel-site reviews after normalization.',
      },
      drive: {
        eyebrow: '3D drive',
        title: 'Turn the planned route into an immersive map drive',
        body: 'Launch the route explorer, focus landmarks, view models, and use placeholder geometry where real 3D assets are not available yet.',
      },
    },
    destinationCta: 'Open in 3D',
    ratingLabel: 'Mock rating',
    searchPlaceholder: 'Search city or landmark (e.g. Rome, Venice, Pompeii)',
    routeLabels: {
      source: 'Source',
      distance: 'Distance',
      duration: 'Duration',
      points: 'Route points',
      speed: 'Speed',
      traffic: 'Traffic',
      layer: 'Layer',
      roadType: 'Road type',
    },
  },
  zh: {
    nav: [
      { id: 'destinations', label: '目的地' },
      { id: 'planner', label: '路线规划' },
      { id: 'reviews', label: '评价' },
      { id: 'drive', label: '3D 导览' },
    ],
    search: {
      title: '规划你的意大利路线',
      destination: '目的地',
      destinationValue: '米兰到庞贝',
      style: '旅行偏好',
      styleValue: '建筑游览 + 3D 预览',
      duration: '行程时长',
      durationValue: '3 天',
      action: '开始路线预览',
    },
    pages: {
      destinations: {
        eyebrow: '目的地',
        title: '浏览 6 个意大利 mock 停靠点',
        body: '每个目的地都包含坐标、模拟评分、旅行笔记，并且可以直接进入 3D 导览。',
      },
      planner: {
        eyebrow: '路线数据结构',
        title: '现在用 mock route，后续替换为真实道路智能数据',
        body: '路线点已经包含道路类型、限速、交通状态、路面、桥梁、隧道和图层字段，后续 OSM、DEM、PostGIS 与交通 API 可以填充同一套结构。',
      },
      reviews: {
        eyebrow: '评价内容',
        title: '进入 3D 前先比较 mock 评价',
        body: '当前评价卡片来自本地模拟数据。后续爬取旅行网站评价后，可以在清洗结构化后替换这里。',
      },
      drive: {
        eyebrow: '3D 导览',
        title: '把规划好的路线转成沉浸式地图驾驶',
        body: '启用路线探索器，聚焦地标，查看模型；暂时没有真实 3D 资产的地点会使用低多面体占位模型。',
      },
    },
    destinationCta: '打开 3D',
    ratingLabel: '模拟评分',
    searchPlaceholder: '搜索城市 / 地标名称（如 罗马、威尼斯、庞贝）',
    routeLabels: {
      source: '来源',
      distance: '距离',
      duration: '时长',
      points: '路线点',
      speed: '限速',
      traffic: '交通',
      layer: '图层',
      roadType: '道路类型',
    },
  },
};

function PageHeading({ page }) {
  return (
    <header className="travel-section-heading">
      <div>
        <p className="travel-section-kicker">{page.eyebrow}</p>
        <h2>{page.title}</h2>
      </div>
      <p>{page.body}</p>
    </header>
  );
}

export function HomePage({ onOpenDrive }) {
  const language = useAppStore((state) => state.language);
  const setLanguage = useAppStore((state) => state.setLanguage);
  const copy = useMemo(() => travelGuide[language], [language]);
  const pageCopy = useMemo(() => homeCopy[language], [language]);
  const reviewsCopy = useMemo(() => reviewLocales[language], [language]);
  const [activePage, setActivePage] = useState('destinations');
  const [searchQuery, setSearchQuery] = useState('');
  const isZh = language === 'zh';
  const activePageCopy = pageCopy.pages[activePage];
  const activePageIndex = Math.max(0, pageCopy.nav.findIndex((item) => item.id === activePage));

  const filteredLandmarks = useMemo(() => {
    const keyword = searchQuery.trim().toLowerCase();
    if (!keyword) return landmarks;
    return landmarks.filter((landmark) => {
      const meta = travelLandmarkMeta[landmark.id];
      return [landmark.name, meta.city[language], meta.region[language], meta.type[language]]
        .some((value) => value.toLowerCase().includes(keyword));
    });
  }, [language, searchQuery]);

  return (
    <main className={`travel-home ${isZh ? 'is-zh' : 'is-en'}`} lang={language}>
      <div className="travel-ambient travel-ambient--grid" aria-hidden="true" />
      <div className="travel-ambient travel-ambient--beam" aria-hidden="true" />
      <div className="travel-ambient travel-ambient--scan" aria-hidden="true" />
      <header className="travel-site-nav">
        <button className="travel-brand" type="button" onClick={() => setActivePage('destinations')} aria-label="Web3D Italy Drive home">
          <span>Web3D</span>
          <strong>Italy Drive</strong>
        </button>
        <nav className="travel-nav-links" aria-label="Site pages" style={{ '--nav-index': activePageIndex, '--nav-count': pageCopy.nav.length }}>
          {pageCopy.nav.map((item) => (
            <button
              key={item.id}
              className={activePage === item.id ? 'is-active' : ''}
              type="button"
              aria-current={activePage === item.id ? 'page' : undefined}
              onClick={() => setActivePage(item.id)}
            >
              {item.label}
            </button>
          ))}
          <span className="travel-nav-links__indicator" aria-hidden="true" />
        </nav>
        <div className="travel-lang-switch" role="group" aria-label="Language switcher">
          <button className={`travel-lang-switch__btn ${language === 'en' ? 'is-active' : ''}`} type="button" onClick={() => setLanguage('en')}>EN</button>
          <button className={`travel-lang-switch__btn ${language === 'zh' ? 'is-active' : ''}`} type="button" onClick={() => setLanguage('zh')}>中文</button>
        </div>
      </header>

      {activePage === 'destinations' && (
        <>
          <section className="travel-hero">
            <div className="travel-hero__copy">
              <p className="travel-kicker">{copy.hero.kicker}</p>
              <h1 className="travel-title">{copy.hero.title}</h1>
              <p className="travel-summary">{copy.hero.summary}</p>
              <div className="travel-actions">
                <button className="travel-btn travel-btn--primary" type="button" onClick={() => onOpenDrive()}>{copy.hero.primaryCta}</button>
                <button className="travel-btn travel-btn--ghost" type="button" onClick={() => setActivePage('planner')}>{copy.hero.secondaryCta}</button>
              </div>
              <form className="travel-planner" onSubmit={(event) => { event.preventDefault(); setActivePage('planner'); }}>
                <p>{pageCopy.search.title}</p>
                <div className="travel-planner__grid">
                  <label><span>{pageCopy.search.destination}</span><strong>{pageCopy.search.destinationValue}</strong></label>
                  <label><span>{pageCopy.search.style}</span><strong>{pageCopy.search.styleValue}</strong></label>
                  <label><span>{pageCopy.search.duration}</span><strong>{pageCopy.search.durationValue}</strong></label>
                  <button type="submit">{pageCopy.search.action}</button>
                </div>
              </form>
              <div className="travel-stats">
                {copy.stats.map((item) => (
                  <article key={item.label}><strong>{item.value}</strong><span>{item.label}</span></article>
                ))}
              </div>
              <div className="travel-live-strip" aria-hidden="true">
                {routeSegments.slice(0, 5).map((segment, index) => (
                  <span key={segment.id} style={{ '--strip-delay': `${index * 0.24}s` }}>{segment.profile.label}</span>
                ))}
              </div>
            </div>
            <RouteMap copy={copy} language={language} />
          </section>
          <section className="travel-page">
            <PageHeading page={activePageCopy} />
            <DestinationGrid language={language} reviewsCopy={reviewsCopy} pageCopy={pageCopy} onOpenDrive={onOpenDrive} />
          </section>
        </>
      )}

      {activePage === 'planner' && (
        <section className="travel-page travel-page--planner">
          <PageHeading page={activePageCopy} />
          <div className="travel-page-grid">
            <RouteMap copy={copy} language={language} />
            <RouteSchemaPanel copy={copy} pageCopy={pageCopy} />
          </div>
        </section>
      )}

      {activePage === 'reviews' && (
        <section className="travel-page">
          <PageHeading page={activePageCopy} />
          <div className="travel-search-panel__head">
            <input className="travel-search-input" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder={pageCopy.searchPlaceholder} />
          </div>
          <div className="travel-reviews-grid">
            {filteredLandmarks.map((landmark) => (
              <ReviewBlock key={landmark.id} landmark={landmark} reviewsCopy={reviewsCopy} copy={copy} onOpenDrive={onOpenDrive} />
            ))}
          </div>
        </section>
      )}

      {activePage === 'drive' && (
        <section className="travel-page travel-page--drive">
          <PageHeading page={activePageCopy} />
          <div className="travel-page-grid">
            <article className="travel-panel travel-panel--feature">
              <p className="travel-panel__eyebrow">{copy.featurePanel.eyebrow}</p>
              <h2>{copy.featurePanel.title}</h2>
              <p>{copy.featurePanel.body}</p>
              <button className="travel-btn travel-btn--primary travel-btn--compact" type="button" onClick={() => onOpenDrive()}>{copy.hero.enterExplorer}</button>
            </article>
            <DestinationGrid language={language} reviewsCopy={reviewsCopy} pageCopy={pageCopy} onOpenDrive={onOpenDrive} compact />
          </div>
        </section>
      )}
    </main>
  );
}

function RouteMap({ copy, language }) {
  return (
    <div className="travel-map-card">
      <div className="travel-map-card__sheen" aria-hidden="true" />
      <p className="travel-section-kicker">{copy.mapBoard.title}</p>
      <div className="travel-map-card__header">
        <p>{copy.mapBoard.title}</p>
        <span>{copy.mapBoard.summary}</span>
      </div>
      <div className="travel-map">
        <div className="travel-map__pulse" aria-hidden="true" />
        <div className="travel-map__route-line" />
        <div className="travel-map__route-glow" />
        <div className="travel-map__sea travel-map__sea--a" />
        <div className="travel-map__sea travel-map__sea--b" />
        <div className="travel-map__italy" />
        {landmarks.map((landmark) => {
          const meta = travelLandmarkMeta[landmark.id];
          const point = travelMapPoints[landmark.id];
          return (
            <span key={landmark.id} className="travel-map__pin" style={point}>
              <span className="travel-map__pin-dot" />
              <span className="travel-map__pin-label">{meta.city[language]}</span>
            </span>
          );
        })}
      </div>
      <div className="travel-coordinates">
        {landmarks.slice(0, 4).map((landmark, index) => {
          const meta = travelLandmarkMeta[landmark.id];
          return (
            <article key={landmark.id} className="travel-coordinate-card">
              <span className="travel-coordinate-card__index">0{index + 1}</span>
              <div><h3>{landmark.name}</h3><p>{meta.blurb[language]}</p></div>
              <dl><div><dt>LAT</dt><dd>{meta.lat.toFixed(4)}</dd></div><div><dt>LON</dt><dd>{meta.lon.toFixed(4)}</dd></div></dl>
            </article>
          );
        })}
      </div>
      <div className="travel-map-telemetry" aria-hidden="true">
        {routeSegments.slice(0, 4).map((segment) => (
          <span key={segment.id}>{segment.type}<strong>{segment.speedLimit}</strong></span>
        ))}
      </div>
    </div>
  );
}

function RouteSchemaPanel({ copy, pageCopy }) {
  const labels = pageCopy.routeLabels;
  return (
    <article className="travel-panel travel-panel--route">
      <p className="travel-panel__eyebrow">{copy.routePanel.eyebrow}</p>
      <h2>{copy.routePanel.title}</h2>
      <p>{copy.routePanel.body}</p>
      <div className="travel-route-summary">
        <span>{labels.source}: {currentRoute.source}</span>
        <span>{labels.distance}: {currentRoute.distanceKm} km</span>
        <span>{labels.duration}: {currentRoute.durationHours} h</span>
        <span>{labels.points}: {currentRoute.points.length}</span>
      </div>
      <div className="travel-itinerary">
        {routeSegments.map((segment) => {
          return (
            <div key={segment.id} className="travel-itinerary__item">
              <span>{segment.trafficState}</span>
              <div>
                <h3>{segment.profile.label}</h3>
                <p>{labels.roadType}: {segment.type} / {labels.speed}: {segment.speedLimit} km/h / {segment.description}</p>
              </div>
            </div>
          );
        })}
      </div>
    </article>
  );
}

function DestinationGrid({ language, reviewsCopy, pageCopy, onOpenDrive, compact = false }) {
  return (
    <section className={`travel-showcase ${compact ? 'travel-showcase--compact' : ''}`}>
      {landmarks.map((landmark, index) => {
        const meta = travelLandmarkMeta[landmark.id];
        const review = reviewsCopy.landmarks[landmark.id]?.[0];
        return (
          <article key={landmark.id} className={`travel-destination-card travel-destination-card--${landmark.id}`}>
            <div className="travel-destination-card__media"><span>{meta.city[language]}</span></div>
            <div className="travel-destination-card__body">
              <div className="travel-destination-card__head"><p>{meta.region[language]}</p><span>{meta.type[language]}</span></div>
              <h2>{landmark.name}</h2>
              <p>{meta.blurb[language]}</p>
              <div className="travel-destination-card__meta">
                <span>{pageCopy.ratingLabel} {review?.score ?? '4.8'}</span>
                <button className="travel-btn travel-btn--ghost travel-btn--compact" type="button" onClick={() => onOpenDrive(landmark.id)}>{pageCopy.destinationCta}</button>
              </div>
            </div>
            <span className="travel-destination-card__number">0{index + 1}</span>
          </article>
        );
      })}
    </section>
  );
}

function ReviewBlock({ landmark, reviewsCopy, copy, onOpenDrive }) {
  const localeReviews = reviewsCopy.landmarks[landmark.id] ?? [];
  return (
    <article className="travel-reviews-block">
      <div className="travel-reviews-block__head">
        <h3>{landmark.name}</h3>
        <button className="travel-btn travel-btn--ghost travel-btn--compact" type="button" onClick={() => onOpenDrive(landmark.id)}>{copy.hero.previewIn3D}</button>
      </div>
      <div className="travel-reviews-block__list">
        {localeReviews.map((item) => (
          <article key={`${landmark.id}-${item.author}-${item.score}`} className="travel-review-card">
            <div className="travel-review-card__meta"><span>{item.author}</span><span>{item.score}</span></div>
            <p>{item.comment}</p>
            <small>{item.source}</small>
          </article>
        ))}
      </div>
    </article>
  );
}
