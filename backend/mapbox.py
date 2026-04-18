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
    

def get_travel_time_minutes(origin_lat: float, origin_long: float, dest_lat: float, dest_long: float): #Given the geo-coords of two locations, get the travel time between the two assuming the transportation method is driving
    origin = f"{origin_long},{origin_lat}"
    destination = f"{dest_long},{dest_lat}"
    
    url = f"https://api.mapbox.com/directions/v5/mapbox/driving/{origin};{destination}?access_token={MAPBOX_TOKEN}"
    
    try:
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        data = response.json()
        
        routes = data.get("routes", [])
        if not routes:
            return None
        
        duration_seconds = routes[0]["duration"]
        return -(-int(duration_seconds) // 60)
        
    except requests.RequestException:
        return None

def geocode(address: str): #Take an address in the form of "123 Main St, City, STATE" and convert it into a tuple of floats that represent the geo-coords of the location
    if not isinstance(address, str):
        return None
    
    address=address.strip()
    if not address:
        return None

    encodedAddress=quote(address)

    url = f"https://api.mapbox.com/geocoding/v5/mapbox.places/{encodedAddress}.json?access_token={MAPBOX_TOKEN}&limit=1&types=address,place"

    try:
        response=requests.get(url, timeout=10)
        response.raise_for_status()
        data=response.json()

        features=data.get("features", [])
        if not features:
            return None
        
        longitude, latitude=data["features"][0]["center"]
        return (latitude, longitude)
    
    except requests.RequestException:
        return None