from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

import os
import time

DATABASE_URL = os.environ.get("DATABASE_URL", "postgresql+psycopg://myuser:mypassword@db:5432/mydb")

engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)

app = FastAPI(title="Minimal API")

CREATE_TABLE_SQL = """
CREATE TABLE IF NOT EXISTS items (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT
);
"""

for _ in range(10):
    try:
        with engine.connect() as conn:
            conn.execute(text(CREATE_TABLE_SQL))
            conn.commit()
        break
    except Exception:
        time.sleep(1)

class ItemIn(BaseModel):
    name: str
    description: Optional[str] = None

class ItemOut(ItemIn):
    id: int

@app.get("/healthz")
def healthz():
    with engine.connect() as conn:
        conn.execute(text("SELECT 1"))
    return {"ok": True}

@app.post("/items", response_model=ItemOut)
def create_item(item: ItemIn):
    with engine.begin() as conn:
        res = conn.execute(
            text("INSERT INTO items (name, description) VALUES (:n, :d) RETURNING id"),
            {"n": item.name, "d": item.description},
        )
        new_id = res.scalar_one()
    return ItemOut(id=new_id, **item.model_dump())

@app.get("/items/{item_id}", response_model=ItemOut)
def get_item(item_id: int):
    with engine.connect() as conn:
        row = conn.execute(
            text("SELECT id, name, description FROM items WHERE id = :id"),
            {"id": item_id},
        ).mappings().first()
    if not row:
        raise HTTPException(status_code=404, detail="Item not found")
    return ItemOut(id=row["id"], name=row["name"], description=row["description"])

@app.get("/items")
def list_items(limit: int = 50, offset: int = 0):
    with engine.connect() as conn:
        rows = conn.execute(
            text("SELECT id, name, description FROM items ORDER BY id LIMIT :l OFFSET :o"),
            {"l": limit, "o": offset},
        ).mappings().all()
    return rows
