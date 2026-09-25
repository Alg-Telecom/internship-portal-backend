-- AlterTable
ALTER TABLE `DocumentRequest` MODIFY `status` ENUM('Pending', 'Submitted', 'Approved', 'Rejected', 'Cancelled', 'Late') NOT NULL DEFAULT 'Pending';
