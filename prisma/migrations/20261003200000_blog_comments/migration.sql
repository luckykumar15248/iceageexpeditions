-- Blog engine with categories, tags, and moderated reader comments.

-- AlterTable
ALTER TABLE `AuditLog` MODIFY `action` ENUM('BOOKING_CREATED', 'BOOKING_CANCELLED', 'DEPARTURE_STATUS_CHANGED', 'ENQUIRY_CREATED', 'EXPEDITION_SAVED', 'DEPARTURE_CREATED', 'ENQUIRY_UPDATED', 'MEDIA_UPLOADED', 'MEDIA_DELETED', 'HERO_SLIDE_SAVED', 'HERO_SLIDE_DELETED', 'HERO_SLIDES_REORDERED', 'GALLERY_ITEM_ADDED', 'GALLERY_ITEM_DELETED', 'GALLERY_ITEMS_REORDERED', 'BLOG_POST_SAVED', 'BLOG_POST_DELETED', 'BLOG_CATEGORY_SAVED', 'BLOG_CATEGORY_DELETED', 'BLOG_COMMENT_MODERATED', 'BLOG_COMMENT_DELETED') NOT NULL;

-- CreateTable
CREATE TABLE `BlogCategory` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(80) NOT NULL,
    `slug` VARCHAR(100) NOT NULL,
    `description` VARCHAR(300) NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `BlogCategory_name_key`(`name`),
    UNIQUE INDEX `BlogCategory_slug_key`(`slug`),
    INDEX `BlogCategory_sortOrder_idx`(`sortOrder`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BlogTag` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(60) NOT NULL,
    `slug` VARCHAR(80) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `BlogTag_name_key`(`name`),
    UNIQUE INDEX `BlogTag_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BlogPost` (
    `id` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(160) NOT NULL,
    `title` VARCHAR(200) NOT NULL,
    `excerpt` VARCHAR(400) NOT NULL,
    `body` MEDIUMTEXT NOT NULL,
    `status` ENUM('DRAFT', 'PUBLISHED') NOT NULL DEFAULT 'DRAFT',
    `publishedAt` DATETIME(3) NULL,
    `readingMinutes` INTEGER NOT NULL DEFAULT 1,
    `featured` BOOLEAN NOT NULL DEFAULT false,
    `commentsEnabled` BOOLEAN NOT NULL DEFAULT true,
    `featuredImageUrl` VARCHAR(500) NULL,
    `featuredImageAlt` VARCHAR(240) NULL,
    `featuredMediaId` VARCHAR(191) NULL,
    `categoryId` VARCHAR(191) NULL,
    `authorStaffId` VARCHAR(191) NOT NULL,
    `metaTitle` VARCHAR(70) NULL,
    `metaDescription` VARCHAR(170) NULL,
    `robotsIndex` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `BlogPost_slug_key`(`slug`),
    INDEX `BlogPost_status_publishedAt_idx`(`status`, `publishedAt`),
    INDEX `BlogPost_categoryId_status_publishedAt_idx`(`categoryId`, `status`, `publishedAt`),
    INDEX `BlogPost_featured_status_publishedAt_idx`(`featured`, `status`, `publishedAt`),
    INDEX `BlogPost_authorStaffId_idx`(`authorStaffId`),
    INDEX `BlogPost_featuredMediaId_idx`(`featuredMediaId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BlogPostTag` (
    `postId` VARCHAR(191) NOT NULL,
    `tagId` VARCHAR(191) NOT NULL,

    INDEX `BlogPostTag_tagId_idx`(`tagId`),
    PRIMARY KEY (`postId`, `tagId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BlogComment` (
    `id` VARCHAR(191) NOT NULL,
    `postId` VARCHAR(191) NOT NULL,
    `authorName` VARCHAR(80) NOT NULL,
    `authorEmail` VARCHAR(191) NOT NULL,
    `body` TEXT NOT NULL,
    `status` ENUM('PENDING', 'APPROVED', 'SPAM') NOT NULL DEFAULT 'PENDING',
    `ipHash` VARCHAR(64) NULL,
    `userAgent` VARCHAR(255) NULL,
    `moderatedByStaffId` VARCHAR(191) NULL,
    `moderatedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `BlogComment_postId_status_createdAt_idx`(`postId`, `status`, `createdAt`),
    INDEX `BlogComment_status_createdAt_idx`(`status`, `createdAt`),
    INDEX `BlogComment_ipHash_createdAt_idx`(`ipHash`, `createdAt`),
    INDEX `BlogComment_moderatedByStaffId_idx`(`moderatedByStaffId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `BlogPost` ADD CONSTRAINT `BlogPost_featuredMediaId_fkey` FOREIGN KEY (`featuredMediaId`) REFERENCES `MediaAsset`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BlogPost` ADD CONSTRAINT `BlogPost_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `BlogCategory`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BlogPost` ADD CONSTRAINT `BlogPost_authorStaffId_fkey` FOREIGN KEY (`authorStaffId`) REFERENCES `StaffUser`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BlogPostTag` ADD CONSTRAINT `BlogPostTag_postId_fkey` FOREIGN KEY (`postId`) REFERENCES `BlogPost`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BlogPostTag` ADD CONSTRAINT `BlogPostTag_tagId_fkey` FOREIGN KEY (`tagId`) REFERENCES `BlogTag`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BlogComment` ADD CONSTRAINT `BlogComment_postId_fkey` FOREIGN KEY (`postId`) REFERENCES `BlogPost`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BlogComment` ADD CONSTRAINT `BlogComment_moderatedByStaffId_fkey` FOREIGN KEY (`moderatedByStaffId`) REFERENCES `StaffUser`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
