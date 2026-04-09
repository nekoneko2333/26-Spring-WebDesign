export const travelGuide = {
  hero: {
    kicker: 'Grand Tour / Italy Field Guide',
    title: 'Plan an Italian route with coordinates, culture, and an optional 3D drive.',
    summary:
      'Browse featured landmarks like a contemporary tourism site, inspect coordinates on a stylized map, and jump into the immersive driving module whenever you want a cinematic spatial preview.',
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
};

export const travelLandmarkMeta = {
  colosseum: {
    city: 'Rome',
    region: 'Lazio',
    lat: 41.8902,
    lon: 12.4922,
    blurb: 'Ancient amphitheatre, evening-lit arches, central Rome energy.',
    season: 'Best light · Sunset',
    type: 'Imperial monument',
  },
  pisa: {
    city: 'Pisa',
    region: 'Tuscany',
    lat: 43.723,
    lon: 10.3963,
    blurb: 'Marble monument plaza, iconic tilt, compact Tuscany stop.',
    season: 'Best light · Early morning',
    type: 'Medieval bell tower',
  },
};

export const travelMapPoints = {
  colosseum: { top: '58%', left: '63%' },
  pisa: { top: '41%', left: '52%' },
};
