import requests
import os

MAPBOX_TOKEN = os.getenv("MAPBOX_TOKEN")

def get_directions(origin, destination):
    url = f"https://api.mapbox.com/directions/v5/mapbox/driving/{origin};{destination}?access_token={MAPBOX_TOKEN}"
    r = requests.get(url)
    data = r.json()
    return data
def geocode(query):
    url = f"https://api.mapbox.com/geocoding/v5/mapbox.places/{query}.json?access_token={MAPBOX_TOKEN}"
    return requests.get(url).json()
