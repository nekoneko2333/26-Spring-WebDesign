import { useEffect, useMemo, useState } from 'react';
import { useAppStore } from '../../state/useAppStore.js';
import { landmarks } from '../../data/landmarks.js';
import { ModelViewerOverlay } from './ModelViewerOverlay.jsx';
import { reviewLocales } from '../../data/reviewLocales.js';
import { travelLandmarkMeta } from '../../data/travelGuide.js';

const driveRouteCopy = {
  en: {
    title: '意大利行车导览',
    waypointNearby: '临近地标',
    guideStateLabel: '导览状态',
    guideStates: {
      IDLE: '待开始',
      DRIVING: '自动导览中',
      APPROACH_POI: '接近景点',
      FOCUS_POI: '到站停靠',
      RESUME: '继续导览',
      FINISHED: '路线导览完成',
    },
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
      ferry: 'Ferry',
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
    tourPanel: {
      routeName: '当前路线',
      currentStop: '当前站点',
      nextStop: '下一站',
      progress: '导览进度',
      speed: '当前速度',
      playbackSpeed: '导览倍率',
      start: '开始导览',
      pause: '暂停',
      resume: '继续',
      reset: '重置',
      defaultRoute: '意大利经典路线',
      freeRoute: '自定义路线',
      noStop: '路线起点',
      finished: '已完成',
      viewMode: '视角模式',
      followView: '跟随视角',
      mapView: '俯视视角',
      freeView: '自由视角',
      arrived: '已到达',
      rating: '评分',
      stay: '建议停留',
      continue: '继续导览',
      continueFromHere: '从此处继续导览',
      startHint: '点击开始导览',
      pausedHint: '已暂停，点击继续导览',
      completeHint: '路线导览完成',
      arrivalNotice: '到站提示',
      detail: '查看详情',
      jumpToStop: '跳转到此处',
      timeline: '路线时间轴',
      reached: '已到达',
      heading: '前往中',
      pending: '未到达',
      summaryTitle: '导览完成',
      completionMessage: '本次导览完成，下面是你的旅行完成总结。',
      passedStops: '经过景点数量',
      routeNames: '经过城市 / 景点',
      postcardTitle: '旅行明信片',
      travelTip: '旅行提示',
      postcardTip: '建议停留片刻，查看模型或打开详情，再继续下一段导览。',
      viewModel: '查看模型',
      backToRoute: '返回路线',
      exportBook: '导出旅行手册',
      stamps: '旅行印章',
      recommendedDays: '推荐旅行天数',
      visitedCount: '已游览景点',
      routeDistance: '模拟路线距离',
      nextStep: '推荐下一步：可重新导览、切换路线，或返回首页调整路线。',
      restart: '重新导览',
      switchRoute: '返回修改路线',
      home: '返回首页',
    },
  },
  zh: {
    title: '意大利行车导览',
    waypointNearby: '临近地标',
    guideStateLabel: '沉浸导览',
    guideStates: {
      IDLE: '待机',
      DRIVING: '巡航中',
      APPROACH_POI: '接近景点',
      FOCUS_POI: '沉浸聚焦',
      RESUME: '回到路线',
      FINISHED: '已完成',
    },
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
      ferry: '水路 / 轮渡',
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
    tourPanel: {
      routeName: '当前路线',
      currentStop: '当前站点',
      nextStop: '下一站',
      progress: '导览进度',
      speed: '当前速度',
      playbackSpeed: '导览倍率',
      start: '开始导览',
      pause: '暂停',
      resume: '继续',
      reset: '重置路线',
      defaultRoute: '意大利经典路线',
      freeRoute: '自定义路线',
      noStop: '路线起点',
      finished: '已完成',
      viewMode: '视角模式',
      followView: '跟随视角',
      mapView: '俯视视角',
      freeView: '自由视角',
      arrived: '已到达',
      rating: '评分',
      stay: '建议停留',
      continue: '继续导览',
      continueFromHere: '从此处继续导览',
      startHint: '点击开始导览',
      pausedHint: '已暂停，点击继续导览',
      completeHint: '路线导览完成',
      arrivalNotice: '到站提示',
      detail: '查看详情',
      jumpToStop: '跳转到此处',
      timeline: '路线时间轴',
      reached: '已到达',
      heading: '前往中',
      pending: '未到达',
      summaryTitle: '导览完成',
      completionMessage: '本次导览完成，下面是你的旅行完成总结。',
      passedStops: '经过景点数量',
      routeNames: '经过城市 / 景点',
      postcardTitle: '旅行明信片',
      travelTip: '旅行提示',
      postcardTip: '建议停留片刻，查看模型或打开详情，再继续下一段导览。',
      viewModel: '查看模型',
      backToRoute: '返回路线',
      exportBook: '导出旅行手册',
      stamps: '旅行印章',
      recommendedDays: '推荐旅行天数',
      visitedCount: '已游览景点',
      routeDistance: '模拟路线距离',
      nextStep: '推荐下一步：可重新导览、切换路线，或返回首页调整路线。',
      restart: '重新导览',
      switchRoute: '返回修改路线',
      home: '返回首页',
    },
  },
};

