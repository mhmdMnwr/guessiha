import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { Pool } from 'pg';

export interface GeoLocation {
  id: string;
  lat: number;
  lng: number;
  label: string;
  country: string;
  region: string;
  difficulty: string;
}

const REGION_ALIASES: Record<string, string> = {
  north_america: 'americas',
  south_america: 'americas',
  latin_america: 'americas',
  america: 'americas',
  algeria: 'all',
  algerie: 'all',
  dz: 'all',
};

export const COUNTRY_TIER_WEIGHTS: Record<string, number> = {
  // Balanced weights for global diversity across 115+ countries
  'United States': 1.6,
  Japan: 1.5,
  Brazil: 1.5,
  France: 1.5,
  Italy: 1.5,
  Germany: 1.5,
  Spain: 1.5,
  'United Kingdom': 1.5,
  Australia: 1.5,
  Canada: 1.5,
  Mexico: 1.5,
  Argentina: 1.4,
  India: 1.4,
  Indonesia: 1.4,
  Poland: 1.3,
  Sweden: 1.3,
  Norway: 1.3,
  Thailand: 1.3,
  'South Korea': 1.3,
  'South Africa': 1.3,
  Colombia: 1.3,
  Chile: 1.3,
  Peru: 1.3,
  Turkey: 1.3,
  // Micro-states / small territories
  Monaco: 0.5,
  Gibraltar: 0.5,
  'San Marino': 0.5,
  Andorra: 0.6,
  Liechtenstein: 0.6,
  Malta: 0.7,
  Jersey: 0.6,
  'Isle of Man': 0.6,
  'Faroe Islands': 0.6,
  'Åland Islands': 0.6,
  Luxembourg: 0.8,
};

const ROAD_KEYWORDS = [
  'road', 'route', 'highway', 'autoroute', 'autobahn', 'freeway',
  'motorway', 'street', 'avenue', 'boulevard', 'drive', 'lane',
  'way', 'rue', 'via ', 'calle', 'strada', 'gasse', 'vej',
  'dori', 'daero', 'jalan', 'rua', 'carrera', 'str.', 'rd.',
  'ave.', 'blvd', 'rocade', 'corniche', 'parkway', 'expressway',
  'turnpike', 'bypass', 'ring road', 'causeway', 'pass',
];

export function isRoadLocation(loc: { label?: string } | null | undefined): boolean {
  if (!loc || !loc.label) return false;
  const l = loc.label.trim();
  if (l.startsWith('Road in ')) return true;
  const lower = l.toLowerCase();
  return ROAD_KEYWORDS.some((kw) => lower.includes(kw));
}

// Emergency fallback in case database connection fails completely during boot (all authentic roads)
const EMERGENCY_FALLBACK_LOCATIONS: GeoLocation[] = [
  { id: '1', lat: 51.5007, lng: -0.1246, label: 'Westminster Bridge Road, London, United Kingdom', country: 'United Kingdom', region: 'europe', difficulty: 'easy' },
  { id: '2', lat: 48.8700, lng: 2.3075, label: 'Avenue des Champs-Élysées, Paris, France', country: 'France', region: 'europe', difficulty: 'easy' },
  { id: '3', lat: 35.6762, lng: 139.6503, label: 'Shinjuku Meiji-dori, Tokyo, Japan', country: 'Japan', region: 'asia', difficulty: 'easy' },
  { id: '4', lat: 40.7128, lng: -74.006, label: 'Broadway & 42nd Street, New York, USA', country: 'United States', region: 'americas', difficulty: 'easy' },
  { id: '5', lat: -33.8688, lng: 151.2093, label: 'George Street, Sydney, Australia', country: 'Australia', region: 'oceania', difficulty: 'easy' },
];

@Injectable()
export class GeoDatabaseService implements OnModuleInit {
  private readonly logger = new Logger(GeoDatabaseService.name);
  private pool: Pool | null = null;

  async onModuleInit() {
    await this.initPostgresConnection();
  }

