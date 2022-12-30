import { Inject, Injectable } from '@nestjs/common';
import { Store } from 'relational-redis-store';
import { SessionStore } from '../session/store';
import { Redis } from './app.module';

@Injectable()
export class SessionService {
  private map: Record<string, SessionStore> = {};

  constructor(@Inject('Redis') private readonly redis: Redis) {}

  createSession(uniqId: string) {
    const nextSession = new SessionStore(
      new Store(this.redis, { namespace: uniqId })
    );

    this.map[uniqId] = nextSession;

    return nextSession;
  }

  getSession(id: string) {
    return this.map[id];
  }

  destroySession(id: string) {
    const { [id]: removed, ...restMap } = this.map;

    this.map = restMap;
  }
}
