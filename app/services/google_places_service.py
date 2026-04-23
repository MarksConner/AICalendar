import os
from datetime import datetime, timedelta, timezone
from pathlib import Path

import requests
from dotenv import load_dotenv
from fastapi import HTTPException

ROOT_ENV_PATH = Path(__file__).resolve().parents[2] / ".env"
load_dotenv(ROOT_ENV_PATH)

GOOGLE_PLACES_SEARCH_NEARBY_URL = "https://places.googleapis.com/v1/places:searchNearby"
GOOGLE_PLACES_TEXT_SEARCH_URL = "https://places.googleapis.com/v1/places:searchText"


def _require_token() -> str:
    token = os.getenv("GOOGLE_PLACES_API_KEY")
    if not token:
        raise HTTPException(status_code=500, detail="GOOGLE_PLACES_API_KEY is not configured")
    return token


def _normalize_google_place(place: dict) -> dict:
    location = place.get("location") or {}
    display_name = (place.get("displayName") or {}).get("text")
    address = place.get("formattedAddress")
    types = ", ".join(place.get("types") or [])
    starts_at = datetime.now(timezone.utc) + timedelta(days=1)
    ends_at = starts_at + timedelta(hours=2)

    return {
        "source": "google_places",
        "external_id": place.get("id") or place.get("name") or display_name or "unknown-place",
        "title": display_name or "Suggested place",
        "description": "Google Places suggestion" + (f" • Types: {types}" if types else ""),
        "start_time": starts_at,
        "end_time": ends_at,
        "venue_name": display_name,
        "address": address,
        "latitude": location.get("latitude"),
        "longitude": location.get("longitude"),
        "url": place.get("googleMapsUri") or place.get("websiteUri"),
        "image_url": None,
        "is_free": None,
        "raw": place,
    }


def search_local_events(
    latitude: float,
    longitude: float,
    radius_km: float = 25,
    keyword: str | None = None,
    start_date: datetime | None = None,
    end_date: datetime | None = None,
) -> list[dict]:
    token = _require_token()
    radius_meters = max(1000, min(int(radius_km * 1000), 50000))

    normalized_keyword = (keyword or "").strip().lower()
    keyword_type_map = {
        "food": ["restaurant"],
        "restaurant": ["restaurant"],
        "restaurants": ["restaurant"],
        "coffee": ["cafe"],
        "cafe": ["cafe"],
        "cafes": ["cafe"],
        "museum": ["museum"],
        "museums": ["museum"],
        "park": ["park"],
        "parks": ["park"],
        "gym": ["gym"],
        "gyms": ["gym"],
        "movie": ["movie_theater"],
        "movies": ["movie_theater"],
        "theater": ["movie_theater"],
        "shopping": ["shopping_mall"],
        "mall": ["shopping_mall"],
        "music": ["live_music_venue"],
        "concert": ["live_music_venue"],
        "bar": ["bar"],
        "bars": ["bar"],
        "nightlife": ["night_club"],
    }
    included_types = keyword_type_map.get(normalized_keyword)

    use_text_search = normalized_keyword and normalized_keyword not in keyword_type_map

    if included_types is None:
        included_types = ["restaurant"]

    headers = {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": token,
        "X-Goog-FieldMask": "places.id,places.name,places.displayName,places.formattedAddress,places.location,places.googleMapsUri,places.websiteUri,places.types",
    }

    if use_text_search:
        payload = {
            "textQuery": normalized_keyword,
            "maxResultCount": 10,
            "locationBias": {
                "circle": {
                    "center": {"latitude": latitude, "longitude": longitude},
                    "radius": radius_meters,
                }
            },
        }
        response = requests.post(GOOGLE_PLACES_TEXT_SEARCH_URL, headers=headers, json=payload, timeout=20)
    else:
        payload = {
            "maxResultCount": 10,
            "locationRestriction": {
                "circle": {
                    "center": {"latitude": latitude, "longitude": longitude},
                    "radius": radius_meters,
                }
            },
            "includedTypes": included_types,
        }
        response = requests.post(GOOGLE_PLACES_SEARCH_NEARBY_URL, headers=headers, json=payload, timeout=20)
    if not response.ok:
        raise HTTPException(status_code=response.status_code, detail=f"Google Places error: {response.text}")

    places = response.json().get("places", [])
    return [_normalize_google_place(place) for place in places]
