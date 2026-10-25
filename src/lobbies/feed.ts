import {Socket} from 'phoenix';
import {FeedEvent, FeedLobby, FeedSnapshot, TrackerHealth} from './types';

/**
 * The tracker's live feed: Phoenix channels over a WebSocket, read-only and without auth. The
 * client adds `/websocket` to the path.
 */
const FEED_URL = 'wss://wc3.henning.tech/socket';

/** `lobbies:all` has every lobby; `lobbies:our_map` only ours, unofficial copies left out. */
export type FeedTopic = 'lobbies:all' | 'lobbies:our_map';

const LOBBY_EVENTS = ['appeared', 'players', 'meta', 'ended'];

export interface FeedListener {
    /** Sent after every join, the first and each one after a reconnect: start over from it. */
    snapshot: (snapshot: FeedSnapshot) => void;
    /** A change to one lobby: `appeared`, `players`, `meta` or `ended`. */
    event: (kind: string, event: FeedEvent, lobby: FeedLobby) => void;
    /** Whenever the tracker's status changes. */
    health: (health: TrackerHealth) => void;
    /** The connection failed or dropped. The client keeps reconnecting on its own. */
    lost: () => void;
}

/**
 * Joins a topic of the live feed until the returned function is called. After that the listener
 * hears nothing more, not even the error of a connection closed while it was still opening.
 */
export function subscribeFeed(topic: FeedTopic, listener: FeedListener): () => void {
    let closed = false;
    const whileOpen = <A extends unknown[]>(handler: (...args: A) => void) => (...args: A): void => {
        if (!closed) {
            handler(...args);
        }
    };
    const lost = whileOpen(() => listener.lost());

    const socket = new Socket(FEED_URL);
    socket.onError(lost);
    socket.connect();

    const channel = socket.channel(topic);
    channel.on('snapshot', whileOpen((snapshot: FeedSnapshot) => listener.snapshot(snapshot)));
    channel.on('health', whileOpen((health: TrackerHealth) => listener.health(health)));
    for (const kind of LOBBY_EVENTS) {
        channel.on(kind, whileOpen(({event, lobby}: {event: FeedEvent; lobby: FeedLobby}) => listener.event(kind, event, lobby)));
    }
    channel.join()
        .receive('error', lost)
        .receive('timeout', lost);

    return () => {
        closed = true;
        channel.leave();
        socket.disconnect();
    };
}
