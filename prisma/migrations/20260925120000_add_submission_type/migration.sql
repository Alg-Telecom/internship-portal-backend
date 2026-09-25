-- AlterTable
ALTER TABLE `Submission` ADD COLUMN `submissionType` ENUM('File', 'Archive', 'Link') NOT NULL DEFAULT 'File',
    MODIFY `fileUrl` TEXT NOT NULL;
