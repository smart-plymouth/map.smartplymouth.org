import React, { useRef, useEffect, useState } from 'react';
import mapboxgl from '!mapbox-gl'; // eslint-disable-line import/no-webpack-loader-syntax

mapboxgl.accessToken = 'pk.eyJ1Ijoicm9icHV0dCIsImEiOiJjbGp2dTVpMHEwam1nM3VuMXN2dHk1aWsxIn0.AwfsC_Not91E4oxcYguXhA';

export default function App() {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const [traffic, setTraffic] = useState(false);
  const [lng, setLng] = useState(-4.1394);
  const [lat, setLat] = useState(50.3926);
  const [zoom, setZoom] = useState(12);

  const toggleTraffic = () => {
    if (traffic) {
        setTraffic(false);
        map.current.setStyle('mapbox://styles/mapbox/streets-v12')
    } else {
        setTraffic(true);
        map.current.setStyle('mapbox://styles/mapbox/navigation-day-v1')
    }
  };

  useEffect(() => {
    if (map.current) return; // initialize map only once
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [lng, lat],
      zoom: zoom
    });
  });

  useEffect(() => {
    if (!map.current) return; // wait for map to initialize
    map.current.on('move', () => {
      setLng(map.current.getCenter().lng.toFixed(4));
      setLat(map.current.getCenter().lat.toFixed(4));
      setZoom(map.current.getZoom().toFixed(2));
    });
  });

  return (
    <div>
      <div className="sidebar">
      <ul>
        <li><b>Transport</b></li>
        <ul>
            <li>Traffic <input type="checkbox" id="checkTraffic" name="checkTraffic" checked={traffic} onClick={toggleTraffic} /></li>
        </ul>
      </ul>
      </div>
      <div ref={mapContainer} className="map-container" />
    </div>
  );
}
