import { Controller, Get, Query, Res, Logger } from '@nestjs/common';
import { Response } from 'express';
import * as https from 'https';
import { StreetviewCipherService } from './streetview-cipher.service';
import { StreetviewTemplateService } from './streetview-template.service';
import { RedisService } from '../redis/redis.service';

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || '';

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
    const cacheKey = `sv:snap:${lat.toFixed(5)}:${lng.toFixed(5)}`;

    const cached = await this.redis.getCached(cacheKey);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch {}
    }

    // Check with Google's Street View metadata (strict outdoor road panorama)
    const meta = await this.fetchMetadata(lat, lng, 2500);
    if (meta && meta.lat && meta.lng) {
      const result = { lat: meta.lat, lng: meta.lng };
      await this.redis.setCached(cacheKey, JSON.stringify(result), 86400);
      return result;
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
}
