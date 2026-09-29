-- CreateTable
CREATE TABLE `Region` (
    `id` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(140) NOT NULL,
    `name` VARCHAR(160) NOT NULL,
    `summary` TEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Region_slug_key`(`slug`),
    INDEX `Region_name_idx`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CancellationPolicy` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(160) NOT NULL,
    `summary` TEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Expedition` (
    `id` VARCHAR(191) NOT NULL,
    `regionId` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(140) NOT NULL,
    `title` VARCHAR(180) NOT NULL,
    `vehicleClass` ENUM('SUV_4X4', 'MOTORBIKE') NOT NULL,
    `durationDays` INTEGER NOT NULL,
    `maxAltitudeMeters` INTEGER NOT NULL,
    `difficulty` ENUM('MODERATE', 'CHALLENGING', 'STRENUOUS', 'EXTREME') NOT NULL,
    `seasonLabel` VARCHAR(120) NOT NULL,
    `seasonStartMonth` INTEGER NULL,
    `seasonEndMonth` INTEGER NULL,
    `summary` TEXT NOT NULL,
    `inclusions` TEXT NOT NULL,
    `exclusions` TEXT NOT NULL,
    `permitNotes` TEXT NULL,
    `supportVehicleIncluded` BOOLEAN NOT NULL DEFAULT true,
    `heroImageUrl` VARCHAR(500) NULL,
    `status` ENUM('DRAFT', 'PUBLISHED', 'ARCHIVED') NOT NULL DEFAULT 'DRAFT',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Expedition_slug_key`(`slug`),
    INDEX `Expedition_regionId_status_idx`(`regionId`, `status`),
    INDEX `Expedition_vehicleClass_status_idx`(`vehicleClass`, `status`),
    INDEX `Expedition_status_title_idx`(`status`, `title`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ItineraryDay` (
    `id` VARCHAR(191) NOT NULL,
    `expeditionId` VARCHAR(191) NOT NULL,
    `dayNumber` INTEGER NOT NULL,
    `title` VARCHAR(180) NOT NULL,
    `body` TEXT NOT NULL,
    `sleepStop` VARCHAR(180) NOT NULL,
    `sleepAltitudeMeters` INTEGER NOT NULL,
    `movingHours` DECIMAL(4, 1) NOT NULL,

    INDEX `ItineraryDay_expeditionId_idx`(`expeditionId`),
    UNIQUE INDEX `ItineraryDay_expeditionId_dayNumber_key`(`expeditionId`, `dayNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Departure` (
    `id` VARCHAR(191) NOT NULL,
    `expeditionId` VARCHAR(191) NOT NULL,
    `cancellationPolicyId` VARCHAR(191) NULL,
    `startDate` DATE NOT NULL,
    `endDate` DATE NOT NULL,
    `meetingPoint` VARCHAR(255) NOT NULL,
    `capacity` INTEGER NOT NULL,
    `seatsRemaining` INTEGER NOT NULL,
    `pillionConsumesSlot` BOOLEAN NOT NULL DEFAULT false,
    `pricePaisa` INTEGER NOT NULL,
    `depositPaisa` INTEGER NOT NULL,
    `status` ENUM('DRAFT', 'OPEN', 'FULL', 'CLOSED', 'CANCELLED', 'COMPLETED') NOT NULL DEFAULT 'DRAFT',
    `policySnapshot` TEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Departure_expeditionId_startDate_idx`(`expeditionId`, `startDate`),
    INDEX `Departure_expeditionId_status_startDate_idx`(`expeditionId`, `status`, `startDate`),
    INDEX `Departure_status_startDate_idx`(`status`, `startDate`),
    INDEX `Departure_cancellationPolicyId_idx`(`cancellationPolicyId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Booking` (
    `id` VARCHAR(191) NOT NULL,
    `departureId` VARCHAR(191) NOT NULL,
    `reference` VARCHAR(32) NOT NULL,
    `status` ENUM('REQUESTED', 'PENDING_PAYMENT', 'DEPOSIT_PAID', 'PAID', 'CANCELLED', 'REFUNDED') NOT NULL DEFAULT 'REQUESTED',
    `partySize` INTEGER NOT NULL,
    `unitsHeld` INTEGER NOT NULL,
    `amountDuePaisa` INTEGER NOT NULL,
    `depositDuePaisa` INTEGER NOT NULL,
    `amountPaidPaisa` INTEGER NOT NULL DEFAULT 0,
    `policyAcknowledgedAt` DATETIME(3) NOT NULL,
    `policySnapshot` TEXT NOT NULL,
    `cancelledAt` DATETIME(3) NULL,
    `cancelReason` TEXT NULL,
    `cancelledByStaffId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Booking_reference_key`(`reference`),
    INDEX `Booking_departureId_status_idx`(`departureId`, `status`),
    INDEX `Booking_status_createdAt_idx`(`status`, `createdAt`),
    INDEX `Booking_cancelledByStaffId_idx`(`cancelledByStaffId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Traveler` (
    `id` VARCHAR(191) NOT NULL,
    `bookingId` VARCHAR(191) NOT NULL,
    `isLead` BOOLEAN NOT NULL DEFAULT false,
    `isPillion` BOOLEAN NOT NULL DEFAULT false,
    `fullName` VARCHAR(160) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(32) NOT NULL,
    `emergencyName` VARCHAR(160) NOT NULL,
    `emergencyPhone` VARCHAR(32) NOT NULL,
    `experienceLevel` ENUM('NONE', 'SOME', 'EXPERIENCED', 'ADVANCED') NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Traveler_bookingId_isLead_idx`(`bookingId`, `isLead`),
    INDEX `Traveler_email_idx`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MedicalDeclaration` (
    `id` VARCHAR(191) NOT NULL,
    `travelerId` VARCHAR(191) NOT NULL,
    `declarationText` TEXT NOT NULL,
    `fitnessAcknowledged` BOOLEAN NOT NULL,
    `acknowledgedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `MedicalDeclaration_travelerId_key`(`travelerId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Enquiry` (
    `id` VARCHAR(191) NOT NULL,
    `kind` ENUM('GENERAL', 'WAITLIST', 'CUSTOM_PRIVATE') NOT NULL,
    `status` ENUM('OPEN', 'CONTACTED', 'CONVERTED', 'CLOSED') NOT NULL DEFAULT 'OPEN',
    `expeditionId` VARCHAR(191) NULL,
    `departureId` VARCHAR(191) NULL,
    `vehicleClass` ENUM('SUV_4X4', 'MOTORBIKE') NULL,
    `name` VARCHAR(160) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(32) NOT NULL,
    `preferredMonth` VARCHAR(7) NULL,
    `partySize` INTEGER NULL,
    `message` TEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Enquiry_kind_status_createdAt_idx`(`kind`, `status`, `createdAt`),
    INDEX `Enquiry_status_createdAt_idx`(`status`, `createdAt`),
    INDEX `Enquiry_expeditionId_idx`(`expeditionId`),
    INDEX `Enquiry_departureId_idx`(`departureId`),
    INDEX `Enquiry_email_idx`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `StaffUser` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `name` VARCHAR(160) NOT NULL,
    `role` ENUM('OPS_ADMIN', 'EXPEDITION_LEAD', 'GUIDE', 'FINANCE', 'VIEWER') NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `StaffUser_email_key`(`email`),
    INDEX `StaffUser_role_isActive_idx`(`role`, `isActive`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AuditLog` (
    `id` VARCHAR(191) NOT NULL,
    `actorStaffId` VARCHAR(191) NULL,
    `action` ENUM('BOOKING_CREATED', 'BOOKING_CANCELLED', 'DEPARTURE_STATUS_CHANGED', 'ENQUIRY_CREATED') NOT NULL,
    `entityType` VARCHAR(64) NOT NULL,
    `entityId` VARCHAR(64) NOT NULL,
    `reason` VARCHAR(500) NOT NULL,
    `before` JSON NULL,
    `after` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `AuditLog_entityType_entityId_idx`(`entityType`, `entityId`),
    INDEX `AuditLog_actorStaffId_createdAt_idx`(`actorStaffId`, `createdAt`),
    INDEX `AuditLog_action_createdAt_idx`(`action`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Expedition` ADD CONSTRAINT `Expedition_regionId_fkey` FOREIGN KEY (`regionId`) REFERENCES `Region`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ItineraryDay` ADD CONSTRAINT `ItineraryDay_expeditionId_fkey` FOREIGN KEY (`expeditionId`) REFERENCES `Expedition`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Departure` ADD CONSTRAINT `Departure_expeditionId_fkey` FOREIGN KEY (`expeditionId`) REFERENCES `Expedition`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Departure` ADD CONSTRAINT `Departure_cancellationPolicyId_fkey` FOREIGN KEY (`cancellationPolicyId`) REFERENCES `CancellationPolicy`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Booking` ADD CONSTRAINT `Booking_departureId_fkey` FOREIGN KEY (`departureId`) REFERENCES `Departure`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Booking` ADD CONSTRAINT `Booking_cancelledByStaffId_fkey` FOREIGN KEY (`cancelledByStaffId`) REFERENCES `StaffUser`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Traveler` ADD CONSTRAINT `Traveler_bookingId_fkey` FOREIGN KEY (`bookingId`) REFERENCES `Booking`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MedicalDeclaration` ADD CONSTRAINT `MedicalDeclaration_travelerId_fkey` FOREIGN KEY (`travelerId`) REFERENCES `Traveler`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Enquiry` ADD CONSTRAINT `Enquiry_expeditionId_fkey` FOREIGN KEY (`expeditionId`) REFERENCES `Expedition`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Enquiry` ADD CONSTRAINT `Enquiry_departureId_fkey` FOREIGN KEY (`departureId`) REFERENCES `Departure`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AuditLog` ADD CONSTRAINT `AuditLog_actorStaffId_fkey` FOREIGN KEY (`actorStaffId`) REFERENCES `StaffUser`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

