POSTGIS_NEARBY_REVIEWS_SQL = """
WITH nearby_landmarks AS (
  SELECT
    l.id,
    l.name,
    l.longitude,
    l.latitude,
    ST_Distance(
      l.geom::geography,
      ST_SetSRID(ST_MakePoint(%(lon)s, %(lat)s), 4326)::geography
    ) AS distance_m
  FROM landmarks l
  WHERE ST_DWithin(
    l.geom::geography,
    ST_SetSRID(ST_MakePoint(%(lon)s, %(lat)s), 4326)::geography,
    %(radius_m)s
  )
)
SELECT
  nl.id AS landmark_id,
  nl.name AS landmark_name,
  ROUND(nl.distance_m / 1000.0, 2) AS distance_km,
  ROUND(AVG(r.score)::numeric, 2) AS average_score,
  COUNT(r.id) AS review_count
FROM nearby_landmarks nl
LEFT JOIN landmark_reviews r ON r.landmark_id = nl.id
GROUP BY nl.id, nl.name, nl.distance_m
ORDER BY nl.distance_m ASC;
"""
