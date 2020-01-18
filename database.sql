-- phpMyAdmin SQL Dump
-- version 4.7.8
-- https://www.phpmyadmin.net/
--
-- Host: db
-- Generation Time: Mar 01, 2018 at 05:46 PM
-- Server version: 5.7.21
-- PHP Version: 7.2.2

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET AUTOCOMMIT = 0;
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `database`
--

-- --------------------------------------------------------

--
-- Table structure for table `Rep`
--

-- Create syntax for TABLE 'Rep'
CREATE TABLE `Rep` (
  `rep_code` varchar(11) NOT NULL,
  `brand` varchar(255) NOT NULL,
  `agency` varchar(255) DEFAULT NULL,
  `contact` varchar(255) DEFAULT NULL,
  `address` varchar(255) DEFAULT NULL,
  `city` varchar(255) DEFAULT NULL,
  `state` varchar(255) DEFAULT NULL,
  `zip` varchar(255) DEFAULT NULL,
  `phone` varchar(255) DEFAULT NULL,
  `fax` varchar(255) DEFAULT NULL,
  `email` varchar(255) NOT NULL,
  PRIMARY KEY (`rep_code`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

-- Create syntax for TABLE 'RepCounty'
CREATE TABLE `RepCounty` (
  `county` varchar(255) NOT NULL,
  `state` varchar(255) NOT NULL,
  `state_abbr` varchar(4) DEFAULT NULL,
  `territory_id` int(11) DEFAULT NULL,
  `territory_name` varchar(255) DEFAULT NULL,
  `brand` varchar(255) NOT NULL,
  `rep_code` varchar(11) NOT NULL,
  `notes` text,
  UNIQUE KEY `unique_fk` (`county`,`state`,`brand`,`rep_code`) USING BTREE,
  KEY `rep_code` (`rep_code`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

-- Create syntax for TABLE 'Zip'
CREATE TABLE `Zip` (
  `zip` varchar(255) NOT NULL,
  `county` varchar(255) NOT NULL,
  `state` varchar(255) NOT NULL,
  UNIQUE KEY `Unique` (`zip`,`county`,`state`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
