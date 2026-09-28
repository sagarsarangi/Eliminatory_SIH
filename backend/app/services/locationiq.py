import os
import httpx
import logging

logger = logging.getLogger(__name__)

LOCATIONIQ_API_KEY = os.getenv("LOCATIONIQ_API_KEY")

async def reverse_geocode(lat: float, lon: float) -> dict:
    """
    Reverse geocode a latitude and longitude using LocationIQ API.
    Returns a dictionary containing location details.
    """
    if not LOCATIONIQ_API_KEY:
        logger.warning("LOCATIONIQ_API_KEY is not set. Reverse geocoding will be skipped.")
        return {}

    url = "https://us1.locationiq.com/v1/reverse"
    params = {
        "key": LOCATIONIQ_API_KEY,
        "lat": lat,
        "lon": lon,
        "format": "json",
        "normalizeaddress": 1
    }

    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(url, params=params, timeout=10.0)
            response.raise_for_status()
            data = response.json()
            return data
        except httpx.HTTPError as e:
            logger.error(f"HTTP Error during reverse geocoding: {e}")
            return {}
        except Exception as e:
            logger.error(f"Error during reverse geocoding: {e}")
            return {}
