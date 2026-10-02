-- Extend AuditAction enum with media and hero-slide events
ALTER TABLE `AuditLog` MODIFY `action` ENUM(
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
  'HERO_SLIDES_REORDERED'
) NOT NULL;

-- Central media library
CREATE TABLE `MediaAsset` (
  `id`                 VARCHAR(191) NOT NULL,
  `filename`           VARCHAR(255) NOT NULL,
  `originalName`       VARCHAR(255) NOT NULL,
  `url`                VARCHAR(500) NOT NULL,
  `mimeType`           VARCHAR(64)  NOT NULL,
  `sizeBytes`          INT          NOT NULL,
  `altText`            VARCHAR(240) NULL,
  `uploadedByStaffId`  VARCHAR(191) NOT NULL,
  `createdAt`          DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `MediaAsset_uploadedByStaffId_idx` (`uploadedByStaffId`),
  INDEX `MediaAsset_createdAt_idx` (`createdAt`),
  CONSTRAINT `MediaAsset_uploadedByStaffId_fkey`
    FOREIGN KEY (`uploadedByStaffId`) REFERENCES `StaffUser` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Dynamic hero slider slides
CREATE TABLE `HeroSlide` (
  `id`             VARCHAR(191) NOT NULL,
  `sortOrder`      INT          NOT NULL DEFAULT 0,
  `active`         TINYINT(1)   NOT NULL DEFAULT 1,
  `kicker`         VARCHAR(120) NOT NULL,
  `title`          VARCHAR(180) NOT NULL,
  `body`           TEXT         NOT NULL,
  `primaryLabel`   VARCHAR(80)  NOT NULL,
  `primaryHref`    VARCHAR(500) NOT NULL,
  `secondaryLabel` VARCHAR(80)  NULL,
  `secondaryHref`  VARCHAR(500) NULL,
  `imageUrl`       VARCHAR(500) NOT NULL,
  `imageAlt`       VARCHAR(240) NOT NULL,
  `mediaAssetId`   VARCHAR(191) NULL,
  `createdAt`      DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`      DATETIME(3)  NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `HeroSlide_active_sortOrder_idx` (`active`, `sortOrder`),
  CONSTRAINT `HeroSlide_mediaAssetId_fkey`
    FOREIGN KEY (`mediaAssetId`) REFERENCES `MediaAsset` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
