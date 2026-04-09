import { create } from 'zustand';

export const useAppStore = create((set, get) => ({
  cameraMode: 'map',
  nearbyLandmarkId: null,
  selectedLandmarkId: null,
  vehicleSpeed: 0,
  vehicleSteer: 0,
  autoDrive: false,
  sidebarOpen: true,
  focusPanelOpen: false,
  modelViewerOpen: false,
  setCameraMode: (cameraMode) => set({ cameraMode }),
  toggleMapView: () => {
    const { cameraMode, selectedLandmarkId } = get();
    if (cameraMode === 'focus' && selectedLandmarkId) {
      set({ cameraMode: 'follow' });
      return;
    }
    set({ cameraMode: cameraMode === 'map' ? 'follow' : 'map' });
  },
  toggleAutoDrive: () => set((state) => ({ autoDrive: !state.autoDrive, cameraMode: 'follow' })),
  setAutoDrive: (autoDrive) => set({ autoDrive }),
  setNearbyLandmarkId: (nearbyLandmarkId) => set({ nearbyLandmarkId }),
  setVehicleState: ({ vehicleSpeed, vehicleSteer }) => set({ vehicleSpeed, vehicleSteer }),
  selectLandmark: (selectedLandmarkId) => set({ selectedLandmarkId, focusPanelOpen: false, modelViewerOpen: false, cameraMode: 'focus' }),
  openLandmarkFocus: (selectedLandmarkId) => set({ selectedLandmarkId, focusPanelOpen: true, modelViewerOpen: false, cameraMode: 'focus' }),
  clearLandmark: () => set({ selectedLandmarkId: null, focusPanelOpen: false, modelViewerOpen: false, cameraMode: 'follow' }),
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  setFocusPanelOpen: (focusPanelOpen) => set({ focusPanelOpen }),
  setModelViewerOpen: (modelViewerOpen) => set({ modelViewerOpen }),
}));
