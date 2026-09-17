-- CreateTable
CREATE TABLE `User` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `role` ENUM('admin', 'supervisor', 'intern') NOT NULL,
    `firstName` VARCHAR(191) NOT NULL,
    `lastName` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `password` VARCHAR(191) NOT NULL,
    `phoneNumber` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `profilePhotoUrl` TEXT NULL,
    `specialization` VARCHAR(191) NULL,
    `department` VARCHAR(191) NULL,
    `studentId` VARCHAR(191) NULL,
    `university` VARCHAR(191) NULL,
    `fieldOfStudy` VARCHAR(191) NULL,
    `academicLevel` VARCHAR(191) NULL,
    `registrationDate` DATETIME(3) NULL,
    `cvPath` VARCHAR(191) NULL,
    `teamId` INTEGER NULL,

    UNIQUE INDEX `User_email_key`(`email`),
    INDEX `User_teamId_idx`(`teamId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Team` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `nameFr` VARCHAR(191) NULL,
    `nameAr` VARCHAR(191) NULL,
    `description` TEXT NULL,
    `startDate` DATETIME(3) NOT NULL,
    `endDate` DATETIME(3) NOT NULL,
    `status` ENUM('Planned', 'Active', 'Completed', 'Cancelled') NOT NULL DEFAULT 'Planned',
    `supervisorId` INTEGER NULL,

    INDEX `Team_supervisorId_idx`(`supervisorId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Application` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `firstName` VARCHAR(191) NOT NULL,
    `lastName` VARCHAR(191) NOT NULL,
    `personalId` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NOT NULL,
    `birthday` DATETIME(3) NOT NULL,
    `university` VARCHAR(191) NOT NULL,
    `major` VARCHAR(191) NOT NULL,
    `grade` VARCHAR(191) NOT NULL,
    `teamPreference` VARCHAR(191) NULL,
    `startDate` DATETIME(3) NOT NULL,
    `endDate` DATETIME(3) NOT NULL,
    `password` VARCHAR(191) NOT NULL,
    `cvFileName` VARCHAR(191) NULL,
    `cvFileUrl` VARCHAR(191) NULL,
    `photoFileName` VARCHAR(191) NULL,
    `photoFileUrl` VARCHAR(191) NULL,
    `agreementFileName` VARCHAR(191) NULL,
    `agreementFileUrl` VARCHAR(191) NULL,
    `internshipRequestFileName` VARCHAR(191) NULL,
    `internshipRequestFileUrl` VARCHAR(191) NULL,
    `otherDocuments` JSON NULL,
    `submissionDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `status` ENUM('Pending', 'Accepted', 'Rejected', 'Cancelled') NOT NULL DEFAULT 'Pending',
    `rejectionReason` TEXT NULL,
    `reviewedAt` DATETIME(3) NULL,
    `internId` INTEGER NULL,
    `cvStatus` ENUM('Pending', 'Approved', 'Rejected') NOT NULL DEFAULT 'Pending',
    `cvRejectionReason` TEXT NULL,
    `photoStatus` ENUM('Pending', 'Approved', 'Rejected') NOT NULL DEFAULT 'Pending',
    `photoRejectionReason` TEXT NULL,
    `agreementStatus` ENUM('Pending', 'Approved', 'Rejected') NOT NULL DEFAULT 'Pending',
    `agreementRejectionReason` TEXT NULL,
    `internshipRequestStatus` ENUM('Pending', 'Approved', 'Rejected') NOT NULL DEFAULT 'Pending',
    `internshipRequestRejectionReason` TEXT NULL,

    UNIQUE INDEX `Application_internId_key`(`internId`),
    INDEX `Application_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Assignment` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `teamId` INTEGER NOT NULL,
    `supervisorId` INTEGER NOT NULL,
    `internId` INTEGER NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` TEXT NOT NULL,
    `creationDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `deadline` DATETIME(3) NOT NULL,
    `status` ENUM('Pending', 'InProgress', 'Submitted', 'Evaluated', 'Late') NOT NULL DEFAULT 'Pending',
    `priority` ENUM('Low', 'Medium', 'High') NOT NULL DEFAULT 'Medium',

    INDEX `Assignment_teamId_idx`(`teamId`),
    INDEX `Assignment_supervisorId_idx`(`supervisorId`),
    INDEX `Assignment_internId_idx`(`internId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Submission` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `assignmentId` INTEGER NOT NULL,
    `internId` INTEGER NOT NULL,
    `fileName` VARCHAR(191) NOT NULL,
    `fileUrl` VARCHAR(191) NOT NULL,
    `notes` TEXT NULL,
    `submissionDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `version` INTEGER NOT NULL DEFAULT 1,
    `grade` DOUBLE NULL,
    `feedback` TEXT NULL,
    `status` ENUM('Submitted', 'UnderReview', 'Accepted', 'Rejected') NOT NULL DEFAULT 'Submitted',

    INDEX `Submission_assignmentId_idx`(`assignmentId`),
    INDEX `Submission_internId_idx`(`internId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Attendance` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `internId` INTEGER NOT NULL,
    `supervisorId` INTEGER NOT NULL,
    `date` DATE NOT NULL,
    `arrivalTime` VARCHAR(191) NULL,
    `departureTime` VARCHAR(191) NULL,
    `status` ENUM('Present', 'Absent', 'Late', 'Justified') NOT NULL,
    `remarks` TEXT NULL,

    INDEX `Attendance_supervisorId_idx`(`supervisorId`),
    UNIQUE INDEX `Attendance_internId_date_key`(`internId`, `date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DocumentRequest` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `internId` INTEGER NOT NULL,
    `adminId` INTEGER NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` TEXT NOT NULL,
    `requestDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `deadline` DATETIME(3) NOT NULL,
    `status` ENUM('Pending', 'Submitted', 'Approved', 'Rejected', 'Cancelled') NOT NULL DEFAULT 'Pending',
    `rejectionReason` TEXT NULL,

    INDEX `DocumentRequest_internId_idx`(`internId`),
    INDEX `DocumentRequest_adminId_idx`(`adminId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Document` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `requestId` INTEGER NOT NULL,
    `internId` INTEGER NOT NULL,
    `fileName` VARCHAR(191) NOT NULL,
    `fileUrl` VARCHAR(191) NOT NULL,
    `documentType` ENUM('CV', 'MotivationLetter', 'InternshipAgreement', 'IdentityDocument', 'Report', 'Certificate', 'Other') NOT NULL,
    `uploadDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `version` INTEGER NOT NULL DEFAULT 1,
    `status` ENUM('Pending', 'Approved', 'Rejected') NOT NULL DEFAULT 'Pending',
    `rejectionReason` TEXT NULL,

    INDEX `Document_requestId_idx`(`requestId`),
    INDEX `Document_internId_idx`(`internId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Notification` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `titleKey` VARCHAR(191) NOT NULL,
    `messageKey` VARCHAR(191) NOT NULL,
    `params` JSON NULL,
    `notificationType` ENUM('Application', 'Assignment', 'Document', 'Attendance', 'Evaluation', 'System') NOT NULL,
    `link` VARCHAR(191) NULL,
    `creationDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `isRead` BOOLEAN NOT NULL DEFAULT false,

    INDEX `Notification_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CalendarEvent` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(191) NOT NULL,
    `date` DATE NOT NULL,
    `type` ENUM('start', 'end', 'holiday', 'event') NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `User` ADD CONSTRAINT `User_teamId_fkey` FOREIGN KEY (`teamId`) REFERENCES `Team`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Team` ADD CONSTRAINT `Team_supervisorId_fkey` FOREIGN KEY (`supervisorId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Application` ADD CONSTRAINT `Application_internId_fkey` FOREIGN KEY (`internId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Assignment` ADD CONSTRAINT `Assignment_teamId_fkey` FOREIGN KEY (`teamId`) REFERENCES `Team`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Assignment` ADD CONSTRAINT `Assignment_supervisorId_fkey` FOREIGN KEY (`supervisorId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Assignment` ADD CONSTRAINT `Assignment_internId_fkey` FOREIGN KEY (`internId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Submission` ADD CONSTRAINT `Submission_assignmentId_fkey` FOREIGN KEY (`assignmentId`) REFERENCES `Assignment`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Submission` ADD CONSTRAINT `Submission_internId_fkey` FOREIGN KEY (`internId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Attendance` ADD CONSTRAINT `Attendance_internId_fkey` FOREIGN KEY (`internId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Attendance` ADD CONSTRAINT `Attendance_supervisorId_fkey` FOREIGN KEY (`supervisorId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DocumentRequest` ADD CONSTRAINT `DocumentRequest_internId_fkey` FOREIGN KEY (`internId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DocumentRequest` ADD CONSTRAINT `DocumentRequest_adminId_fkey` FOREIGN KEY (`adminId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Document` ADD CONSTRAINT `Document_requestId_fkey` FOREIGN KEY (`requestId`) REFERENCES `DocumentRequest`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Document` ADD CONSTRAINT `Document_internId_fkey` FOREIGN KEY (`internId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Notification` ADD CONSTRAINT `Notification_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
