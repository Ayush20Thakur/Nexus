from __future__ import annotations

import pytest

from app.core.config import get_settings
from app.database.session import clear_database_caches


@pytest.fixture(autouse=True)
def clear_settings_cache():
    get_settings.cache_clear()
    clear_database_caches()
    yield
    get_settings.cache_clear()
    clear_database_caches()
