import requests
import os
from urllib.parse import quote

MAPBOX_TOKEN = os.getenv("MAPBOX_TOKEN")

def get_directions(origin, destination):
    url = f"https://api.mapbox.com/directions/v5/mapbox/driving/{origin};{destination}?access_token={MAPBOX_TOKEN}"
    r=requests.get(url, timeout=20)
    
    r.raise_for_status()
    data = r.json()
    return data

def geocode(address):
    if not isinstance(address, str):
        return None
    
    address=address.strip()
    if not address:
        return None

    encodedAddress=quote(address)

    url=f"https://api.mapbox.com/geocoding/v5/mapbox.places/{encodedAddress}.json?proximity=ip&types=address"
    params={"accessToken":MAPBOX_TOKEN, "limit":1}

    try:
        response=requests.get(url, params=params)
        response.raise_for_status()
        data=response.json()

        features=data.get("features", [])
        if not data["features"]:
            return None
        long, lat=data["features"][0]["center"]
        return f"{long},{lat}"
    except requests.RequestException:
        return None