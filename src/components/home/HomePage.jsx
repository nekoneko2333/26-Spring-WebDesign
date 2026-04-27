import { Canvas, useFrame } from '@react-three/fiber';
import { Float } from '@react-three/drei';
import * as THREE from 'three';
import { useMemo, useRef, useState } from 'react';
import { useAppStore } from '../../state/useAppStore.js';
import { landmarks } from '../../data/landmarks.js';
import { currentRoute, routeSegments } from '../../data/routes.js';
import { travelGuide, travelLandmarkMeta, travelMapPoints } from '../../data/travelGuide.js';
import { reviewLocales } from '../../data/reviewLocales.js';

const homeCopy = {
  en: {
    brand: { eyebrow: 'Web3D', title: 'Italy Drive' },
    languageLabels: { en: 'English', zh: 'Chinese' },
    nav: [
      { id: 'destinations', label: 'Destinations' },
      { id: 'planner', label: 'Route Planner' },
      { id: 'reviews', label: 'Reviews' },
      { id: 'drive', label: '3D Drive' },
    ],
    search: {
      title: 'Plan your Italy route',
      destination: 'Destination',
      destinationValue: 'Milan to Pompeii',
      style: 'Travel style',
      styleValue: 'Architecture + 3D preview',
      duration: 'Duration',
      durationValue: '3 days',
      action: 'Start route preview',
    },
    pages: {
      destinations: {
        eyebrow: 'Destinations',
        title: 'Browse six mock stops across Italy',
        body: 'Each destination includes coordinates, mock ratings, local notes, and a direct entry into the 3D guide.',
      },
      planner: {
        eyebrow: 'Route schema',
        title: 'Mock route data today, real road intelligence later',
        body: 'Route points now carry road type, speed limit, traffic state, surface, bridge, tunnel, and layer fields so OSM, DEM, PostGIS, and traffic APIs can fill the same contract later.',
      },
      reviews: {
        eyebrow: 'Reviews',
        title: 'Compare mock reviews before entering 3D',
        body: 'The current review cards are local mock data. Later they can be replaced with crawled travel-site reviews after normalization.',
      },
      drive: {
        eyebrow: '3D drive',
        title: 'Turn the planned route into an immersive map drive',
        body: 'Launch the route explorer, focus landmarks, view models, and use placeholder geometry where real 3D assets are not available yet.',
      },
    },
    destinationCta: 'Open in 3D',
    ratingLabel: 'Mock rating',
    searchPlaceholder: 'Search city or landmark (e.g. Rome, Venice, Pompeii)',
    routeSource: 'Mock route',
    distanceUnit: 'km',
    durationUnit: 'h',
    speedUnit: 'km/h',
    coordinateLabels: { lat: 'LAT', lon: 'LON' },
    highlights: [
      { label: 'Best pace', value: '3 days', detail: 'A compact north-to-south cultural route with enough time for model previews.' },
      { label: 'Route mood', value: 'Architecture first', detail: 'Cathedrals, bridges, Roman ruins, and city-scale landmarks stay central.' },
      { label: '3D ready', value: '6 stops', detail: 'Every stop links into the drive scene, with coordinates and review notes prepared.' },
    ],
    trafficLabels: {
      free: 'Free flow',
      normal: 'Normal traffic',
      slow: 'Slow traffic',
      traffic_jam: 'Traffic jam',
    },
    segmentTypes: {
      city: 'City streets',
      motorway: 'Autostrada',
      scenic: 'Scenic road',
      mountain: 'Mountain pass',
      bridge: 'Lagoon bridge',
      tunnel: 'Mountain tunnel',
      ringRoad: 'Rome ring road',
    },
    segmentDescriptions: {
      milan_city: 'dense historic arrival',
      a4_lombardy: 'long northern autostrada corridor',
      venice_lagoon: 'lagoon approach on an elevated deck',
      veneto_emilia: 'flat motorway between Veneto and Emilia',
      apennine_crossing: 'broad mountain-grade climb',
      apennine_tunnel: 'simplified tunnel descent toward Florence',
      tuscany_west: 'rolling Tuscan primary road',
      tuscany_to_rome: 'long scenic countryside transfer',
      rome_arrival: 'busy metropolitan approach',
      a1_campania: 'southbound motorway run',
      pompeii_arrival: 'urban arrival near the ruins',
    },
    routeLabels: {
      source: 'Source',
      distance: 'Distance',
      duration: 'Duration',
      points: 'Route points',
      speed: 'Speed',
      traffic: 'Traffic',
      layer: 'Layer',
      roadType: 'Road type',
    },
  },
  zh: {
    brand: { eyebrow: 'Web3D', title: '意大利行车导览' },
    languageLabels: { en: '英文', zh: '中文' },
    nav: [
      { id: 'destinations', label: '目的地' },
      { id: 'planner', label: '路线规划' },
      { id: 'reviews', label: '评价' },
      { id: 'drive', label: '3D 导览' },
    ],
    search: {
      title: '规划你的意大利路线',
      destination: '目的地',
      destinationValue: '米兰到庞贝',
      style: '旅行偏好',
      styleValue: '建筑游览 + 3D 预览',
      duration: '行程时长',
      durationValue: '3 天',
      action: '开始路线预览',
    },
    pages: {
      destinations: {
        eyebrow: '目的地',
        title: '浏览 6 个意大利模拟停靠点',
        body: '每个目的地都包含坐标、模拟评分、旅行笔记，并且可以直接进入 3D 导览。',
      },
      planner: {
        eyebrow: '路线数据结构',
        title: '现在使用模拟路线，后续可替换真实道路智能数据',
        body: '路线点已经包含道路类型、限速、交通状态、路面、桥梁、隧道和图层字段，后续 OSM、DEM、PostGIS 与交通 API 可以填充同一套结构。',
      },
      reviews: {
        eyebrow: '评价内容',
        title: '进入 3D 前先比较模拟评价',
        body: '当前评价卡片来自本地模拟数据。后续抓取旅行网站评价后，可以在清洗结构化后替换这里。',
      },
      drive: {
        eyebrow: '3D 导览',
        title: '把规划好的路线转成沉浸式地图驾驶',
        body: '启用路线探索器，聚焦地标、查看模型；暂时没有真实 3D 资产的地点会使用低多边形占位模型。',
      },
    },
    destinationCta: '打开 3D',
    ratingLabel: '模拟评分',
    searchPlaceholder: '搜索城市 / 地标名称（如 罗马、威尼斯、庞贝）',
    routeSource: '模拟路线',
    distanceUnit: '公里',
    durationUnit: '小时',
    speedUnit: '公里/小时',
    coordinateLabels: { lat: '纬度', lon: '经度' },
    highlights: [
      { label: '建议节奏', value: '3 天', detail: '从北到南的紧凑文化路线，保留足够时间查看模型与评价。' },
      { label: '路线气质', value: '建筑优先', detail: '教堂、桥梁、古罗马遗址和城市尺度地标是页面核心。' },
      { label: '3D 就绪', value: '6 站', detail: '每个停靠点都能进入驾驶场景，并准备好坐标与评价信息。' },
    ],
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
      bridge: '潟湖桥梁',
      tunnel: '山地隧道',
      ringRoad: '罗马环路',
    },
    segmentDescriptions: {
      milan_city: '进入历史城区的密集街道',
      a4_lombardy: '意大利北部的长距离高速通道',
      venice_lagoon: '通往潟湖城市的高架桥路段',
      veneto_emilia: '威尼托到艾米利亚之间的平直高速',
      apennine_crossing: '跨越亚平宁山脉的爬坡路段',
      apennine_tunnel: '通向佛罗伦萨的简化隧道下坡',
      tuscany_west: '托斯卡纳西侧起伏的主干道路',
      tuscany_to_rome: '穿过乡野景观的长距离转场',
      rome_arrival: '进入罗马都会区的繁忙道路',
      a1_campania: '向坎帕尼亚南下的高速路段',
      pompeii_arrival: '靠近遗址的城市抵达路段',
    },
    routeLabels: {
      source: '来源',
      distance: '距离',
      duration: '时长',
      points: '路线点',
      speed: '限速',
      traffic: '交通',
      layer: '图层',
      roadType: '道路类型',
    },
  },
};

