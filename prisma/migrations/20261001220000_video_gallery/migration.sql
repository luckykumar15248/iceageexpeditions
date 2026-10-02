-- Video & Gallery migration
-- Run with: npx prisma migrate deploy (production) or npx prisma migrate dev (local)

-- ── 1. Add assetType and durationSeconds to MediaAsset ──────────────────────
ALTER TABLE `MediaAsset`
  ADD COLUMN `assetType` ENUM('IMAGE','VIDEO') NOT NULL DEFAULT 'IMAGE' AFTER `id`,
  ADD COLUMN `durationSeconds` INT NULL AFTER `sizeBytes`;

-- Drop old index and add new one that includes assetType
DROP INDEX `MediaAsset_createdAt_idx` ON `MediaAsset`;
CREATE INDEX `MediaAsset_assetType_createdAt_idx` ON `MediaAsset` (`assetType`, `createdAt`);
CREATE INDEX `MediaAsset_createdAt_idx` ON `MediaAsset` (`createdAt`);

-- ── 2. Add videoUrl to HeroSlide ─────────────────────────────────────────────
ALTER TABLE `HeroSlide`
  ADD COLUMN `videoUrl` VARCHAR(500) NULL AFTER `imageAlt`;

-- ── 3. Extend AuditAction enum ───────────────────────────────────────────────
ALTER TABLE `AuditLog` MODIFY COLUMN `action` ENUM(
  'BOOKING_CREATED',
  'BOOKING_CANCELLED',
  'DEPARTURE_STATUS_CHANGED',
  'ENQUIRY_CREATED',
  'EXPEDITION_SAVED',
  'DEPARTURE_CREATED',
  'ENQUIRY_UPDATED',
  'MEDIA_UPLOADED',
  'MEDIA_DELETED',
  'HERO_SLIDE_SAVED',
  'HERO_SLIDE_DELETED',
  'HERO_SLIDES_REORDERED',
  'GALLERY_ITEM_ADDED',
  'GALLERY_ITEM_DELETED',
  'GALLERY_ITEMS_REORDERED'
) NOT NULL;

-- ── 4. Create GalleryItem table ──────────────────────────────────────────────
CREATE TABLE `GalleryItem` (
  `id`           VARCHAR(191)  NOT NULL,
  `sortOrder`    INT           NOT NULL DEFAULT 0,
  `active`       TINYINT(1)    NOT NULL DEFAULT 1,
  `caption`      VARCHAR(300)  NULL,
  `mediaAssetId` VARCHAR(191)  NOT NULL,
  `createdAt`    DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`    DATETIME(3)   NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `GalleryItem_active_sortOrder_idx` (`active`, `sortOrder`),
  INDEX `GalleryItem_mediaAssetId_idx` (`mediaAssetId`),
  CONSTRAINT `GalleryItem_mediaAssetId_fkey`
    FOREIGN KEY (`mediaAssetId`) REFERENCES `MediaAsset` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
