import { useEffect } from 'react';
import { useAppStore } from '../../state/useAppStore.js';
import { landmarks } from '../../data/landmarks.js';
import { useLandmarkReviews } from '../../hooks/useLandmarkReviews.js';
import { ModelViewerOverlay } from './ModelViewerOverlay.jsx';

export function UIOverlay({ isStarted }) {
  const {
    cameraMode,
    nearbyLandmarkId,
    selectedLandmarkId,
    focusPanelOpen,
    modelViewerOpen,
    autoDrive,
    setFocusPanelOpen,
    setModelViewerOpen,
    setCameraMode,
    toggleMapView,
    toggleAutoDrive,
    openLandmarkFocus,
    clearLandmark,
  } = useAppStore();

  const nearbyLandmark = landmarks.find((item) => item.id === nearbyLandmarkId);
  const selectedLandmark = landmarks.find((item) => item.id === selectedLandmarkId);
  const popupLandmark = selectedLandmark ?? nearbyLandmark;
  const { data: reviewPayload, isLoading } = useLandmarkReviews(selectedLandmarkId);
  const comments = reviewPayload?.reviews ?? [];

  useEffect(() => {
    if (!isStarted) return;

    const onKeyDown = (event) => {
      const key = event.key.toLowerCase();

      if (key === 'v') {
        toggleMapView();
        return;
      }

      if (key === 'r') {
        toggleAutoDrive();
        return;
      }

      if (key === 'f' && nearbyLandmarkId) {
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
        if (focusPanelOpen) {
          clearLandmark();
          return;
        }
        if (selectedLandmarkId) {
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
    selectedLandmarkId,
    setFocusPanelOpen,
    setModelViewerOpen,
    toggleAutoDrive,
    toggleMapView,
  ]);

  useEffect(() => {
    if (!selectedLandmarkId || !nearbyLandmarkId || selectedLandmarkId === nearbyLandmarkId) return;
    clearLandmark();
  }, [clearLandmark, nearbyLandmarkId, selectedLandmarkId]);

  if (!isStarted) return null;

  return (
    <>
      <div className="hud-title is-visible">Italy <span>Drive</span></div>
      <div className={`hud-mode is-visible ${autoDrive ? 'is-autodriving' : ''}`}>
        {cameraMode === 'focus' ? 'Landmark Focus' : cameraMode === 'follow' ? (autoDrive ? 'Auto Driving' : 'Driving View') : 'Map View'}
      </div>

      <button className={`btn-map-view ${cameraMode !== 'map' ? 'is-visible' : ''}`} onClick={() => setCameraMode('map')}>
        <svg className="btn-map-view__icon" width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
          <rect x="1" y="1" width="5" height="5" rx="1" fill="currentColor" opacity="0.6" />
          <rect x="8" y="1" width="5" height="5" rx="1" fill="currentColor" />
          <rect x="1" y="8" width="5" height="5" rx="1" fill="currentColor" />
          <rect x="8" y="8" width="5" height="5" rx="1" fill="currentColor" opacity="0.6" />
        </svg>
        Map View
      </button>

      <div className="hud-hints is-visible">
        <span className="hud-key"><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> Drive</span>
        <span className="hud-key"><kbd>Shift</kbd> Boost</span>
        <span className="hud-key"><kbd>V</kbd> Toggle View</span>
        <span className="hud-key"><kbd>R</kbd> Auto-Drive</span>
        <span className="hud-key"><kbd>F</kbd> Explore</span>
      </div>

      <div className="hud-speed is-visible" aria-live="polite">
        <span className={`hud-speed__val ${autoDrive ? 'is-boosting' : ''}`}>{reviewPayload?.average_score ? reviewPayload.average_score : '0'}</span>
        <span className="hud-speed__unit">score</span>
      </div>

      <div className={`interact-prompt ${nearbyLandmarkId && cameraMode !== 'map' ? 'is-visible' : ''}`} aria-live="polite">
        <span className="interact-prompt__key">F</span>
        <span className="interact-prompt__text">{nearbyLandmarkId ? 'Explore Landmark' : 'Cruise & Discover'}</span>
      </div>

      <div className={`poi-popup ${popupLandmark && !focusPanelOpen && cameraMode !== 'map' ? 'is-visible' : ''}`} aria-live="polite">
        <div className="poi-popup__card">
          <button className="poi-popup__close" aria-label="Close" onClick={() => clearLandmark()}>&times;</button>
          <p className="poi-popup__tag">Curated Landmark</p>
          <h2 className="poi-popup__title">{popupLandmark?.name ?? 'Landmark'}</h2>
          <p className="poi-popup__desc">{popupLandmark?.description ?? 'Move through Italy and stop at curated architectural landmarks.'}</p>
          <div className="poi-popup__footer">
            <span className="poi-popup__distance">{selectedLandmarkId ? reviewPayload?.review_count ?? 0 : 'Press F'} {selectedLandmarkId ? 'reviews' : 'to enter'}</span>
            <button className="poi-popup__btn" type="button" onClick={() => popupLandmark && openLandmarkFocus(popupLandmark.id)}>
              {selectedLandmarkId ? 'Open Focus' : 'View Landmark'}
            </button>
          </div>
        </div>
      </div>

      <div className={`focus-overlay ${focusPanelOpen ? 'is-visible' : ''}`} aria-hidden={!focusPanelOpen}>
        <div className="focus-panel" role="dialog" aria-modal="true" aria-labelledby="focus-title">
          <button className="focus-back" type="button" onClick={() => clearLandmark()}>Back to Route</button>
          <p className="focus-tag">Architectural Story</p>
          <h2 id="focus-title" className="focus-title">{selectedLandmark?.name ?? 'Comments'}</h2>
          <p className="focus-description">{selectedLandmark?.description ?? 'Select a landmark to inspect reviews and scene details.'}</p>

          <div className="focus-reviews">
            {isLoading && <p className="focus-review-empty">Loading reviews…</p>}
            {!isLoading && comments.length === 0 && <p className="focus-review-empty">Select a landmark to load mock review data from the backend.</p>}
            {comments.map((comment) => (
              <article key={comment.id} className="focus-review-card">
                <div className="focus-review-card__meta">
                  <span>{comment.author}</span>
                  <span>{comment.score}</span>
                </div>
                <p className="focus-review-card__body">{comment.comment}</p>
                <p className="focus-review-card__source">{comment.source}</p>
              </article>
            ))}
          </div>

          {selectedLandmark && (
            <button className="focus-model-btn" type="button" onClick={() => setModelViewerOpen(true)}>
              View 3D Model
            </button>
          )}
        </div>
      </div>

      <ModelViewerOverlay landmark={selectedLandmark} isOpen={modelViewerOpen} onClose={() => setModelViewerOpen(false)} />
    </>
  );
}
