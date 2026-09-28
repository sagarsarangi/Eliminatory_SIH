import logging
from typing import Optional, List, Dict, Any, Union
from supabase import create_client, Client
from app.core.config import settings

logger = logging.getLogger(__name__)

_supabase_client: Optional[Client] = None


def get_client() -> Optional[Client]:
    global _supabase_client
    if _supabase_client is not None:
        return _supabase_client

    if not settings.SUPABASE_URL or not settings.SUPABASE_SERVICE_ROLE_KEY:
        logger.warning(
            "Supabase URL or Service Role Key is missing. Database operations will be disabled."
        )
        return None

    try:
        _supabase_client = create_client(
            settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY
        )
        return _supabase_client
    except Exception as e:
        logger.error(f"Failed to initialize Supabase client: {e}")
        return None


def insert_farm(data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    client = get_client()
    if not client:
        return None
    try:
        response = client.table("farms").insert(data).execute()
        return response.data[0] if response.data else None
    except Exception as e:
        logger.error(f"Error inserting farm: {e}")
        return None


def insert_cow(data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    client = get_client()
    if not client:
        return None
    try:
        response = client.table("cows").insert(data).execute()
        return response.data[0] if response.data else None
    except Exception as e:
        logger.error(f"Error inserting cow: {e}")
        return None


def insert_sensor_reading(data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    client = get_client()
    if not client:
        return None
    try:
        response = client.table("sensor_readings").insert(data).execute()
        return response.data[0] if response.data else None
    except Exception as e:
        logger.error(f"Error inserting sensor reading: {e}")
        return None


def insert_tabular_prediction(data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    client = get_client()
    if not client:
        return None
    try:
        response = client.table("tabular_predictions").insert(data).execute()
        return response.data[0] if response.data else None
    except Exception as e:
        logger.error(f"Error inserting tabular prediction: {e}")
        return None


def insert_image_prediction(data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    client = get_client()
    if not client:
        return None
    try:
        response = client.table("image_predictions").insert(data).execute()
        return response.data[0] if response.data else None
    except Exception as e:
        logger.error(f"Error inserting image prediction: {e}")
        return None


def insert_joint_prediction(data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    client = get_client()
    if not client:
        return None
    try:
        response = client.table("joint_predictions").insert(data).execute()
        return response.data[0] if response.data else None
    except Exception as e:
        logger.error(f"Error inserting joint prediction: {e}")
        return None


def insert_alert(data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    client = get_client()
    if not client:
        return None
    try:
        response = client.table("alerts").insert(data).execute()
        return response.data[0] if response.data else None
    except Exception as e:
        logger.error(f"Error inserting alert: {e}")
        return None


def upsert_geohash_stats(data: Union[Dict[str, Any], List[Dict[str, Any]]]) -> Union[Dict[str, Any], List[Dict[str, Any]], None]:
    client = get_client()
    if not client:
        return None
    try:
        response = client.table("geohash_stats").upsert(data).execute()
        return response.data if response.data else None
    except Exception as e:
        logger.error(f"Error upserting geohash stats: {e}")
        return None


def get_cow(cow_id: str) -> Optional[Dict[str, Any]]:
    client = get_client()
    if not client:
        return None
    try:
        response = client.table("cows").select("*").eq("id", cow_id).execute()
        return response.data[0] if response.data else None
    except Exception as e:
        logger.error(f"Error getting cow {cow_id}: {e}")
        return None


def get_farm(farm_id: str) -> Optional[Dict[str, Any]]:
    client = get_client()
    if not client:
        return None
    try:
        response = client.table("farms").select("*").eq("id", farm_id).execute()
        return response.data[0] if response.data else None
    except Exception as e:
        logger.error(f"Error getting farm {farm_id}: {e}")
        return None


def get_farm_by_name(name: str) -> Optional[Dict[str, Any]]:
    client = get_client()
    if not client:
        return None
    try:
        response = client.table("farms").select("*").eq("name", name).execute()
        return response.data[0] if response.data else None
    except Exception as e:
        logger.error(f"Error getting farm by name {name}: {e}")
        return None


def get_cow_history(cow_id: str) -> List[Dict[str, Any]]:
    client = get_client()
    if not client:
        return []
    try:
        response = (
            client.table("sensor_readings")
            .select(
                "*, tabular_predictions(*), image_predictions(*), joint_predictions(*)"
            )
            .eq("cow_id", cow_id)
            .order("recorded_at", desc=True)
            .execute()
        )
        return response.data if response.data else []
    except Exception as e:
        logger.error(f"Error getting cow history for {cow_id}: {e}")
        return []


def get_all_cows() -> List[Dict[str, Any]]:
    client = get_client()
    if not client:
        return []
    try:
        response = client.table("cows").select("*, joint_predictions(*), farms(*)").execute()
        return response.data if response.data else []
    except Exception as e:
        logger.error(f"Error getting all cows: {e}")
        return []


def get_all_geohash_stats() -> List[Dict[str, Any]]:
    client = get_client()
    if not client:
        return []
    try:
        response = client.table("geohash_stats").select("*").execute()
        return response.data if response.data else []
    except Exception as e:
        logger.error(f"Error getting all geohash stats: {e}")
        return []


def get_joint_predictions_by_geohash(
    geohash: str, days: int = 14
) -> List[Dict[str, Any]]:
    client = get_client()
    if not client:
        return []
    try:
        # Note: advanced nested filtering might require an RPC. Using simple query here.
        response = (
            client.table("joint_predictions")
            .select("*, cows!inner(farm_id, farms!inner(geohash))")
            .like("cows.farms.geohash", f"{geohash}%")
            .execute()
        )
        return response.data if response.data else []
    except Exception as e:
        logger.error(f"Error getting joint predictions by geohash: {e}")
        return []


def get_recent_alerts(limit: int = 20) -> List[Dict[str, Any]]:
    client = get_client()
    if not client:
        return []
    try:
        response = (
            client.table("alerts")
            .select("*")
            .order("created_at", desc=True)
            .limit(limit)
            .execute()
        )
        return response.data if response.data else []
    except Exception as e:
        logger.error(f"Error getting recent alerts: {e}")
        return []


def get_all_joint_predictions_recent(days: int = 14) -> List[Dict[str, Any]]:
    client = get_client()
    if not client:
        return []
    try:
        response = (
            client.table("joint_predictions")
            .select("*")
            .order("created_at", desc=True)
            .execute()
        )
        return response.data if response.data else []
    except Exception as e:
        logger.error(f"Error getting recent joint predictions: {e}")
        return []


def get_farm_for_cow(cow_id: str) -> Optional[Dict[str, Any]]:
    client = get_client()
    if not client:
        return None
    try:
        response = client.table('cows').select('*, farms(*)').eq('id', cow_id).execute()
        if response.data and len(response.data) > 0 and response.data[0].get('farms'):
            return response.data[0]['farms']
        return None
    except Exception as e:
        logger.error(f'Error getting farm for cow {cow_id}: {e}')
        return None

def get_geohash_regions() -> Dict[str, str]:
    """Returns a dict mapping geohash to region name from farms table."""
    try:
        supabase = get_client()
        if not supabase: return {}
        res = supabase.table('farms').select('geohash, region').execute()
        if res.data:
            return {f['geohash']: f['region'] for f in res.data if f.get('geohash') and f.get('region')}
        return {}
    except Exception as e:
        logger.error(f'Error fetching regions: {e}')
        return {}
