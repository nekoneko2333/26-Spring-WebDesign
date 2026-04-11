import math
from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware

from db import get_connection, get_database_url, get_reviews_for_landmark
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
        return {'landmark_id': landmark_id, 'reviews': [], 'average_score': None, 'review_count': 0}

    reviews = get_reviews_for_landmark(landmark_id)
    average_score = round(sum(item['score'] for item in reviews if item['score'] is not None) / len(reviews), 2) if reviews else None
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
        return {'items': [], 'mode': 'database_unavailable'}

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
            'items': [],
            'mode': 'postgis_error',
            'warning': f'PostGIS query failed: {exc}',
        }
    finally:
        connection.close()
