import React from "react"
import { WORLD_MAP_PATH_DATA } from "./worldMapData"
import "./neon-map.css"

export function NeonWorldMapBackground() {
  return (
    <div aria-hidden="true" className="neon-world-map-wrapper">
      <svg
        className="neon-world-map-svg"
        fill="none"
        preserveAspectRatio="xMidYMid slice"
        viewBox="0 0 950 620"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Intense Neon Cyan Glow for the passing wave */}
          <filter id="neonGlowCyan" height="200%" width="200%" x="-50%" y="-50%">
            <feGaussianBlur in="SourceGraphic" result="blur1" stdDeviation="2.5" />
            <feGaussianBlur in="SourceGraphic" result="blur2" stdDeviation="6" />
            <feMerge>
              <feMergeNode in="blur2" />
              <feMergeNode in="blur1" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Vertical Glow Wave Gradient (seamlessly feathered top and bottom) */}
          <linearGradient id="verticalWaveGrad" x1="0%" x2="0%" y1="0%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0" />
            <stop offset="25%" stopColor="#ffffff" stopOpacity="0.3" />
            <stop offset="50%" stopColor="#ffffff" stopOpacity="1" />
            <stop offset="75%" stopColor="#ffffff" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>

          {/* Top-to-Bottom Moving Glow Mask */}
          <mask
            id="verticalGlowMask"
            maskUnits="userSpaceOnUse"
            x="0"
            y="0"
            width="950"
            height="620"
          >
            <rect
              className="vertical-glow-wave"
              fill="url(#verticalWaveGrad)"
              height="340"
              width="950"
              x="0"
              y="-340"
            />
          </mask>

          {/* Graticule Line Pattern */}
          <linearGradient id="graticuleGrad" x1="0%" x2="100%" y1="0%" y2="0%">
            <stop offset="0%" stopColor="rgba(67, 220, 255, 0.02)" />
            <stop offset="50%" stopColor="rgba(67, 220, 255, 0.12)" />
            <stop offset="100%" stopColor="rgba(67, 220, 255, 0.02)" />
          </linearGradient>
        </defs>

        {/* 1. Subtle, Minimalist Graticule Lines (Clean latitude/longitude) */}
        <g className="map-graticules" stroke="url(#graticuleGrad)">
          <line strokeDasharray="4 6" strokeWidth="0.7" x1="60" x2="890" y1="110" />
          <line strokeDasharray="4 6" strokeWidth="0.7" x1="60" x2="890" y1="210" />
          <line stroke="rgba(67, 220, 255, 0.22)" strokeDasharray="6 4" strokeWidth="0.9" x1="50" x2="900" y1="310" />
          <line strokeDasharray="4 6" strokeWidth="0.7" x1="60" x2="890" y1="410" />
          <line strokeDasharray="4 6" strokeWidth="0.7" x1="60" x2="890" y1="510" />

          <line strokeDasharray="4 6" strokeWidth="0.7" x1="160" x2="160" y1="80" y2="540" />
          <line strokeDasharray="4 6" strokeWidth="0.7" x1="310" x2="310" y1="80" y2="540" />
          <line stroke="rgba(67, 220, 255, 0.22)" strokeDasharray="6 4" strokeWidth="0.9" x1="465" x2="465" y1="70" y2="550" />
          <line strokeDasharray="4 6" strokeWidth="0.7" x1="630" x2="630" y1="80" y2="540" />
          <line strokeDasharray="4 6" strokeWidth="0.7" x1="790" x2="790" y1="80" y2="540" />
        </g>

        {/* 2. Base Landmass: Clean, Steady, Resting Neon Blue Outline (Empty Inside) */}
        <path
          className="neon-landmass-base"
          d={WORLD_MAP_PATH_DATA}
          fill="none"
          stroke="rgba(67, 220, 255, 0.28)"
          strokeWidth="1.2"
        />

        {/* 3. Luminous Top-to-Bottom Neon Blue Glow Wave (Borders Only) */}
        <path
          className="neon-landmass-glow-wave"
          d={WORLD_MAP_PATH_DATA}
          fill="none"
          filter="url(#neonGlowCyan)"
          mask="url(#verticalGlowMask)"
          stroke="#43dcff"
          strokeWidth="1.8"
        />
      </svg>
    </div>
  )
}

export default NeonWorldMapBackground