function getLandmarkDisplayName(landmark, language) {
  const meta = travelLandmarkMeta[landmark.id];
  return meta?.name?.[language] ?? landmark.name;
}

function getSegmentDisplay(segment, pageCopy) {
  return {
    type: pageCopy.segmentTypes[segment.type] ?? segment.profile.label,
    traffic: pageCopy.trafficLabels[segment.trafficState] ?? segment.trafficState,
    description: pageCopy.segmentDescriptions[segment.id] ?? segment.description,
  };
}

function HomeWebGLBackdrop() {
  return (
    <div className="travel-webgl" aria-hidden="true">
      <Canvas dpr={[1, 1.5]} camera={{ position: [0, 0, 8], fov: 45 }} gl={{ antialias: true, alpha: true }}>
        <ambientLight intensity={0.65} />
        <pointLight position={[4, 5, 6]} intensity={2.2} color="#f2c480" />
        <pointLight position={[-5, -2, 4]} intensity={1.5} color="#78b7d3" />
        <LusionField />
      </Canvas>
    </div>
  );
}

function LusionField() {
  const group = useRef(null);
  const particles = useRef(null);
  const microParticles = useRef(null);
  const streamGroup = useRef(null);
  const graph = useRef(null);
  const magnet = useRef(null);
  const sparks = useRef([]);
  const points = useMemo(() => {
    const positions = new Float32Array(520 * 3);
    for (let i = 0; i < 520; i += 1) {
      const radius = 2.1 + Math.random() * 3.8;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos((Math.random() * 2) - 1);
      positions[i * 3] = Math.sin(phi) * Math.cos(theta) * radius;
      positions[i * 3 + 1] = Math.sin(phi) * Math.sin(theta) * radius * 0.62;
      positions[i * 3 + 2] = Math.cos(phi) * radius;
    }
    return positions;
  }, []);
  const microPoints = useMemo(() => {
    const positions = new Float32Array(320 * 3);
    for (let i = 0; i < 320; i += 1) {
      const x = -4.8 + Math.random() * 9.6;
      const y = -2.9 + Math.random() * 5.8;
      const z = -2.8 + Math.random() * 4.2;
      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;
    }
    return positions;
  }, []);
  const streamGeometries = useMemo(() => {
    return [0, 1].map((index) => {
      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(-3.7 + index * 0.18, -1.9 + index * 0.28, -0.6),
        new THREE.Vector3(-1.5, -0.6 + index * 0.16, 0.35),
        new THREE.Vector3(0.45, 0.4 - index * 0.2, -0.15),
        new THREE.Vector3(2.8 - index * 0.2, 1.65 - index * 0.18, 0.45),
      ]);
      return new THREE.TubeGeometry(curve, 96, 0.008 + index * 0.002, 8, false);
    });
  }, []);
  const cityGraph = useMemo(() => {
    const nodes = [
      [-2.3, 1.05, 0.35],
      [-1.1, 1.28, -0.05],
      [-0.5, 0.2, 0.2],
      [0.42, 0.0, -0.18],
      [1.1, -0.86, 0.12],
      [2.05, -1.1, 0.36],
    ];
    const linePositions = new Float32Array((nodes.length - 1) * 6);
    for (let i = 0; i < nodes.length - 1; i += 1) {
      linePositions.set(nodes[i], i * 6);
      linePositions.set(nodes[i + 1], i * 6 + 3);
    }
    const nodePositions = new Float32Array(nodes.flat());
    return { linePositions, nodePositions };
  }, []);

  useFrame(({ clock, pointer }) => {
    const t = clock.getElapsedTime();
    const scrollProgress = typeof window === 'undefined'
      ? 0
      : Math.min(1, window.scrollY / Math.max(1, document.body.scrollHeight - window.innerHeight));
    if (group.current) {
      group.current.rotation.x = Math.sin(t * 0.22) * 0.08 + pointer.y * 0.12 + scrollProgress * 0.24;
      group.current.rotation.y = t * 0.08 + pointer.x * 0.24 + scrollProgress * 0.55;
      group.current.scale.setScalar(1 + scrollProgress * 0.08);
    }
    if (particles.current) {
      particles.current.rotation.z = -t * 0.035;
      particles.current.position.x = pointer.x * 0.42;
      particles.current.position.y = pointer.y * 0.28;
    }
    if (microParticles.current) {
      microParticles.current.rotation.y = t * 0.055;
      microParticles.current.position.x = Math.sin(t * 0.32) * 0.08 + pointer.x * 0.72;
      microParticles.current.position.y = pointer.y * 0.48;
    }
    if (streamGroup.current) {
      streamGroup.current.rotation.z = Math.sin(t * 0.38) * 0.05;
      streamGroup.current.position.y = Math.sin(t * 0.62) * 0.05;
    }
    if (graph.current) {
      graph.current.rotation.z = Math.sin(t * 0.26) * 0.08;
      graph.current.position.x = pointer.x * -0.28;
      graph.current.position.y = pointer.y * -0.2;
    }
    if (magnet.current) {
      magnet.current.position.x = pointer.x * 3.1;
      magnet.current.position.y = pointer.y * 1.75;
      magnet.current.scale.setScalar(1 + Math.sin(t * 3) * 0.08);
    }
    sparks.current.forEach((spark, index) => {
      if (!spark) return;
      spark.position.y += Math.sin(t * 1.8 + index) * 0.003;
      spark.scale.setScalar(1 + Math.sin(t * 2.4 + index) * 0.28);
    });
  });

  return (
    <group ref={group} position={[0.55, -0.04, 0]}>
      <points ref={particles}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" count={points.length / 3} array={points} itemSize={3} />
        </bufferGeometry>
        <pointsMaterial size={0.018} color="#d9b06f" transparent opacity={0.62} depthWrite={false} blending={THREE.AdditiveBlending} />
      </points>
      <points ref={microParticles} position={[-0.6, 0.12, -0.55]}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" count={microPoints.length / 3} array={microPoints} itemSize={3} />
        </bufferGeometry>
        <pointsMaterial size={0.01} color="#8bc8dc" transparent opacity={0.52} depthWrite={false} blending={THREE.AdditiveBlending} />
      </points>
      <mesh ref={magnet} position={[0, 0, 0.9]}>
        <sphereGeometry args={[0.18, 32, 32]} />
        <meshBasicMaterial color="#fff1bd" transparent opacity={0.42} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      <group ref={graph} position={[0.1, -0.05, 0.65]} rotation={[0.15, -0.18, -0.35]}>
        <lineSegments>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" count={cityGraph.linePositions.length / 3} array={cityGraph.linePositions} itemSize={3} />
          </bufferGeometry>
          <lineBasicMaterial color="#f1bd70" transparent opacity={0.42} blending={THREE.AdditiveBlending} />
        </lineSegments>
        <points>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" count={cityGraph.nodePositions.length / 3} array={cityGraph.nodePositions} itemSize={3} />
          </bufferGeometry>
          <pointsMaterial size={0.08} color="#fff2c9" transparent opacity={0.78} depthWrite={false} blending={THREE.AdditiveBlending} />
        </points>
      </group>
      <group ref={streamGroup} position={[-0.15, -0.1, 0.2]}>
        {streamGeometries.map((geometry, index) => (
          <mesh key={index} geometry={geometry}>
            <meshBasicMaterial color={index % 2 ? '#d7a55e' : '#78bdd0'} transparent opacity={0.34} blending={THREE.AdditiveBlending} depthWrite={false} />
          </mesh>
        ))}
      </group>
      <Float speed={1.5} rotationIntensity={0.35} floatIntensity={0.55}>
        <mesh position={[0.38, 0.1, 0]} rotation={[0.7, -0.52, 0.2]}>
          <torusKnotGeometry args={[1.05, 0.14, 180, 18]} />
          <meshStandardMaterial color="#c6d8dc" roughness={0.28} metalness={0.48} transparent opacity={0.3} wireframe />
        </mesh>
      </Float>
      {[0, 1, 2].map((index) => (
        <mesh key={index} rotation={[Math.PI / 2.4, index * 0.72, index * 0.2]} scale={1.4 + index * 0.42}>
          <torusGeometry args={[1.42, 0.006, 12, 180]} />
          <meshBasicMaterial color={index === 1 ? '#88bac9' : '#b98152'} transparent opacity={0.28 - index * 0.05} blending={THREE.AdditiveBlending} />
        </mesh>
      ))}
      {[0, 1, 2].map((index) => (
        <mesh key={`spark-${index}`} ref={(node) => { sparks.current[index] = node; }} position={[-2.2 + index * 0.95, Math.sin(index) * 0.65, -0.35 + index * 0.1]}>
          <sphereGeometry args={[0.018 + index * 0.002, 12, 12]} />
          <meshBasicMaterial color={index % 2 ? '#f0c779' : '#96d8e8'} transparent opacity={0.72} blending={THREE.AdditiveBlending} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}

function PageHeading({ page }) {
  return (
    <header className="travel-section-heading">
      <div>
        <p className="travel-section-kicker">{page.eyebrow}</p>
        <h2>{page.title}</h2>
      </div>
      <p>{page.body}</p>
    </header>
  );
}

export function HomePage({ onOpenDrive }) {
  const language = useAppStore((state) => state.language);
  const setLanguage = useAppStore((state) => state.setLanguage);
  const copy = useMemo(() => travelGuide[language], [language]);
  const pageCopy = useMemo(() => homeCopy[language], [language]);
  const reviewsCopy = useMemo(() => reviewLocales[language], [language]);
  const [activePage, setActivePage] = useState('destinations');
  const [searchQuery, setSearchQuery] = useState('');
  const isZh = language === 'zh';
  const activePageCopy = pageCopy.pages[activePage];
  const activePageIndex = Math.max(0, pageCopy.nav.findIndex((item) => item.id === activePage));

  const filteredLandmarks = useMemo(() => {
    const keyword = searchQuery.trim().toLowerCase();
    if (!keyword) return landmarks;
    return landmarks.filter((landmark) => {
      const meta = travelLandmarkMeta[landmark.id];
      return [getLandmarkDisplayName(landmark, language), meta.city[language], meta.region[language], meta.type[language]]
        .some((value) => value.toLowerCase().includes(keyword));
    });
  }, [language, searchQuery]);

  return (
    <main className={`travel-home ${isZh ? 'is-zh' : 'is-en'}`} lang={language}>
      <HomeWebGLBackdrop />
      <div className="travel-ambient travel-ambient--grid" aria-hidden="true" />
      <div className="travel-ambient travel-ambient--beam" aria-hidden="true" />
      <div className="travel-ambient travel-ambient--scan" aria-hidden="true" />
      <aside className="travel-site-nav" aria-label="Travel sections">
        <button className="travel-brand" type="button" onClick={() => setActivePage('destinations')} aria-label="Web3D Italy Drive home">
          <span>{pageCopy.brand.eyebrow}</span>
          <strong>{pageCopy.brand.title}</strong>
        </button>
        <nav className="travel-nav-links" aria-label="Site pages" style={{ '--nav-index': activePageIndex, '--nav-count': pageCopy.nav.length }}>
          {pageCopy.nav.map((item) => (
            <button
              key={item.id}
              className={activePage === item.id ? 'is-active' : ''}
              type="button"
              aria-current={activePage === item.id ? 'page' : undefined}
              onClick={() => setActivePage(item.id)}
            >
              {item.label}
            </button>
          ))}
          <span className="travel-nav-links__indicator" aria-hidden="true" />
        </nav>
        <div className="travel-sidebar-brief">
          <span>{copy.mapBoard.title}</span>
          <strong>{currentRoute.distanceKm} {pageCopy.distanceUnit}</strong>
          <p>{copy.mapBoard.summary}</p>
        </div>
        <div className="travel-lang-switch" role="group" aria-label="Language switcher">
          <button className={`travel-lang-switch__btn ${language === 'en' ? 'is-active' : ''}`} type="button" onClick={() => setLanguage('en')}>{pageCopy.languageLabels.en}</button>
          <button className={`travel-lang-switch__btn ${language === 'zh' ? 'is-active' : ''}`} type="button" onClick={() => setLanguage('zh')}>{pageCopy.languageLabels.zh}</button>
        </div>
      </aside>

      <div className="travel-main-stage" key={activePage}>
        {activePage === 'destinations' && (
          <>
            <section className="travel-hero">
              <div className="travel-hero__copy">
                <p className="travel-kicker">{copy.hero.kicker}</p>
                <h1 className="travel-title">{copy.hero.title}</h1>
                <p className="travel-summary">{copy.hero.summary}</p>
                <div className="travel-actions">
                  <button className="travel-btn travel-btn--primary" type="button" onClick={() => onOpenDrive()}>{copy.hero.primaryCta}</button>
                  <button className="travel-btn travel-btn--ghost" type="button" onClick={() => setActivePage('planner')}>{copy.hero.secondaryCta}</button>
                </div>
                <form className="travel-planner" onSubmit={(event) => { event.preventDefault(); setActivePage('planner'); }}>
                  <p>{pageCopy.search.title}</p>
                  <div className="travel-planner__grid">
                    <label><span>{pageCopy.search.destination}</span><strong>{pageCopy.search.destinationValue}</strong></label>
                    <label><span>{pageCopy.search.style}</span><strong>{pageCopy.search.styleValue}</strong></label>
                    <label><span>{pageCopy.search.duration}</span><strong>{pageCopy.search.durationValue}</strong></label>
                    <button type="submit">{pageCopy.search.action}</button>
                  </div>
                </form>
                <div className="travel-stats">
                  {copy.stats.map((item) => (
                    <article key={item.label}><strong>{item.value}</strong><span>{item.label}</span></article>
                  ))}
                </div>
                <div className="travel-live-strip" aria-hidden="true">
                  {routeSegments.slice(0, 5).map((segment, index) => (
                    <span key={segment.id} style={{ '--strip-delay': `${index * 0.24}s` }}>{getSegmentDisplay(segment, pageCopy).type}</span>
                  ))}
                </div>
                <div className="travel-highlights">
                  {pageCopy.highlights.map((item) => (
                    <article key={item.label}>
                      <span>{item.label}</span>
                      <strong>{item.value}</strong>
                      <p>{item.detail}</p>
                    </article>
                  ))}
                </div>
              </div>
              <RouteMap copy={copy} language={language} pageCopy={pageCopy} />
            </section>
            <section className="travel-page">
              <PageHeading page={activePageCopy} />
              <JourneyTimeline copy={copy} />
              <DestinationGrid language={language} reviewsCopy={reviewsCopy} pageCopy={pageCopy} onOpenDrive={onOpenDrive} />
            </section>
          </>
        )}

        {activePage === 'planner' && (
          <section className="travel-page travel-page--planner">
            <PageHeading page={activePageCopy} />
            <div className="travel-page-grid">
              <RouteMap copy={copy} language={language} pageCopy={pageCopy} />
              <RouteSchemaPanel copy={copy} pageCopy={pageCopy} />
            </div>
          </section>
        )}

        {activePage === 'reviews' && (
          <section className="travel-page">
            <PageHeading page={activePageCopy} />
            <div className="travel-search-panel__head">
              <input className="travel-search-input" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder={pageCopy.searchPlaceholder} />
            </div>
            <div className="travel-reviews-grid">
              {filteredLandmarks.map((landmark) => (
                <ReviewBlock key={landmark.id} landmark={landmark} language={language} reviewsCopy={reviewsCopy} copy={copy} onOpenDrive={onOpenDrive} />
              ))}
            </div>
          </section>
        )}

        {activePage === 'drive' && (
          <section className="travel-page travel-page--drive">
            <PageHeading page={activePageCopy} />
            <div className="travel-page-grid">
              <article className="travel-panel travel-panel--feature">
                <p className="travel-panel__eyebrow">{copy.featurePanel.eyebrow}</p>
                <h2>{copy.featurePanel.title}</h2>
                <p>{copy.featurePanel.body}</p>
                <button className="travel-btn travel-btn--primary travel-btn--compact" type="button" onClick={() => onOpenDrive()}>{copy.hero.enterExplorer}</button>
              </article>
              <DestinationGrid language={language} reviewsCopy={reviewsCopy} pageCopy={pageCopy} onOpenDrive={onOpenDrive} compact />
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

function JourneyTimeline({ copy }) {
  return (
    <section className="travel-journey-timeline" aria-label={copy.journalIntro.eyebrow}>
      {copy.itinerary.map((item, index) => (
        <article key={item.day}>
          <span>0{index + 1}</span>
          <div>
            <p>{item.day}</p>
            <h3>{item.title}</h3>
            <small>{item.detail}</small>
          </div>
        </article>
      ))}
    </section>
  );
}

function RouteMap({ copy, language, pageCopy }) {
  return (
    <div className="travel-map-card">
      <div className="travel-map-card__sheen" aria-hidden="true" />
      <p className="travel-section-kicker">{copy.mapBoard.title}</p>
      <div className="travel-map-card__header">
        <p>{copy.mapBoard.title}</p>
        <span>{copy.mapBoard.summary}</span>
      </div>
      <div className="travel-map">
        <div className="travel-map__pulse" aria-hidden="true" />
        <div className="travel-map__route-line" />
        <div className="travel-map__route-glow" />
        <div className="travel-map__sea travel-map__sea--a" />
        <div className="travel-map__sea travel-map__sea--b" />
        <div className="travel-map__italy" />
        {landmarks.map((landmark) => {
          const meta = travelLandmarkMeta[landmark.id];
          const point = travelMapPoints[landmark.id];
          return (
            <span key={landmark.id} className="travel-map__pin" style={point}>
              <span className="travel-map__pin-dot" />
              <span className="travel-map__pin-label">{meta.city[language]}</span>
            </span>
          );
        })}
      </div>
      <div className="travel-coordinates">
        {landmarks.slice(0, 4).map((landmark, index) => {
          const meta = travelLandmarkMeta[landmark.id];
          return (
            <article key={landmark.id} className="travel-coordinate-card">
              <span className="travel-coordinate-card__index">0{index + 1}</span>
              <div><h3>{getLandmarkDisplayName(landmark, language)}</h3><p>{meta.blurb[language]}</p></div>
              <dl><div><dt>{pageCopy.coordinateLabels.lat}</dt><dd>{meta.lat.toFixed(4)}</dd></div><div><dt>{pageCopy.coordinateLabels.lon}</dt><dd>{meta.lon.toFixed(4)}</dd></div></dl>
            </article>
          );
        })}
      </div>
      <div className="travel-map-telemetry" aria-hidden="true">
        {routeSegments.slice(0, 4).map((segment) => (
          <span key={segment.id}>{getSegmentDisplay(segment, pageCopy).type}<strong>{segment.speedLimit}</strong></span>
        ))}
      </div>
    </div>
  );
}

function RouteSchemaPanel({ copy, pageCopy }) {
  const labels = pageCopy.routeLabels;
  return (
    <article className="travel-panel travel-panel--route">
      <p className="travel-panel__eyebrow">{copy.routePanel.eyebrow}</p>
      <h2>{copy.routePanel.title}</h2>
      <p>{copy.routePanel.body}</p>
      <div className="travel-route-summary">
        <span>{labels.source}: {pageCopy.routeSource}</span>
        <span>{labels.distance}: {currentRoute.distanceKm} {pageCopy.distanceUnit}</span>
        <span>{labels.duration}: {currentRoute.durationHours} {pageCopy.durationUnit}</span>
        <span>{labels.points}: {currentRoute.points.length}</span>
      </div>
      <div className="travel-itinerary">
        {routeSegments.map((segment) => {
          const segmentCopy = getSegmentDisplay(segment, pageCopy);
          return (
            <div key={segment.id} className="travel-itinerary__item">
              <span>{segmentCopy.traffic}</span>
              <div>
                <h3>{segmentCopy.type}</h3>
                <p>{labels.roadType}: {segmentCopy.type} / {labels.speed}: {segment.speedLimit} {pageCopy.speedUnit} / {segmentCopy.description}</p>
              </div>
            </div>
          );
        })}
      </div>
    </article>
  );
}

function DestinationGrid({ language, reviewsCopy, pageCopy, onOpenDrive, compact = false }) {
  return (
    <section className={`travel-showcase ${compact ? 'travel-showcase--compact' : ''}`}>
      {landmarks.map((landmark, index) => {
        const meta = travelLandmarkMeta[landmark.id];
        const review = reviewsCopy.landmarks[landmark.id]?.[0];
        return (
          <article key={landmark.id} className={`travel-destination-card travel-destination-card--${landmark.id}`}>
            <div className="travel-destination-card__media"><span>{meta.city[language]}</span></div>
            <div className="travel-destination-card__body">
              <div className="travel-destination-card__head"><p>{meta.region[language]}</p><span>{meta.type[language]}</span></div>
              <h2>{getLandmarkDisplayName(landmark, language)}</h2>
              <p>{meta.blurb[language]}</p>
              <div className="travel-destination-card__meta">
                <span>{pageCopy.ratingLabel} {review?.score ?? '4.8'}</span>
                <button className="travel-btn travel-btn--ghost travel-btn--compact" type="button" onClick={() => onOpenDrive(landmark.id)}>{pageCopy.destinationCta}</button>
              </div>
            </div>
            <span className="travel-destination-card__number">0{index + 1}</span>
          </article>
        );
      })}
    </section>
  );
}

function ReviewBlock({ landmark, language, reviewsCopy, copy, onOpenDrive }) {
  const localeReviews = reviewsCopy.landmarks[landmark.id] ?? [];
  return (
    <article className="travel-reviews-block">
      <div className="travel-reviews-block__head">
        <h3>{getLandmarkDisplayName(landmark, language)}</h3>
        <button className="travel-btn travel-btn--ghost travel-btn--compact" type="button" onClick={() => onOpenDrive(landmark.id)}>{copy.hero.previewIn3D}</button>
      </div>
      <div className="travel-reviews-block__list">
        {localeReviews.map((item) => (
          <article key={`${landmark.id}-${item.author}-${item.score}`} className="travel-review-card">
            <div className="travel-review-card__meta"><span>{item.author}</span><span>{item.score}</span></div>
            <p>{item.comment}</p>
            <small>{item.source}</small>
          </article>
        ))}
      </div>
    </article>
  );
}