  normalizeRegion(region?: string): string {
    const clean = (region || 'all').toLowerCase().trim();
    return REGION_ALIASES[clean] || clean;
  }

  getCountryWeight(country: string): number {
    return COUNTRY_TIER_WEIGHTS[country] ?? 1.5;
  }

  private async initPostgresConnection() {
    const host = process.env.POSTGRES_HOST || process.env.PGHOST;
    const user = process.env.POSTGRES_USER || process.env.PGUSER;
    const database = process.env.POSTGRES_DB || process.env.PGDATABASE;
    const password = process.env.POSTGRES_PASSWORD || process.env.PGPASSWORD;
    const port = parseInt(process.env.POSTGRES_PORT || process.env.PGPORT || '5432', 10);
    const connStr = process.env.DATABASE_URL;

    try {
      if (host && user && database) {
        this.logger.log(`Connecting to PostGIS via discrete parameters (${user}@${host}:${port}/${database})...`);
        this.pool = new Pool({
          host,
          port,
          user,
          password: password ? String(password) : undefined,
          database,
          connectionTimeoutMillis: 5000,
          max: 10,
          idleTimeoutMillis: 30000,
        });
      } else if (connStr) {
        this.logger.log('Connecting to PostGIS via connection string...');
        this.pool = new Pool({
          connectionString: connStr,
          connectionTimeoutMillis: 5000,
          max: 10,
          idleTimeoutMillis: 30000,
        });
      } else {
        this.logger.warn('Neither PostgreSQL parameters nor DATABASE_URL configured. PostGIS connection disabled.');
        return;
      }

      const res = await this.pool.query('SELECT COUNT(*) FROM locations');
      this.logger.log(`PostGIS database active! Table contains ${res.rows[0].count} authoritative locations.`);
    } catch (err: any) {
      this.logger.error(`PostGIS connection failed (${err.message}).`);
      this.pool = null;
    }
  }

  async getLocations(options: { region?: string; difficulty?: string; limit?: number }): Promise<GeoLocation[]> {
    const region = this.normalizeRegion(options.region);
    const difficulty = (options.difficulty || 'all').toLowerCase().trim();
    const queryLimit = options.limit || 3000;

    if (!this.pool) {
      await this.initPostgresConnection();
    }

    if (this.pool) {
      try {
        const rows = await this.queryDb(region, difficulty, queryLimit);
        if (rows && rows.length > 0) {
          return rows;
        }

        // Fallback 1: if requested specific difficulty yielded 0 rows, relax difficulty within same region
        if (difficulty !== 'all') {
          this.logger.debug(`Relaxing difficulty filter for region: ${region}`);
          const fallbackRows = await this.queryDb(region, 'all', queryLimit);
          if (fallbackRows && fallbackRows.length > 0) {
            return fallbackRows;
          }
        }

        // Fallback 2: relax region filter to worldwide
        if (region !== 'all') {
          this.logger.debug(`Relaxing region filter to worldwide`);
          const worldwideRows = await this.queryDb('all', 'all', queryLimit);
          if (worldwideRows && worldwideRows.length > 0) {
            return worldwideRows;
          }
        }
      } catch (e: any) {
        this.logger.warn(`PostGIS query error: ${e.message}`);
      }
    }

    this.logger.warn('Returning emergency fallback locations (database unavailable)');
    return EMERGENCY_FALLBACK_LOCATIONS;
  }

