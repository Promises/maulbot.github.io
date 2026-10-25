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
