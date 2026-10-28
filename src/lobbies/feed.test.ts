import {subscribeFeed} from './feed';
import {feedChannel, feedSocket} from './testing';

function listener() {
    return {snapshot: jest.fn(), event: jest.fn(), health: jest.fn(), lost: jest.fn()};
}

test('joins the topic on the public feed and hands on what it pushes', () => {
    const heard = listener();
    subscribeFeed('lobbies:our_map', heard);
    expect(feedSocket().endPoint).toBe('wss://wc3.henning.tech/socket');
    expect(feedChannel().topic).toBe('lobbies:our_map');

    const lobby = {instance_id: 'a', players: 3};
    feedChannel().deliver('players', {event: {instance_id: 'a', ts: '2026-10-25T12:00:00Z', kind: 'players'}, lobby});
    expect(heard.event).toHaveBeenCalledWith('players', expect.objectContaining({kind: 'players'}), lobby);

    feedChannel().reply('error');
    expect(heard.lost).toHaveBeenCalled();
});

test('hands on every lobby event, also kinds it was not written for, and nothing else as one', () => {
    const heard = listener();
    subscribeFeed('lobbies:all', heard);
    const lobby = {instance_id: 'a', players: 4};
    const event = (kind: string) => ({instance_id: 'a', ts: '2026-10-28T12:00:00Z', kind});
    feedChannel().deliver('rehost', {event: {...event('rehost'), old_webui_id: 1, new_webui_id: 2}, lobby});
    feedChannel().deliver('some_future_kind', {event: event('some_future_kind'), lobby});
    feedChannel().deliver('phx_reply', {status: 'ok', response: {}});
    feedChannel().deliver('health', {status: 'ok'});
    expect(heard.event.mock.calls.map(([kind]) => kind)).toEqual(['rehost', 'some_future_kind']);
    expect(heard.health).toHaveBeenCalledWith({status: 'ok'});
});

test('says nothing more once closed, not even for a connection that fails while opening', () => {
    const heard = listener();
    const close = subscribeFeed('lobbies:all', heard);
    close();
    feedSocket().fail();
    feedChannel().deliver('snapshot', {as_of: '2026-10-25T12:00:00Z', health: {status: 'ok'}, lobbies: []});
    expect(heard.lost).not.toHaveBeenCalled();
    expect(heard.snapshot).not.toHaveBeenCalled();
    expect(feedSocket().disconnected).toBe(true);
    expect(feedChannel().left).toBe(true);
});
