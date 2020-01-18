START TRANSACTION;
SET time_zone = "+00:00";

ALTER TABLE `Rep`
    ADD COLUMN `brand` VARCHAR(255) AFTER `rep_code`;

ALTER TABLE `RepCounty`
  DROP KEY `Unique`,
  DROP KEY `rep_code`;

ALTER TABLE `RepCounty`
  ADD UNIQUE KEY `Unique` (`county`,`state`,`brand`, `rep_code`) USING BTREE;

COMMIT;
