import React, { useRef, useEffect, useState } from 'react';
import mapboxgl from '!mapbox-gl'; // eslint-disable-line import/no-webpack-loader-syntax

import TreeView from '@mui/lab/TreeView';
import TreeItem from '@mui/lab/TreeItem';

// Icons
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import TrafficIcon from '@mui/icons-material/Traffic';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import WcIcon from '@mui/icons-material/Wc';

mapboxgl.accessToken = 'pk.eyJ1Ijoicm9icHV0dCIsImEiOiJjbGp2dTVpMHEwam1nM3VuMXN2dHk1aWsxIn0.AwfsC_Not91E4oxcYguXhA';

export default function App() {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const [traffic, setTraffic] = useState(false);
  const [toilets, setToilets] = useState(false);
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

  const toggleEDWaitTimes = () => {
    console.log("Emergency Department Wait Times Toggled");
  };

  const togglePublicToilets = async () => {
    console.log("Public Toilets Toggled");
    if (!toilets) {
        let toilet_data = await fetch("https://public-toilets.api.smartplymouth.org/toilets").then(function(response) {
            return response.json();
        });

        let toilet_geojson = {
            'type': 'FeatureCollection',
            'features': [
            ]
        }

        let toilet_features = toilet_data.toilets.map((toilet) => {
                return {
                    'type': 'Feature',
                    'geometry': {
                        'type': 'Point',
                        'coordinates': [toilet.latitude, toilet.longitude]
                    },
                    'properties': {
                        'title': toilet.name
                    }
                }
            }
        );
        toilet_geojson.features = toilet_features;

        map.current.loadImage(
            'https://map.smartplymouth.org/icons/toilet.png',
        (error, image) => {
        if (error) throw error;

        // Add the image to the map style.
        map.current.addImage('cat', image);
        });

        map.current.addSource('toilets', {
            type: 'geojson',
            data: toilet_geojson
        });
        map.current.addLayer({
                'id': 'toilets-layer',
                'type': 'symbol',
                'source': 'toilets',
                'layout': {
                    'icon-image': 'cat',
                }
        });
        setToilets(true);
    } else {
        map.current.removeLayer('toilets-layer');
        map.current.removeSource('toilets');
        setToilets(false);
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
      <TreeView
          aria-label="file system navigator"
          defaultCollapseIcon={<ExpandMoreIcon />}
          defaultExpandIcon={<ChevronRightIcon />}
          sx={{ height: 300, flexGrow: 1, maxWidth: 400, overflowY: 'auto' }}
        >
          <TreeItem nodeId="catHealth" label="Health">
            <TreeItem icon={<LocalHospitalIcon />} nodeId="itemEDWaitTimes" label="Emergency Department Wait Times" onClick={toggleEDWaitTimes} />
          </TreeItem>
          <TreeItem nodeId="catAmenities" label="Amenities">
            <TreeItem icon={<WcIcon />} nodeId="itemPublicToilets" label="Public Toilets" onClick={togglePublicToilets} />
          </TreeItem>
      </TreeView>
      </div>
      <div ref={mapContainer} className="map-container" />
    </div>
  );
}
