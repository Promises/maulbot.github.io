import {encodeDds} from './dds';

describe('encodeDds', () => {
    it('writes a valid uncompressed BGRA header and swaps channels', () => {
        const rgba = new Uint8ClampedArray([
            10, 20, 30, 255, // pixel 0: R G B A
            40, 50, 60, 128, // pixel 1
        ]);
        const buffer = encodeDds(2, 1, rgba);
        const view = new DataView(buffer);

        expect(buffer.byteLength).toBe(128 + 8);
        expect(Array.from(new Uint8Array(buffer, 0, 4), (byte) => String.fromCharCode(byte)).join('')).toBe('DDS ');
        expect(view.getUint32(4, true)).toBe(124);
        expect(view.getUint32(8, true)).toBe(0x100f);
        expect(view.getUint32(12, true)).toBe(1); // height
        expect(view.getUint32(16, true)).toBe(2); // width
        expect(view.getUint32(20, true)).toBe(8); // pitch = width * 4
        expect(view.getUint32(76, true)).toBe(32); // pixel format size
        expect(view.getUint32(80, true)).toBe(0x41);
        expect(view.getUint32(88, true)).toBe(32); // bits per pixel
        expect(view.getUint32(92, true)).toBe(0x00ff0000); // R mask
        expect(view.getUint32(96, true)).toBe(0x0000ff00); // G mask
        expect(view.getUint32(100, true)).toBe(0x000000ff); // B mask
        expect(view.getUint32(104, true)).toBe(0xff000000); // A mask
        expect(view.getUint32(108, true)).toBe(0x1000);

        expect(Array.from(new Uint8Array(buffer, 128))).toEqual([
            30, 20, 10, 255,
            60, 50, 40, 128,
        ]);
    });

    it('rejects pixel data that does not match the dimensions', () => {
        expect(() => encodeDds(2, 2, new Uint8ClampedArray(4))).toThrow('Expected 16 bytes');
    });
});
