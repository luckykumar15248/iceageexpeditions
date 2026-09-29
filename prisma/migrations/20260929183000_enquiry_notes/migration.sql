-- AlterTable
ALTER TABLE `Enquiry` MODIFY `status` ENUM('OPEN', 'CONTACTED', 'CONVERTED', 'CLOSED', 'QUOTED') NOT NULL DEFAULT 'OPEN';

-- CreateTable
CREATE TABLE `EnquiryNote` (
    `id` VARCHAR(191) NOT NULL,
    `enquiryId` VARCHAR(191) NOT NULL,
    `authorStaffId` VARCHAR(191) NOT NULL,
    `body` TEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `EnquiryNote_enquiryId_createdAt_idx`(`enquiryId`, `createdAt`),
    INDEX `EnquiryNote_authorStaffId_idx`(`authorStaffId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `EnquiryNote` ADD CONSTRAINT `EnquiryNote_enquiryId_fkey` FOREIGN KEY (`enquiryId`) REFERENCES `Enquiry`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EnquiryNote` ADD CONSTRAINT `EnquiryNote_authorStaffId_fkey` FOREIGN KEY (`authorStaffId`) REFERENCES `StaffUser`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
