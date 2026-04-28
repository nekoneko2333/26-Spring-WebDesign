export const travelGuide = {
  en: {
    hero: {
      kicker: 'Italy route planner / 3D travel guide',
      title: 'Explore Italian landmarks, plan a route, then drive it in 3D.',
      summary:
        'Search destinations, compare notes, build a curated route, and open the immersive drive when you want to understand the trip spatially.',
      primaryCta: 'Open 3D Drive',
      secondaryCta: 'View route map',
      enterExplorer: 'Enter explorer',
      jumpToLandmark: 'Jump to landmark',
      previewIn3D: 'Preview in 3D',
    },
    mapBoard: {
      title: 'Italy route map',
      summary: 'Six curated destinations from Milan and Venice to Florence, Pisa, Rome, and Pompeii.',
    },
    routePanel: {
      eyebrow: 'Suggested route',
      title: 'Northern cities to Roman heritage',
      body: 'Start with Gothic and water-city landmarks in the north, move through Florence and Pisa, then close with Rome and Pompeii for ancient urban space.',
    },
    featurePanel: {
      eyebrow: 'Immersive guide',
      title: '3D Drive mode',
      body: 'The 3D explorer turns the planned route into a guided drive with landmark focus panels, live route metrics, and model previews.',
    },
    journalIntro: {
      eyebrow: 'Travel journal',
      title: 'A tourism page backed by route planning, search, and 3D exploration.',
    },
    stats: [
      { value: '06', label: 'Destinations' },
      { value: 'OSRM', label: 'Route metrics' },
      { value: 'WebGL', label: 'Interactive guide' },
    ],
    itinerary: [
      {
        day: 'Day 01',
        title: 'Milan / Venice',
        detail: 'Begin in the north with the Milan Cathedral plaza, then move east toward Venice and the Rialto Bridge.',
      },
      {
        day: 'Day 02',
        title: 'Florence / Pisa',
        detail: 'Compare Renaissance city fabric in Florence with the compact monument field around the Leaning Tower of Pisa.',
      },
      {
        day: 'Day 03',
        title: 'Rome / Pompeii',
        detail: 'Finish with the Colosseum and Pompeii to connect imperial spectacle with everyday ancient urban life.',
      },
    ],
    journal: [
      {
        title: 'Destination Search',
        body: 'Browse, filter, favorite, compare, and add stops to the route before entering the 3D drive.',
      },
      {
        title: 'Route Planning',
        body: 'Route distance and ETA use OSRM. The editor keeps a clear contract for future traffic + DEM integration.',
      },
      {
        title: '3D Preview',
        body: 'The 3D module combines imported GLB models, landmark coordinates, and procedural city markers so every stop appears on the route.',
      },
    ],
  },
  zh: {
    hero: {
      kicker: '意大利路线规划 / 3D 旅行导览',
      title: '探索意大利地标，规划路线，然后在 3D 中驾驶体验。',
      summary:
        '搜索与筛选目的地，收藏与对比，生成一条清晰路线；需要空间预览时，进入沉浸式 3D 导览。',
      primaryCta: '进入 3D 导览',
      secondaryCta: '查看路线地图',
      enterExplorer: '进入探索',
      jumpToLandmark: '跳转到地标',
      previewIn3D: '3D 预览',
    },
    mapBoard: {
      title: '意大利路线地图',
      summary: '6 个精选目的地：米兰、威尼斯、佛罗伦萨、比萨、罗马与庞贝。',
    },
    routePanel: {
      eyebrow: '建议路线',
      title: '从北部城市到古罗马遗产',
      body: '从北部的哥特式广场与水城桥梁出发，经佛罗伦萨与比萨，最后以罗马与庞贝收束古城空间体验。',
    },
    featurePanel: {
      eyebrow: '沉浸式导览',
      title: '3D 驾驶模式',
      body: '3D 模块会把规划好的路线变成可驾驶的导览：地标聚焦、实时路线里程与时长、模型预览。',
    },
    journalIntro: {
      eyebrow: '旅行笔记',
      title: '一个结合路线规划、搜索与 3D 导览的旅游页面。',
    },
    stats: [
      { value: '06', label: '目的地' },
      { value: 'OSRM', label: '路线数据' },
      { value: 'WebGL', label: '交互导览' },
    ],
    itinerary: [
      {
        day: '第 1 天',
        title: '米兰 / 威尼斯',
        detail: '从米兰主教座堂广场出发，向东抵达威尼斯与里亚托桥，感受水城的紧凑空间秩序。',
      },
      {
        day: '第 2 天',
        title: '佛罗伦萨 / 比萨',
        detail: '对比文艺复兴城市肌理与纪念性地标群，聚焦步行尺度与轴线组织。',
      },
      {
        day: '第 3 天',
        title: '罗马 / 庞贝',
        detail: '以斗兽场与庞贝收束旅程，把帝国奇观与日常城市生活串联起来。',
      },
    ],
    journal: [
      {
        title: '目的地搜索',
        body: '支持浏览、筛选、收藏、对比，并将地标加入路线后再进入 3D 导览。',
      },
      {
        title: '路线规划',
        body: '路线里程与时长来自 OSRM。编辑器保留清晰的数据契约，便于后续接入交通与地形数据。',
      },
      {
        title: '3D 预览',
        body: '3D 模块结合已导入的 GLB 模型、地标坐标和程序化城市标记，让每个停靠点都出现在路线场景中。',
      },
    ],
  },
};