function getLandmarkName(landmark, language) {
  return landmark?.localizedNames?.[language]
    ?? travelLandmarkMeta[landmark?.id]?.name?.[language]
    ?? landmark?.name
    ?? '';
}

function getLandmarkDescription(landmark, language) {
  return landmark?.localizedDescriptions?.[language]
    ?? landmark?.description
    ?? travelLandmarkMeta[landmark?.id]?.blurb?.[language]
    ?? '';
}

function getShortText(text, maxLength = 58) {
  if (!text || text.length <= maxLength) return text ?? '';
  return `${text.slice(0, maxLength)}…`;
}

function getArrivalMeta(landmarkId) {
  const fallback = { rating: '4.8', stay: '45 分钟' };
  const table = {
    milan_duomo: { rating: '4.9', stay: '60 分钟' },
    venice_rialto: { rating: '4.7', stay: '40 分钟' },
    florence_duomo: { rating: '4.8', stay: '55 分钟' },
    pisa: { rating: '4.7', stay: '45 分钟' },
    colosseum: { rating: '4.9', stay: '75 分钟' },
    pompeii: { rating: '4.8', stay: '90 分钟' },
  };
  return table[landmarkId] ?? fallback;
}

function formatHour(hour) {
  const safeHour = Number.isFinite(hour) ? hour : 8;
  const totalMinutes = Math.max(0, Math.round(safeHour * 60));
  const h = Math.floor(totalMinutes / 60) % 24;
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function UIOverlay({ isStarted, onClose }) {
  const [controlsCollapsed, setControlsCollapsed] = useState(false);
  const [arrivalToastId, setArrivalToastId] = useState(null);
  const [activeTimelineStopId, setActiveTimelineStopId] = useState(null);
  const {
    language,
    cameraMode,
    nearbyLandmarkId,
    selectedLandmarkId,
    routeContext,
    routeDay,
    routeHour,
    routeProgress,
    activeRouteIds,
    activeRouteSegments,
    activeRouteDistanceKm,
    guidedTourState,
    vehicleSpeed,
    routePlaybackSpeed,
    arrivalNotice,
    arrivedLandmarkIds,
    focusPanelOpen,
    modelViewerOpen,
    autoDrive,
    setFocusPanelOpen,
    setModelViewerOpen,
    setCameraMode,
    setAutoDrive,
    setRoutePlaybackSpeed,
    resetVehicleTour,
    toggleMapView,
    toggleAutoDrive,
    openLandmarkFocus,
    jumpVehicleToLandmark,
    continueVehicleTour,
    clearLandmark,
  } = useAppStore();

  const nearbyLandmark = landmarks.find((item) => item.id === nearbyLandmarkId);
  const selectedLandmark = landmarks.find((item) => item.id === selectedLandmarkId);
  const arrivalLandmark = landmarks.find((item) => item.id === arrivalNotice?.landmarkId);
  const focusTargetId = nearbyLandmarkId ?? arrivalNotice?.landmarkId;
  const displayLandmark = selectedLandmark ?? nearbyLandmark;
  const locale = reviewLocales[language];
  const routeCopy = driveRouteCopy[language] ?? driveRouteCopy.en;
  const routeLocked = focusPanelOpen || modelViewerOpen;
  const routePoint = routeContext?.point;
  const routeSegment = routeContext?.segment;
  const routeProfile = routeContext?.profile;
  const panelCopy = routeCopy.tourPanel;
  const displayRouteIds = activeRouteIds.length ? activeRouteIds : ['milan_duomo', 'venice_rialto', 'florence_duomo', 'pisa', 'colosseum', 'pompeii'];
  const routeStops = displayRouteIds.map((id) => landmarks.find((item) => item.id === id)).filter(Boolean);
  const timelinePositions = useMemo(() => {
    if (routeStops.length <= 1) return routeStops.map(() => 0);
    const distances = routeStops.slice(1).map((stop, index) => {
      const from = routeStops[index];
      const segment = activeRouteSegments.find((item) => (
        (item.fromId === from.id && item.toId === stop.id) || item.index === index
      ));
      const distance = Number(segment?.distanceKm ?? 0);
      return Number.isFinite(distance) && distance > 0 ? distance : 1;
    });
    const total = distances.reduce((sum, distance) => sum + distance, 0) || 1;
    let cursor = 0;
    return routeStops.map((_, index) => {
      if (index === 0) return 0;
      cursor += distances[index - 1] ?? 0;
      return Math.min(100, Math.max(0, (cursor / total) * 100));
    });
  }, [activeRouteSegments, routeStops]);
  const timelineOverlapGroups = useMemo(() => {
    const groups = [];
    routeStops.forEach((_, index) => {
      const previousIndex = index - 1;
      const previousGroup = groups.at(-1);
      const overlapsPrevious = previousIndex >= 0
        && Math.abs((timelinePositions[index] ?? 0) - (timelinePositions[previousIndex] ?? 0)) <= 2.8;
      if (overlapsPrevious && previousGroup) previousGroup.push(index);
      else groups.push([index]);
    });
    return groups;
  }, [routeStops, timelinePositions]);
  const progressPercent = Math.round((routeProgress ?? 0) * 100);
  const contextualStopId = routeContext?.currentStopId ?? arrivalNotice?.landmarkId;
  const contextualStopIndex = routeStops.findIndex((stop) => stop.id === contextualStopId);
  const currentStopIndex = contextualStopIndex >= 0
    ? contextualStopIndex
    : Math.min(Math.floor((routeProgress ?? 0) * Math.max(routeStops.length - 1, 1)), Math.max(routeStops.length - 1, 0));
  const currentStop = nearbyLandmark ?? routeStops[currentStopIndex];
  const nextStop = routeStops.find((_, index) => index > currentStopIndex) ?? null;
  const isPaused = !autoDrive;
  const isComplete = progressPercent >= 100 || guidedTourState === 'FINISHED';
  const arrivalMeta = getArrivalMeta(arrivalLandmark?.id);
  const selectedMeta = travelLandmarkMeta[selectedLandmark?.id] ?? {};
  const selectedArrivalMeta = getArrivalMeta(selectedLandmark?.id);
  const selectedIsArrival = Boolean(selectedLandmark?.id && selectedLandmark.id === arrivalNotice?.landmarkId);
  const [timelineLandmarkId, setTimelineLandmarkId] = useState(null);
  const timelineLandmark = landmarks.find((item) => item.id === timelineLandmarkId);
  const timelineMeta = getArrivalMeta(timelineLandmark?.id);
  const visitedCount = Math.max(arrivedLandmarkIds.length, isComplete ? routeStops.length : 0);
  const recommendedTourDays = Math.max(1, Math.ceil(routeStops.length / 2));
  const routeStampNames = routeStops.map((stop) => getLandmarkName(stop, language).split(/[ /·]/)[0]).slice(0, 6);
  const distanceText = activeRouteDistanceKm
    ? `${activeRouteDistanceKm < 10 ? activeRouteDistanceKm.toFixed(1) : Math.round(activeRouteDistanceKm)} km`
    : '约 920 km';
  const showPoiBriefing = Boolean(
    displayLandmark
      && !focusPanelOpen
      && cameraMode !== 'map'
      && !arrivalLandmark
      && !timelineLandmark
      && !isComplete,
  );
  const handleTimelineStopClick = (index) => {
    const clickedStop = routeStops[index];
    if (!clickedStop) return;
    const groupIndices = timelineOverlapGroups.find((group) => group.includes(index)) ?? [index];
    const overlapGroup = groupIndices.map((stopIndex) => ({
      stop: routeStops[stopIndex],
      index: stopIndex,
    }));
    const activeIndex = overlapGroup.findIndex((item) => item.stop.id === activeTimelineStopId);
    const target = activeIndex >= 0
      ? overlapGroup[(activeIndex + 1) % overlapGroup.length]
      : overlapGroup[0];

    setActiveTimelineStopId(target.stop.id);
    jumpVehicleToLandmark(target.stop.id);
  };

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

      if (key === 'f' && focusTargetId && !modelViewerOpen) {
        setAutoDrive(false);
        if (focusPanelOpen && selectedLandmarkId === focusTargetId) {
          clearLandmark();
          return;
        }
        if (selectedLandmarkId === focusTargetId) {
          setFocusPanelOpen(true);
          return;
        }
        openLandmarkFocus(focusTargetId);
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
    focusTargetId,
    openLandmarkFocus,
    routeLocked,
    selectedLandmarkId,
    setAutoDrive,
    setRoutePlaybackSpeed,
    resetVehicleTour,
    setFocusPanelOpen,
    setModelViewerOpen,
    toggleAutoDrive,
    toggleMapView,
  ]);

  useEffect(() => {
    setTimelineLandmarkId(null);
    setActiveTimelineStopId(null);
  }, [displayRouteIds.join('|')]);

  useEffect(() => {
    if (!arrivalNotice?.landmarkId) return undefined;
    setArrivalToastId(arrivalNotice.landmarkId);
    const timeoutId = window.setTimeout(() => setArrivalToastId(null), 3200);
    return () => window.clearTimeout(timeoutId);
  }, [arrivalNotice?.landmarkId]);

  useEffect(() => {
    document.body.classList.toggle('route-locked', routeLocked);
    return () => document.body.classList.remove('route-locked');
  }, [routeLocked]);

  useEffect(() => {
    document.body.classList.toggle('poi-briefing-visible', showPoiBriefing);
    return () => document.body.classList.remove('poi-briefing-visible');
  }, [showPoiBriefing]);

  useEffect(() => {
    if (!selectedLandmarkId || selectedLandmarkId === nearbyLandmarkId || selectedLandmarkId === arrivalNotice?.landmarkId) return;
    if (!nearbyLandmarkId && !arrivalNotice?.landmarkId) return;
    if (focusPanelOpen || modelViewerOpen) return;
    clearLandmark();
  }, [arrivalNotice?.landmarkId, clearLandmark, focusPanelOpen, modelViewerOpen, nearbyLandmarkId, selectedLandmarkId]);

  if (!isStarted) return null;

  const dayText = routeCopy.dayLabel.replace('{day}', routeDay ?? 1);
  const timeText = routeCopy.timeLabel.replace('{hour}', formatHour(routeHour));

  return (
    <>
      <aside className={`tour-info-panel ${controlsCollapsed ? 'is-collapsed' : ''}`} aria-live="polite">
        <button
          className="tour-info-panel__toggle"
          type="button"
          onClick={() => setControlsCollapsed((current) => !current)}
          aria-expanded={!controlsCollapsed}
        >
          {controlsCollapsed ? (language === 'zh' ? '展开' : 'Open') : (language === 'zh' ? '收起' : 'Hide')}
        </button>
        {!controlsCollapsed && (
          <>
        <p className="tour-info-panel__eyebrow">{language === 'zh' ? '导览控制' : 'Guide controls'}</p>
        <dl>
          <div><dt>{panelCopy.currentStop}</dt><dd>{isComplete ? panelCopy.completeHint : getLandmarkName(currentStop, language) || panelCopy.noStop}</dd></div>
          <div><dt>{panelCopy.nextStop}</dt><dd>{isComplete ? panelCopy.finished : getLandmarkName(nextStop, language) || panelCopy.finished}</dd></div>
          <div><dt>{panelCopy.progress}</dt><dd>{progressPercent}%</dd></div>
          <div><dt>{panelCopy.speed}</dt><dd>{Math.round(vehicleSpeed ?? 0)} {routeCopy.speedUnit}</dd></div>
          <div><dt>{panelCopy.playbackSpeed}</dt><dd>{routePlaybackSpeed}×</dd></div>
        </dl>
        <div className="tour-info-panel__progress"><span style={{ width: `${progressPercent}%` }} /></div>
        <label className="tour-info-panel__speed-control">
          <span>{panelCopy.playbackSpeed}</span>
          <select
            value={routePlaybackSpeed}
            onChange={(event) => setRoutePlaybackSpeed(Number(event.target.value))}
            aria-label={panelCopy.playbackSpeed}
          >
            {[1, 4, 8, 20].map((speed) => (
              <option key={speed} value={speed}>{speed}×</option>
            ))}
          </select>
        </label>
        <p className="tour-info-panel__subhead">{panelCopy.viewMode}</p>
        <div className="tour-info-panel__view-actions">
          <button type="button" className={cameraMode === 'follow' ? 'is-active' : ''} onClick={() => setCameraMode('follow')}>{panelCopy.followView}</button>
          <button type="button" className={cameraMode === 'map' ? 'is-active' : ''} onClick={() => setCameraMode('map')}>{panelCopy.mapView}</button>
          <button type="button" className={cameraMode === 'free' ? 'is-active' : ''} onClick={() => setCameraMode('free')}>{panelCopy.freeView}</button>
        </div>
        <div className="tour-info-panel__actions">
          <button type="button" onClick={() => setAutoDrive(true)} disabled={autoDrive || isComplete}>
            {isComplete ? panelCopy.finished : progressPercent > 0 && isPaused ? panelCopy.resume : panelCopy.start}
          </button>
          <button type="button" onClick={() => setAutoDrive(false)} disabled={!autoDrive}>{panelCopy.pause}</button>
          <button type="button" onClick={resetVehicleTour}>{panelCopy.reset}</button>
        </div>
          </>
        )}
      </aside>

      {arrivalToastId && (
        <aside className="arrival-toast" aria-live="polite">
          <span>{language === 'zh' ? '已到达' : 'Arrived'}</span>
          <strong>{getLandmarkName(landmarks.find((item) => item.id === arrivalToastId), language)}</strong>
        </aside>
      )}

      {arrivalLandmark && !isComplete && (
        <aside className="arrival-card travel-postcard" role="dialog" aria-live="polite">
          <p>{panelCopy.postcardTitle}</p>
          <h2>{language === 'zh' ? '已到达：' : 'Arrived: '}{getLandmarkName(arrivalLandmark, language)}</h2>
          <span>{getShortText(getLandmarkDescription(arrivalLandmark, language), 92)}</span>
          <div className="arrival-card__meta"><strong>{panelCopy.stay} {arrivalMeta.stay}</strong><strong>{panelCopy.travelTip}</strong></div>
          <p className="arrival-card__reason">{panelCopy.postcardTip}</p>
          <div className="arrival-card__actions">
            <button type="button" onClick={continueVehicleTour}>{panelCopy.continue}</button>
            <button type="button" onClick={() => { openLandmarkFocus(arrivalLandmark.id); setModelViewerOpen(true); }}>{panelCopy.viewModel}</button>
            <button type="button" onClick={() => clearLandmark()}>{panelCopy.backToRoute}</button>
          </div>
        </aside>
      )}

      <div className="route-timeline" aria-label={panelCopy.timeline} style={{ '--route-progress-ratio': String(Math.min(1, Math.max(0, routeProgress ?? 0))) }}>
        <div className="route-timeline__track">
          <i className="route-timeline__travelled" aria-hidden="true" />
          {routeStops.map((stop, index) => {
            const stopRatio = (timelinePositions[index] ?? 0) / 100;
            const reached = isComplete || (routeProgress ?? 0) >= Math.max(0, stopRatio - 0.004);
            const current = !isComplete && index === currentStopIndex;
            const statusText = reached ? panelCopy.reached : current ? panelCopy.heading : panelCopy.pending;
            return (
              <button
                key={stop.id}
                type="button"
                className={`route-timeline__stop ${reached ? 'is-reached' : ''} ${current ? 'is-current' : ''} ${activeTimelineStopId === stop.id ? 'is-active-layer' : ''}`}
                style={{
                  '--stop-ratio': String((timelinePositions[index] ?? 0) / 100),
                  '--stop-z': activeTimelineStopId === stop.id ? 40 : 2 + index,
                }}
                onClick={() => handleTimelineStopClick(index)}
              >
                <span>{index + 1}</span>
                <strong>{getLandmarkName(stop, language)}</strong>
                <em>{statusText}</em>
              </button>
            );
          })}
        </div>
      </div>

      {timelineLandmark && (
        <aside className="timeline-popover">
          <button type="button" onClick={() => setTimelineLandmarkId(null)}>×</button>
          <h2>{getLandmarkName(timelineLandmark, language)}</h2>
          <span>{getShortText(getLandmarkDescription(timelineLandmark, language), 52)}</span>
          <div><strong>{panelCopy.rating} {timelineMeta.rating}</strong><strong>{panelCopy.stay} {timelineMeta.stay}</strong></div>
          <button className="timeline-popover__jump" type="button" onClick={() => { jumpVehicleToLandmark(timelineLandmark.id); setTimelineLandmarkId(null); }}>{panelCopy.jumpToStop}</button>
        </aside>
      )}

      {isComplete && (
        <aside className="tour-summary-card" role="dialog" aria-live="polite">
          <p>{panelCopy.summaryTitle}</p>
          <h2>{language === 'zh' ? '本次导览完成' : 'Guide completed'}</h2>
          <small>{panelCopy.completionMessage}</small>
          <div><span>{panelCopy.passedStops}</span><strong>{visitedCount} / {routeStops.length}</strong></div>
          <div><span>{panelCopy.routeDistance}</span><strong>{distanceText}</strong></div>
          <div><span>{panelCopy.recommendedDays}</span><strong>{recommendedTourDays}</strong></div>
          <small>{panelCopy.routeNames}: {routeStops.map((stop) => getLandmarkName(stop, language)).join(' / ')}</small>
          <small>{panelCopy.stamps}: {routeStampNames.join(' / ')}</small>
          <small>{panelCopy.nextStep}</small>
          <section>
            <button type="button" onClick={resetVehicleTour}>{panelCopy.restart}</button>
            <button type="button" onClick={onClose}>{panelCopy.switchRoute}</button>
            <button type="button" onClick={() => window.print()}>{panelCopy.exportBook}</button>
          </section>
        </aside>
      )}

      <div className="hud-hints is-visible">
        <span className="hud-key"><kbd>W</kbd><kbd>S</kbd> {locale.ui.cruise}</span>
        <span className="hud-key hud-key--boost"><kbd>Shift</kbd> {language === 'zh' ? '加速' : 'Boost'}</span>
        <span className="hud-key"><kbd>R</kbd> {locale.ui.auto}</span>
        <span className="hud-key"><kbd>V</kbd> {locale.ui.view}</span>
        <span className="hud-key"><kbd>F</kbd> {focusTargetId ? (language === 'zh' ? '查看详细信息' : 'View details') : locale.ui.explore}</span>
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

      <aside className={`poi-side poi-side--left ${showPoiBriefing ? 'is-visible' : ''}`} aria-live="polite">
        <div className="poi-side__panel">
          <h2 className="poi-side__title">{getLandmarkName(displayLandmark, language) || 'Landmark'}</h2>
        </div>
      </aside>

      <div className={`focus-shell ${focusPanelOpen ? 'is-visible' : ''}`} aria-hidden={!focusPanelOpen}>
        <aside className="focus-side focus-side--left" role="dialog" aria-modal="true" aria-labelledby="focus-title">
          <button className="focus-back" type="button" onClick={() => clearLandmark()}>{locale.ui.backToRoute}</button>
          <h2 id="focus-title" className="focus-title">{getLandmarkName(selectedLandmark, language) || 'Landmark'}</h2>
          <p className="focus-description">{getLandmarkDescription(selectedLandmark, language)}</p>
          {selectedLandmark && (
            <div className="focus-detail-grid">
              <span>{selectedMeta.type?.[language] ?? (language === 'zh' ? '精选景点' : 'Featured stop')}</span>
              <span>{selectedMeta.city?.[language] ?? selectedLandmark.city}</span>
              <span>{selectedMeta.region?.[language] ?? selectedLandmark.country}</span>
              <span>{selectedMeta.season?.[language] ?? (language === 'zh' ? '建议现场观察光线与人流' : 'Check light and crowds on site')}</span>
              <span>{panelCopy.rating} {selectedArrivalMeta.rating}</span>
              <span>{panelCopy.stay} {selectedArrivalMeta.stay}</span>
            </div>
          )}
          {selectedIsArrival && (
            <div className="focus-arrival-actions">
              <p>{language === 'zh' ? '推荐理由：适合作为本段路线的重点停靠点，建议短暂停留拍照并查看建筑细节。' : 'Recommended as a key stop for this route segment. Pause briefly for photos and architectural details.'}</p>
            </div>
          )}
          {selectedLandmark && (
            <button className="focus-model-btn" type="button" onClick={() => setModelViewerOpen(true)}>
              {locale.ui.view3dModel}
            </button>
          )}
        </aside>
      </div>

      <ModelViewerOverlay landmark={selectedLandmark} isOpen={modelViewerOpen} onClose={() => setModelViewerOpen(false)} />
    </>
  );
}
