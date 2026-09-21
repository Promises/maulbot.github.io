/**
 * DXT5 (BC3) block compression for the loading screen export.
 *
 * Warcraft III loads compressed DDS loading screens (the map has always shipped DXT5), and
 * at 1920x1080 DXT5 is 2 MB where uncompressed BGRA is 8 MB. The colour endpoints of each
 * 4x4 block are fitted along the block's principal axis and then refined by least squares
 * against the chosen palette indices, the approach of the reference encoders (stb_dxt,
 * squish); a plain bounding-box fit smears saturated areas such as the badge artwork.
 */

const BLOCK_BYTES = 16;

interface Endpoints {
    /** RGB565 endpoints; c0 must compare greater than c1 for the 4-colour palette */
    c0: number;
    c1: number;
}

function toRgb565(r: number, g: number, b: number): number {
    return ((r >> 3) << 11) | ((g >> 2) << 5) | (b >> 3);
}

/** Expands a 565 endpoint to 8-bit RGB the way the decoder does (bit replication). */
function fromRgb565(c: number): [number, number, number] {
    const r = (c >> 11) & 0x1f;
    const g = (c >> 5) & 0x3f;
    const b = c & 0x1f;
    return [(r << 3) | (r >> 2), (g << 2) | (g >> 4), (b << 3) | (b >> 2)];
}

function clamp255(value: number): number {
    return value < 0 ? 0 : value > 255 ? 255 : Math.round(value);
}

/** The four palette colours of the 4-colour (c0 > c1) mode. */
function palette(c0: number, c1: number): [number, number, number][] {
    const a = fromRgb565(c0);
    const b = fromRgb565(c1);
    return [
        a,
        b,
        [(2 * a[0] + b[0]) / 3, (2 * a[1] + b[1]) / 3, (2 * a[2] + b[2]) / 3],
        [(a[0] + 2 * b[0]) / 3, (a[1] + 2 * b[1]) / 3, (a[2] + 2 * b[2]) / 3],
    ];
}

/** Nearest palette entry per pixel; returns the indices and the total squared error. */
function assignIndices(pixels: Float64Array, colours: [number, number, number][], indices: Uint8Array): number {
    let error = 0;
    for (let p = 0; p < 16; p++) {
        const r = pixels[p * 3];
        const g = pixels[p * 3 + 1];
        const b = pixels[p * 3 + 2];
        let best = 0;
        let bestDistance = Infinity;
        for (let i = 0; i < 4; i++) {
            const dr = r - colours[i][0];
            const dg = g - colours[i][1];
            const db = b - colours[i][2];
            const distance = dr * dr + dg * dg + db * db;
            if (distance < bestDistance) {
                bestDistance = distance;
                best = i;
            }
        }
        indices[p] = best;
        error += bestDistance;
    }
    return error;
}

