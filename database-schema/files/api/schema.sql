-- ===========================================================================
-- PROG2002 Web Development II - Assessment 3
-- Charity Events case study: database schema (Part 1 - Database improvements)
--
-- Target: MySQL 8.x (also verified against MariaDB 10.x used by SCU cPanel)
--
-- Changes made for Assessment 3
--   1. `events` gained `latitude` / `longitude` so the Open-Meteo weather API
--      can produce a forecast for the event location (Part 6 of the brief).
--   2. A new `registrations` table records who registered for which event.
--      One user (matched on email) may register for an event only once, which
--      is enforced by the uq_registration_event_email unique key.
--   3. A `categories` table was introduced so events can be filtered by
--      category on the client website and managed separately by staff.
--
-- Import with:
--     mysql -u <user> -p < schema.sql
--     mysql -u <user> -p < seed.sql
-- or paste both files into phpMyAdmin (SCU cPanel) -> SQL tab.
-- ===========================================================================

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS registrations;
DROP TABLE IF EXISTS events;
DROP TABLE IF EXISTS categories;
SET FOREIGN_KEY_CHECKS = 1;

-- ---------------------------------------------------------------------------
-- categories: lookup table for the charity event categories
-- ---------------------------------------------------------------------------
CREATE TABLE categories (
  category_id   INT AUTO_INCREMENT PRIMARY KEY,
  category_name VARCHAR(80)  NOT NULL UNIQUE,
  description   VARCHAR(255) NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- events: the charity events shown on the client website and managed by staff
-- ---------------------------------------------------------------------------
CREATE TABLE events (
  event_id      INT AUTO_INCREMENT PRIMARY KEY,
  category_id   INT           NOT NULL,
  event_name    VARCHAR(150)  NOT NULL,
  description   TEXT          NULL,
  event_date    DATETIME      NOT NULL,
  end_date      DATETIME      NULL,
  location_name VARCHAR(150)  NOT NULL,
  address       VARCHAR(255)  NULL,
  -- Added in Assessment 3: Open-Meteo needs coordinates to forecast the weather
  -- at the event location.
  latitude      DECIMAL(9,6)  NULL,
  longitude     DECIMAL(9,6)  NULL,
  capacity      INT           NOT NULL DEFAULT 100,
  ticket_price  DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  image_url     VARCHAR(500)  NULL,
  status        ENUM('Active','Past','Suspended') NOT NULL DEFAULT 'Active',
  created_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_events_category FOREIGN KEY (category_id) REFERENCES categories(category_id),
  INDEX idx_events_status (status),
  INDEX idx_events_date (event_date),
  INDEX idx_events_category (category_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- registrations: a ticket purchase / registration for one event
--
-- Relationship: one event has many registrations (1:M). The unique key on
-- (event_id, email) is the database-level guarantee of the rule "one user may
-- register for an event only once".
-- ---------------------------------------------------------------------------
CREATE TABLE registrations (
  registration_id   INT AUTO_INCREMENT PRIMARY KEY,
  event_id          INT           NOT NULL,
  full_name         VARCHAR(120)  NOT NULL,
  email             VARCHAR(150)  NOT NULL,
  phone             VARCHAR(30)   NOT NULL,
  registration_date DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  tickets           INT           NOT NULL DEFAULT 1,
  notes             VARCHAR(255)  NULL,
  CONSTRAINT fk_registrations_event FOREIGN KEY (event_id) REFERENCES events(event_id),
  CONSTRAINT uq_registration_event_email UNIQUE (event_id, email),
  INDEX idx_registrations_event (event_id),
  INDEX idx_registrations_date (registration_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
