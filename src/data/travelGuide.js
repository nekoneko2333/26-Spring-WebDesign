export const travelGuide = {
  en: {
    hero: {
      kicker: 'Grand Tour / Italy Field Guide',
      title: 'Plan an Italian route with coordinates, culture, and an optional 3D drive.',
      summary:
        'Browse featured landmarks like a contemporary tourism site, inspect coordinates on a stylized map, and jump into the immersive driving module whenever you want a cinematic spatial preview.',
      primaryCta: 'Open 3D Drive',
      secondaryCta: 'View coordinates',
      enterExplorer: 'Enter explorer',
      jumpToLandmark: 'Jump to landmark',
      previewIn3D: 'Preview in 3D',
    },
    mapBoard: {
      title: 'Route board',
      summary: 'Browse destination pins, inspect coordinates, then launch immersive route mode.',
    },
    routePanel: {
      eyebrow: 'Suggested route',
      title: 'Rome to Pisa',
      body: 'Use the tourism layer to compare coordinates and context, then open the drive mode when you want a cinematic understanding of the route geometry.',
    },
    featurePanel: {
      eyebrow: 'Immersive feature',
      title: '3D Drive mode',
      body: 'The 3D explorer now behaves like a premium module inside the main website: launch it from the homepage, inspect landmarks, and return to the editorial travel guide anytime.',
    },
    journalIntro: {
      eyebrow: 'Travel journal',
      title: 'A complete travel guide paired with interactive 3D exploration.',
    },
    stats: [
      { value: '02', label: 'Featured stops' },
      { value: '6.6° → 18.5°E', label: 'Map longitude span' },
      { value: 'Hybrid', label: 'Travel guide + 3D explorer' },
    ],
    itinerary: [
      {
        day: 'Day 01',
        title: 'Rome Arrival / Colosseum Axis',
        detail: 'Begin in Rome with an architectural briefing, evening exterior views, and a first coordinate check for the Colosseum.',
      },
      {
        day: 'Day 02',
        title: 'Northbound Scenic Transfer',
        detail: 'Follow the peninsula northward through the editorial route board before switching into immersive drive mode for a route preview.',
      },
      {
        day: 'Day 03',
        title: 'Pisa Landmark Study',
        detail: 'Finish in Pisa for plaza-scale orientation, tower inspection, and a final coordinate review.',
      },
    ],
    journal: [
      {
        title: 'Architectural Notes',
        body: 'Each stop is written like a travel feature: place, atmosphere, and route logic first; immersive preview second.',
      },
      {
        title: 'Coordinate-first Planning',
        body: 'Homepage cards surface latitude and longitude so the tourism layer feels practical before the 3D mode takes over.',
      },
      {
        title: 'Immersive Optionality',
        body: 'The driving scene is framed as a premium exploration tool, not the only way to browse the project.',
      },
    ],
  },
  zh: {
    hero: {
      kicker: '意大利路线 / 旅行现场手册',
      title: '用坐标、城市气质与一段可进入的 3D 路线，规划一场意大利建筑之旅。',
      summary:
        '首页像一本当代旅行专题：先看目的地、坐标与节奏，再在需要时进入 3D 导览，用更有空间感的方式预览整段路线。',
      primaryCta: '进入 3D 导览',
      secondaryCta: '查看坐标',
      enterExplorer: '进入探索器',
      jumpToLandmark: '直达地标',
      previewIn3D: '3D 预览',
    },
    mapBoard: {
      title: '路线总览',
      summary: '先浏览地图上的目的地与坐标，再切入沉浸式路线模式。',
    },
    routePanel: {
      eyebrow: '建议行程',
      title: '从罗马到比萨',
      body: '先在旅行专题层查看坐标与城市语境，再进入 3D 导览，用更直观的方式理解路线尺度与地标关系。',
    },
    featurePanel: {
      eyebrow: '沉浸功能',
      title: '3D 驾行模式',
      body: '3D 场景不再只是演示模块，而像主站里的高级导览：从首页进入、围绕地标停留，再随时返回旅行内容。',
    },
    journalIntro: {
      eyebrow: '旅行札记',
      title: '完整的旅行专题内容，配合可交互的 3D 空间探索。',
    },
    stats: [
      { value: '02', label: '精选停靠点' },
      { value: '6.6° → 18.5°E', label: '经度覆盖范围' },
      { value: '双模', label: '旅行专题 + 3D 探索' },
    ],
    itinerary: [
      {
        day: '第一日',
        title: '抵达罗马 / 斗兽场轴线',
        detail: '以罗马为起点，先阅读建筑导览与场景提要，再通过坐标确认斗兽场在整段旅程中的位置。',
      },
      {
        day: '第二日',
        title: '北上转场 / 半岛路线',
        detail: '沿着专题路线板向北推进，在进入 3D 前先建立一条编辑化、叙事化的路线印象。',
      },
      {
        day: '第三日',
        title: '比萨落点 / 广场尺度研究',
        detail: '在比萨完成终点停留，观察斜塔与广场空间，并用最终坐标为整段路线收束。',
      },
    ],
    journal: [
      {
        title: '建筑观察',
        body: '每个停靠点都像一篇旅行专栏：先讲地点气质、观看方式与路线关系，再进入沉浸预览。',
      },
      {
        title: '以坐标规划行程',
        body: '首页直接给出经纬度，使这个专题在进入 3D 之前，就已经具备真实旅行规划的参考感。',
      },
      {
        title: '把 3D 当作加值导览',
        body: '3D 路线被放在“进一步理解空间”的位置上，而不是唯一入口，这让内容层次更完整。',
      },
    ],
  },
};

export const travelLandmarkMeta = {
  colosseum: {
    city: { en: 'Rome', zh: '罗马' },
    region: { en: 'Lazio', zh: '拉齐奥' },
    lat: 41.8902,
    lon: 12.4922,
    blurb: {
      en: 'Ancient amphitheatre, evening-lit arches, central Rome energy.',
      zh: '古罗马圆形竞技场、拱廊光影与罗马城区中心气息。',
    },
    season: { en: 'Best light · Sunset', zh: '最佳光线 · 黄昏' },
    type: { en: 'Imperial monument', zh: '帝国遗迹' },
  },
  pisa: {
    city: { en: 'Pisa', zh: '比萨' },
    region: { en: 'Tuscany', zh: '托斯卡纳' },
    lat: 43.723,
    lon: 10.3963,
    blurb: {
      en: 'Marble monument plaza, iconic tilt, compact Tuscany stop.',
      zh: '白色大理石广场、标志性倾斜姿态、紧凑而鲜明的托斯卡纳停靠点。',
    },
    season: { en: 'Best light · Early morning', zh: '最佳光线 · 清晨' },
    type: { en: 'Medieval bell tower', zh: '中世纪钟楼' },
  },
};

export const travelMapPoints = {
  colosseum: { top: '58%', left: '63%' },
  pisa: { top: '41%', left: '52%' },
};
