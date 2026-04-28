const reviewsEn = {
  colosseum: [],
  pisa: [],
  florence_duomo: [],
  venice_rialto: [],
  milan_duomo: [],
  pompeii: [],
};

const reviewsZh = {
  colosseum: [],
  pisa: [],
  florence_duomo: [],
  venice_rialto: [],
  milan_duomo: [],
  pompeii: [],
};

export const reviewLocales = {
  en: {
    ui: {
      score: 'score',
      mapView: 'Map View',
      cruise: 'Cruise',
      auto: 'Auto',
      view: 'View',
      explore: 'Explore',
      openSideBriefing: 'Open Side Briefing',
      cruiseAndDiscover: 'Cruise & Discover',
      routeBriefing: 'Route briefing',
      enterFocus: 'Enter focus',
      backToRoute: 'Back to Route',
      architecturalStory: 'Architectural story',
      fieldNotes: 'Field notes',
      view3dModel: 'View 3D Model',
      loadingReviews: 'Loading notes...',
      noReviews: 'No notes yet.',
      drivingView: 'Driving View',
      autoDriving: 'Auto Driving',
      landmarkFocus: 'Landmark Focus',
      mapMode: 'Map View',
      modelPreview: '3D Preview',
      close: 'Close',
      modelHint: 'Drag to rotate / Scroll to zoom',
    },
    landmarks: reviewsEn,
  },
  zh: {
    ui: {
      score: '评分',
      mapView: '地图视角',
      cruise: '巡航',
      auto: '自动',
      view: '视角',
      explore: '探索',
      openSideBriefing: '打开侧边导览',
      cruiseAndDiscover: '沿路巡游，发现地标',
      routeBriefing: '路线简报',
      enterFocus: '进入聚焦',
      backToRoute: '返回路线',
      architecturalStory: '建筑叙事',
      fieldNotes: '现场笔记',
      view3dModel: '查看 3D 模型',
      loadingReviews: '正在加载信息...',
      noReviews: '暂无信息。',
      drivingView: '驾驶视角',
      autoDriving: '自动巡航',
      landmarkFocus: '地标聚焦',
      mapMode: '地图视角',
      modelPreview: '3D 预览',
      close: '关闭',
      modelHint: '拖拽旋转 / 滚轮缩放',
    },
    landmarks: reviewsZh,
  },
};

export function getMockReviewPayload(landmarkId, language = 'en') {
  const reviews = reviewLocales[language]?.landmarks?.[landmarkId] ?? [];
  return {
    mode: 'mock',
    landmark_id: landmarkId,
    average_score: null,
    review_count: reviews.length,
    reviews,
  };
}

