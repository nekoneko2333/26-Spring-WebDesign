import { create } from 'zustand';
import { GUIDE_DAY_START_HOUR, visitHoursBeforeStop } from '../lib/itinerarySchedule.js';

export const useAppStore = create((set, get) => ({
  language: 'zh',
  cameraMode: 'map',
  nearbyLandmarkId: null,
  selectedLandmarkId: null,
  vehicleSpeed: 0,
  vehicleSteer: 0,
  routePlaybackSpeed: 8,
  vehicleJumpTarget: null,
  routeContext: null,
  routeProgress: 0,
  routeDay: 1,
  routeHour: GUIDE_DAY_START_HOUR,
  activeItineraryPlan: null,
  itineraryVisitHours: 0,
  activeRouteIds: [],
  activeRouteGeometryCoordinates: [],
  activeRouteSegments: [],
  activeRouteDistanceKm: null,
  guidedTourState: 'IDLE',
  guidedTourLandmarkId: null,
  guidedTourMessage: '',
  arrivalNotice: null,
  arrivedLandmarkIds: [],
  tourResetToken: 0,
  autoDrive: false,
  sidebarOpen: true,
  focusPanelOpen: false,
  modelViewerOpen: false,
  cesiumStatus: {
    terrain: 'idle',
    imagery: 'idle',
    buildings: 'idle',
    ready: false,
    error: '',
  },
  setLanguage: (language) => set({ language }),
  setCesiumStatus: (patch) => set((state) => ({
    cesiumStatus: { ...state.cesiumStatus, ...patch },
  })),
  setRoutePlaybackSpeed: (routePlaybackSpeed) => {
    const allowedSpeeds = [1, 4, 8, 20];
    const nextSpeed = Number(routePlaybackSpeed);
    set({ routePlaybackSpeed: allowedSpeeds.includes(nextSpeed) ? nextSpeed : 8 });
  },
  jumpVehicleToLandmark: (landmarkId) => set((state) => {
    const stopIndex = state.activeItineraryPlan?.stopIds?.indexOf(landmarkId) ?? -1;
    return {
      vehicleJumpTarget: { landmarkId, token: (state.vehicleJumpTarget?.token ?? 0) + 1 },
      autoDrive: false,
      arrivalNotice: { landmarkId, source: 'jump' },
      arrivedLandmarkIds: stopIndex > 0
        ? state.activeItineraryPlan.stopIds.slice(0, stopIndex)
        : [],
      itineraryVisitHours: visitHoursBeforeStop(state.activeItineraryPlan, landmarkId),
      selectedLandmarkId: null,
      focusPanelOpen: false,
      modelViewerOpen: false,
      guidedTourState: 'IDLE',
      guidedTourLandmarkId: null,
      guidedTourMessage: '',
      cameraMode: 'follow',
    };
  }),
  setCameraMode: (cameraMode) => set((state) => (
    state.cameraMode === cameraMode ? state : { cameraMode }
  )),
  toggleMapView: () => {
    const { cameraMode, selectedLandmarkId, focusPanelOpen, modelViewerOpen } = get();
    if (focusPanelOpen || modelViewerOpen) return;
    if (cameraMode === 'focus' && selectedLandmarkId) {
      set({ cameraMode: 'follow' });
      return;
    }
    set({ cameraMode: cameraMode === 'map' ? 'follow' : 'map' });
  },
  toggleAutoDrive: () => {
    const { focusPanelOpen, modelViewerOpen, autoDrive, setAutoDrive } = get();
    if (focusPanelOpen || modelViewerOpen) return;
    setAutoDrive(!autoDrive);
  },
  setAutoDrive: (autoDrive) => set((state) => {
    const arrivedId = autoDrive ? state.arrivalNotice?.landmarkId : null;
    const completesArrival = Boolean(arrivedId && !state.arrivedLandmarkIds.includes(arrivedId));
    return {
      autoDrive,
      arrivalNotice: autoDrive ? null : state.arrivalNotice,
      arrivedLandmarkIds: completesArrival
        ? [...state.arrivedLandmarkIds, arrivedId]
        : state.arrivedLandmarkIds,
      itineraryVisitHours: completesArrival
        ? state.itineraryVisitHours
          + Number(state.activeItineraryPlan?.visitHoursById?.[arrivedId] ?? 0)
        : state.itineraryVisitHours,
      cameraMode: autoDrive && !state.focusPanelOpen && !state.modelViewerOpen ? 'follow' : state.cameraMode,
    };
  }),
  resetVehicleTour: () => set((state) => ({
    autoDrive: false,
    tourResetToken: state.tourResetToken + 1,
    routeProgress: 0,
    routeDay: 1,
    routeHour: GUIDE_DAY_START_HOUR,
    itineraryVisitHours: 0,
    vehicleSpeed: 0,
    vehicleSteer: 0,
    nearbyLandmarkId: null,
    guidedTourState: 'IDLE',
    guidedTourLandmarkId: null,
    guidedTourMessage: '',
    arrivalNotice: null,
    arrivedLandmarkIds: [],
    cameraMode: 'follow',
  })),
  setNearbyLandmarkId: (nearbyLandmarkId) => set((state) => (
    state.nearbyLandmarkId === nearbyLandmarkId ? state : { nearbyLandmarkId }
  )),
  setActiveItineraryPlan: (activeItineraryPlan) => set({
    activeItineraryPlan,
    itineraryVisitHours: 0,
    routeDay: 1,
    routeHour: activeItineraryPlan?.startHour ?? GUIDE_DAY_START_HOUR,
  }),
  setVehicleState: ({ vehicleSpeed, vehicleSteer, routeContext, routeProgress, routeDay, routeHour }) => set((state) => ({
    vehicleSpeed,
    vehicleSteer,
    routeContext: routeContext ?? state.routeContext,
    routeProgress: routeProgress ?? state.routeProgress,
    routeDay: routeDay ?? state.routeDay,
    routeHour: routeHour ?? state.routeHour,
  })),
  setActiveRouteIds: (activeRouteIds) => set((state) => {
    const sameRoute = state.activeRouteIds.length === activeRouteIds.length
      && state.activeRouteIds.every((id, index) => id === activeRouteIds[index]);
    return {
    activeRouteIds,
    activeRouteGeometryCoordinates: sameRoute ? state.activeRouteGeometryCoordinates : [],
    activeRouteSegments: sameRoute ? state.activeRouteSegments : [],
    activeRouteDistanceKm: sameRoute ? state.activeRouteDistanceKm : null,
    tourResetToken: state.tourResetToken + 1,
    autoDrive: false,
    routeProgress: 0,
    routeDay: 1,
    routeHour: GUIDE_DAY_START_HOUR,
    activeItineraryPlan: null,
    itineraryVisitHours: 0,
    vehicleSpeed: 0,
    vehicleSteer: 0,
    nearbyLandmarkId: null,
    selectedLandmarkId: null,
    focusPanelOpen: false,
    modelViewerOpen: false,
    guidedTourState: 'IDLE',
    guidedTourLandmarkId: null,
    guidedTourMessage: '',
    arrivalNotice: null,
    arrivedLandmarkIds: [],
    cameraMode: 'follow',
    };
  }),
  setActiveRouteGeometry: ({ coordinates = [], distanceKm = null, segments = [] } = {}) => set((state) => ({
    activeRouteGeometryCoordinates: coordinates,
    activeRouteSegments: segments,
    activeRouteDistanceKm: distanceKm,
    tourResetToken: state.tourResetToken + 1,
    autoDrive: false,
    routeProgress: 0,
    routeDay: 1,
    routeHour: GUIDE_DAY_START_HOUR,
    itineraryVisitHours: 0,
    vehicleSpeed: 0,
    vehicleSteer: 0,
    nearbyLandmarkId: null,
    selectedLandmarkId: null,
    focusPanelOpen: false,
    modelViewerOpen: false,
    guidedTourState: 'IDLE',
    guidedTourLandmarkId: null,
    guidedTourMessage: '',
    arrivalNotice: null,
    arrivedLandmarkIds: [],
    cameraMode: 'follow',
  })),
  setGuidedTourState: ({ guidedTourState = 'IDLE', guidedTourLandmarkId = null, guidedTourMessage = '' } = {}) => set({
    guidedTourState,
    guidedTourLandmarkId,
    guidedTourMessage,
  }),
  showArrivalNotice: (landmarkId) => set((state) => {
    if (!landmarkId || state.arrivedLandmarkIds.includes(landmarkId) || state.arrivalNotice?.landmarkId === landmarkId) return {};
    const isFinalStop = state.activeItineraryPlan?.stopIds?.at(-1) === landmarkId;
    return {
      autoDrive: false,
      arrivalNotice: { landmarkId },
      arrivedLandmarkIds: isFinalStop
        ? [...state.arrivedLandmarkIds, landmarkId]
        : state.arrivedLandmarkIds,
      itineraryVisitHours: isFinalStop
        ? state.itineraryVisitHours
          + Number(state.activeItineraryPlan?.visitHoursById?.[landmarkId] ?? 0)
        : state.itineraryVisitHours,
      guidedTourState: 'FOCUS_POI',
      guidedTourLandmarkId: landmarkId,
      guidedTourMessage: '已到达景点',
    };
  }),
  continueVehicleTour: () => {
    get().setAutoDrive(true);
    set({
      guidedTourState: 'DRIVING',
      guidedTourLandmarkId: null,
      guidedTourMessage: '',
    });
  },
  clearGuidedTourFocus: () => set({
    selectedLandmarkId: null,
    focusPanelOpen: false,
    modelViewerOpen: false,
    guidedTourLandmarkId: null,
    guidedTourMessage: '',
  }),
  selectLandmark: (selectedLandmarkId) => set({ selectedLandmarkId, focusPanelOpen: false, modelViewerOpen: false, cameraMode: 'focus' }),
  openLandmarkFocus: (selectedLandmarkId) => set({ selectedLandmarkId, focusPanelOpen: true, modelViewerOpen: false, cameraMode: 'focus', autoDrive: false }),
  clearLandmark: () => set({ selectedLandmarkId: null, focusPanelOpen: false, modelViewerOpen: false, cameraMode: 'follow', autoDrive: false }),
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  setFocusPanelOpen: (focusPanelOpen) => set((state) => ({ focusPanelOpen, autoDrive: focusPanelOpen ? false : state.autoDrive })),
  setModelViewerOpen: (modelViewerOpen) => set((state) => ({ modelViewerOpen, autoDrive: modelViewerOpen ? false : state.autoDrive })),
}));
