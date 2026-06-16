/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * Client-side page optimization for Creator Originals uploads:
 *  - downscales to a sane max width (quality + much lower egress cost),
 *  - re-encodes to WebP (falls back to JPEG),
 *  - slices very tall "long-strip" webtoon images into render-friendly segments.
 * All best-effort: any failure falls back to uploading the original file.
 */

export interface OptimizeOptions {
    /** Max output width in px (pages are downscaled to fit). */
    maxWidth: number;
    /** Max height per output segment; taller images are sliced (long strip). */
    maxSliceHeight: number;
    /** Encoder quality 0–1. */
    quality: number;
}

export const DEFAULT_OPTIMIZE: OptimizeOptions = {
    maxWidth: 1600,
    maxSliceHeight: 4000,
    quality: 0.82,
};

function loadImage(file: File): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => {
            URL.revokeObjectURL(url);
            resolve(img);
        };
        img.onerror = (e) => {
            URL.revokeObjectURL(url);
            reject(e);
        };
        img.src = url;
    });
}

function canvasToFile(canvas: HTMLCanvasElement, baseName: string, quality: number): Promise<File> {
    return new Promise((resolve, reject) => {
        const finalize = (blob: Blob | null, ext: string) => {
            if (!blob) {
                reject(new Error('encode failed'));
                return;
            }
            resolve(new File([blob], `${baseName}.${ext}`, { type: blob.type }));
        };
        canvas.toBlob(
            (webp) => {
                if (webp) finalize(webp, 'webp');
                else canvas.toBlob((jpeg) => finalize(jpeg, 'jpg'), 'image/jpeg', quality);
            },
            'image/webp',
            quality,
        );
    });
}

/**
 * Optimize a single image file into one or more upload-ready files. Non-images
 * pass through unchanged. Returns the original file on any processing error.
 */
export async function optimizeForUpload(file: File, opts: OptimizeOptions = DEFAULT_OPTIMIZE): Promise<File[]> {
    if (!file.type.startsWith('image/') || typeof document === 'undefined') return [file];
    try {
        const img = await loadImage(file);
        const scale = Math.min(1, opts.maxWidth / img.width);
        const targetW = Math.max(1, Math.round(img.width * scale));
        const targetH = Math.max(1, Math.round(img.height * scale));
        const base = file.name.replace(/\.[^.]+$/, '');

        const segments = Math.max(1, Math.ceil(targetH / opts.maxSliceHeight));
        const out: File[] = [];
        for (let i = 0; i < segments; i += 1) {
            const sliceTargetH = Math.min(opts.maxSliceHeight, targetH - i * opts.maxSliceHeight);
            const canvas = document.createElement('canvas');
            canvas.width = targetW;
            canvas.height = sliceTargetH;
            const ctx = canvas.getContext('2d');
            if (!ctx) return [file];
            // Map the destination slice back to the source region (account for scale).
            const srcY = (i * opts.maxSliceHeight) / scale;
            const srcH = sliceTargetH / scale;
            ctx.drawImage(img, 0, srcY, img.width, srcH, 0, 0, targetW, sliceTargetH);
            // eslint-disable-next-line no-await-in-loop -- sequential keeps slice order + bounds memory
            out.push(await canvasToFile(canvas, segments > 1 ? `${base}-${i}` : base, opts.quality));
        }
        return out;
    } catch {
        return [file];
    }
}

/** Optimize a batch of files (flattening any long-strip slices), in order. */
export async function optimizeBatch(files: File[], opts: OptimizeOptions = DEFAULT_OPTIMIZE): Promise<File[]> {
    const result: File[] = [];
    for (let i = 0; i < files.length; i += 1) {
        // eslint-disable-next-line no-await-in-loop -- preserve page order deterministically
        const optimized = await optimizeForUpload(files[i], opts);
        result.push(...optimized);
    }
    return result;
}
