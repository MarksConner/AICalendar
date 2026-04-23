import os
from pathlib import Path
from urllib.parse import quote

import requests
from dotenv import load_dotenv
from fastapi import HTTPException

ROOT_ENV_PATH = Path(__file__).resolve().parents[2] / ".env"
load_dotenv(ROOT_ENV_PATH)

BASE_GEOCODE_URL = "https://api.mapbox.com/geocoding/v5/mapbox.places"
BASE_DIRECTIONS_URL = "https://api.mapbox.com/directions/v5/mapbox/driving"


def _require_token() -> str:
    token = os.getenv("MAPBOX_TOKEN") or os.getenv("VITE_MAPBOX_TOKEN")
    if not token:
        raise HTTPException(status_code=500, detail="MAPBOX_TOKEN is not configured")
    return token


def geocode_location(query: str) -> dict:
    token = _require_token()
    url = f"{BASE_GEOCODE_URL}/{quote(query)}.json"
    response = requests.get(url, params={"access_token": token, "limit": 1}, timeout=15)
    response.raise_for_status()
    payload = response.json()
    features = payload.get("features", [])
    if not features:
        raise HTTPException(status_code=404, detail=f"Could not geocode location: {query}")
    return features[0]


def get_route(user_longitude: float, user_latitude: float, destination: str) -> dict:
    token = _require_token()
    destination_feature = geocode_location(destination)
    destination_longitude, destination_latitude = destination_feature["center"]

    coordinates = f"{user_longitude},{user_latitude};{destination_longitude},{destination_latitude}"
    response = requests.get(
        f"{BASE_DIRECTIONS_URL}/{coordinates}",
        params={"access_token": token, "geometries": "geojson", "overview": "full"},
        timeout=15,
    )
    response.raise_for_status()
    payload = response.json()
    routes = payload.get("routes", [])
    if not routes:
        raise HTTPException(status_code=404, detail="Could not calculate route")

    route = routes[0]
    return {
        "destination_name": destination_feature.get("place_name", destination),
        "destination_latitude": destination_latitude,
        "destination_longitude": destination_longitude,
        "distance_meters": route.get("distance", 0),
        "duration_seconds": route.get("duration", 0),
        "geometry": route.get("geometry"),
    }
