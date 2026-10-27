import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis;
  private pubClient: Redis;
  private subClient: Redis;

  onModuleInit() {
    const host = process.env.REDIS_HOST || '127.0.0.1';
    const port = parseInt(process.env.REDIS_PORT || '6379', 10);

    const opts = {
      host,
      port,
      retryStrategy: (times: number) => Math.min(times * 100, 3000),
      lazyConnect: true,
    };

    this.client = new Redis(opts);
    this.pubClient = new Redis(opts);
    this.subClient = new Redis(opts);

    Promise.all([
      this.client.connect().catch((e) => this.logger.warn(`Redis client connect: ${e.message}`)),
      this.pubClient.connect().catch((e) => this.logger.warn(`Redis pub connect: ${e.message}`)),
      this.subClient.connect().catch((e) => this.logger.warn(`Redis sub connect: ${e.message}`)),
    ]);
  }

  onModuleDestroy() {
    this.client?.disconnect();
    this.pubClient?.disconnect();
    this.subClient?.disconnect();
  }

  getClient(): Redis {
    return this.client;
  }

  async publish(channel: string, message: any): Promise<void> {
    try {
      const data = typeof message === 'string' ? message : JSON.stringify(message);
      await this.pubClient.publish(channel, data);
    } catch (err: any) {
      this.logger.error(`Publish error on ${channel}: ${err.message}`);
    }
  }

  async subscribe(channel: string, callback: (msg: string) => void): Promise<void> {
    await this.subClient.subscribe(channel);
    this.subClient.on('message', (ch, msg) => {
      if (ch === channel) callback(msg);
    });
  }

  async setRoundTarget(
    roomId: string,
    token: string,
    coords: { lat: number; lng: number },
    ttlSeconds = 7200,
  ): Promise<void> {
    try {
      const payload = JSON.stringify(coords);
      await Promise.all([
        this.client.set(`round:target:${roomId}`, payload, 'EX', ttlSeconds),
        this.client.set(`round:token:${token}`, payload, 'EX', ttlSeconds),
      ]);
    } catch (err: any) {
      this.logger.warn(`Failed caching round target: ${err.message}`);
    }
  }

  async pushRecentLocationKeys(keys: string[], maxHistory = 2000): Promise<void> {
    if (!this.client || !keys || keys.length === 0) return;
    try {
      const pipeline = this.client.pipeline();
      pipeline.lpush('global:recent_locations', ...keys);
      pipeline.ltrim('global:recent_locations', 0, maxHistory - 1);
      pipeline.expire('global:recent_locations', 86400 * 3);
      await pipeline.exec();
    } catch (err: any) {
      this.logger.warn(`Failed pushing recent locations: ${err.message}`);
    }
  }

  async getRecentLocationKeys(limit = 2000): Promise<Set<string>> {
    if (!this.client) return new Set<string>();
    try {
      const items = await this.client.lrange('global:recent_locations', 0, limit - 1);
      return new Set(items);
    } catch (err: any) {
      this.logger.warn(`Failed getting recent locations: ${err.message}`);
      return new Set<string>();
    }
  }
}
