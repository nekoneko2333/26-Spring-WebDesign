import math
from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware

from db import get_connection, get_database_url
from postgis_queries import POSTGIS_NEARBY_REVIEWS_SQL

app = FastAPI(title='Web3D Landmarks API', version='1.0.0')

app.add_middleware(
    CORSMiddleware,
    allow_origins=['*'],
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


_RAW = [
    {
        'id': 'colosseum',
        'name': 'Colosseum · 罗马斗兽场',
        'description': '古罗马时代最宏伟的圆形竞技场之一，是罗马文明象征。',
        'model_path': '/models/colosseum.glb',
        'lon': 12.4922,
        'lat': 41.8902,
    },
    {
        'id': 'pisa',
        'name': 'Leaning Tower of Pisa · 比萨斜塔',
        'description': '始建于 1173 年，以独特倾斜结构闻名世界。',
        'model_path': '/models/leaning_tower_of_pisa.glb',
        'lon': 10.3963,
        'lat': 43.7230,
    },
]

LANDMARKS = [
    {
        **{k: v for k, v in item.items() if k not in ('lon', 'lat')},
        'coordinates': _lnglat_to_world(item['lon'], item['lat']),
        'lon': item['lon'],
        'lat': item['lat'],
    }
    for item in _RAW
]

MOCK_REVIEWS = {
    'colosseum': [
        {'id': 'col-1', 'author': 'Giulia', 'score': 4.9, 'comment': '光影和历史氛围非常震撼，傍晚时段尤其适合停留观赏。', 'source': 'mock-google'},
        {'id': 'col-2', 'author': 'Luca', 'score': 4.7, 'comment': '如果能在周边街区慢慢步行，会比只拍照更有体验感。', 'source': 'mock-tripadvisor'},
        {'id': 'col-3', 'author': 'Emma', 'score': 4.8, 'comment': '非常适合作为路线中的重点停靠点，建筑细节很有层次。', 'source': 'mock-editorial'},
    ],
    'pisa': [
        {'id': 'pis-1', 'author': 'Marco', 'score': 4.6, 'comment': '广场空间开阔，白色石材在晴天里非常上镜。', 'source': 'mock-google'},
        {'id': 'pis-2', 'author': 'Sofia', 'score': 4.5, 'comment': '比想象中更优雅，适合搭配周边教堂群一起浏览。', 'source': 'mock-tripadvisor'},
        {'id': 'pis-3', 'author': 'Noah', 'score': 4.7, 'comment': '如果作为 3D 场景中的第二站，节奏会非常舒服。', 'source': 'mock-editorial'},
    ],
}


def _fallback_nearby_reviews(lon: float, lat: float, radius_km: float):
    nearby_landmarks = []
    for landmark in LANDMARKS:
        dx = (landmark['lon'] - lon) * 85
        dy = (landmark['lat'] - lat) * 111
        distance_km = math.sqrt(dx * dx + dy * dy)
        if distance_km <= radius_km:
            reviews = MOCK_REVIEWS.get(landmark['id'], [])
            nearby_landmarks.append(
                {
                    'landmark_id': landmark['id'],
                    'landmark_name': landmark['name'],
                    'distance_km': round(distance_km, 2),
                    'average_score': round(sum(item['score'] for item in reviews) / len(reviews), 2) if reviews else None,
                    'review_count': len(reviews),
                    'source': 'mock-fallback',
                }
            )
    nearby_landmarks.sort(key=lambda item: item['distance_km'])
    return nearby_landmarks


@app.get('/api/health')
def health():
    return {'status': 'ok', 'database_configured': bool(get_database_url())}


@app.get('/api/landmarks')
def get_landmarks():
    return LANDMARKS


@app.get('/api/landmarks/{landmark_id}/reviews')
def get_landmark_reviews(landmark_id: str):
    landmark = next((item for item in LANDMARKS if item['id'] == landmark_id), None)
    if not landmark:
        return {'landmark_id': landmark_id, 'reviews': [], 'average_score': None}

    reviews = MOCK_REVIEWS.get(landmark_id, [])
    average_score = round(sum(item['score'] for item in reviews) / len(reviews), 2) if reviews else None
    return {
        'landmark_id': landmark_id,
        'landmark_name': landmark['name'],
        'average_score': average_score,
        'review_count': len(reviews),
        'reviews': reviews,
    }


@app.get('/api/reviews/nearby')
def get_nearby_reviews(
    lon: float = Query(...),
    lat: float = Query(...),
    radius_km: float = Query(50, ge=1, le=500),
):
    connection = get_connection()
    if connection is None:
        return {'items': _fallback_nearby_reviews(lon, lat, radius_km), 'mode': 'mock'}

    try:
        with connection, connection.cursor() as cursor:
            cursor.execute(
                POSTGIS_NEARBY_REVIEWS_SQL,
                {'lon': lon, 'lat': lat, 'radius_m': radius_km * 1000},
            )
            rows = cursor.fetchall()
            items = [
                {
                    'landmark_id': row[0],
                    'landmark_name': row[1],
                    'distance_km': float(row[2]),
                    'average_score': float(row[3]) if row[3] is not None else None,
                    'review_count': int(row[4]),
                    'source': 'postgis',
                }
                for row in rows
            ]
            return {'items': items, 'mode': 'postgis'}
    except Exception as exc:
        return {
            'items': _fallback_nearby_reviews(lon, lat, radius_km),
            'mode': 'mock',
            'warning': f'PostGIS query failed: {exc}',
        }
    finally:
        connection.close()
