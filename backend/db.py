import os
from typing import Optional

try:
    import psycopg
except ImportError:  # pragma: no cover
    psycopg = None


def get_database_url() -> Optional[str]:
    return os.getenv('DATABASE_URL') or os.getenv('POSTGRES_DSN')


def get_connection():
    database_url = get_database_url()
    if not database_url or psycopg is None:
        return None
    return psycopg.connect(database_url)


def bulk_insert_reviews(reviews):
    if not reviews:
        return 0

    connection = get_connection()
    if connection is None:
        raise RuntimeError('Database connection is not configured.')

    insert_sql = """
        INSERT INTO reviews (landmark_id, author, score, comment, source)
        VALUES (%s, %s, %s, %s, %s)
    """

    try:
        with connection, connection.cursor() as cursor:
            cursor.executemany(
                insert_sql,
                [
                    (
                        item['landmark_id'],
                        item['author'],
                        item['score'],
                        item['comment'],
                        item['source'],
                    )
                    for item in reviews
                ],
            )
        return len(reviews)
    finally:
        connection.close()


def get_reviews_for_landmark(landmark_id: str):
    connection = get_connection()
    if connection is None:
        return []

    query = """
        SELECT id, author, score, comment, source
        FROM reviews
        WHERE landmark_id = %s
        ORDER BY id DESC
    """

    try:
        with connection, connection.cursor() as cursor:
            cursor.execute(query, (landmark_id,))
            rows = cursor.fetchall()
            return [
                {
                    'id': str(row[0]),
                    'author': row[1],
                    'score': float(row[2]) if row[2] is not None else None,
                    'comment': row[3],
                    'source': row[4],
                }
                for row in rows
            ]
    finally:
        connection.close()
