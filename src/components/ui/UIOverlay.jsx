import { useEffect, useMemo } from 'react';
import { useAppStore } from '../../state/useAppStore.js';
import { landmarks } from '../../data/landmarks.js';
import { useLandmarkReviews } from '../../hooks/useLandmarkReviews.js';
import { ModelViewerOverlay } from './ModelViewerOverlay.jsx';
import { reviewLocales } from '../../data/reviewLocales.js';

export function UIOverlay({ isStarted }) {
  const {
    language,
    cameraMode,
    nearbyLandmarkId,
    selectedLandmarkId,
    routeContext,
    focusPanelOpen,
    modelViewerOpen,
    autoDrive,
    setFocusPanelOpen,
    setModelViewerOpen,
    setCameraMode,
    setAutoDrive,
    toggleMapView,
    toggleAutoDrive,
    openLandmarkFocus,
    clearLandmark,
  } = useAppStore();

  const nearbyLandmark = landmarks.find((item) => item.id === nearbyLandmarkId);
  const selectedLandmark = landmarks.find((item) => item.id === selectedLandmarkId);
  const displayLandmark = selectedLandmark ?? nearbyLandmark;
  const { data: reviewPayload, isLoading } = useLandmarkReviews(selectedLandmarkId, language);
  const locale = reviewLocales[language];
  const localizedReviews = useMemo(() => {
    if (!selectedLandmarkId) return [];
    return locale.landmarks[selectedLandmarkId] ?? [];
  }, [language, locale.landmarks, selectedLandmarkId]);
  const comments = localizedReviews.length > 0 ? localizedReviews : reviewPayload?.reviews ?? [];
  const scoreLabel = localizedReviews[0]?.score ?? reviewPayload?.average_score ?? '0';
  const routeLocked = focusPanelOpen || modelViewerOpen;
  const routePoint = routeContext?.point;
  const routeSegment = routeContext?.segment;
  const routeProfile = routeContext?.profile;

  useEffect(() => {
    if (!isStarted) return undefined;

    const onKeyDown = (event) => {
      const key = event.key.toLowerCase();

      if (key === 'v' && !routeLocked) {
        toggleMapView();
        return;
      }

      if (key === 'r' && !routeLocked) {
        toggleAutoDrive();
        return;
      }

      if (key === 'f' && nearbyLandmarkId && !modelViewerOpen) {
        setAutoDrive(false);
        if (selectedLandmarkId === nearbyLandmarkId && !focusPanelOpen) {
          setFocusPanelOpen(true);
          return;
        }
        openLandmarkFocus(nearbyLandmarkId);
        return;
      }

      if (event.key === 'Escape') {
        if (modelViewerOpen) {
          setModelViewerOpen(false);
          return;
        }
        if (focusPanelOpen || selectedLandmarkId) {
          clearLandmark();
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    clearLandmark,
    focusPanelOpen,
    isStarted,
    modelViewerOpen,
    nearbyLandmarkId,
    openLandmarkFocus,
    routeLocked,
    selectedLandmarkId,
    setAutoDrive,
    setFocusPanelOpen,
    setModelViewerOpen,
    toggleAutoDrive,
    toggleMapView,
  ]);

  useEffect(() => {
    document.body.classList.toggle('route-locked', routeLocked);
    return () => document.body.classList.remove('route-locked');
  }, [routeLocked]);

  useEffect(() => {
    if (!selectedLandmarkId || !nearbyLandmarkId || selectedLandmarkId === nearbyLandmarkId) return;
    if (focusPanelOpen || modelViewerOpen) return;
    clearLandmark();
  }, [clearLandmark, focusPanelOpen, modelViewerOpen, nearbyLandmarkId, selectedLandmarkId]);

  if (!isStarted) return null;

  return (
    <>
      <div className="hud-title is-visible">Italy <span>Drive</span></div>
      <div className={`hud-mode is-visible ${autoDrive ? 'is-autodriving' : ''}`}>
        {cameraMode === 'focus' ? locale.ui.landmarkFocus : cameraMode === 'follow' ? (autoDrive ? locale.ui.autoDriving : locale.ui.drivingView) : locale.ui.mapMode}
      </div>

      <button className={`btn-map-view ${cameraMode !== 'map' && !routeLocked ? 'is-visible' : ''}`} onClick={() => setCameraMode('map')}>
        <svg className="btn-map-view__icon" width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
          <rect x="1" y="1" width="5" height="5" rx="1" fill="currentColor" opacity="0.6" />
          <rect x="8" y="1" width="5" height="5" rx="1" fill="currentColor" />
          <rect x="1" y="8" width="5" height="5" rx="1" fill="currentColor" />
          <rect x="8" y="8" width="5" height="5" rx="1" fill="currentColor" opacity="0.6" />
        </svg>
        {locale.ui.mapView}
      </button>

      <div className="hud-hints is-visible">
        <span className="hud-key"><kbd>W</kbd><kbd>S</kbd> {locale.ui.cruise}</span>
        <span className="hud-key"><kbd>R</kbd> {locale.ui.auto}</span>
        <span className="hud-key"><kbd>V</kbd> {locale.ui.view}</span>
        <span className="hud-key"><kbd>F</kbd> {locale.ui.explore}</span>
      </div>

      <div className="hud-speed is-visible" aria-live="polite">
        <span className={`hud-speed__val ${autoDrive ? 'is-boosting' : ''}`}>{scoreLabel}</span>
        <span className="hud-speed__unit">{locale.ui.score}</span>
      </div>

      {routeSegment && (
        <div className={`hud-road is-visible hud-road--${routeSegment.trafficState}`}>
          <div>
            <span>{routeProfile?.roadLabel ?? routeSegment.type}</span>
            <strong>{routeSegment.speedLimit} km/h</strong>
          </div>
          <p>
            {routeProfile?.trafficLabel ?? routeSegment.trafficState}
            {routeProfile?.surfaceLabel ? ` / ${routeProfile.surfaceLabel}` : ''}
            {routeSegment.description ? ` / ${routeSegment.description}` : ''}
            {routePoint?.landmarkId ? ' / waypoint nearby' : ''}
          </p>
        </div>
      )}

      <div className={`interact-prompt ${nearbyLandmarkId && cameraMode !== 'map' && !routeLocked ? 'is-visible' : ''}`} aria-live="polite">
        <span className="interact-prompt__key">F</span>
        <span className="interact-prompt__text">{nearbyLandmarkId ? locale.ui.openSideBriefing : locale.ui.cruiseAndDiscover}</span>
      </div>

      <aside className={`poi-side poi-side--left ${displayLandmark && !focusPanelOpen && cameraMode !== 'map' ? 'is-visible' : ''}`} aria-live="polite">
        <div className="poi-side__panel">
          <p className="poi-side__eyebrow">{locale.ui.routeBriefing}</p>
          <h2 className="poi-side__title">{displayLandmark?.name ?? 'Landmark'}</h2>
          <p className="poi-side__body">{displayLandmark?.description ?? ''}</p>
          <div className="poi-side__actions">
            <button className="poi-side__btn" type="button" onClick={() => displayLandmark && openLandmarkFocus(displayLandmark.id)}>
              {locale.ui.enterFocus}
            </button>
          </div>
        </div>
      </aside>

      <div className={`focus-shell ${focusPanelOpen ? 'is-visible' : ''}`} aria-hidden={!focusPanelOpen}>
        <aside className="focus-side focus-side--left" role="dialog" aria-modal="true" aria-labelledby="focus-title">
          <button className="focus-back" type="button" onClick={() => clearLandmark()}>{locale.ui.backToRoute}</button>
          <p className="focus-tag">{locale.ui.architecturalStory}</p>
          <h2 id="focus-title" className="focus-title">{selectedLandmark?.name ?? 'Landmark'}</h2>
          <p className="focus-description">{selectedLandmark?.description ?? ''}</p>
          {selectedLandmark && (
            <button className="focus-model-btn" type="button" onClick={() => setModelViewerOpen(true)}>
              {locale.ui.view3dModel}
            </button>
          )}
        </aside>

        <aside className="focus-side focus-side--right">
          <p className="focus-tag">{locale.ui.fieldNotes}</p>
          <div className="focus-reviews">
            {isLoading && <p className="focus-review-empty">{locale.ui.loadingReviews}</p>}
            {!isLoading && comments.length === 0 && <p className="focus-review-empty">{locale.ui.noReviews}</p>}
            {comments.map((comment) => (
              <article key={`${comment.author}-${comment.score}`} className="focus-review-card">
                <div className="focus-review-card__meta">
                  <span>{comment.author}</span>
                  <span>{comment.score}</span>
                </div>
                <p className="focus-review-card__body">{comment.comment}</p>
                <p className="focus-review-card__source">{comment.source}</p>
              </article>
            ))}
          </div>
        </aside>
      </div>

      <ModelViewerOverlay landmark={selectedLandmark} isOpen={modelViewerOpen} onClose={() => setModelViewerOpen(false)} />
    </>
  );
}
