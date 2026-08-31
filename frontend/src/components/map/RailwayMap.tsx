import React, { useEffect, useRef, useState } from 'react';
import { Station, RailwayLine, CrowdStatus } from '../../types';
import { MOCK_STATIONS } from '../../data/mockData';
import { Layers, ZoomIn, ZoomOut, RotateCcw, AlertTriangle, Sparkles, Navigation, Info } from 'lucide-react';
import { cn } from '../../lib/utils';

// Import Leaflet safely for Next.js / client-side rendering
import L from 'leaflet';

interface RailwayMapProps {
  selectedStationId?: string;
  onSelectStation?: (station: Station) => void;
  height?: string;
  showControls?: boolean;
  viewMode?: 'CURRENT' | 'FORECAST';
  lineFilter?: 'ALL' | 'WESTERN' | 'CENTRAL' | 'HARBOUR' | 'CRITICAL';
  searchQuery?: string;
  className?: string;
}

export const RailwayMap: React.FC<RailwayMapProps> = ({
  selectedStationId = 'dadar',
  onSelectStation,
  height = '640px',
  showControls = true,
  viewMode = 'CURRENT',
  lineFilter = 'ALL',
  searchQuery = '',
  className
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const linesLayerRef = useRef<L.LayerGroup | null>(null);
  const [mapReady, setMapReady] = useState(false);

  // Initialize Map safely on mount
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    // Default center on Dadar Junction (Mumbai transport geographic heart)
    const map = L.map(mapContainerRef.current, {
      center: [19.0300, 72.8800],
      zoom: 11,
      minZoom: 10,
      maxZoom: 17,
      zoomControl: false,
      attributionControl: false
    });

    // High quality light basemap tiles
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      subdomains: 'abcd',
      attribution: '&copy; OpenStreetMap contributors &copy; CARTO'
    }).addTo(map);

    const linesGroup = L.layerGroup().addTo(map);
    const markersGroup = L.layerGroup().addTo(map);

    linesLayerRef.current = linesGroup;
    markersLayerRef.current = markersGroup;
    mapInstanceRef.current = map;
    setMapReady(true);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Draw Mumbai Railway Line Polylines (Western, Central, Harbour)
  useEffect(() => {
    if (!mapReady || !linesLayerRef.current) return;
    linesLayerRef.current.clearLayers();

    // 1. Western Line (Churchgate to Borivali)
    const westernOrderedIds = [
      'churchgate', 'marine-lines', 'charni-road', 'grant-road', 'mumbai-central',
      'mahalaxmi', 'lower-parel', 'prabhadevi', 'dadar', 'matunga-road', 'mahim',
      'bandra', 'khar-road', 'santacruz', 'vile-parle', 'andheri', 'jogeshwari',
      'ram-mandir', 'goregaon', 'malad', 'kandivali', 'borivali'
    ];
    const westernStations = westernOrderedIds
      .map(id => MOCK_STATIONS.find(s => s.id === id))
      .filter((s): s is Station => s !== undefined);
    const westernCoords: [number, number][] = westernStations.map(s => [s.latitude, s.longitude]);

    // 2. Central Line (CSMT to Kalyan via Dadar, Kurla, Thane)
    const centralOrderedIds = [
      'csmt', 'masjid', 'sandhurst-road', 'byculla', 'chinchpokli', 'currey-road',
      'parel', 'dadar', 'matunga', 'sion', 'kurla', 'vidyavihar', 'ghatkopar',
      'vikhroli', 'kanjurmarg', 'bhandup', 'nahur', 'mulund', 'thane', 'kalwa',
      'mumbra', 'diva', 'kopar', 'dombivli', 'thakurli', 'kalyan'
    ];
    const centralStations = centralOrderedIds
      .map(id => MOCK_STATIONS.find(s => s.id === id))
      .filter((s): s is Station => s !== undefined);
    const centralCoords: [number, number][] = centralStations.map(s => [s.latitude, s.longitude]);

    // 3. Harbour Main Line (CSMT -> Wadala Road -> Kurla -> Chembur -> Vashi -> Nerul -> Belapur -> Panvel)
    const harbourOrderedIds = [
      'csmt', 'masjid', 'sandhurst-road', 'wadala-road', 'gtb-nagar', 'chunabhatti',
      'kurla', 'tilak-nagar', 'chembur', 'govandi', 'mankhurd', 'vashi', 'sanpada',
      'juinagar', 'nerul', 'seawoods-darave', 'cbd-belapur', 'kharghar', 'mansarovar',
      'khandeshwar', 'panvel'
    ];
    const harbourStations = harbourOrderedIds
      .map(id => MOCK_STATIONS.find(s => s.id === id))
      .filter((s): s is Station => s !== undefined);
    const harbourCoords: [number, number][] = harbourStations.map(s => [s.latitude, s.longitude]);

    // Draw Western Line (Teal)
    if (lineFilter === 'ALL' || lineFilter === 'WESTERN' || lineFilter === 'CRITICAL') {
      // Glow underlay
      L.polyline(westernCoords, {
        color: '#008080',
        weight: 6,
        opacity: 0.85,
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(linesLayerRef.current);
    }

    // Draw Central Line (Coral / Rose Red)
    if (lineFilter === 'ALL' || lineFilter === 'CENTRAL' || lineFilter === 'CRITICAL') {
      L.polyline(centralCoords, {
        color: '#E11D48',
        weight: 6,
        opacity: 0.85,
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(linesLayerRef.current);
    }

    // Draw Harbour Line (Royal Blue)
    if (lineFilter === 'ALL' || lineFilter === 'HARBOUR' || lineFilter === 'CRITICAL') {
      L.polyline(harbourCoords, {
        color: '#2563EB',
        weight: 6,
        opacity: 0.85,
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(linesLayerRef.current);
    }

    // Harbour Branch connection from Wadala Road to Mahim/Bandra (Harbour Western Link)
    if (lineFilter === 'ALL' || lineFilter === 'HARBOUR' || lineFilter === 'WESTERN') {
      const wadala = MOCK_STATIONS.find(s => s.id === 'wadala-road');
      const mahim = MOCK_STATIONS.find(s => s.id === 'mahim');
      const bandra = MOCK_STATIONS.find(s => s.id === 'bandra');
      if (wadala && mahim && bandra) {
        L.polyline([
          [wadala.latitude, wadala.longitude],
          [mahim.latitude, mahim.longitude],
          [bandra.latitude, bandra.longitude]
        ], {
          color: '#2563EB',
          weight: 4,
          opacity: 0.7,
          dashArray: '6, 6'
        }).addTo(linesLayerRef.current);
      }
    }
  }, [mapReady, lineFilter]);

  // Render Station Density Markers
  useEffect(() => {
    if (!mapReady || !markersLayerRef.current || !mapInstanceRef.current) return;
    markersLayerRef.current.clearLayers();

    const filteredStations = MOCK_STATIONS.filter((station) => {
      // Search matching
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const match =
          station.name.toLowerCase().includes(q) ||
          (station.marathiName && station.marathiName.includes(q)) ||
          station.line.toLowerCase().includes(q);
        if (!match) return false;
      }

      // Line matching
      if (lineFilter === 'WESTERN') {
        return station.lines.includes('WESTERN') || station.line === 'WESTERN';
      }
      if (lineFilter === 'CENTRAL') {
        return station.lines.includes('CENTRAL') || station.line === 'CENTRAL';
      }
      if (lineFilter === 'HARBOUR') {
        return station.lines.includes('HARBOUR') || station.line === 'HARBOUR';
      }
      if (lineFilter === 'CRITICAL') {
        const effectiveOccupancy = viewMode === 'FORECAST' ? station.predictedOccupancy : station.currentOccupancy;
        return effectiveOccupancy >= 70;
      }
      return true;
    });

    filteredStations.forEach((station) => {
      const isSelected = station.id === selectedStationId;
      const isKeyStation = ['dadar', 'csmt', 'kurla', 'andheri', 'thane', 'borivali', 'bandra', 'panvel', 'wadala-road', 'vashi'].includes(station.id);

      // Determine effective occupancy & status based on active viewMode
      const displayOccupancy = viewMode === 'FORECAST' ? station.predictedOccupancy : station.currentOccupancy;
      
      let effectiveStatus: CrowdStatus = 'LOW';
      if (displayOccupancy >= 85) effectiveStatus = 'CRITICAL';
      else if (displayOccupancy >= 70) effectiveStatus = 'HIGH';
      else if (displayOccupancy >= 50) effectiveStatus = 'MEDIUM';
      else effectiveStatus = 'LOW';

      // 4-Tier color coding requirement:
      // Green = Low Crowd (<50%)
      // Yellow = Medium Traffic (50-70%)
      // Orange = High Crowd (70-85%)
      // Red = Peak Congestion (>85%)
      const crowdColorMap: Record<CrowdStatus, { color: string; label: string }> = {
        LOW: { color: '#10B981', label: 'Low Crowd' },        // Green
        MEDIUM: { color: '#F59E0B', label: 'Medium Traffic' },  // Yellow/Amber
        HIGH: { color: '#F97316', label: 'High Crowd' },        // Orange
        CRITICAL: { color: '#EF4444', label: 'Peak Congestion' } // Red
      };

      const crowdInfo = crowdColorMap[effectiveStatus];
      const crowdColor = crowdInfo.color;

      // Line color for core
      let lineCoreColor = '#008080'; // Western Teal
      if (station.isInterchange) {
        lineCoreColor = '#1A1A1A'; // Interchange dark
      } else if (station.line === 'CENTRAL' || station.lines.includes('CENTRAL')) {
        lineCoreColor = '#E11D48'; // Central Rose
      } else if (station.line === 'HARBOUR' || station.lines.includes('HARBOUR')) {
        lineCoreColor = '#2563EB'; // Harbour Blue
      }

      const markerSize = isSelected || isKeyStation ? 26 : 18;
      const isSurging = effectiveStatus === 'CRITICAL' || (viewMode === 'FORECAST' && station.predictedOccupancy >= 85);

      // Custom HTML Marker Pin
      const customIcon = L.divIcon({
        className: 'railflow-station-marker',
        html: `
          <div style="
            position: relative;
            width: ${markerSize}px;
            height: ${markerSize}px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
          ">
            <!-- Pulsing surge ring for critical or selected -->
            ${
              isSurging || isSelected
                ? `<div style="
                    position: absolute;
                    inset: -5px;
                    border-radius: 9999px;
                    background-color: ${crowdColor};
                    opacity: 0.45;
                    animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;
                  "></div>`
                : ''
            }
            
            <!-- Outer circle colored by crowd occupancy -->
            <div style="
              position: absolute;
              inset: 0;
              border-radius: 9999px;
              border: 3px solid ${crowdColor};
              background-color: #FFFFFF;
              box-shadow: 0 2px 6px rgba(0,0,0,0.22);
              transition: transform 0.2s;
            "></div>

            <!-- Inner core colored by Railway Line -->
            <div style="
              width: ${markerSize > 20 ? '10px' : '7px'};
              height: ${markerSize > 20 ? '10px' : '7px'};
              border-radius: 9999px;
              background-color: ${lineCoreColor};
              z-index: 2;
            "></div>

            <!-- Major Station Permanent Name Badge -->
            ${
              isKeyStation || isSelected
                ? `<div style="
                    position: absolute;
                    top: 100%;
                    left: 50%;
                    transform: translateX(-50%);
                    margin-top: 3px;
                    background-color: #1A1A1A;
                    color: #FFFFFF;
                    font-size: 10px;
                    font-weight: 800;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    padding: 2px 6px;
                    border-radius: 5px;
                    white-space: nowrap;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.25);
                    z-index: 10;
                    pointer-events: none;
                    display: flex;
                    align-items: center;
                    gap: 3px;
                  ">
                    <span>${station.name}</span>
                    <span style="color: ${crowdColor}; font-size: 9px;">${displayOccupancy}%</span>
                  </div>`
                : ''
            }
          </div>
        `,
        iconSize: [markerSize, markerSize],
        iconAnchor: [markerSize / 2, markerSize / 2]
      });

      const marker = L.marker([station.latitude, station.longitude], { icon: customIcon });

      const occupancyShift = station.predictedOccupancy - station.currentOccupancy;
      const shiftText = occupancyShift > 0 ? `+${occupancyShift}% ▲` : `${occupancyShift}% ▼`;
      const shiftColor = occupancyShift > 0 ? '#F97316' : '#008080';

      // Rich Interactive Station Info Popup
      const popupHtml = `
        <div style="padding: 12px 14px; min-width: 240px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
          <!-- Header with station name & lines -->
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6px;">
            <div>
              <h4 style="font-size: 14px; font-weight: 800; color: #1A1A1A; margin: 0; line-height: 1.2;">
                ${station.name}
              </h4>
              <p style="font-size: 11px; color: #6B7280; margin: 2px 0 0 0;">
                ${station.marathiName || ''}
              </p>
            </div>
            <span style="
              font-size: 9px;
              font-weight: 800;
              text-transform: uppercase;
              padding: 2px 6px;
              border-radius: 4px;
              background-color: #F3F4F1;
              color: #1A1A1A;
              border: 1px solid #E5E5E0;
            ">
              ${station.isInterchange ? 'Interchange' : station.line}
            </span>
          </div>

          <!-- Occupancy & 15m Forecast Box -->
          <div style="background-color: #F9F9F7; border: 1px solid #E5E5E0; border-radius: 10px; padding: 8px 10px; margin: 8px 0;">
            <div style="display: flex; justify-content: space-between; align-items: center; font-size: 11px; margin-bottom: 5px;">
              <span style="color: #6B7280;">Live Occupancy:</span>
              <strong style="color: ${station.currentOccupancy >= 85 ? '#EF4444' : station.currentOccupancy >= 70 ? '#F97316' : '#10B981'}; font-weight: 800; font-family: monospace; font-size: 12px;">
                ${station.currentOccupancy}% (${station.crowdStatus})
              </strong>
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center; font-size: 11px; margin-bottom: 5px;">
              <span style="color: #6B7280;">15-Min Forecast:</span>
              <div style="display: flex; align-items: center; gap: 4px;">
                <strong style="color: #1A1A1A; font-weight: 800; font-family: monospace; font-size: 12px;">
                  ${station.predictedOccupancy}%
                </strong>
                <span style="font-size: 9px; font-weight: 700; color: ${shiftColor}; font-family: monospace;">
                  (${shiftText})
                </span>
              </div>
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center; font-size: 11px; padding-top: 4px; border-top: 1px dashed #E5E5E0;">
              <span style="color: #6B7280;">Next Train:</span>
              <strong style="color: #1A1A1A; font-size: 11px;">
                ${station.nextTrain} • PF ${station.platform}
              </strong>
            </div>
            <div style="font-size: 10px; color: #6B7280; margin-top: 2px;">
              Destination: <strong style="color: #1A1A1A;">${station.destination}</strong>
            </div>
          </div>

          <!-- Select Action Button -->
          <button
            id="map-popup-select-${station.id}"
            style="
              width: 100%;
              background-color: #008080;
              color: #FFFFFF;
              font-size: 11px;
              font-weight: 700;
              padding: 7px 10px;
              border-radius: 8px;
              border: none;
              cursor: pointer;
              transition: background 0.15s;
            "
          >
            Inspect Platform Telemetry →
          </button>
        </div>
      `;

      marker.bindPopup(popupHtml, { closeButton: false, minWidth: 240 });

      marker.on('popupopen', () => {
        const btn = document.getElementById(`map-popup-select-${station.id}`);
        if (btn) {
          btn.onclick = () => {
            onSelectStation?.(station);
            mapInstanceRef.current?.closePopup();
          };
        }
      });

      marker.on('click', () => {
        onSelectStation?.(station);
      });

      marker.addTo(markersLayerRef.current!);
    });
  }, [mapReady, lineFilter, viewMode, searchQuery, selectedStationId, onSelectStation]);

  // Center on selected station if user selects one
  useEffect(() => {
    if (!mapInstanceRef.current || !selectedStationId) return;
    const target = MOCK_STATIONS.find((s) => s.id === selectedStationId);
    if (target) {
      mapInstanceRef.current.setView([target.latitude, target.longitude], 13, {
        animate: true
      });
    }
  }, [selectedStationId]);

  const handleResetView = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([19.0300, 72.8800], 11, { animate: true });
    }
  };

  return (
    <div className={cn('relative rounded-2xl overflow-hidden border border-[#E5E5E0] bg-[#F9F9F7] shadow-sm', className)}>
      {/* Floating Mode Indicator Top Right */}
      <div className="absolute top-3.5 right-3.5 z-30 flex items-center gap-2">
        <div className={cn(
          'flex items-center gap-1.5 px-3 py-1.5 rounded-xl border shadow-sm text-xs font-bold font-mono transition-all',
          viewMode === 'FORECAST'
            ? 'bg-[#F97316] text-white border-[#F97316]'
            : 'bg-white text-[#008080] border-[#E5E5E0]'
        )}>
          <Sparkles className="w-3.5 h-3.5" />
          <span>{viewMode === 'FORECAST' ? '15-Min Surge Mode' : 'Live Occupancy'}</span>
        </div>
      </div>

      {/* Floating Map Navigation Tools Bottom Right */}
      <div className="absolute bottom-4 right-4 z-30 flex flex-col gap-1.5">
        <button
          onClick={() => mapInstanceRef.current?.zoomIn()}
          className="w-8 h-8 rounded-xl bg-white border border-[#E5E5E0] text-[#1A1A1A] hover:bg-[#F3F4F1] flex items-center justify-center shadow-sm transition-all"
          title="Zoom In"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={() => mapInstanceRef.current?.zoomOut()}
          className="w-8 h-8 rounded-xl bg-white border border-[#E5E5E0] text-[#1A1A1A] hover:bg-[#F3F4F1] flex items-center justify-center shadow-sm transition-all"
          title="Zoom Out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          onClick={handleResetView}
          className="w-8 h-8 rounded-xl bg-white border border-[#E5E5E0] text-[#1A1A1A] hover:bg-[#F3F4F1] flex items-center justify-center shadow-sm transition-all"
          title="Reset Mumbai Overview"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Interactive Map Canvas */}
      <div
        ref={mapContainerRef}
        id="railflow-network-map-canvas"
        style={{ height, width: '100%' }}
        className="z-10"
      />
    </div>
  );
};
