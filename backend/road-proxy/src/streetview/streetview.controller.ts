import { Controller, Get, Query, Res, Logger } from '@nestjs/common';
import { Response } from 'express';
import * as https from 'https';
import { StreetviewCipherService } from './streetview-cipher.service';
import { StreetviewTemplateService } from './streetview-template.service';
import { RedisService } from '../redis/redis.service';

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || '';

// Guaranteed verified Algerian road and highway 360° panoramas
const GUARANTEED_ALGERIA_PANOS: Array<{ lat: number; lng: number }> = [
  { lat: 36.768293, lng: 3.053982 }, // Algiers - Rue Didouche Mourad
  { lat: 36.773102, lng: 3.061167 }, // Algiers - Boulevard Colonel Amirouche
  { lat: 36.662320, lng: 3.094719 }, // Algiers - Route Nationale 1 (Baraki)
  { lat: 36.714159, lng: 3.138192 }, // Algiers - Rocade Sud (El Harrach Interchange)
  { lat: 36.764595, lng: 3.029768 }, // Algiers - Boulevard Bougara (El Biar)
  { lat: 36.713435, lng: 2.836479 }, // Algiers - Corniche de Zéralda
  { lat: 36.751310, lng: 3.016823 }, // Algiers - Val d'Hydra / Ben Aknoun
  { lat: 35.703992, lng: -0.648909 }, // Oran - Front de Mer, Boulevard de l'ALN
  { lat: 35.701496, lng: -0.640620 }, // Oran - Boulevard de la Soummam
  { lat: 35.738740, lng: -0.701079 }, // Oran - Route de la Corniche (Mers El Kébir)
  { lat: 35.719913, lng: -0.580803 }, // Oran - Boulevard Millenium (Bir El Djir)
  { lat: 35.822192, lng: -0.489705 }, // Oran - Route de Kristel
  { lat: 36.372052, lng: 6.611973 }, // Constantine - Boulevard de l'Abîme
  { lat: 36.372399, lng: 6.623417 }, // Constantine - Route Nationale 3 (Gorges)
  { lat: 36.487027, lng: 5.280168 }, // Béjaïa - Route Nationale 9 (Gorges de Kherrata)
  { lat: 36.607405, lng: 2.407850 }, // Tipaza - Corniche du Mont Chenoua
  { lat: 36.897244, lng: 7.770194 }, // Annaba - Avenue de l'ALN
  { lat: 36.153165, lng: 5.679943 }, // Sétif - Boulevard Commercial
  { lat: 35.278173, lng: 6.541061 }, // Batna - Route d'Arris
  { lat: 35.103163, lng: -1.857636 }, // Tlemcen - Corniche de Ghazaouet
];

@Controller('api/streetview')
export class StreetViewController {
  private readonly logger = new Logger(StreetViewController.name);

  constructor(
    private readonly cipherService: StreetviewCipherService,
    private readonly templateService: StreetviewTemplateService,
    private readonly redis: RedisService,
  ) {}

  @Get('uplink')
  async getUplink(
    @Query('roomId') roomId: string,
    @Query('token') token: string,
    @Query('lat') latStr: string,
    @Query('lng') lngStr: string,
    @Res() res: Response,
  ) {
    let lat = 35.6895;
    let lng = 139.6917;

    const lookupKey = token || roomId;
    if (lookupKey) {
      const cached = await this.redis.getTargetCoords(lookupKey);
      if (cached && typeof cached.lat === 'number' && typeof cached.lng === 'number') {
        lat = cached.lat;
        lng = cached.lng;
      } else if (latStr && lngStr) {
        lat = parseFloat(latStr);
        lng = parseFloat(lngStr);
      }
    } else if (latStr && lngStr) {
      lat = parseFloat(latStr);
      lng = parseFloat(lngStr);
    }

    // Snap to nearest verified real Google Street View panorama if needed
    const resolved = await this.resolveStreetViewCoords(lat, lng);
    lat = resolved.lat;
    lng = resolved.lng;

    const embedUrl = `https://www.google.com/maps/embed?origin=mfe&pb=!6m6!1m5!2m2!1d${lat}!2d${lng}!4f-0!5f1`;
    const { payload, key } = this.cipherService.obfuscateUrl(embedUrl);
    const html = this.templateService.renderUplinkHtml(payload, key);

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.removeHeader('X-Frame-Options');
    res.send(html);
  }

  private async resolveStreetViewCoords(lat: number, lng: number): Promise<{ lat: number; lng: number }> {
    const isAlgeria = lat >= 18.0 && lat <= 38.0 && lng >= -9.0 && lng <= 12.5;
    const cacheKey = `sv:snap:${lat.toFixed(5)}:${lng.toFixed(5)}`;

    const cached = await this.redis.getCached(cacheKey);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch {}
    }

    // Check with Google's Street View metadata
    const meta = await this.fetchMetadata(lat, lng, isAlgeria ? 35000 : 2500);
    if (meta && meta.lat && meta.lng) {
      const result = { lat: meta.lat, lng: meta.lng };
      await this.redis.setCached(cacheKey, JSON.stringify(result), 86400);
      return result;
    }

    // If in Algeria and no panorama was found nearby, fall back to a guaranteed verified panorama
    if (isAlgeria) {
      const fallback = this.findClosestOrRotatingPano(lat, lng);
      this.logger.warn(`No nearby panorama at ${lat}, ${lng}. Snapped to guaranteed Algerian panorama at ${fallback.lat}, ${fallback.lng}`);
      await this.redis.setCached(cacheKey, JSON.stringify(fallback), 86400);
      return fallback;
    }

    return { lat, lng };
  }

  private fetchMetadata(lat: number, lng: number, radius: number): Promise<{ lat: number; lng: number } | null> {
    if (!GOOGLE_API_KEY) {
      return Promise.resolve(null);
    }
    return new Promise((resolve) => {
      const url = `https://maps.googleapis.com/maps/api/streetview/metadata?location=${lat},${lng}&radius=${radius}&source=outdoor&key=${GOOGLE_API_KEY}`;
      const req = https.get(url, { timeout: 2500 }, (res) => {
        let raw = '';
        res.on('data', (c) => (raw += c));
        res.on('end', () => {
          try {
            const data = JSON.parse(raw);
            if (data.status === 'OK' && data.location) {
              resolve({
                lat: Number(data.location.lat.toFixed(6)),
                lng: Number(data.location.lng.toFixed(6)),
              });
              return;
            }
          } catch {}
          resolve(null);
        });
      });
      req.on('error', () => resolve(null));
      req.on('timeout', () => {
        req.destroy();
        resolve(null);
      });
    });
  }

  private findClosestOrRotatingPano(lat: number, lng: number): { lat: number; lng: number } {
    let closest = GUARANTEED_ALGERIA_PANOS[0];
    let minDist = Infinity;

    for (const p of GUARANTEED_ALGERIA_PANOS) {
      const d = Math.hypot(p.lat - lat, p.lng - lng);
      if (d < minDist) {
        minDist = d;
        closest = p;
      }
    }
    return closest;
  }
}
