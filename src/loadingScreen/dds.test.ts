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

import {encodeDdsDxt5} from './dds';
import {compressDxt5} from './dxt5';

/** Reference DXT5 block decoder, enough to check what the encoder wrote. */
function decodeBlock(block: Uint8Array): number[][] {
    const a0 = block[0];
    const a1 = block[1];
    const alphaLevels = [a0, a1];
    for (let i = 1; i <= 6; i++) {
        alphaLevels.push(Math.round(((7 - i) * a0 + i * a1) / 7));
    }
    const expand = (c: number): number[] => {
        const r = (c >> 11) & 0x1f;
        const g = (c >> 5) & 0x3f;
        const b = c & 0x1f;
        return [(r << 3) | (r >> 2), (g << 2) | (g >> 4), (b << 3) | (b >> 2)];
    };
    const c0 = block[8] | (block[9] << 8);
    const c1 = block[10] | (block[11] << 8);
    const [p0, p1] = [expand(c0), expand(c1)];
    const colours = [p0, p1, p0.map((v, i) => Math.round((2 * v + p1[i]) / 3)), p0.map((v, i) => Math.round((v + 2 * p1[i]) / 3))];
    const pixels: number[][] = [];
    for (let p = 0; p < 16; p++) {
        const alphaBits = (p < 8 ? block[2] | (block[3] << 8) | (block[4] << 16) : block[5] | (block[6] << 8) | (block[7] << 16)) >> (3 * (p & 7)) & 7;
        const colourIndex = (block[12 + (p >> 2)] >> (2 * (p & 3))) & 3;
        pixels.push([...colours[colourIndex], alphaLevels[alphaBits]]);
    }
    return pixels;
}

describe('encodeDdsDxt5', () => {
    it('writes a DXT5 header with the linear size of the block data', () => {
        const rgba = new Uint8ClampedArray(4 * 4 * 4).fill(200);
        const buffer = encodeDdsDxt5(4, 4, rgba);
        const view = new DataView(buffer);
        expect(buffer.byteLength).toBe(128 + 16);
        expect(view.getUint32(8, true)).toBe(0x81007);
        expect(view.getUint32(20, true)).toBe(16);
        expect(view.getUint32(80, true)).toBe(0x4);
        expect(Array.from(new Uint8Array(buffer, 84, 4), (byte) => String.fromCharCode(byte)).join('')).toBe('DXT5');
    });

    it('reproduces a flat block exactly', () => {
        const rgba = new Uint8ClampedArray(64);
        for (let p = 0; p < 16; p++) {
            rgba.set([49, 120, 198, 255], p * 4);
        }
        const [pixel] = decodeBlock(compressDxt5(4, 4, rgba));
        // 565 quantisation: within one step of the source
        expect(Math.abs(pixel[0] - 49)).toBeLessThanOrEqual(4);
        expect(Math.abs(pixel[1] - 120)).toBeLessThanOrEqual(2);
        expect(Math.abs(pixel[2] - 198)).toBeLessThanOrEqual(4);
        expect(pixel[3]).toBe(255);
    });

    it('keeps a hard two-colour edge sharp', () => {
        // Left half saturated blue, right half white: a bounding-box fit smears this
        const rgba = new Uint8ClampedArray(64);
        for (let p = 0; p < 16; p++) {
            rgba.set(p % 4 < 2 ? [49, 120, 198, 255] : [255, 255, 255, 255], p * 4);
        }
        const pixels = decodeBlock(compressDxt5(4, 4, rgba));
        for (let p = 0; p < 16; p++) {
            const expected = p % 4 < 2 ? [49, 120, 198] : [255, 255, 255];
            for (let c = 0; c < 3; c++) {
                expect(Math.abs(pixels[p][c] - expected[c])).toBeLessThanOrEqual(4);
            }
        }
    });

    it('encodes alpha through the eight-level ramp and pads odd sizes', () => {
        const rgba = new Uint8ClampedArray(5 * 3 * 4);
        for (let p = 0; p < 15; p++) {
            rgba.set([0, 0, 0, p * 17], p * 4);
        }
        const blocks = compressDxt5(5, 3, rgba);
        expect(blocks.byteLength).toBe(2 * 16);
        const pixels = decodeBlock(blocks.subarray(0, 16));
        // The padded block spans alpha 0..221, a ramp step of ~32: each pixel lands within half a step
        expect(Math.abs(pixels[0][3] - 0)).toBeLessThanOrEqual(16);
        expect(Math.abs(pixels[3][3] - 51)).toBeLessThanOrEqual(16);
        expect(Math.abs(pixels[8][3] - 170)).toBeLessThanOrEqual(16);
    });
});
