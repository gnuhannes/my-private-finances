from __future__ import annotations

from fastapi import APIRouter, HTTPException

from my_private_finances.deps import SessionDep
from my_private_finances.schemas.ml import Suggestion, TrainResult
from my_private_finances.services.ml_categorization import (
    ColdStartError,
    suggest,
    train,
)

router = APIRouter(prefix="/ml", tags=["ml"])


@router.post("/train", response_model=TrainResult)
async def train_model(session: SessionDep) -> TrainResult:
    try:
        return await train(session)
    except ColdStartError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.get("/suggest", response_model=list[Suggestion])
async def get_suggestions(session: SessionDep) -> list[Suggestion]:
    try:
        return await suggest(session)
    except ColdStartError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