export const travelLandmarkMeta = {
  colosseum: {
    name: { en: 'Colosseum', zh: '罗马斗兽场' },
    city: { en: 'Rome', zh: '罗马' },
    region: { en: 'Lazio', zh: '拉齐奥' },
    lat: 41.8902,
    lon: 12.4922,
    blurb: {
      en: 'Ancient amphitheatre, evening-lit arches, central Rome energy.',
      zh: '古罗马圆形斗兽场，拱廊光影清晰，城市中心能量感强。',
    },
    season: { en: 'Best light / Sunset', zh: '最佳光线 / 日落' },
    type: { en: 'Imperial monument', zh: '帝国遗迹' },
  },
  pisa: {
    name: { en: 'Leaning Tower of Pisa', zh: '比萨斜塔' },
    city: { en: 'Pisa', zh: '比萨' },
    region: { en: 'Tuscany', zh: '托斯卡纳' },
    lat: 43.723,
    lon: 10.3963,
    blurb: {
      en: 'Marble monument plaza, iconic tilt, compact Tuscany stop.',
      zh: '大理石纪念性广场与标志性倾斜姿态，紧凑而明亮。',
    },
    season: { en: 'Best light / Early morning', zh: '最佳光线 / 清晨' },
    type: { en: 'Medieval bell tower', zh: '中世纪钟楼' },
  },
  florence_duomo: {
    name: { en: 'Florence Duomo', zh: '佛罗伦萨主教座堂' },
    city: { en: 'Florence', zh: '佛罗伦萨' },
    region: { en: 'Tuscany', zh: '托斯卡纳' },
    lat: 43.7731,
    lon: 11.2558,
    blurb: {
      en: 'Renaissance dome, dense historic streets, and a strong walking-city atmosphere.',
      zh: '文艺复兴穹顶与密集街巷构成强烈的步行城市氛围。',
    },
    season: { en: 'Best light / Late afternoon', zh: '最佳光线 / 下午' },
    type: { en: 'Renaissance cathedral', zh: '文艺复兴教堂' },
  },
  venice_rialto: {
    name: { en: 'Rialto Bridge', zh: '里亚托桥' },
    city: { en: 'Venice', zh: '威尼斯' },
    region: { en: 'Veneto', zh: '威尼托' },
    lat: 45.438,
    lon: 12.3359,
    blurb: {
      en: 'Canal crossing, layered pedestrian bridges, and compact water-city movement.',
      zh: '运河跨越节点与层叠步行流线，水城移动体验紧凑且清晰。',
    },
    season: { en: 'Best light / Morning', zh: '最佳光线 / 上午' },
    type: { en: 'Canal bridge', zh: '运河桥梁' },
  },
  milan_duomo: {
    name: { en: 'Milan Cathedral', zh: '米兰主教座堂' },
    city: { en: 'Milan', zh: '米兰' },
    region: { en: 'Lombardy', zh: '伦巴第' },
    lat: 45.4642,
    lon: 9.1919,
    blurb: {
      en: 'Gothic spires, plaza scale, and a strong metropolitan arrival point.',
      zh: '哥特式尖塔与广场尺度，具有强烈的都市抵达感。',
    },
    season: { en: 'Best light / Blue hour', zh: '最佳光线 / 蓝调时刻' },
    type: { en: 'Gothic cathedral', zh: '哥特式教堂' },
  },
  pompeii: {
    name: { en: 'Pompeii Archaeological Park', zh: '庞贝古城遗址' },
    city: { en: 'Pompeii', zh: '庞贝' },
    region: { en: 'Campania', zh: '坎帕尼亚' },
    lat: 40.748,
    lon: 14.487,
    blurb: {
      en: 'Ancient streets, preserved houses, and a direct view into Roman urban life.',
      zh: '古代街道与保存良好的住宅，让罗马日常城市生活可被直接阅读。',
    },
    season: { en: 'Best light / Early morning', zh: '最佳光线 / 清晨' },
    type: { en: 'Archaeological park', zh: '考古遗址' },
  },
};

export const travelMapPoints = {
  milan_duomo: { top: '29%', left: '38%' },
  venice_rialto: { top: '27%', left: '55%' },
  florence_duomo: { top: '42%', left: '49%' },
  pisa: { top: '41%', left: '43%' },
  colosseum: { top: '59%', left: '61%' },
  pompeii: { top: '70%', left: '69%' },
};
