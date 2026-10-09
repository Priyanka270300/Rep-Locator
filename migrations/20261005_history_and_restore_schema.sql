-- Schema Migration: History-Based Data Import and Version Restore
-- Date: 2026-10-05

CREATE TABLE IF NOT EXISTS `DatasetState` (
  `id` INT NOT NULL DEFAULT 1,
  `current_run_id` INT NULL,
  `current_version` INT NOT NULL DEFAULT 0,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO `DatasetState` (`id`, `current_run_id`, `current_version`)
VALUES (1, NULL, 0)
ON DUPLICATE KEY UPDATE `id`=`id`;

CREATE TABLE IF NOT EXISTS `ImportUpload` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `original_filename` VARCHAR(255) NOT NULL,
  `storage_key` VARCHAR(255) NOT NULL,
  `file_hash` VARCHAR(64) NOT NULL,
  `file_size` BIGINT NOT NULL,
  `actor` VARCHAR(255) DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `ImportPreview` (
  `id` VARCHAR(64) PRIMARY KEY,
  `operation` VARCHAR(32) NOT NULL, -- 'import' | 'restore'
  `mode` VARCHAR(32) NOT NULL, -- 'replace_selected' | 'replace_all' | 'add_records'
  `upload_id` INT NULL,
  `restore_from_run_id` INT NULL,
  `restore_from_version` INT NULL,
  `base_version` INT NOT NULL,
  `selected_brands` TEXT NULL,
  `candidate_hash` VARCHAR(64) NULL,
  `validation_status` VARCHAR(32) NOT NULL, -- 'valid' | 'invalid' | 'warnings'
  `validation_errors` JSON NULL,
  `validation_warnings` JSON NULL,
  `summary_diff` JSON NULL,
  `actor` VARCHAR(255) DEFAULT NULL,
  `is_consumed` TINYINT(1) NOT NULL DEFAULT 0,
  `expires_at` DATETIME NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_preview_status` (`validation_status`, `is_consumed`),
  INDEX `idx_preview_expires` (`expires_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `RepCandidate` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `preview_id` VARCHAR(64) NOT NULL,
  `rep_code` VARCHAR(255) NOT NULL,
  `brand` VARCHAR(255) NOT NULL,
  `agency` VARCHAR(255) DEFAULT NULL,
  `contact` VARCHAR(255) DEFAULT NULL,
  `address` VARCHAR(255) DEFAULT NULL,
  `city` VARCHAR(255) DEFAULT NULL,
  `state` VARCHAR(255) DEFAULT NULL,
  `zip` VARCHAR(255) DEFAULT NULL,
  `country` VARCHAR(255) DEFAULT NULL,
  `phone` VARCHAR(255) DEFAULT NULL,
  `fax` VARCHAR(255) DEFAULT NULL,
  `email` VARCHAR(255) DEFAULT NULL,
  INDEX `idx_candidate_preview` (`preview_id`),
  INDEX `idx_candidate_rep` (`preview_id`, `brand`, `rep_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `RepCountyCandidate` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `preview_id` VARCHAR(64) NOT NULL,
  `county` VARCHAR(255) NOT NULL,
  `state` VARCHAR(255) NOT NULL,
  `country` VARCHAR(255) DEFAULT NULL,
  `state_abbr` VARCHAR(255) DEFAULT NULL,
  `territory_id` INT DEFAULT NULL,
  `territory_name` VARCHAR(255) DEFAULT NULL,
  `brand` VARCHAR(255) NOT NULL,
  `rep_code` VARCHAR(255) NOT NULL,
  `notes` TEXT DEFAULT NULL,
  INDEX `idx_candidate_county_preview` (`preview_id`),
  INDEX `idx_candidate_county_brand` (`preview_id`, `brand`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `ImportRun` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `version_number` INT NULL,
  `operation` VARCHAR(32) NOT NULL, -- 'baseline' | 'import' | 'restore'
  `mode` VARCHAR(32) NOT NULL, -- 'replace_all' | 'replace_selected' | 'add_records'
  `status` VARCHAR(32) NOT NULL, -- 'running' | 'successful' | 'failed'
  `upload_id` INT NULL,
  `preview_id` VARCHAR(64) NULL,
  `previous_run_id` INT NULL,
  `previous_version` INT NULL,
  `restored_from_version` INT NULL,
  `actor` VARCHAR(255) DEFAULT NULL,
  `total_reps` INT NOT NULL DEFAULT 0,
  `total_territories` INT NOT NULL DEFAULT 0,
  `affected_brands` TEXT NULL,
  `checksum` VARCHAR(64) NULL,
  `error_message` TEXT NULL,
  `summary_diff` JSON NULL,
  `started_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `completed_at` DATETIME NULL,
  INDEX `idx_run_version` (`version_number`),
  INDEX `idx_run_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `RepSnapshot` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `run_id` INT NOT NULL,
  `rep_code` VARCHAR(255) NOT NULL,
  `brand` VARCHAR(255) NOT NULL,
  `agency` VARCHAR(255) DEFAULT NULL,
  `contact` VARCHAR(255) DEFAULT NULL,
  `address` VARCHAR(255) DEFAULT NULL,
  `city` VARCHAR(255) DEFAULT NULL,
  `state` VARCHAR(255) DEFAULT NULL,
  `zip` VARCHAR(255) DEFAULT NULL,
  `country` VARCHAR(255) DEFAULT NULL,
  `phone` VARCHAR(255) DEFAULT NULL,
  `fax` VARCHAR(255) DEFAULT NULL,
  `email` VARCHAR(255) DEFAULT NULL,
  INDEX `idx_snapshot_run` (`run_id`),
  INDEX `idx_snapshot_rep` (`run_id`, `brand`, `rep_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `RepCountySnapshot` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `run_id` INT NOT NULL,
  `county` VARCHAR(255) NOT NULL,
  `state` VARCHAR(255) NOT NULL,
  `country` VARCHAR(255) DEFAULT NULL,
  `state_abbr` VARCHAR(255) DEFAULT NULL,
  `territory_id` INT DEFAULT NULL,
  `territory_name` VARCHAR(255) DEFAULT NULL,
  `brand` VARCHAR(255) NOT NULL,
  `rep_code` VARCHAR(255) NOT NULL,
  `notes` TEXT DEFAULT NULL,
  INDEX `idx_county_snapshot_run` (`run_id`),
  INDEX `idx_county_snapshot_brand` (`run_id`, `brand`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
