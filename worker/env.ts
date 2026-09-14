import type { RoomDO } from './room';

export interface Env {
    /** next build (output: 'export') が吐いた ./out を配信するバインディング */
    ASSETS: Fetcher;
    /** ルーム1つ = Durable Object 1つ */
    ROOM: DurableObjectNamespace<RoomDO>;
}
