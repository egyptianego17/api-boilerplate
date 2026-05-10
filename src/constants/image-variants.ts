export enum ImageVariant {
  ORIGINAL = 'original',
  THUMBNAIL = 'thumbnail',
  SMALL = 'small',
  MEDIUM = 'medium',
}

interface VariantConfig {
  width: number;
  height: number;
  format: 'webp';
  quality: number;
}

export const IMAGE_VARIANT_CONFIGS = new Map<ImageVariant, VariantConfig>([
  [
    ImageVariant.THUMBNAIL,
    { width: 64, height: 64, format: 'webp', quality: 80 },
  ],
  [
    ImageVariant.SMALL,
    { width: 128, height: 128, format: 'webp', quality: 80 },
  ],
  [
    ImageVariant.MEDIUM,
    { width: 256, height: 256, format: 'webp', quality: 80 },
  ],
]);
