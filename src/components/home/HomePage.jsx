import { useMemo, useState } from 'react';
import { useAppStore } from '../../state/useAppStore.js';
import { landmarks } from '../../data/landmarks.js';
import { travelGuide, travelLandmarkMeta, travelMapPoints } from '../../data/travelGuide.js';
import { reviewLocales } from '../../data/reviewLocales.js';

export function HomePage({ onOpenDrive }) {
  const language = useAppStore((state) => state.language);
  const setLanguage = useAppStore((state) => state.setLanguage);
  const copy = useMemo(() => travelGuide[language], [language]);
  const reviewsCopy = useMemo(() => reviewLocales[language], [language]);
  const [activeTab, setActiveTab] = useState('guide');
  const [searchQuery, setSearchQuery] = useState('');
  const isZh = language === 'zh';

  const tabs = useMemo(
    () => (language === 'zh'
      ? [
          { id: 'guide', label: '路线指南' },
          { id: 'search', label: '查找景点' },
          { id: 'reviews', label: '评论区' },
        ]
      : [
          { id: 'guide', label: 'Route Guide' },
          { id: 'search', label: 'Find Landmark' },
          { id: 'reviews', label: 'Reviews' },
        ]),
    [language],
  );

  const activeIndex = Math.max(0, tabs.findIndex((tab) => tab.id === activeTab));

  const filteredLandmarks = useMemo(() => {
    const keyword = searchQuery.trim().toLowerCase();
    if (!keyword) return landmarks;
    return landmarks.filter((landmark) => {
      const meta = travelLandmarkMeta[landmark.id];
      const city = meta.city[language].toLowerCase();
      const region = meta.region[language].toLowerCase();
      const name = landmark.name.toLowerCase();
      return city.includes(keyword) || region.includes(keyword) || name.includes(keyword);
    });
  }, [language, searchQuery]);

  return (
    <main className={`travel-home ${isZh ? 'is-zh' : 'is-en'}`} lang={language}>
      <section className="travel-hero">
        <div className="travel-hero__copy">
          <div className="travel-lang-switch" role="group" aria-label="Language switcher">
            <button className={`travel-lang-switch__btn ${language === 'en' ? 'is-active' : ''}`} type="button" onClick={() => setLanguage('en')}>
              EN
            </button>
            <button className={`travel-lang-switch__btn ${language === 'zh' ? 'is-active' : ''}`} type="button" onClick={() => setLanguage('zh')}>
              中文
            </button>
          </div>

          <p className="travel-kicker">{copy.hero.kicker}</p>
          <h1 className="travel-title">{copy.hero.title}</h1>
          <p className="travel-summary">{copy.hero.summary}</p>
          <div className="travel-actions">
            <button className="travel-btn travel-btn--primary" type="button" onClick={() => onOpenDrive()}>{copy.hero.primaryCta}</button>
            <a className="travel-btn travel-btn--ghost" href="#map-board">{copy.hero.secondaryCta}</a>
          </div>
          <div className="travel-stats">
            {copy.stats.map((item) => (
              <article key={item.label}>
                <strong>{item.value}</strong>
                <span>{item.label}</span>
              </article>
            ))}
          </div>
        </div>

        <div id="map-board" className="travel-map-card">
          <div className="travel-map-card__header">
            <p>{copy.mapBoard.title}</p>
            <span>{copy.mapBoard.summary}</span>
          </div>
          <div className="travel-map">
            <div className="travel-map__sea travel-map__sea--a" />
            <div className="travel-map__sea travel-map__sea--b" />
            <div className="travel-map__italy" />
            {landmarks.map((landmark) => {
              const meta = travelLandmarkMeta[landmark.id];
              const point = travelMapPoints[landmark.id];
              return (
                <button key={landmark.id} className="travel-map__pin" type="button" style={point} onClick={() => onOpenDrive(landmark.id)}>
                  <span className="travel-map__pin-dot" />
                  <span className="travel-map__pin-label">{meta.city[language]}</span>
                </button>
              );
            })}
          </div>
          <div className="travel-coordinates">
            {landmarks.map((landmark, index) => {
              const meta = travelLandmarkMeta[landmark.id];
              return (
                <article key={landmark.id} className="travel-coordinate-card">
                  <span className="travel-coordinate-card__index">0{index + 1}</span>
                  <div>
                    <h3>{landmark.name}</h3>
                    <p>{meta.blurb[language]}</p>
                    <button className="travel-btn travel-btn--ghost travel-btn--compact" type="button" onClick={() => onOpenDrive(landmark.id)}>
                      {copy.hero.jumpToLandmark}
                    </button>
                  </div>
                  <dl>
                    <div><dt>LAT</dt><dd>{meta.lat.toFixed(4)}</dd></div>
                    <div><dt>LON</dt><dd>{meta.lon.toFixed(4)}</dd></div>
                  </dl>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="travel-workspace">
        <div className="travel-tabs" style={{ '--tab-index': activeIndex, '--tab-count': tabs.length }}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`travel-tabs__btn ${activeTab === tab.id ? 'is-active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
          <span className="travel-tabs__indicator" aria-hidden="true" />
        </div>

        {activeTab === 'guide' && (
          <div className="travel-workspace__panel">
            <section className="travel-showcase">
              {landmarks.map((landmark) => {
                const meta = travelLandmarkMeta[landmark.id];
                return (
                  <article key={landmark.id} className="travel-destination-card">
                    <div className="travel-destination-card__head">
                      <p>{meta.region[language]}</p>
                      <span>{meta.type[language]}</span>
                    </div>
                    <h2>{landmark.name}</h2>
                    <p>{meta.blurb[language]}</p>
                    <div className="travel-destination-card__meta">
                      <span>{meta.season[language]}</span>
                      <button className="travel-btn travel-btn--ghost travel-btn--compact" type="button" onClick={() => onOpenDrive(landmark.id)}>{copy.hero.previewIn3D}</button>
                    </div>
                  </article>
                );
              })}
            </section>

            <section className="travel-grid">
              <article className="travel-panel travel-panel--route">
                <p className="travel-panel__eyebrow">{copy.routePanel.eyebrow}</p>
                <h2>{copy.routePanel.title}</h2>
                <p>{copy.routePanel.body}</p>
                <div className="travel-itinerary">
                  {copy.itinerary.map((item) => (
                    <div key={item.day} className="travel-itinerary__item">
                      <span>{item.day}</span>
                      <div>
                        <h3>{item.title}</h3>
                        <p>{item.detail}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </article>

              <article className="travel-panel travel-panel--feature">
                <p className="travel-panel__eyebrow">{copy.featurePanel.eyebrow}</p>
                <h2>{copy.featurePanel.title}</h2>
                <p>{copy.featurePanel.body}</p>
                <button className="travel-btn travel-btn--primary travel-btn--compact" type="button" onClick={() => onOpenDrive()}>{copy.hero.enterExplorer}</button>
              </article>
            </section>
          </div>
        )}

        {activeTab === 'search' && (
          <section className="travel-workspace__panel travel-search-panel">
            <div className="travel-search-panel__head">
              <input
                className="travel-search-input"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder={language === 'zh' ? '输入城市 / 地标名称（如 罗马、Pisa）' : 'Search city or landmark (e.g. Rome, Pisa)'}
              />
            </div>
            <div className="travel-search-grid">
              {filteredLandmarks.map((landmark) => {
                const meta = travelLandmarkMeta[landmark.id];
                return (
                  <article key={landmark.id} className="travel-search-card">
                    <p>{meta.region[language]} · {meta.city[language]}</p>
                    <h3>{landmark.name}</h3>
                    <p>{meta.blurb[language]}</p>
                    <div className="travel-search-card__meta">
                      <span>LAT {meta.lat.toFixed(4)}</span>
                      <span>LON {meta.lon.toFixed(4)}</span>
                    </div>
                    <button className="travel-btn travel-btn--ghost travel-btn--compact" type="button" onClick={() => onOpenDrive(landmark.id)}>
                      {copy.hero.jumpToLandmark}
                    </button>
                  </article>
                );
              })}
            </div>
          </section>
        )}

        {activeTab === 'reviews' && (
          <section className="travel-workspace__panel travel-reviews-panel">
            <div className="travel-reviews-grid">
              {landmarks.map((landmark) => {
                const localeReviews = reviewsCopy.landmarks[landmark.id] ?? [];
                return (
                  <article key={landmark.id} className="travel-reviews-block">
                    <div className="travel-reviews-block__head">
                      <h3>{landmark.name}</h3>
                      <button className="travel-btn travel-btn--ghost travel-btn--compact" type="button" onClick={() => onOpenDrive(landmark.id)}>
                        {copy.hero.previewIn3D}
                      </button>
                    </div>
                    <div className="travel-reviews-block__list">
                      {localeReviews.map((item) => (
                        <article key={`${landmark.id}-${item.author}-${item.score}`} className="travel-review-card">
                          <div className="travel-review-card__meta">
                            <span>{item.author}</span>
                            <span>{item.score}</span>
                          </div>
                          <p>{item.comment}</p>
                          <small>{item.source}</small>
                        </article>
                      ))}
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        )}
      </section>

      <section className="travel-journal">
        <div className="travel-journal__intro">
          <p className="travel-panel__eyebrow">{copy.journalIntro.eyebrow}</p>
          <h2>{copy.journalIntro.title}</h2>
        </div>
        <div className="travel-journal__grid">
          {copy.journal.map((item) => (
            <article key={item.title} className="travel-journal-card">
              <h3>{item.title}</h3>
              <p>{item.body}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
