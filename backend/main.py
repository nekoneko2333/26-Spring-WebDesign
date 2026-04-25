import math
import os

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title='Web3D Mock Landmarks API', version='1.1.0')

allowed_origins = [
    origin.strip()
    for origin in os.getenv('CORS_ORIGINS', 'http://127.0.0.1:5173,http://localhost:5173').split(',')
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)

_LON_MIN, _LON_MAX = 6.6, 18.5
_LAT_MIN, _LAT_MAX = 36.6, 47.1
_WORLD = 170


def _merc_y(lat):
    return math.log(math.tan(math.pi / 4 + math.radians(lat) / 2))


_MERC_Y_MIN = _merc_y(_LAT_MIN)
_MERC_Y_MAX = _merc_y(_LAT_MAX)


def _lnglat_to_world(lon, lat):
    tx = (lon - _LON_MIN) / (_LON_MAX - _LON_MIN)
    tz = 1.0 - (_merc_y(lat) - _MERC_Y_MIN) / (_MERC_Y_MAX - _MERC_Y_MIN)
    x = (tx - 0.5) * _WORLD
    z = (tz - 0.5) * _WORLD
    return [round(x, 2), 0, round(z, 2)]


def _distance_km(a_lon, a_lat, b_lon, b_lat):
    radius = 6371.0
    d_lat = math.radians(b_lat - a_lat)
    d_lon = math.radians(b_lon - a_lon)
    lat1 = math.radians(a_lat)
    lat2 = math.radians(b_lat)
    h = math.sin(d_lat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(d_lon / 2) ** 2
    return radius * 2 * math.atan2(math.sqrt(h), math.sqrt(1 - h))


_RAW_LANDMARKS = [
    {
        'id': 'colosseum',
        'name': 'Colosseum / 罗马斗兽场',
        'description': '古罗马时期最具代表性的圆形竞技场之一，也是罗马城市记忆和帝国建筑尺度的象征。',
        'model_path': '/models/colosseum.glb',
        'lon': 12.4922,
        'lat': 41.8902,
    },
    {
        'id': 'pisa',
        'name': 'Leaning Tower of Pisa / 比萨斜塔',
        'description': '始建于 1173 年的中世纪钟楼，以独特的倾斜结构和广场空间闻名。',
        'model_path': '/models/leaning_tower_of_pisa.glb',
        'lon': 10.3963,
        'lat': 43.7230,
    },
]

MOCK_ROUTE = {
    'id': 'mock_italy_north_to_south',
    'name': 'Milan to Pompeii mock heritage drive',
    'source': 'mock',
    'distance_km': 920,
    'duration_hours': 10.8,
    'notes': 'Schema prepared for OSM, DEM, PostGIS and traffic-aware routing data.',
    'stops': ['milan_duomo', 'venice_rialto', 'florence_duomo', 'pisa', 'colosseum', 'pompeii'],
    'points': [
        {'id': 'milan_entry', 'lon': 9.13, 'lat': 45.49, 'road_type': 'urban', 'speed_limit': 50, 'traffic_state': 'slow', 'surface': 'asphalt', 'bridge': False, 'tunnel': False, 'layer': 0},
        {'id': 'milan_duomo', 'lon': 9.1919, 'lat': 45.4642, 'landmark_id': 'milan_duomo', 'road_type': 'urban', 'speed_limit': 30, 'traffic_state': 'slow', 'surface': 'asphalt', 'bridge': False, 'tunnel': False, 'layer': 0},
        {'id': 'venice_rialto', 'lon': 12.3359, 'lat': 45.438, 'landmark_id': 'venice_rialto', 'road_type': 'pedestrian_context', 'speed_limit': 20, 'traffic_state': 'slow', 'surface': 'stone', 'bridge': True, 'tunnel': False, 'layer': 1},
        {'id': 'florence_duomo', 'lon': 11.2558, 'lat': 43.7731, 'landmark_id': 'florence_duomo', 'road_type': 'urban', 'speed_limit': 30, 'traffic_state': 'slow', 'surface': 'stone', 'bridge': False, 'tunnel': False, 'layer': 0},
        {'id': 'pisa', 'lon': 10.3963, 'lat': 43.723, 'landmark_id': 'pisa', 'road_type': 'urban', 'speed_limit': 30, 'traffic_state': 'slow', 'surface': 'asphalt', 'bridge': False, 'tunnel': False, 'layer': 0},
        {'id': 'colosseum', 'lon': 12.4922, 'lat': 41.8902, 'landmark_id': 'colosseum', 'road_type': 'urban', 'speed_limit': 30, 'traffic_state': 'slow', 'surface': 'stone', 'bridge': False, 'tunnel': False, 'layer': 0},
        {'id': 'pompeii', 'lon': 14.487, 'lat': 40.748, 'landmark_id': 'pompeii', 'road_type': 'urban', 'speed_limit': 30, 'traffic_state': 'normal', 'surface': 'stone', 'bridge': False, 'tunnel': False, 'layer': 0},
    ],
}

LANDMARKS = [
    {
        **{key: value for key, value in item.items() if key not in ('lon', 'lat')},
        'coordinates': _lnglat_to_world(item['lon'], item['lat']),
        'lon': item['lon'],
        'lat': item['lat'],
        'data_source': 'mock',
    }
    for item in _RAW_LANDMARKS
]

MOCK_REVIEWS = {
    'en': {
        'colosseum': [
            {
                'id': 'mock-colosseum-en-1',
                'author': 'Marta H.',
                'score': 4.9,
                'comment': 'The arena reads beautifully from the outer ring. Even a short stop gives you a strong sense of imperial scale.',
                'source': 'Mock editorial note',
            },
            {
                'id': 'mock-colosseum-en-2',
                'author': 'Jonas V.',
                'score': 4.8,
                'comment': 'Best approached slowly. The arches stack into a clear silhouette at golden hour.',
                'source': 'Mock field review',
            },
        ],
        'pisa': [
            {
                'id': 'mock-pisa-en-1',
                'author': 'Elena R.',
                'score': 4.7,
                'comment': 'The square feels calmer than expected, and the tower works best when viewed with the surrounding lawn and cathedral axis.',
                'source': 'Mock editorial note',
            },
            {
                'id': 'mock-pisa-en-2',
                'author': 'Marco T.',
                'score': 4.6,
                'comment': 'Compact, bright, and easy to read spatially. A good final stop for a short route study.',
                'source': 'Mock field review',
            },
        ],
    },
    'zh': {
        'colosseum': [
            {
                'id': 'mock-colosseum-zh-1',
                'author': '玛尔塔',
                'score': 4.9,
                'comment': '从外围拱廊看过去最能感受到斗兽场的尺度感。即使只是短暂停留，也能迅速建立对古罗马空间秩序的印象。',
                'source': '模拟专题笔记',
            },
            {
                'id': 'mock-colosseum-zh-2',
                'author': '约纳斯',
                'score': 4.8,
                'comment': '适合放慢速度接近。黄昏时分，层层叠起的拱券会形成很强的轮廓感。',
                'source': '模拟现场观察',
            },
        ],
        'pisa': [
            {
                'id': 'mock-pisa-zh-1',
                'author': '埃琳娜',
                'score': 4.7,
                'comment': '广场比想象中更安静。如果把草坪、主教堂与斜塔一起看，空间关系会变得非常清晰。',
                'source': '模拟专题笔记',
            },
            {
                'id': 'mock-pisa-zh-2',
                'author': '马可',
                'score': 4.6,
                'comment': '尺度紧凑、光线明亮，作为一条短路线的终点非常合适。',
                'source': '模拟现场观察',
            },
        ],
    },
}


def _find_landmark(landmark_id):
    return next((item for item in LANDMARKS if item['id'] == landmark_id), None)


def _review_payload(landmark, language):
    reviews_by_language = MOCK_REVIEWS.get(language, MOCK_REVIEWS['en'])
    reviews = reviews_by_language.get(landmark['id'], [])
    scored_reviews = [item['score'] for item in reviews if item.get('score') is not None]
    average_score = round(sum(scored_reviews) / len(scored_reviews), 2) if scored_reviews else None
    return {
        'mode': 'mock',
        'landmark_id': landmark['id'],
        'landmark_name': landmark['name'],
        'average_score': average_score,
        'review_count': len(reviews),
        'reviews': reviews,
    }


@app.get('/api/health')
def health():
    return {
        'status': 'ok',
        'mode': 'mock',
        'database_configured': False,
    }


@app.get('/api/landmarks')
def get_landmarks():
    return {
        'mode': 'mock',
        'items': LANDMARKS,
    }


@app.get('/api/routes/current')
def get_current_route():
    return {
        'mode': 'mock',
        'route': MOCK_ROUTE,
    }


@app.get('/api/landmarks/{landmark_id}/reviews')
def get_landmark_reviews(
    landmark_id: str,
    language: str = Query('en', pattern='^(en|zh)$'),
):
    landmark = _find_landmark(landmark_id)
    if not landmark:
        raise HTTPException(status_code=404, detail=f'Unknown landmark: {landmark_id}')

    return _review_payload(landmark, language)


@app.get('/api/reviews/nearby')
def get_nearby_reviews(
    lon: float = Query(...),
    lat: float = Query(...),
    radius_km: float = Query(50, ge=1, le=500),
    language: str = Query('en', pattern='^(en|zh)$'),
):
    items = []
    for landmark in LANDMARKS:
        distance = _distance_km(lon, lat, landmark['lon'], landmark['lat'])
        if distance > radius_km:
            continue

        review_payload = _review_payload(landmark, language)
        items.append({
            'landmark_id': landmark['id'],
            'landmark_name': landmark['name'],
            'distance_km': round(distance, 2),
            'average_score': review_payload['average_score'],
            'review_count': review_payload['review_count'],
            'source': 'mock',
        })

    items.sort(key=lambda item: item['distance_km'])
    return {
        'mode': 'mock',
        'items': items,
    }
