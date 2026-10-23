"""Compatibility shim for the legacy ``backend.app.*`` module stack.

The running FastAPI application uses :mod:`app.db.database` exclusively.
This module is kept only so old imports do not create a second engine or a
second declarative ``Base``; it re-exports the live one.
"""

from collections.abc import Generator

from app.db.database import Base, SessionLocal, engine


def get_db() -> Generator:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
