import logging
import math
from typing import Any, Dict, List, Optional
import pygeohash as geohash

from app.services.supabase import (
    get_all_geohash_stats,
    get_all_joint_predictions_recent,
    upsert_geohash_stats,
    get_geohash_regions,
)

logger = logging.getLogger(__name__)


def compute_geohash(lat: float, lng: float, precision: int = 5) -> str:
    """Computes geohash string for coordinates."""
    try:
        return geohash.encode(lat, lng, precision)
    except Exception as e:
        logger.error(f"Error computing geohash: {e}")
        return ""


def compute_regional_anomaly(geohash_cell: str) -> Dict[str, Any]:
    """Computes regional anomaly (Model C)."""
    default_resp = {
        "geohash": geohash_cell,
        "zscore": 0.0,
        "severity": 0.0,
        "cell_rate": 0.0,
        "is_reliable": False,
    }
    try:
        stats = get_all_geohash_stats()
        if not stats:
            return default_resp

        reliable_rates = [
            s.get("recent_mastitis_rate", 0.0)
            for s in stats
            if s.get("cow_count", 0) >= 3
        ]
        if not reliable_rates:
            return default_resp

        mean = sum(reliable_rates) / len(reliable_rates)
        variance = sum((r - mean) ** 2 for r in reliable_rates) / len(reliable_rates)
        std = math.sqrt(variance) if variance > 0 else 0.0

        cell_stat = next((s for s in stats if s.get("geohash") == geohash_cell), None)
        if not cell_stat:
            return default_resp

        cell_rate = cell_stat.get("recent_mastitis_rate", 0.0)
        cow_count = cell_stat.get("cow_count", 0)

        if cow_count < 3:
            return {
                "geohash": geohash_cell,
                "zscore": 0.0,
                "severity": 0.0,
                "cell_rate": float(cell_rate),
                "is_reliable": False,
            }

        z = (cell_rate - mean) / std if std > 0 else 0.0
        # Clip to [-1, 3] range, then min-max scale
        z_clipped = max(-1.0, min(3.0, z))
        severity = (z_clipped + 1.0) / 4.0

        return {
            "geohash": geohash_cell,
            "zscore": float(z),
            "severity": float(severity),
            "cell_rate": float(cell_rate),
            "is_reliable": True,
        }
    except Exception as e:
        logger.error(f"Error computing regional anomaly: {e}")
        return default_resp


def recompute_geohash_stats() -> None:
    """Recomputes stats and upserts to supabase."""
    try:
        predictions = get_all_joint_predictions_recent()
        if not predictions:
            return

        # Group by geohash
        cell_data = {}
        for p in predictions:
            g = p.get("geohash")
            if not g:
                continue

            if g not in cell_data:
                cell_data[g] = {"total": 0, "mastitis": 0}

            cell_data[g]["total"] += 1
            risk = p.get("risk_tier", "No Risk")
            if risk in ["Moderate", "High"]:
                cell_data[g]["mastitis"] += 1

        # Compute rates
        stats_to_upsert = []
        reliable_rates = []
        for g, data in cell_data.items():
            rate = data["mastitis"] / data["total"] if data["total"] > 0 else 0.0
            stat = {
                "geohash": g,
                "cow_count": data["total"],
                "recent_mastitis_rate": rate,
                "zscore": 0.0,
                "severity": 0.0,
            }
            stats_to_upsert.append(stat)
            if data["total"] >= 3:
                reliable_rates.append(rate)

        # Compute z-scores for all cells based on reliable rates
        if reliable_rates:
            mean = sum(reliable_rates) / len(reliable_rates)
            variance = sum((r - mean) ** 2 for r in reliable_rates) / len(
                reliable_rates
            )
            std = math.sqrt(variance) if variance > 0 else 0.0

            for stat in stats_to_upsert:
                if stat["cow_count"] >= 3:
                    z = (stat["recent_mastitis_rate"] - mean) / std if std > 0 else 0.0
                    z_clipped = max(-1.0, min(3.0, z))
                    severity = (z_clipped + 1.0) / 4.0
                    stat["zscore"] = float(z)
                    stat["severity"] = float(severity)

        if stats_to_upsert:
            upsert_geohash_stats(stats_to_upsert)
    except Exception as e:
        logger.error(f"Error recomputing geohash stats: {e}")


def get_hotspot_geojson() -> Dict[str, Any]:
    """Returns GeoJSON FeatureCollection for the map."""
    empty_geojson = {"type": "FeatureCollection", "features": []}
    try:
        stats = get_all_geohash_stats()
        if not stats:
            return empty_geojson

        regions_map = get_geohash_regions()

        features = []
        for stat in stats:
            g = stat.get("geohash")
            if not g:
                continue

            lat, lng = geohash.decode(g)

            feature = {
                "type": "Feature",
                "geometry": {
                    "type": "Point",
                    "coordinates": [lng, lat],  # GeoJSON uses [longitude, latitude]
                },
                "properties": {
                    "geohash": g,
                    "region_name": regions_map.get(g, "Unknown Region"),
                    "recent_mastitis_rate": stat.get("recent_mastitis_rate", 0.0),
                    "cow_count": stat.get("cow_count", 0),
                    "zscore": stat.get("zscore", 0.0),
                    "severity": stat.get("severity", 0.0),
                },
            }
            features.append(feature)

        return {"type": "FeatureCollection", "features": features}
    except Exception as e:
        logger.error(f"Error getting hotspot geojson: {e}")
        return empty_geojson
