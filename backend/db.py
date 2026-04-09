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
