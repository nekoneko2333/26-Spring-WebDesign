export const travelGuide = {
  en: {
    hero: {
      kicker: 'Italy route planner / 3D travel guide',
      title: 'Explore Italian landmarks, plan a route, then drive it in 3D.',
      summary:
        'Search mock destinations, compare ratings and notes, build a curated route, and open the immersive drive when you want to understand the trip spatially.',
      primaryCta: 'Open 3D Drive',
      secondaryCta: 'View route map',
      enterExplorer: 'Enter explorer',
      jumpToLandmark: 'Jump to landmark',
      previewIn3D: 'Preview in 3D',
    },
    mapBoard: {
      title: 'Italy route map',
      summary: 'Six mock destinations from Milan and Venice to Rome, Pompeii, Pisa, and Florence.',
    },
    routePanel: {
      eyebrow: 'Suggested route',
      title: 'Northern cities to Roman heritage',
      body: 'Start with Gothic and water-city landmarks in the north, move through Florence and Pisa, then close with Rome and Pompeii for ancient urban space.',
    },
    featurePanel: {
      eyebrow: 'Immersive guide',
      title: '3D Drive mode',
      body: 'The 3D explorer turns the planned route into a guided drive with landmark focus panels, mock reviews, and model previews.',
    },
    journalIntro: {
      eyebrow: 'Travel journal',
      title: 'A tourism page backed by route planning, search, reviews, and 3D exploration.',
    },
    stats: [
      { value: '06', label: 'Mock destinations' },
      { value: '3D', label: 'Drive explorer' },
      { value: 'Mock', label: 'Search + reviews' },
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
        body: 'The homepage behaves like a travel site: users can browse city cards, search by name, and inspect practical coordinate data.',
      },
      {
        title: 'Route Planning',
        body: 'The current route is hardcoded for clarity, but the page is structured so later data-driven route recommendations can replace it.',
      },
      {
        title: '3D Preview',
        body: 'Every destination can open the 3D module. Real model acquisition can come later; mock placeholders keep the experience complete today.',
      },
    ],
  },
  zh: {
    hero: {
      kicker: '意大利路线规划 / 3D 旅行导览',
      title: '探索意大利地标，规划路线，再用 3D 驾驶体验整段旅程。',
      summary:
        '先用模拟数据浏览目的地、评分和评论，再生成一条清晰的旅行路线；需要空间预览时，可以进入沉浸式 3D 导览。',
      primaryCta: '进入 3D 导览',
      secondaryCta: '查看路线地图',
      enterExplorer: '进入探索器',
      jumpToLandmark: '直达地标',
      previewIn3D: '3D 预览',
    },
    mapBoard: {
      title: '意大利路线地图',
      summary: '从米兰、威尼斯到佛罗伦萨、比萨、罗马和庞贝的 6 个模拟目的地。',
    },
    routePanel: {
      eyebrow: '推荐路线',
      title: '从北部城市到古罗马遗产',
      body: '先从北部的哥特式广场和水城桥梁出发，再经过佛罗伦萨与比萨，最后用罗马和庞贝收束古城空间体验。',
    },
    featurePanel: {
      eyebrow: '沉浸导览',
      title: '3D 驾驶模式',
      body: '3D 模块会把规划好的路线变成一次可驾驶的导览，配合地标聚焦、模拟评论和模型预览。',
    },
    journalIntro: {
      eyebrow: '旅行笔记',
      title: '一个结合路线规划、景点检索、评价内容和 3D 导览的旅游页面。',
    },
    stats: [
      { value: '06', label: '模拟目的地' },
      { value: '3D', label: '驾驶导览' },
      { value: '模拟', label: '检索与评论' },
    ],
    itinerary: [
      {
        day: '第一日',
        title: '米兰 / 威尼斯',
        detail: '从米兰大教堂广场开始，随后向东抵达威尼斯，在里亚托桥观察水上交通和商业街区。',
      },
      {
        day: '第二日',
        title: '佛罗伦萨 / 比萨',
        detail: '对比佛罗伦萨的文艺复兴城市肌理和比萨斜塔周边紧凑的纪念性广场。',
      },
      {
        day: '第三日',
        title: '罗马 / 庞贝',
        detail: '用罗马斗兽场和庞贝古城收束路线，把帝国景观与古代日常城市空间联系起来。',
      },
    ],
    journal: [
      {
        title: '景点检索',
        body: '首页按照旅游网站逻辑组织：浏览城市卡片、按名称搜索目的地，并查看坐标等实用信息。',
      },
      {
        title: '路线规划',
        body: '当前路线先硬编码，方便展示完整流程；后续可以替换为数据库和智能推荐生成的路线。',
      },
      {
        title: '3D 预览',
        body: '每个目的地都可以进入 3D 模块。真实模型后续再接入，当前用占位模型保证体验完整。',
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
      zh: '古罗马圆形竞技场、拱廊光影与罗马城区中心气息。',
    },
    season: { en: 'Best light / Sunset', zh: '最佳光线 / 黄昏' },
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
      zh: '白色大理石广场、标志性倾斜姿态，以及紧凑鲜明的托斯卡纳停靠点。',
    },
    season: { en: 'Best light / Early morning', zh: '最佳光线 / 清晨' },
    type: { en: 'Medieval bell tower', zh: '中世纪钟楼' },
  },
  florence_duomo: {
    name: { en: 'Florence Duomo', zh: '佛罗伦萨圣母百花大教堂' },
    city: { en: 'Florence', zh: '佛罗伦萨' },
    region: { en: 'Tuscany', zh: '托斯卡纳' },
    lat: 43.7731,
    lon: 11.2558,
    blurb: {
      en: 'Renaissance dome, dense historic streets, and a strong walking-city atmosphere.',
      zh: '文艺复兴穹顶、密集历史街区，以及非常适合步行观察的城市氛围。',
    },
    season: { en: 'Best light / Late afternoon', zh: '最佳光线 / 午后' },
    type: { en: 'Renaissance cathedral', zh: '文艺复兴教堂' },
  },
  venice_rialto: {
    name: { en: 'Rialto Bridge', zh: '威尼斯里亚托桥' },
    city: { en: 'Venice', zh: '威尼斯' },
    region: { en: 'Veneto', zh: '威尼托' },
    lat: 45.438,
    lon: 12.3359,
    blurb: {
      en: 'Canal crossing, layered pedestrian bridges, and compact water-city movement.',
      zh: '大运河过桥节点、层叠步行桥和紧凑的水城移动体验。',
    },
    season: { en: 'Best light / Morning', zh: '最佳光线 / 上午' },
    type: { en: 'Canal bridge', zh: '运河桥梁' },
  },
  milan_duomo: {
    name: { en: 'Milan Cathedral', zh: '米兰大教堂' },
    city: { en: 'Milan', zh: '米兰' },
    region: { en: 'Lombardy', zh: '伦巴第' },
    lat: 45.4642,
    lon: 9.1919,
    blurb: {
      en: 'Gothic spires, plaza scale, and a strong metropolitan arrival point.',
      zh: '哥特式尖塔群、广场尺度，以及强烈的都市抵达感。',
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
      zh: '古代街道、保存完整的住宅，以及理解罗马日常城市生活的入口。',
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
