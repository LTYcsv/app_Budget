from collections.abc import Iterator

from sqlalchemy.orm import Session

from app.database import get_db


def get_db_session() -> Iterator[Session]:
    yield from get_db()
