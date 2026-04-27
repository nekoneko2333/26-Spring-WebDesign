const reviewsEn = {
  colosseum: [
    { author: 'Marta H.', score: '4.9', comment: 'The arena reads beautifully from the outer ring. Even a short stop gives you a strong sense of imperial scale.', source: 'Mock editorial note' },
    { author: 'Jonas V.', score: '4.8', comment: 'Best approached slowly. The arches stack into a clear silhouette at golden hour.', source: 'Mock field review' },
  ],
  pisa: [
    { author: 'Elena R.', score: '4.7', comment: 'The square feels calmer than expected, and the tower works best with the lawn and cathedral axis.', source: 'Mock editorial note' },
    { author: 'Marco T.', score: '4.6', comment: 'Compact, bright, and easy to read spatially. A good final stop for a short route study.', source: 'Mock field review' },
  ],
  florence_duomo: [
    { author: 'Clara B.', score: '4.8', comment: 'The dome anchors the entire historic center. It is the best stop for understanding Florence on foot.', source: 'Mock editorial note' },
    { author: 'Nico L.', score: '4.7', comment: 'The streets around the cathedral are dense but rewarding, especially when approached from a narrow side lane.', source: 'Mock field review' },
  ],
  venice_rialto: [
    { author: 'Irene S.', score: '4.6', comment: 'Rialto works as a spatial hinge: market, canal traffic, and bridge movement all meet in one compact scene.', source: 'Mock editorial note' },
    { author: 'Paolo G.', score: '4.5', comment: 'Go early. The bridge is much easier to understand before the pedestrian flow becomes too heavy.', source: 'Mock field review' },
  ],
  milan_duomo: [
    { author: 'Luca R.', score: '4.8', comment: 'The cathedral facade has a strong arrival effect. The plaza makes the scale easy to compare and photograph.', source: 'Mock editorial note' },
    { author: 'Sofia M.', score: '4.7', comment: 'Blue hour is the best moment: stone detail, city lights, and tram movement all become visible together.', source: 'Mock field review' },
  ],
  pompeii: [
    { author: 'Anna P.', score: '4.9', comment: 'Pompeii is the most immersive stop for everyday Roman urban life. The streets feel like a readable plan.', source: 'Mock editorial note' },
    { author: 'Giorgio F.', score: '4.8', comment: 'The site needs time. Even a short route should focus on streets, houses, and public space rather than only highlights.', source: 'Mock field review' },
  ],
};

const reviewsZh = {
  colosseum: [
    { author: '玛尔塔', score: '4.9', comment: '从外圈拱廊看过去最能感受到斗兽场的尺度感。即使只是短暂停留，也能迅速建立对古罗马空间秩序的印象。', source: '模拟专题笔记' },
    { author: '约纳斯', score: '4.8', comment: '适合放慢速度接近。黄昏时分，层层叠起的拱券会形成很强的轮廓感。', source: '模拟现场观察' },
  ],
  pisa: [
    { author: '埃琳娜', score: '4.7', comment: '广场比想象中更安静。如果把草坪、主教堂与斜塔一起看，空间关系会变得非常清晰。', source: '模拟专题笔记' },
    { author: '马可', score: '4.6', comment: '尺度紧凑、光线明亮，作为一条短路线的终点非常合适。', source: '模拟现场观察' },
  ],
  florence_duomo: [
    { author: '克拉拉', score: '4.8', comment: '穹顶像整个历史中心的锚点，非常适合作为理解佛罗伦萨步行尺度的起点。', source: '模拟专题笔记' },
    { author: '尼科', score: '4.7', comment: '教堂周边街巷密集，但从狭窄街道转入广场的一刻很有空间冲击力。', source: '模拟现场观察' },
  ],
  venice_rialto: [
    { author: '伊莲娜', score: '4.6', comment: '里亚托桥像一个空间枢纽，市场、水上交通和步行流线都在这里交汇。', source: '模拟专题笔记' },
    { author: '保罗', score: '4.5', comment: '建议清晨前往。人流变多前，更容易看清桥、运河和两岸街区的关系。', source: '模拟现场观察' },
  ],
  milan_duomo: [
    { author: '卢卡', score: '4.8', comment: '米兰大教堂的立面很有抵达感，广场也让建筑尺度更容易被感知和比较。', source: '模拟专题笔记' },
    { author: '索菲亚', score: '4.7', comment: '蓝调时刻最适合观察：石材细节、城市灯光和电车流动会同时出现。', source: '模拟现场观察' },
  ],
  pompeii: [
    { author: '安娜', score: '4.9', comment: '庞贝是最适合理解古罗马日常城市生活的停靠点，街道本身就像一张可阅读的平面图。', source: '模拟专题笔记' },
    { author: '乔治', score: '4.8', comment: '遗址需要时间。即使是短路线，也应关注街道、住宅和公共空间，而不只是打卡点。', source: '模拟现场观察' },
  ],
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
      loadingReviews: 'Loading reviews...',
      noReviews: 'No mock reviews yet. Use this panel as an immersive side briefing.',
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
      loadingReviews: '正在载入评论...',
      noReviews: '当前暂无模拟评论，这里会作为沉浸式地标说明区域。',
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
  const reviews = reviewLocales[language]?.landmarks[landmarkId] ?? reviewLocales.en.landmarks[landmarkId] ?? [];
  const numericScores = reviews.map((item) => Number(item.score)).filter(Number.isFinite);
  const averageScore = numericScores.length > 0
    ? Number((numericScores.reduce((sum, score) => sum + score, 0) / numericScores.length).toFixed(2))
    : null;

  return {
    mode: 'mock',
    landmark_id: landmarkId,
    average_score: averageScore,
    review_count: reviews.length,
    reviews,
  };
}
