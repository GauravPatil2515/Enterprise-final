"""
Centralized in-memory cache for risk analysis results.
Allows invalidation from CRUD routes when data changes.
"""
from typing import Dict, Optional, Any
import time

# Simple in-memory cache: { project_id: { "result": ..., "ts": ... } }
_risk_cache: Dict[str, dict] = {}
RISK_CACHE_TTL = 300  # 5 minutes

def get_cached_risk(project_id: str) -> Optional[Any]:
    entry = _risk_cache.get(project_id)
    if entry and (time.time() - entry["ts"]) < RISK_CACHE_TTL:
        return entry["result"]
    return None

def set_cached_risk(project_id: str, result: Any):
    _risk_cache[project_id] = {"result": result, "ts": time.time()}

def invalidate_project_risk(project_id: str):
    if project_id in _risk_cache:
        del _risk_cache[project_id]
