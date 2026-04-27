import { create } from 'zustand';

export const useAppStore = create((set, get) => ({
  language: 'zh',
  cameraMode: 'map',
  nearbyLandmarkId: null,
  selectedLandmarkId: null,
  vehicleSpeed: 0,
  vehicleSteer: 0,
  routeContext: null,
  routeProgress: 0,
  routeDay: 1,
  routeHour: 7,
  autoDrive: false,
  sidebarOpen: true,
  focusPanelOpen: false,
  modelViewerOpen: false,
  setLanguage: (language) => set({ language }),
  setCameraMode: (cameraMode) => set({ cameraMode }),
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
    const { focusPanelOpen, modelViewerOpen } = get();
    if (focusPanelOpen || modelViewerOpen) return;
    set((state) => ({ autoDrive: !state.autoDrive, cameraMode: 'follow' }));
  },
  setAutoDrive: (autoDrive) => set({ autoDrive }),
  setNearbyLandmarkId: (nearbyLandmarkId) => set({ nearbyLandmarkId }),
  setVehicleState: ({ vehicleSpeed, vehicleSteer, routeContext, routeProgress, routeDay, routeHour }) => set((state) => ({
    vehicleSpeed,
    vehicleSteer,
    routeContext: routeContext ?? state.routeContext,
    routeProgress: routeProgress ?? state.routeProgress,
    routeDay: routeDay ?? state.routeDay,
    routeHour: routeHour ?? state.routeHour,
  })),
  selectLandmark: (selectedLandmarkId) => set({ selectedLandmarkId, focusPanelOpen: false, modelViewerOpen: false, cameraMode: 'focus' }),
  openLandmarkFocus: (selectedLandmarkId) => set({ selectedLandmarkId, focusPanelOpen: true, modelViewerOpen: false, cameraMode: 'focus', autoDrive: false }),
  clearLandmark: () => set({ selectedLandmarkId: null, focusPanelOpen: false, modelViewerOpen: false, cameraMode: 'follow', autoDrive: false }),
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  setFocusPanelOpen: (focusPanelOpen) => set((state) => ({ focusPanelOpen, autoDrive: focusPanelOpen ? false : state.autoDrive })),
  setModelViewerOpen: (modelViewerOpen) => set((state) => ({ modelViewerOpen, autoDrive: modelViewerOpen ? false : state.autoDrive })),
}));