/** Initial endpoints: the extremes of the block projected onto its principal colour axis. */
function principalAxisEndpoints(pixels: Float64Array): Endpoints {
    let mr = 0;
    let mg = 0;
    let mb = 0;
    for (let p = 0; p < 16; p++) {
        mr += pixels[p * 3];
        mg += pixels[p * 3 + 1];
        mb += pixels[p * 3 + 2];
    }
    mr /= 16;
    mg /= 16;
    mb /= 16;

    // Covariance matrix (symmetric, 6 unique entries)
    let crr = 0, crg = 0, crb = 0, cgg = 0, cgb = 0, cbb = 0;
    for (let p = 0; p < 16; p++) {
        const r = pixels[p * 3] - mr;
        const g = pixels[p * 3 + 1] - mg;
        const b = pixels[p * 3 + 2] - mb;
        crr += r * r;
        crg += r * g;
        crb += r * b;
        cgg += g * g;
        cgb += g * b;
        cbb += b * b;
    }
    // Dominant eigenvector by power iteration, starting from the spread of the block
    let vr = 1, vg = 1, vb = 1;
    for (let i = 0; i < 8; i++) {
        const nr = crr * vr + crg * vg + crb * vb;
        const ng = crg * vr + cgg * vg + cgb * vb;
        const nb = crb * vr + cgb * vg + cbb * vb;
        const length = Math.sqrt(nr * nr + ng * ng + nb * nb);
        if (length < 1e-6) {
            break;
        }
        vr = nr / length;
        vg = ng / length;
        vb = nb / length;
    }

    let minDot = Infinity;
    let maxDot = -Infinity;
    let minPixel = 0;
    let maxPixel = 0;
    for (let p = 0; p < 16; p++) {
        const dot = pixels[p * 3] * vr + pixels[p * 3 + 1] * vg + pixels[p * 3 + 2] * vb;
        if (dot < minDot) {
            minDot = dot;
            minPixel = p;
        }
        if (dot > maxDot) {
            maxDot = dot;
            maxPixel = p;
        }
    }
    return {
        c0: toRgb565(pixels[maxPixel * 3], pixels[maxPixel * 3 + 1], pixels[maxPixel * 3 + 2]),
        c1: toRgb565(pixels[minPixel * 3], pixels[minPixel * 3 + 1], pixels[minPixel * 3 + 2]),
    };
}

/**
 * Least-squares endpoints for fixed indices: each pixel is c0 * w + c1 * (1 - w) with
 * w in {1, 0, 2/3, 1/3}; solving the 2x2 normal equations gives the endpoints that best
 * reproduce the block through those weights.
 */
function refineEndpoints(pixels: Float64Array, indices: Uint8Array): Endpoints | undefined {
    const weights = [1, 0, 2 / 3, 1 / 3];
    let sumW = 0, sumWW = 0;
    const sumWP = [0, 0, 0];
    const sumP = [0, 0, 0];
    for (let p = 0; p < 16; p++) {
        const w = weights[indices[p]];
        sumW += w;
        sumWW += w * w;
        for (let c = 0; c < 3; c++) {
            sumWP[c] += w * pixels[p * 3 + c];
            sumP[c] += pixels[p * 3 + c];
        }
    }
    // Normal equations: [sumWW, sumW - sumWW; sumW - sumWW, 16 - 2 sumW + sumWW] [c0; c1] = [sumWP; sumP - sumWP]
    const a = sumWW;
    const b = sumW - sumWW;
    const d = 16 - 2 * sumW + sumWW;
    const det = a * d - b * b;
    if (Math.abs(det) < 1e-6) {
        return undefined;
    }
    const c0: number[] = [];
    const c1: number[] = [];
    for (let c = 0; c < 3; c++) {
        const e = sumWP[c];
        const f = sumP[c] - sumWP[c];
        c0.push(clamp255((d * e - b * f) / det));
        c1.push(clamp255((a * f - b * e) / det));
    }
    return {c0: toRgb565(c0[0], c0[1], c0[2]), c1: toRgb565(c1[0], c1[1], c1[2])};
}

/** Compresses one block's RGB into the 8-byte DXT1 colour part (4-colour mode). */
function encodeColourBlock(pixels: Float64Array, out: Uint8Array, offset: number): void {
    let best = principalAxisEndpoints(pixels);
    const indices = new Uint8Array(16);
    let bestIndices = new Uint8Array(16);
    let bestError = Infinity;

    // Fit, refine, fit again: a few rounds settle the endpoints on the block's line
    let current: Endpoints | undefined = best;
    for (let round = 0; round < 4 && current; round++) {
        if (current.c0 === current.c1) {
            // A single colour: every pixel is c0, and the 4-colour mode needs c0 > c1
            current = {c0: Math.max(current.c0, 1), c1: Math.max(current.c0, 1) - 1};
        } else if (current.c0 < current.c1) {
            current = {c0: current.c1, c1: current.c0};
        }
        const error = assignIndices(pixels, palette(current.c0, current.c1), indices);
        if (error < bestError) {
            bestError = error;
            best = current;
            bestIndices = Uint8Array.from(indices);
            if (error === 0) {
                break;
            }
        }
        current = refineEndpoints(pixels, indices);
    }

    out[offset] = best.c0 & 0xff;
    out[offset + 1] = best.c0 >> 8;
    out[offset + 2] = best.c1 & 0xff;
    out[offset + 3] = best.c1 >> 8;
    for (let row = 0; row < 4; row++) {
        out[offset + 4 + row] = bestIndices[row * 4] | (bestIndices[row * 4 + 1] << 2)
            | (bestIndices[row * 4 + 2] << 4) | (bestIndices[row * 4 + 3] << 6);
    }
}

