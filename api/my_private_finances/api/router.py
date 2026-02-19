from fastapi import APIRouter

from my_private_finances.api.routes import reports
from my_private_finances.api.routes.accounts import router as accounts_router
from my_private_finances.api.routes.budgets import router as budgets_router
from my_private_finances.api.routes.categories import router as categories_router
from my_private_finances.api.routes.categorization_rules import (
    router as categorization_rules_router,
)
from my_private_finances.api.routes.imports import router as imports_router
from my_private_finances.api.routes.recurring_patterns import (
    router as recurring_patterns_router,
)
from my_private_finances.api.routes.transactions import router as transactions_router
from my_private_finances.api.routes.transfers import router as transfers_router
from my_private_finances.api.routes.net_worth import router as net_worth_router
from my_private_finances.api.routes.trends import router as trends_router
from my_private_finances.api.routes.annual import router as annual_router

api_router = APIRouter()
api_router.include_router(accounts_router)
api_router.include_router(budgets_router)
api_router.include_router(categories_router)
api_router.include_router(categorization_rules_router)
api_router.include_router(transactions_router)
api_router.include_router(recurring_patterns_router)
api_router.include_router(reports.router)
api_router.include_router(imports_router)
api_router.include_router(transfers_router)
api_router.include_router(net_worth_router)
api_router.include_router(trends_router)
api_router.include_router(annual_router)
