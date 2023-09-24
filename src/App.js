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

  const toggleEDWaitTimes = async () => {
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
                        'title': toilet.name,
                        'opening_hours': toilet.opening_hours,
                        'fee': toilet.fee,
                        'id': toilet.id,
                        'attributes': toilet.attributes,
                        'address': toilet.address
                    }
                }
            }
        );
        toilet_geojson.features = toilet_features;

        map.current.loadImage(
            'https://map.smartplymouth.org/icons/toilet_marker.png',
        (error, image) => {
        if (error) throw error;

        // Add the image to the map style.
        map.current.addImage('toilet-icon', image);
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
                    'icon-image': 'toilet-icon',
                }
        });

        map.current.on('click', 'toilets-layer', (e) => {
            // Copy coordinates array.
            const coordinates = e.features[0].geometry.coordinates.slice();
            const properties = e.features[0].properties;

            // Ensure that if the map is zoomed out such that multiple
            // copies of the feature are visible, the popup appears
            // over the copy being pointed to.
            while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
                coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
            }

            let attributes = JSON.parse(properties.attributes);
            let html_attributes = attributes.map((attribute) => {
                return "<img src='https://map.smartplymouth.org/icons/" + attribute + ".png' alt='" + attribute + "' title='" + attribute + "' width='40px' />";
            })
            html_attributes = html_attributes.join('')

            let opening_hours = JSON.parse(properties.opening_hours);

            new mapboxgl.Popup()
            .setLngLat(coordinates)
            .setHTML("<h3>" + properties.title + "</h3>" +
                     "<strong>Address: </strong>" + properties.address + "<br />" +
                     "<strong>Fee: </strong>" + properties.fee + "<br />" +
                     "<strong>Attributes: </strong>" + html_attributes + "<br />" +
                     "<strong>Opening Times: </strong> <br />" +
                     "<table>" +
                     "<tr><td><strong>Sunday</strong></td><td>" + opening_hours.sun.open + "-" + opening_hours.sun.close + "</td></tr>" +
                     "<tr><td><strong>Monday</strong></td><td>" + opening_hours.mon.open + "-" + opening_hours.mon.close + "</td></tr>" +
                     "<tr><td><strong>Tuesday</strong></td><td>" + opening_hours.tue.open + "-" + opening_hours.tue.close + "</td></tr>" +
                     "<tr><td><strong>Wednesday</strong></td><td>" + opening_hours.wed.open + "-" + opening_hours.wed.close + "</td></tr>" +
                     "<tr><td><strong>Thursday</strong></td><td>" + opening_hours.thu.open + "-" + opening_hours.thu.close + "</td></tr>" +
                     "<tr><td><strong>Friday</strong></td><td>" + opening_hours.fri.open + "-" + opening_hours.fri.close + "</td></tr>" +
                     "<tr><td><strong>Saturday</strong></td><td>" + opening_hours.sat.open + "-" + opening_hours.sat.close + "</td></tr>" +
                     "</table>"
            )
            .addTo(map.current);
        });

        // Change the cursor to a pointer when the mouse is over the places layer.
            map.current.on('mouseenter', 'toilets-layer', () => {
            map.current.getCanvas().style.cursor = 'pointer';
        });

        // Change it back to a pointer when it leaves.
            map.current.on('mouseleave', 'toilets-layer', () => {
            map.current.getCanvas().style.cursor = '';
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
