// Stands in for the Phoenix client in every test: nothing connects, and a test drives the live feed
// through the sockets the code under test opened (`FakeSocket.opened`).

type Handler = (payload: any) => void;

export class FakeChannel {
    readonly handlers = new Map<string, Handler[]>();
    readonly replies = new Map<string, () => void>();
    left = false;

    constructor(readonly topic: string) {}

    on(event: string, handler: Handler) {
        this.handlers.set(event, [...(this.handlers.get(event) ?? []), handler]);
    }

    join() {
        const push = {
            receive: (status: string, callback: () => void) => {
                this.replies.set(status, callback);
                return push;
            },
        };
        return push;
    }

    leave() {
        this.left = true;
    }

    /** Delivers a server push to the channel's handlers. */
    deliver(event: string, payload: unknown) {
        this.handlers.get(event)?.forEach((handler) => handler(payload));
    }

    /** Answers the join, e.g. with `error`. */
    reply(status: string) {
        this.replies.get(status)?.();
    }
}

export class FakeSocket {
    static opened: FakeSocket[] = [];
    readonly channels: FakeChannel[] = [];
    readonly errorHandlers: Array<() => void> = [];
    disconnected = false;

    constructor(readonly endPoint: string) {
        FakeSocket.opened.push(this);
    }

    onError(handler: () => void) {
        this.errorHandlers.push(handler);
    }

    connect() {}

    disconnect() {
        this.disconnected = true;
    }

    channel(topic: string) {
        const channel = new FakeChannel(topic);
        this.channels.push(channel);
        return channel;
    }

    /** Fails the connection, as an unreachable server would. */
    fail() {
        this.errorHandlers.forEach((handler) => handler());
    }
}

export {FakeSocket as Socket};