/** Compresses one block's alpha into the 8-byte BC3 alpha part (8-value mode). */
function encodeAlphaBlock(alphas: Uint8Array, out: Uint8Array, offset: number): void {
    let a0 = 0;
    let a1 = 255;
    for (let p = 0; p < 16; p++) {
        a0 = Math.max(a0, alphas[p]);
        a1 = Math.min(a1, alphas[p]);
    }
    // 8-value mode requires a0 > a1; a flat block encodes as all index 0 = a0
    if (a0 === a1) {
        a1 = a0 > 0 ? a0 - 1 : 0;
        a0 = a0 > 0 ? a0 : 1;
    }
    const levels: number[] = [a0, a1];
    for (let i = 1; i <= 6; i++) {
        levels.push(((7 - i) * a0 + i * a1) / 7);
    }
    // 16 three-bit indices packed little-endian into 48 bits, as two 24-bit halves
    // (eight indices each) so no value exceeds the safe 32-bit integer range
    const halves = [0, 0];
    for (let p = 0; p < 16; p++) {
        let best = 0;
        let bestDistance = Infinity;
        for (let i = 0; i < 8; i++) {
            const distance = Math.abs(alphas[p] - levels[i]);
            if (distance < bestDistance) {
                bestDistance = distance;
                best = i;
            }
        }
        halves[p >> 3] |= best << (3 * (p & 7));
    }
    out[offset] = a0;
    out[offset + 1] = a1;
    for (let half = 0; half < 2; half++) {
        for (let i = 0; i < 3; i++) {
            out[offset + 2 + half * 3 + i] = (halves[half] >> (8 * i)) & 0xff;
        }
    }
}

/** Compresses RGBA pixels (rows top-down) into DXT5 blocks; edges are padded by clamping. */
export function compressDxt5(width: number, height: number, rgba: Uint8ClampedArray | Uint8Array): Uint8Array {
    const blocksX = Math.max(1, Math.ceil(width / 4));
    const blocksY = Math.max(1, Math.ceil(height / 4));
    const out = new Uint8Array(blocksX * blocksY * BLOCK_BYTES);
    const pixels = new Float64Array(16 * 3);
    const alphas = new Uint8Array(16);
    let offset = 0;
    for (let by = 0; by < blocksY; by++) {
        for (let bx = 0; bx < blocksX; bx++) {
            for (let y = 0; y < 4; y++) {
                const sy = Math.min(by * 4 + y, height - 1);
                for (let x = 0; x < 4; x++) {
                    const sx = Math.min(bx * 4 + x, width - 1);
                    const src = (sy * width + sx) * 4;
                    const p = y * 4 + x;
                    pixels[p * 3] = rgba[src];
                    pixels[p * 3 + 1] = rgba[src + 1];
                    pixels[p * 3 + 2] = rgba[src + 2];
                    alphas[p] = rgba[src + 3];
                }
            }
            encodeAlphaBlock(alphas, out, offset);
            encodeColourBlock(pixels, out, offset + 8);
            offset += BLOCK_BYTES;
        }
    }
    return out;
}
