from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title='Web3D Landmarks API', version='1.0.0')

app.add_middleware(
    CORSMiddleware,
    allow_origins=['*'],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)

# 地图范围（与前端 MAP_BOUNDS 保持一致）
_LON_MIN, _LON_MAX = 6.6, 18.5
_LAT_MIN, _LAT_MAX = 36.6, 47.1
_WORLD = 240  # Three.js 世界单位

import math

def _merc_y(lat):
    return math.log(math.tan(math.pi / 4 + math.radians(lat) / 2))

_MERC_Y_MIN = _merc_y(_LAT_MIN)
_MERC_Y_MAX = _merc_y(_LAT_MAX)

def _lnglat_to_world(lon, lat):
    """真实经纬度 → Three.js 世界坐标 (x, 0, z)"""
    tx = (lon - _LON_MIN) / (_LON_MAX - _LON_MIN)
    tz = 1.0 - (_merc_y(lat) - _MERC_Y_MIN) / (_MERC_Y_MAX - _MERC_Y_MIN)
    x = (tx - 0.5) * _WORLD
    z = (tz - 0.5) * _WORLD
    return [round(x, 2), 0, round(z, 2)]

# 真实经纬度：lon, lat
_RAW = [
    {
        'id': 'colosseum',
        'name': 'Colosseum · 罗马斗兽场',
        'description': '古罗马时代最宏伟的圆形竞技场之一，是罗马文明象征。',
        'model_path': '/models/colosseum.glb',
        'lon': 12.4922, 'lat': 41.8902,   # 罗马斗兽场真实坐标
    },
    {
        'id': 'pisa',
        'name': 'Leaning Tower of Pisa · 比萨斜塔',
        'description': '始建于 1173 年，以独特倾斜结构闻名世界。',
        'model_path': '/models/leaning_tower_of_pisa.glb',
        'lon': 10.3963, 'lat': 43.7230,   # 比萨斜塔真实坐标
    },
]

LANDMARKS = [
    {**{k: v for k, v in item.items() if k not in ('lon', 'lat')},
     'coordinates': _lnglat_to_world(item['lon'], item['lat'])}
    for item in _RAW
]


@app.get('/api/health')
def health():
    return {'status': 'ok'}


@app.get('/api/landmarks')
def get_landmarks():
    return LANDMARKS
