export const PACE_DAILY_HOURS = {
  Relaxed: 6,
  Standard: 8,
  Fast: 10,
};

export const PACE_PROFILES = {
  Relaxed: { visitMultiplier: 1.3, dailyBufferHours: 1 },
  Standard: { visitMultiplier: 1, dailyBufferHours: 0.5 },
  Fast: { visitMultiplier: 0.75, dailyBufferHours: 0.25 },
};

export const GUIDE_DAY_START_HOUR = 8;

export function plannedVisitHoursForLandmark(landmark, sourceDurationHours, pace = 'Standard') {
  const fallbackHours = landmark?.modelKind === 'museum' ? 3
    : ['coast', 'lake', 'mountain'].includes(landmark?.modelKind) ? 4
      : ['ruins', 'temple'].includes(landmark?.modelKind) ? 2.5
        : 2;
  const baseHours = Number.isFinite(Number(sourceDurationHours))
    ? Number(sourceDurationHours)
    : fallbackHours;
  const multiplier = PACE_PROFILES[pace]?.visitMultiplier ?? 1;
  return Math.max(0.5, Math.round(baseHours * multiplier * 4) / 4);
}

export function createGuideItineraryPlan({
  routeStops = [],
  routeSegments = [],
  days = 3,
  pace = 'Standard',
  visitHoursById = {},
} = {}) {
  const segments = routeStops.slice(1).map((stop, index) => {
    const from = routeStops[index];
    const source = routeSegments.find((segment) => (
      (segment.fromId === from?.id && segment.toId === stop?.id)
      || segment.index === index
    )) ?? routeSegments[index] ?? {};
    return {
      fromId: from?.id ?? source.fromId ?? null,
      toId: stop?.id ?? source.toId ?? null,
      distanceKm: Math.max(0, Number(source.distanceKm ?? source.distance ?? 0) || 0),
      durationHours: Math.max(0, Number(source.durationHours ?? source.duration ?? 0) || 0),
    };
  });
  const totalDistanceKm = segments.reduce((sum, segment) => sum + segment.distanceKm, 0);
  const normalizedVisitHours = Object.fromEntries(routeStops.map((stop) => [
    stop.id,
    Math.max(0, Number(visitHoursById[stop.id] ?? 0) || 0),
  ]));

  return {
    days: Math.max(1, Math.round(Number(days) || 1)),
    pace,
    dailyLimitHours: PACE_DAILY_HOURS[pace] ?? PACE_DAILY_HOURS.Standard,
    dailyBufferHours: PACE_PROFILES[pace]?.dailyBufferHours ?? PACE_PROFILES.Standard.dailyBufferHours,
    startHour: GUIDE_DAY_START_HOUR,
    stopIds: routeStops.map((stop) => stop.id),
    visitHoursById: normalizedVisitHours,
    segments,
    totalDistanceKm,
    totalTravelHours: segments.reduce((sum, segment) => sum + segment.durationHours, 0),
  };
}

export function visitHoursBeforeStop(plan, landmarkId) {
  const targetIndex = plan?.stopIds?.indexOf(landmarkId) ?? -1;
  if (targetIndex <= 0) return 0;
  return plan.stopIds.slice(0, targetIndex).reduce(
    (sum, stopId) => sum + Number(plan.visitHoursById?.[stopId] ?? 0),
    0,
  );
}

export function travelHoursAtProgress(plan, progress) {
  const segments = plan?.segments ?? [];
  if (!segments.length) return 0;
  const safeProgress = Math.max(0, Math.min(1, Number(progress) || 0));
  const totalDistanceKm = Number(plan.totalDistanceKm) || 0;
  if (totalDistanceKm <= 0) return (Number(plan.totalTravelHours) || 0) * safeProgress;

  let remainingDistance = totalDistanceKm * safeProgress;
  let elapsedHours = 0;
  for (const segment of segments) {
    if (remainingDistance <= 0) break;
    const distanceKm = Math.max(0, Number(segment.distanceKm) || 0);
    const durationHours = Math.max(0, Number(segment.durationHours) || 0);
    if (distanceKm <= 0) continue;
    const usedDistance = Math.min(distanceKm, remainingDistance);
    elapsedHours += durationHours * (usedDistance / distanceKm);
    remainingDistance -= usedDistance;
  }
  return elapsedHours;
}

export function guideClockAtProgress(plan, progress, completedVisitHours = 0) {
  if (!plan) return { routeDay: 1, routeHour: GUIDE_DAY_START_HOUR };
  const activityHours = Math.max(
    0,
    travelHoursAtProgress(plan, progress) + (Number(completedVisitHours) || 0),
  );
  const capacity = Math.max(0.5, plan.dailyLimitHours - plan.dailyBufferHours);
  const completedDays = Math.floor((activityHours + 1e-7) / capacity);
  const hoursToday = activityHours - completedDays * capacity;
  return {
    routeDay: completedDays + 1,
    routeHour: plan.startHour + Math.max(0, hoursToday),
  };
}
