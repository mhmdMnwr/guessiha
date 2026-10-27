import { Injectable } from '@nestjs/common';

@Injectable()
export class StreetviewTemplateService {
  renderUplinkHtml(payload: string, key: string): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>geussiha</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body {
      width: 100%;
      height: 100%;
      overflow: hidden;
      background: #020617;
      touch-action: pan-x pan-y pinch-zoom;
      overscroll-behavior: none;
      user-select: none;
      -webkit-user-select: none;
    }
    #sv-mount {
      width: 100%;
      height: 100%;
      position: absolute;
      inset: 0;
      overflow: hidden;
      touch-action: pan-x pan-y pinch-zoom;
    }
    iframe {
      width: 100%;
      height: 100%;
      border: 0;
      display: block;
      touch-action: pan-x pan-y pinch-zoom;
    }
    
    /* Anti-Spoiler Top-Left Shield: 100% blocks Google place name, address, and 'View on Google Maps' / 'View larger map' link */
    .sv-shield-top-left {
      position: absolute;
      top: 0;
      left: 0;
      width: 400px;
      max-width: 88vw;
      height: 95px;
      background: #070b0d;
      border-bottom-right-radius: 12px;
      border-bottom: 2px solid #1e293b;
      border-right: 2px solid #1e293b;
      z-index: 999999;
      pointer-events: auto;
      display: flex;
      flex-direction: column;
      justify-content: center;
      padding: 0 20px;
      gap: 6px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.85);
    }
    .sv-shield-brand { display: flex; align-items: center; gap: 8px; }
    .sv-shield-title {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace, sans-serif;
      font-size: 13px;
      font-weight: 800;
      letter-spacing: 1.5px;
      color: #38bdf8;
      text-transform: uppercase;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .sv-shield-dot {
      width: 8px;
      height: 8px;
      background: #10b981;
      border-radius: 50%;
      box-shadow: 0 0 10px #10b981;
      animation: sv-pulse 1.8s infinite alternate;
    }
    @keyframes sv-pulse { from { opacity: 0.4; } to { opacity: 1; } }
    .sv-shield-sub {
      font-family: monospace;
      font-size: 11px;
      color: #94a3b8;
      letter-spacing: 0.6px;
    }

    /* Anti-Spoiler Top-Right Shield: Blocks Google expand/fullscreen button */
    .sv-shield-top-right {
      position: absolute;
      top: 0;
      right: 0;
      width: 68px;
      height: 68px;
      background: #070b0d;
      border-bottom-left-radius: 12px;
      border-bottom: 2px solid #1e293b;
      border-left: 2px solid #1e293b;
      z-index: 999999;
      pointer-events: auto;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.85);
    }

    /* Compact Bottom Shields */
    .sv-shield-bottom-left {
      position: absolute;
      bottom: 0;
      left: 0;
      width: 100px;
      height: 32px;
      background: #070b0d;
      border-top-right-radius: 8px;
      border-top: 1px solid #1e293b;
      border-right: 1px solid #1e293b;
      z-index: 999999;
      pointer-events: auto;
    }

    .sv-shield-bottom-right {
      position: absolute;
      bottom: 0;
      right: 0;
      width: 160px;
      height: 30px;
      background: #070b0d;
      border-top-left-radius: 8px;
      border-top: 1px solid #1e293b;
      border-left: 1px solid #1e293b;
      z-index: 999999;
      pointer-events: auto;
    }
  </style>
</head>
<body>
  <div id="sv-mount">
    <div class="sv-shield-top-left">
      <div class="sv-shield-brand">
        <span class="sv-shield-dot"></span>
        <div class="sv-shield-title">Street View Uplink</div>
      </div>
      <div class="sv-shield-sub">
        SIGNAL ENCRYPTED // COORDINATES CLASSIFIED
      </div>
    </div>
    <div class="sv-shield-top-right"></div>
    <div class="sv-shield-bottom-left"></div>
    <div class="sv-shield-bottom-right"></div>
  </div>
  <script>
    (function() {
      document.addEventListener('contextmenu', function(e) { e.preventDefault(); }, true);
      document.addEventListener('keydown', function(e) {
        if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C')) || (e.ctrlKey && e.key === 'u')) {
          e.preventDefault();
          e.stopPropagation();
        }
      }, true);

      try {
        const _p = "${payload}";
        const _k = "${key}";
        const _raw = atob(_p);
        let _url = "";
        for (let i = 0; i < _raw.length; i++) {
          _url += String.fromCharCode(_raw.charCodeAt(i) ^ _k.charCodeAt(i % _k.length));
        }

        const _f = document.createElement('iframe');
        _f.src = _url;
        _f.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture";
        _f.allowFullscreen = false;
        _f.setAttribute('referrerpolicy', 'no-referrer');
        _f.style.width = "100%";
        _f.style.height = "100%";
        _f.style.border = "none";
        document.getElementById('sv-mount').appendChild(_f);
      } catch(e) {
        console.error("Uplink mount error", e);
      }
    })();
  </script>
</body>
</html>`;
  }
}
