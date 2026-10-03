-- Route map and altitude profile. Additive nullable columns only; existing rows keep NULL.

-- AlterTable
ALTER TABLE `Expedition` ADD COLUMN `routeStartAltitudeMeters` INTEGER NULL,
    ADD COLUMN `routeStartLatitude` DECIMAL(9, 6) NULL,
    ADD COLUMN `routeStartLongitude` DECIMAL(9, 6) NULL,
    ADD COLUMN `routeStartName` VARCHAR(180) NULL;

-- AlterTable
ALTER TABLE `ItineraryDay` ADD COLUMN `campLatitude` DECIMAL(9, 6) NULL,
    ADD COLUMN `campLongitude` DECIMAL(9, 6) NULL,
    ADD COLUMN `highPointAltitudeMeters` INTEGER NULL,
    ADD COLUMN `highPointName` VARCHAR(180) NULL;
