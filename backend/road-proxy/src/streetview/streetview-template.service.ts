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
    
    /* Sleek, Non-Obstructive Anti-Spoiler Badge (covers only Google title text without blocking road clicks) */
    .sv-shield-top-left {
      position: absolute;
      top: 0;
      left: 0;
      width: 220px;
      max-width: 60vw;
      height: 36px;
      background: #090e10;
      border-bottom-right-radius: 8px;
      border-bottom: 1px solid #1e293b;
      border-right: 1px solid #1e293b;
      z-index: 999999;
      pointer-events: auto;
      display: flex;
      align-items: center;
      padding: 0 12px;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.7);
    }
    .sv-shield-brand { display: flex; align-items: center; gap: 8px; }
    .sv-shield-title {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace, sans-serif;
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 1.2px;
      color: #38bdf8;
      text-transform: uppercase;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .sv-shield-dot {
      width: 6px;
      height: 6px;
      background: #10b981;
      border-radius: 50%;
      box-shadow: 0 0 8px #10b981;
      animation: sv-pulse 1.8s infinite alternate;
    }
    @keyframes sv-pulse { from { opacity: 0.4; } to { opacity: 1; } }

    /* Compact Bottom Shields */
    .sv-shield-bottom-left {
      position: absolute;
      bottom: 0;
      left: 0;
      width: 85px;
      height: 26px;
      background: #090e10;
      border-top-right-radius: 6px;
      border-top: 1px solid #1e293b;
      border-right: 1px solid #1e293b;
      z-index: 999999;
      pointer-events: none;
    }

    .sv-shield-bottom-right {
      position: absolute;
      bottom: 0;
      right: 0;
      width: 140px;
      height: 24px;
      background: #090e10;
      border-top-left-radius: 6px;
      border-top: 1px solid #1e293b;
      border-left: 1px solid #1e293b;
      z-index: 999999;
      pointer-events: none;
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
    </div>
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
        _f.allowFullscreen = true;
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
