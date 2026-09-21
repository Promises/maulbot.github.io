const HEADER_BYTES = 128;
const DDS_MAGIC = 0x20534444; // "DDS "
const HEADER_FLAGS = 0x1 | 0x2 | 0x4 | 0x8 | 0x1000; // caps, height, width, pitch, pixelformat
const PIXELFORMAT_FLAGS = 0x41; // alpha pixels + uncompressed RGB
const CAPS_TEXTURE = 0x1000;

/**
 * Encodes RGBA pixel data as an uncompressed 32-bit BGRA DDS, the format
 * Warcraft III accepts for loading screens. Rows are stored top-down.
 */
export function encodeDds(width: number, height: number, rgba: Uint8ClampedArray): ArrayBuffer {
    const pixelCount = width * height;
    if (rgba.length !== pixelCount * 4) {
        throw new Error(`Expected ${pixelCount * 4} bytes of RGBA data, got ${rgba.length}`);
    }
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
