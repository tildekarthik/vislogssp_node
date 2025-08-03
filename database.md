-- vislogssp.recordings definition

CREATE TABLE `recordings` (
  `recordings_pk` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `location_code` varchar(50) NOT NULL,
  `recording_ref` varchar(50) NOT NULL,
  `status` varchar(50) DEFAULT NULL,
  `created_at` bigint(20) unsigned DEFAULT NULL,
  `frozen_at` bigint(20) unsigned DEFAULT NULL,
  PRIMARY KEY (`recordings_pk`),
  UNIQUE KEY `uniq_location_order` (`location_code`,`recording_ref`),
  KEY `recordings_location_code_IDX` (`location_code`) USING BTREE,
  KEY `recordings_recording_ref_IDX` (`recording_ref`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;



-- vislogssp.images definition

CREATE TABLE `images` (
  `images_pk` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `location_code` varchar(50) NOT NULL,
  `recording_ref` varchar(50) NOT NULL,
  `view_name` varchar(20) NOT NULL,
  `uploaded_at` bigint(20) unsigned NOT NULL,
  PRIMARY KEY (`images_pk`),
  UNIQUE KEY `uniq_location_ref_view` (`location_code`,`recording_ref`,`view_name`),
  KEY `images_location_code_IDX` (`location_code`) USING BTREE,
  KEY `images_recording_ref_IDX` (`recording_ref`) USING BTREE,
  KEY `images_view_name_IDX` (`view_name`) USING BTREE,
  KEY `images_uploaded_at_IDX` (`uploaded_at`) USING BTREE,
  KEY `images_locationrefview_code_IDX` (`location_code`,`recording_ref`,`view_name`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


