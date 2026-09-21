import {compressDxt5} from './dxt5';

const HEADER_BYTES = 128;
const DDS_MAGIC = 0x20534444; // "DDS "
const HEADER_FLAGS = 0x1 | 0x2 | 0x4 | 0x8 | 0x1000; // caps, height, width, pitch, pixelformat
const HEADER_FLAGS_COMPRESSED = 0x1 | 0x2 | 0x4 | 0x1000 | 0x80000; // caps, height, width, pixelformat, linear size
const PIXELFORMAT_FLAGS = 0x41; // alpha pixels + uncompressed RGB
const PIXELFORMAT_FOURCC = 0x4;
const FOURCC_DXT5 = 0x35545844; // "DXT5"
const CAPS_TEXTURE = 0x1000;

function checkSize(width: number, height: number, rgba: Uint8ClampedArray): void {
    const pixelCount = width * height;
    if (rgba.length !== pixelCount * 4) {
        throw new Error(`Expected ${pixelCount * 4} bytes of RGBA data, got ${rgba.length}`);
    }
}

/**
 * Encodes RGBA pixel data as a DXT5-compressed DDS, the format the map's own loading
 * screen ships in: a quarter of the size of uncompressed BGRA and loaded by the game
 * without conversion. Rows are stored top-down.
 */
export function encodeDdsDxt5(width: number, height: number, rgba: Uint8ClampedArray): ArrayBuffer {
    checkSize(width, height, rgba);
    const blocks = compressDxt5(width, height, rgba);
    const buffer = new ArrayBuffer(HEADER_BYTES + blocks.byteLength);
    const view = new DataView(buffer);
    view.setUint32(0, DDS_MAGIC, true);
    view.setUint32(4, 124, true);
    view.setUint32(8, HEADER_FLAGS_COMPRESSED, true);
    view.setUint32(12, height, true);
    view.setUint32(16, width, true);
    view.setUint32(20, blocks.byteLength, true); // linear size of the top level
    view.setUint32(76, 32, true);
    view.setUint32(80, PIXELFORMAT_FOURCC, true);
    view.setUint32(84, FOURCC_DXT5, true);
    view.setUint32(108, CAPS_TEXTURE, true);
    new Uint8Array(buffer, HEADER_BYTES).set(blocks);
    return buffer;
}

/**
 * Encodes RGBA pixel data as an uncompressed 32-bit BGRA DDS. Kept for the full-quality
 * variant; four times the size of the DXT5 export. Rows are stored top-down.
 */
export function encodeDds(width: number, height: number, rgba: Uint8ClampedArray): ArrayBuffer {
    checkSize(width, height, rgba);
    const pixelCount = width * height;
    const buffer = new ArrayBuffer(HEADER_BYTES + pixelCount * 4);
    const view = new DataView(buffer);
    view.setUint32(0, DDS_MAGIC, true);
    view.setUint32(4, 124, true);
    view.setUint32(8, HEADER_FLAGS, true);
    view.setUint32(12, height, true);
    view.setUint32(16, width, true);
    view.setUint32(20, width * 4, true);
    view.setUint32(76, 32, true);
    view.setUint32(80, PIXELFORMAT_FLAGS, true);
    view.setUint32(88, 32, true);
    view.setUint32(92, 0x00ff0000, true);
    view.setUint32(96, 0x0000ff00, true);
    view.setUint32(100, 0x000000ff, true);
    view.setUint32(104, 0xff000000, true);
    view.setUint32(108, CAPS_TEXTURE, true);

    const pixels = new Uint8Array(buffer, HEADER_BYTES);
    for (let i = 0; i < rgba.length; i += 4) {
        pixels[i] = rgba[i + 2];
        pixels[i + 1] = rgba[i + 1];
        pixels[i + 2] = rgba[i];
        pixels[i + 3] = rgba[i + 3];
    }
    return buffer;
}