  private async queryDb(region: string, difficulty: string, limit: number): Promise<GeoLocation[]> {
    if (!this.pool) return [];

    const conditions: string[] = [];
    const params: any[] = [];
    let idx = 1;

    if (region && region !== 'all') {
      conditions.push(`LOWER(region) = $${idx++}`);
      params.push(region);
    }

    // Strictly exclude Algeria across all modes
    conditions.push(`(LOWER(country) != 'algeria' AND LOWER(region) != 'algeria')`);

    if (difficulty && difficulty !== 'all') {
      conditions.push(`LOWER(difficulty) = $${idx++}`);
      params.push(difficulty);
    }

    // 1-in-1000 non-road rate: By default (99.9% of queries), strictly fetch verified roads
    const allowNonRoads = Math.random() < 0.001;
    if (!allowNonRoads) {
      conditions.push(`(
        label LIKE 'Road in %' 
        OR label ILIKE '%road%' 
        OR label ILIKE '%route%' 
        OR label ILIKE '%highway%' 
        OR label ILIKE '%autoroute%' 
        OR label ILIKE '%autobahn%' 
        OR label ILIKE '%freeway%' 
        OR label ILIKE '%motorway%' 
        OR label ILIKE '%street%' 
        OR label ILIKE '%avenue%' 
        OR label ILIKE '%boulevard%' 
        OR label ILIKE '%drive%' 
        OR label ILIKE '%lane%' 
        OR label ILIKE '%way%' 
        OR label ILIKE '%rue%' 
        OR label ILIKE '%via %' 
        OR label ILIKE '%calle%' 
        OR label ILIKE '%strada%' 
        OR label ILIKE '%gasse%' 
        OR label ILIKE '%vej%' 
        OR label ILIKE '%dori%' 
        OR label ILIKE '%daero%' 
        OR label ILIKE '%jalan%' 
        OR label ILIKE '%rua%' 
        OR label ILIKE '%carrera%' 
        OR label ILIKE '%str.%' 
        OR label ILIKE '%rd.%' 
        OR label ILIKE '%ave.%' 
        OR label ILIKE '%blvd%' 
        OR label ILIKE '%rocade%' 
        OR label ILIKE '%corniche%' 
        OR label ILIKE '%parkway%' 
        OR label ILIKE '%expressway%' 
        OR label ILIKE '%turnpike%' 
        OR label ILIKE '%bypass%' 
        OR label ILIKE '%causeway%'
      )`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const query = `
      SELECT id, lat, lng, label, country, region, difficulty 
      FROM locations 
      ${whereClause} 
      ORDER BY 
        CASE WHEN (
          label LIKE 'Road in %' 
          OR label ILIKE '%road%' 
          OR label ILIKE '%route%' 
          OR label ILIKE '%highway%' 
          OR label ILIKE '%autoroute%' 
          OR label ILIKE '%autobahn%' 
          OR label ILIKE '%freeway%' 
          OR label ILIKE '%motorway%' 
          OR label ILIKE '%street%' 
          OR label ILIKE '%avenue%' 
          OR label ILIKE '%boulevard%' 
          OR label ILIKE '%drive%' 
          OR label ILIKE '%lane%' 
          OR label ILIKE '%way%' 
          OR label ILIKE '%rue%' 
          OR label ILIKE '%via %' 
          OR label ILIKE '%calle%' 
          OR label ILIKE '%strada%' 
          OR label ILIKE '%gasse%' 
          OR label ILIKE '%vej%' 
          OR label ILIKE '%dori%' 
          OR label ILIKE '%daero%' 
          OR label ILIKE '%jalan%' 
          OR label ILIKE '%rua%' 
          OR label ILIKE '%carrera%' 
          OR label ILIKE '%str.%' 
          OR label ILIKE '%rd.%' 
          OR label ILIKE '%ave.%' 
          OR label ILIKE '%blvd%' 
          OR label ILIKE '%rocade%' 
          OR label ILIKE '%corniche%'
          OR label ILIKE '%parkway%'
          OR label ILIKE '%expressway%'
          OR label ILIKE '%turnpike%'
          OR label ILIKE '%bypass%'
          OR label ILIKE '%causeway%'
        ) THEN 0 ELSE 1 END,
        RANDOM() 
      LIMIT ${Number(limit) || 500}
    `;

    const res = await this.pool.query(query, params);
    return res.rows.map((r: any) => ({
      id: String(r.id),
      lat: Number(r.lat),
      lng: Number(r.lng),
      label: r.label,
      country: r.country,
      region: r.region,
      difficulty: r.difficulty,
    }));
  }

  // Deprecated stub for backwards compatibility, returns empty array
  getAllInMemoryLocations(): GeoLocation[] {
    return [];
  }
}
