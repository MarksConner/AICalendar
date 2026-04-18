import backend.mapbox as mapbox
from backend.mapbox import geocode
from backend.mapbox import get_travel_time_minutes
from unittest.mock import patch, Mock


class DummyResponse:
    def __init__(self, payload):
        self._payload = payload
        self._raised = False

    def json(self):
        return self._payload

    def raise_for_status(self):
        return None


def test_get_directions_mocks_requests(monkeypatch):
    def fake_get(url, timeout=20):
        assert "directions" in url
        return DummyResponse({"routes": [{"duration": 600.0}]})

    monkeypatch.setattr(mapbox.requests, "get", fake_get)
    monkeypatch.setattr(mapbox, "MAPBOX_TOKEN", "fake-token")

    data = mapbox.get_directions("0,0", "1,1")
    assert data["routes"][0]["duration"] == 600.0


def test_geocode_mocks_requests(monkeypatch):
    def fake_get(url, params=None, timeout=20):
        assert "geocoding" in url
        return DummyResponse({
            "features": [
                {"center": [-119.8138, 39.5296]}
            ]
        })

    monkeypatch.setattr(mapbox.requests, "get", fake_get)
    monkeypatch.setattr(mapbox, "MAPBOX_TOKEN", "fake-token")

    result = mapbox.geocode("Reno")
    assert result == (39.5296, -119.8138)
    
#Testing a valid address
def test_geocode_success():
    mock_response=Mock()
    mock_response.json.return_value={"features":[{"center": [-119.812804, 39.539467]}]} #Primary address for UNR, 1664 N Virginia St
    mock_response.raise_for_status.return_value=None
    
    with patch("backend.mapbox.requests.get", return_value=mock_response):
        result=geocode("1664 N Virginia St")

    assert result==(39.539467, -119.812804)

#Testing an invalid address
def test_geocode_failure():
    mock_response=Mock()
    mock_response.json.return_value={"features":[]}
    mock_response.raise_for_status.return_value=None

    with patch("backend.mapbox.requests.get", return_value=mock_response):
        result=geocode("123 Fake Address")

    assert result is None
    
#Testing travel time between Davidson Academy and Little Waldorf Saloon
def test_travel_time_minutes():
    #Davidson Academy: 1164 N Virginia St, Reno ; -119.816766,39.538546
    #Little Waldorf Saloon: 1661 N Virginia St, Reno, NV ; -119.82164,39.547495
    mock_response=Mock()
    mock_response.json.return_value={"routes":[{"duration": 196.159}]}
    mock_response.raise_for_status.return_value=None
    
    with patch("backend.mapbox.requests.get", return_value = mock_response):
        result = get_travel_time_minutes(-119.816766, 39.538546, -119.82164, 39.547495)
        
    assert result==(-(-int(196.159) // 60))
    