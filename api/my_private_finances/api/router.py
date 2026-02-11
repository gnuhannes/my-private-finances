from fastapi import APIRouter

from my_private_finances.api.routes import reports
from my_private_finances.api.routes.accounts import router as accounts_router
from my_private_finances.api.routes.imports import router as imports_router
from my_private_finances.api.routes.transactions import router as transactions_router

api_router = APIRouter()
api_router.include_router(accounts_router)
api_router.include_router(transactions_router)
api_router.include_router(reports.router)
api_router.include_router(imports_router)
