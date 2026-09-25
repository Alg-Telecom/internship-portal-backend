-- AlterTable
ALTER TABLE `Document` ADD COLUMN `uploadType` ENUM('File', 'Archive', 'Link') NOT NULL DEFAULT 'File',
    MODIFY `fileUrl` TEXT NOT NULL;
