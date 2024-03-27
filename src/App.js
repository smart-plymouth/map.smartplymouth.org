import React, { useRef, useEffect, useState } from 'react';
import mapboxgl from '!mapbox-gl'; // eslint-disable-line import/no-webpack-loader-syntax

import { TreeView } from '@mui/x-tree-view/TreeView'
import { TreeItem } from '@mui/x-tree-view/TreeItem'

// Icons
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import PedalBikeIcon from '@mui/icons-material/PedalBike';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import WcIcon from '@mui/icons-material/Wc';

mapboxgl.accessToken = 'pk.eyJ1Ijoicm9icHV0dCIsImEiOiJjbGp2dTVpMHEwam1nM3VuMXN2dHk1aWsxIn0.AwfsC_Not91E4oxcYguXhA';

export default function App() {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const [traffic, setTraffic] = useState(false);
  const [toilets, setToilets] = useState(false);
  const [berylBikes, setBerylBikes] = useState(false);
  const [waitTimes, setWaitTimes] = useState(false);
  const [liveBus, setLiveBus] = useState(false);
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

  const toggleLiveBus = async () => {
    console.log("Live Bus Toggled");
    if (!liveBus) {
        let citybus_data = await fetch("https://buses.api.smartplymouth.org/proxy/vehicles").then(function(response) {
            return response.json();
        });

        map.current.loadImage(
            'https://map.smartplymouth.org/icons/red_bus.png',
        (error, image) => {
        if (error) throw error;
        // Add the image to the map style.
        map.current.addImage('bus-icon', image);
        });

        map.current.addSource('livebus-data', {
            type: 'geojson',
            data: citybus_data
        });

        map.current.addLayer({
                'id': 'livebus-layer',
                'type': 'symbol',
                'source': 'livebus-data',
                'layout': {
                    'icon-image': 'bus-icon',
                }
        });

        map.current.on('click', 'livebus-layer', async (e) => {
            // Copy coordinates array.
            const coordinates = e.features[0].geometry.coordinates.slice();
            const properties = e.features[0].properties;
            const meta = JSON.parse(e.features[0].properties.meta);

            // Ensure that if the map is zoomed out such that multiple
            // copies of the feature are visible, the popup appears
            // over the copy being pointed to.
            while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
                coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
            }

            new mapboxgl.Popup()
            .setLngLat(coordinates)
            .setHTML(
                "<strong>Route: </strong>" + properties.line + "<br />" +
                "<strong>Number Plate: </strong>" + meta.number_plate + "<br />" +
                "<strong>Operator: </strong>" + properties.operator + "<br />"
            )
            .addTo(map.current);
        });

        // Change the cursor to a pointer when the mouse is over the places layer.
            map.current.on('mouseenter', 'livebus-layer', () => {
            map.current.getCanvas().style.cursor = 'pointer';
        });

        // Change it back to a pointer when it leaves.
            map.current.on('mouseleave', 'livebus-layer', () => {
            map.current.getCanvas().style.cursor = '';
        });

        setLiveBus(true);
    } else {
        map.current.removeLayer('livebus-layer');
        map.current.removeSource('livebus-data');
        setLiveBus(false);
    }
  };

  const toggleBerylStations = async () => {
    console.log("Beryl Stations Toggled");
    if (!berylBikes) {
        let beryl_data = await fetch("https://gbfs.beryl.cc/v2_2/Plymouth/station_information.json").then(function(response) {
            return response.json();
        });
        let stations = beryl_data.data.stations;

        let beryl_geojson = {
            'type': 'FeatureCollection',
            'features': [
            ]
        }

        let beryl_features = stations.map((station) => {
                return {
                    'type': 'Feature',
                    'geometry': {
                        'type': 'Point',
                        'coordinates': [station.lon, station.lat]
                    },
                    'properties': {
                        'title': station.name,
                        'capacity': station.capacity,
                        'id': station.station_id
                    }
                }
            }
        );

        beryl_geojson.features = beryl_features;

        map.current.loadImage(
            'https://map.smartplymouth.org/icons/beryl_station.png',
        (error, image) => {
        if (error) throw error;
        // Add the image to the map style.
        map.current.addImage('beryl-icon', image);
        });

        map.current.addSource('beryl-stations', {
            type: 'geojson',
            data: beryl_geojson
        });

        map.current.addLayer({
                'id': 'beryl-layer',
                'type': 'symbol',
                'source': 'beryl-stations',
                'layout': {
                    'icon-image': 'beryl-icon',
                }
        });

        map.current.on('click', 'beryl-layer', async (e) => {
            // Copy coordinates array.
            const coordinates = e.features[0].geometry.coordinates.slice();
            const properties = e.features[0].properties;

            // Ensure that if the map is zoomed out such that multiple
            // copies of the feature are visible, the popup appears
            // over the copy being pointed to.
            while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
                coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
            }

            let station_status = await fetch("https://gbfs.beryl.cc/v2_2/Plymouth/station_status.json").then(function(response) {
                return response.json();
            });
            let selectedStation = null;
            for (let currentStation in station_status.data.stations) {
                if (properties.id === station_status.data.stations[currentStation].station_id) {
                    selectedStation = station_status.data.stations[currentStation]
                }
            }

            new mapboxgl.Popup()
            .setLngLat(coordinates)
            .setHTML(
                "<h3>" + properties.title + "</h3>" +
                "<strong>Available Bikes: </strong>" + selectedStation.num_bikes_available + "/" + properties.capacity + "<br/><br/>"
            )
            .addTo(map.current);
        });

        // Change the cursor to a pointer when the mouse is over the places layer.
            map.current.on('mouseenter', 'beryl-layer', () => {
            map.current.getCanvas().style.cursor = 'pointer';
        });

        // Change it back to a pointer when it leaves.
            map.current.on('mouseleave', 'beryl-layer', () => {
            map.current.getCanvas().style.cursor = '';
        });

        setBerylBikes(true);
    } else {
        map.current.removeLayer('beryl-layer');
        map.current.removeSource('beryl-stations');
        setBerylBikes(false);
    }
  };

  const toggleEDWaitTimes = async () => {
    console.log("Emergency Department Wait Times Toggled");
    if (!waitTimes) {
        let facilities = await fetch("https://emergency-department-wait-times.api.smartplymouth.org/facilities").then(function(response) {
            return response.json();
        });

        facilities = facilities.facilities;
        let ed_geojson = {
            'type': 'FeatureCollection',
            'features': [
            ]
        }

        let ed_features = facilities.map((facility) => {
                return {
                    'type': 'Feature',
                    'geometry': {
                        'type': 'Point',
                        'coordinates': [facility.latitude, facility.longitude]
                    },
                    'properties': {
                        'title': facility.name,
                        'address': facility.address,
                        'id': facility.id,
                        'type': facility.type,
                        'telephone': facility.telephone,
                        'nhs_trust': facility.nhs_trust
                    }
                }
            }
        );

        ed_geojson.features = ed_features;

        map.current.loadImage(
            'https://map.smartplymouth.org/icons/hospital_marker.png',
        (error, image) => {
        if (error) throw error;
        // Add the image to the map style.
        map.current.addImage('urgentcare-icon', image);
        });

        map.current.addSource('ed-facilities', {
            type: 'geojson',
            data: ed_geojson
        });

        map.current.addLayer({
                'id': 'ed-layer',
                'type': 'symbol',
                'source': 'ed-facilities',
                'layout': {
                    'icon-image': 'urgentcare-icon',
                }
        });

        map.current.on('click', 'ed-layer', async (e) => {
            // Copy coordinates array.
            const coordinates = e.features[0].geometry.coordinates.slice();
            const properties = e.features[0].properties;

            // Ensure that if the map is zoomed out such that multiple
            // copies of the feature are visible, the popup appears
            // over the copy being pointed to.
            while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
                coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
            }

            let data = await fetch("https://emergency-department-wait-times.api.smartplymouth.org/facilities/" + properties.id).then(function(response) {
                return response.json();
            });
            let facilityWaitTimes = data.data;
            let currentWaitTimes = facilityWaitTimes.pop();

            new mapboxgl.Popup()
            .setLngLat(coordinates)
            .setHTML(
                "<h3>" + properties.title + "</h3>" +
                "<strong>Address: </strong>" + properties.address + "<br/>" +
                "<strong>Telephone: </strong>" + properties.telephone + "<br/>" +
                "<strong>Type: </strong>" + properties.type + "<br/><br/>" +
                "<strong>Total Patients: </strong>" + currentWaitTimes.patients_in_department + "<br/>" +
                "<strong>Patients Waiting: </strong>" + currentWaitTimes.patients_waiting + "<br/>" +
                "<strong>Longest Wait: </strong>" + currentWaitTimes.longest_wait + " mins <br/><br/>" +
                "<strong>Last Updated: " + currentWaitTimes.dt + "</strong>" +
                "<br/><br/>" + 
                "<a href='https://dashboards.smartplymouth.org/urgent-care/history'>View History</a>"
            )
            .addTo(map.current);
        });

        // Change the cursor to a pointer when the mouse is over the places layer.
            map.current.on('mouseenter', 'ed-layer', () => {
            map.current.getCanvas().style.cursor = 'pointer';
        });

        // Change it back to a pointer when it leaves.
            map.current.on('mouseleave', 'ed-layer', () => {
            map.current.getCanvas().style.cursor = '';
        });

        setWaitTimes(true);
    } else {
        map.current.removeLayer('ed-layer');
        map.current.removeSource('ed-facilities');
        setWaitTimes(false);
    }
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
          <TreeItem nodeId="catTransport" itemId="catTransport" id="catTransport" label="Transport">
              {berylBikes ? (
                <TreeItem icon={<PedalBikeIcon />} itemId="itemBerylStations" id="itemBerylStations" nodeId="itemBerylStations" label="✅ Beryl Bike Stations" onClick={toggleBerylStations} />
              ) : (
                <TreeItem icon={<PedalBikeIcon />} itemId="itemBerylStations" id="itemBerylStations" nodeId="itemBerylStations" label="❌ Beryl Bike Stations" onClick={toggleBerylStations} />
              )}
              {liveBus ? (
                <TreeItem icon={<PedalBikeIcon />} itemId="itemLiveBuses" id="itemLiveBuses" nodeId="itemLiveBuses" label="✅ Citybus Live Feed" onClick={toggleLiveBus} />
              ) : (
                <TreeItem icon={<PedalBikeIcon />} itemId="itemLiveBuses" id="itemLiveBuses" nodeId="itemLiveBuses" label="❌ Citybus Live Feed" onClick={toggleLiveBus} />
              )}
          </TreeItem>
          <TreeItem nodeId="catHealth" id="catHealth" itemId="catHealth" label="Health">
            {waitTimes ? (
                <TreeItem icon={<LocalHospitalIcon />} itemId="itemEDWaitTimes" id="itemEDWaitTimes" nodeId="itemEDWaitTimes" label="✅ Urgent Care Wait Times" onClick={toggleEDWaitTimes} />
            ) : (
                <TreeItem icon={<LocalHospitalIcon />} itemId="itemEDWaitTimes" id="itemEDWaitTimes" nodeId="itemEDWaitTimes" label="❌ Urgent Care Wait Times" onClick={toggleEDWaitTimes} />
            )}
          </TreeItem>
          <TreeItem nodeId="catAmenities" itemId="catAmenities" id="catAmenities" label="Amenities">
            {toilets ? (
                <TreeItem icon={<WcIcon />} itemId="itemPublicToilets" id="itemPublicToilets" nodeId="itemPublicToilets" label="✅ Public Toilets" onClick={togglePublicToilets} />
            ) : (
                <TreeItem icon={<WcIcon />} itemId="itemPublicToilets" id="itemPublicToilets" nodeId="itemPublicToilets" label="❌ Public Toilets" onClick={togglePublicToilets} />
            )}
          </TreeItem>
      </TreeView>
      </div>
      <div ref={mapContainer} className="map-container" />
    </div>
  );
}
