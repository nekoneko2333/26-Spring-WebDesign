import { landmarks } from '../../data/landmarks.js';
import { travelGuide, travelLandmarkMeta, travelMapPoints } from '../../data/travelGuide.js';

export function HomePage({ onOpenDrive }) {
  return (
    <main className="travel-home">
      <section className="travel-hero">
        <div className="travel-hero__copy">
          <p className="travel-kicker">{travelGuide.hero.kicker}</p>
          <h1 className="travel-title">{travelGuide.hero.title}</h1>
          <p className="travel-summary">{travelGuide.hero.summary}</p>
          <div className="travel-actions">
            <button className="travel-btn travel-btn--primary" type="button" onClick={onOpenDrive}>Open 3D Drive</button>
            <a className="travel-btn travel-btn--ghost" href="#map-board">View coordinates</a>
          </div>
          <div className="travel-stats">
            {travelGuide.stats.map((item) => (
              <article key={item.label}>
                <strong>{item.value}</strong>
                <span>{item.label}</span>
              </article>
            ))}
          </div>
        </div>

        <div id="map-board" className="travel-map-card">
          <div className="travel-map-card__header">
            <p>Route board</p>
            <span>Browse destination pins, inspect coordinates, then launch immersive route mode.</span>
          </div>
          <div className="travel-map">
            <div className="travel-map__sea travel-map__sea--a" />
            <div className="travel-map__sea travel-map__sea--b" />
            <div className="travel-map__italy" />
            {landmarks.map((landmark) => {
              const meta = travelLandmarkMeta[landmark.id];
              const point = travelMapPoints[landmark.id];
              return (
                <button key={landmark.id} className="travel-map__pin" type="button" style={point} onClick={onOpenDrive}>
                  <span className="travel-map__pin-dot" />
                  <span className="travel-map__pin-label">{meta.city}</span>
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
                    <p>{meta.blurb}</p>
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

      <section className="travel-showcase">
        {landmarks.map((landmark) => {
          const meta = travelLandmarkMeta[landmark.id];
          return (
            <article key={landmark.id} className="travel-destination-card">
              <div className="travel-destination-card__head">
                <p>{meta.region}</p>
                <span>{meta.type}</span>
              </div>
              <h2>{landmark.name}</h2>
              <p>{landmark.description}</p>
              <div className="travel-destination-card__meta">
                <span>{meta.season}</span>
                <button className="travel-btn travel-btn--ghost travel-btn--compact" type="button" onClick={onOpenDrive}>Preview in 3D</button>
              </div>
            </article>
          );
        })}
      </section>

      <section className="travel-grid">
        <article className="travel-panel travel-panel--route">
          <p className="travel-panel__eyebrow">Suggested route</p>
          <h2>Rome to Pisa</h2>
          <p>Use the tourism layer to compare coordinates and context, then open the drive mode when you want a cinematic understanding of the route geometry.</p>
          <div className="travel-itinerary">
            {travelGuide.itinerary.map((item) => (
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
          <p className="travel-panel__eyebrow">Immersive feature</p>
          <h2>3D Drive mode</h2>
          <p>The 3D explorer now behaves like a premium module inside the main website: launch it from the homepage, inspect landmarks, and return to the editorial travel guide anytime.</p>
          <button className="travel-btn travel-btn--primary travel-btn--compact" type="button" onClick={onOpenDrive}>Enter explorer</button>
        </article>
      </section>

      <section className="travel-journal">
        <div className="travel-journal__intro">
          <p className="travel-panel__eyebrow">Travel journal</p>
          <h2>Designed like a destination microsite, not just a demo scene.</h2>
        </div>
        <div className="travel-journal__grid">
          {travelGuide.journal.map((item) => (
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
