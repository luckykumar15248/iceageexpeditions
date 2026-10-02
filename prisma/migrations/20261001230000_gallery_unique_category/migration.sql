-- Prevent the same library asset from being added to the public gallery twice,
-- and allow optional staff-entered categories (Ladakh, Spiti, Zanskar, On the trail).

ALTER TABLE `GalleryItem`
  ADD COLUMN `category` VARCHAR(80) NULL AFTER `caption`;

-- The mediaAssetId foreign key needs an index at all times, so add the unique
-- index before dropping the plain one it replaces.
ALTER TABLE `GalleryItem`
  ADD UNIQUE INDEX `GalleryItem_mediaAssetId_key` (`mediaAssetId`);

DROP INDEX `GalleryItem_mediaAssetId_idx` ON `GalleryItem`;

CREATE INDEX `GalleryItem_category_idx` ON `GalleryItem` (`category`);
