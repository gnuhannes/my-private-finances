from typing import cast, Any

from pydantic import ConfigDict
from sqlmodel import SQLModel


class StrictSchema(SQLModel):
    model_config = cast(Any, ConfigDict(extra="forbid"))
