-- AlterTable
ALTER TABLE `Expedition`
    ADD COLUMN `heroImageAlt` VARCHAR(240) NULL,
    ADD COLUMN `metaTitle` VARCHAR(180) NULL,
    ADD COLUMN `metaDescription` VARCHAR(320) NULL,
    ADD COLUMN `focusKeywords` VARCHAR(255) NULL,
    ADD COLUMN `robotsIndex` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `robotsFollow` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `ogTitle` VARCHAR(180) NULL,
    ADD COLUMN `ogDescription` VARCHAR(320) NULL,
    ADD COLUMN `ogImageUrl` VARCHAR(500) NULL,
    ADD COLUMN `ogImageAlt` VARCHAR(240) NULL;

-- AlterTable
ALTER TABLE `Enquiry` ADD COLUMN `internalNote` TEXT NULL;

-- AlterTable
ALTER TABLE `AuditLog` MODIFY `action` ENUM('BOOKING_CREATED', 'BOOKING_CANCELLED', 'DEPARTURE_STATUS_CHANGED', 'ENQUIRY_CREATED', 'EXPEDITION_SAVED', 'DEPARTURE_CREATED', 'ENQUIRY_UPDATED') NOT NULL;

-- CreateTable
CREATE TABLE `ExpeditionImage` (
    `id` VARCHAR(191) NOT NULL,
    `expeditionId` VARCHAR(191) NOT NULL,
    `url` VARCHAR(500) NOT NULL,
    `alt` VARCHAR(240) NOT NULL,
    `sortOrder` INTEGER NOT NULL,

    INDEX `ExpeditionImage_expeditionId_sortOrder_idx`(`expeditionId`, `sortOrder`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ExpeditionImage` ADD CONSTRAINT `ExpeditionImage_expeditionId_fkey` FOREIGN KEY (`expeditionId`) REFERENCES `Expedition`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
