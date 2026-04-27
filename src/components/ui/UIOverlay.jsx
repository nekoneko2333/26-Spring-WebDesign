import { useEffect, useMemo } from 'react';
import { useAppStore } from '../../state/useAppStore.js';
import { landmarks } from '../../data/landmarks.js';
import { useLandmarkReviews } from '../../hooks/useLandmarkReviews.js';
import { ModelViewerOverlay } from './ModelViewerOverlay.jsx';
import { reviewLocales } from '../../data/reviewLocales.js';
import { travelLandmarkMeta } from '../../data/travelGuide.js';

const driveRouteCopy = {
  en: {
    title: 'Italy Drive',
    waypointNearby: 'waypoint nearby',
    speedUnit: 'km/h',
    dayLabel: 'Day {day}',
    timeLabel: '{hour}',
    trafficLabels: {
      free: 'Free flow',
      normal: 'Normal traffic',
      slow: 'Slow traffic',
      traffic_jam: 'Traffic jam',
    },
    segmentTypes: {
      city: 'City streets',
      motorway: 'Autostrada',
      scenic: 'Scenic road',
      mountain: 'Mountain pass',
      bridge: 'Lagoon access road',
      tunnel: 'Mountain tunnel',
      ringRoad: 'Rome ring road',
    },
    surfaceLabels: {
      'asphalt / stone edge': 'asphalt / stone edge',
      'smooth asphalt': 'smooth asphalt',
      'rolling asphalt': 'rolling asphalt',
      'graded mountain road': 'graded mountain road',
      'low coastal roadway': 'low coastal roadway',
      'covered roadway': 'covered roadway',
      'urban arterial': 'urban arterial',
    },
    descriptions: {
      milan_city: 'dense historic arrival',
      a4_lombardy: 'long northern autostrada corridor',
      venice_lagoon: 'arrival near the Venice mainland gateway',
      veneto_emilia: 'flat motorway between Veneto and Emilia',
      apennine_crossing: 'broad mountain-grade climb',
      apennine_tunnel: 'tunnel descent toward Florence',
      tuscany_west: 'rolling Tuscan primary road',
      tuscany_to_rome: 'long scenic countryside transfer',
      rome_arrival: 'busy metropolitan approach',
      a1_campania: 'southbound motorway run',
      pompeii_arrival: 'urban arrival near the ruins',
    },
  },
  zh: {
    title: '意大利行车导览',
    waypointNearby: '临近地标',
    speedUnit: '公里/小时',
    dayLabel: '第 {day} 天',
    timeLabel: '{hour}',
    trafficLabels: {
      free: '畅通',
      normal: '正常',
      slow: '缓行',
      traffic_jam: '拥堵',
    },
    segmentTypes: {
      city: '城市街道',
      motorway: '高速公路',
      scenic: '风景道路',
      mountain: '山地路段',
      bridge: '潟湖入口路',
      tunnel: '山地隧道',
      ringRoad: '罗马环路',
    },
    surfaceLabels: {
      'asphalt / stone edge': '沥青 / 石材边缘',
      'smooth asphalt': '平整沥青',
      'rolling asphalt': '起伏沥青路面',
      'graded mountain road': '山地坡道路面',
      'low coastal roadway': '低海岸道路',
      'covered roadway': '隧道道路',
      'urban arterial': '城市主干路',
    },
    descriptions: {
      milan_city: '进入历史城区的密集街道',
      a4_lombardy: '意大利北部的长距离高速通道',
      venice_lagoon: '抵达威尼斯陆路入口附近',
      veneto_emilia: '威尼托到艾米利亚之间的平直高速',
      apennine_crossing: '跨越亚平宁山脉的爬坡路段',
      apennine_tunnel: '通向佛罗伦萨的隧道下坡',
      tuscany_west: '托斯卡纳西侧起伏的主干道路',
      tuscany_to_rome: '穿过乡野景观的长距离转场',
      rome_arrival: '进入罗马都会区的繁忙道路',
      a1_campania: '向坎帕尼亚南下的高速路段',
      pompeii_arrival: '靠近遗址的城市抵达路段',
    },
  },
};

function getLandmarkName(landmark, language) {
  return travelLandmarkMeta[landmark?.id]?.name?.[language] ?? landmark?.name ?? '';
}

function getLandmarkDescription(landmark, language) {
  return travelLandmarkMeta[landmark?.id]?.blurb?.[language] ?? landmark?.description ?? '';
}

function formatHour(hour) {
  const safeHour = Number.isFinite(hour) ? hour : 7;
  const h = Math.floor(safeHour);
  const m = Math.round((safeHour - h) * 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function UIOverlay({ isStarted }) {
  const {
    language,
    cameraMode,
    nearbyLandmarkId,
    selectedLandmarkId,
    routeContext,
    routeDay,
    routeHour,
    vehicleSpeed,
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
  const routeCopy = driveRouteCopy[language] ?? driveRouteCopy.en;
  const localizedReviews = useMemo(() => {
    if (!selectedLandmarkId) return [];
    return locale.landmarks[selectedLandmarkId] ?? [];
  }, [language, locale.landmarks, selectedLandmarkId]);
  const comments = localizedReviews.length > 0 ? localizedReviews : reviewPayload?.reviews ?? [];
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

  const dayText = routeCopy.dayLabel.replace('{day}', routeDay ?? 1);
  const timeText = routeCopy.timeLabel.replace('{hour}', formatHour(routeHour));

  return (
    <>
      <div className="hud-title is-visible">{routeCopy.title}</div>
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

      <div className="hud-time is-visible">
        <span>{dayText}</span>
        <strong>{timeText}</strong>
      </div>

      <div className="hud-speed is-visible" aria-live="polite">
        <span className={`hud-speed__val ${autoDrive ? 'is-boosting' : ''}`}>{Math.round(vehicleSpeed ?? 0)}</span>
        <span className="hud-speed__unit">{routeCopy.speedUnit}</span>
      </div>

      {routeSegment && (
        <div className={`hud-road is-visible hud-road--${routeSegment.trafficState}`}>
          <div>
            <span>{routeCopy.segmentTypes[routeSegment.type] ?? routeProfile?.roadLabel ?? routeSegment.type}</span>
            <strong>{routeSegment.speedLimit} {routeCopy.speedUnit}</strong>
          </div>
          <p>
            {routeCopy.trafficLabels[routeSegment.trafficState] ?? routeProfile?.trafficLabel ?? routeSegment.trafficState}
            {routeProfile?.surfaceLabel ? ` / ${routeCopy.surfaceLabels[routeProfile.surfaceLabel] ?? routeProfile.surfaceLabel}` : ''}
            {routeSegment.description ? ` / ${routeCopy.descriptions[routeSegment.id] ?? routeSegment.description}` : ''}
            {routePoint?.landmarkId ? ` / ${routeCopy.waypointNearby}` : ''}
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
          <h2 className="poi-side__title">{getLandmarkName(displayLandmark, language) || 'Landmark'}</h2>
          <p className="poi-side__body">{getLandmarkDescription(displayLandmark, language)}</p>
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
          <h2 id="focus-title" className="focus-title">{getLandmarkName(selectedLandmark, language) || 'Landmark'}</h2>
          <p className="focus-description">{getLandmarkDescription(selectedLandmark, language)}</p>
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
