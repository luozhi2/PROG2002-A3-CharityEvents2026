-- ===========================================================================
-- PROG2002 Web Development II - Assessment 3
-- Charity Events case study: initial data
--
-- Run AFTER schema.sql. Provides a realistic dataset for the website:
--   5 categories, 8 charity events (Active / Past / Suspended) and
--   14 registrations, exceeding the required minimum of 10.
--
-- TIMEZONE CONVENTION: every event datetime below is an Australia/Sydney
-- wall-clock time. CURDATE() is used with an explicit INTERVAL ... HOUR rather
-- than NOW(), so the time of day is exactly what is intended whatever timezone
-- the MySQL server runs in. See api/lib/timezone.js for the full explanation.
--
-- Relative dates are used so the "upcoming events" and "latest registration
-- first" behaviour is visible whenever the file is imported.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- Categories
-- ---------------------------------------------------------------------------
INSERT INTO categories (category_id, category_name, description) VALUES
  (1, 'Health',        'Fundraising for hospitals, medical research and patient support.'),
  (2, 'Environment',   'Conservation, clean-up and sustainability projects.'),
  (3, 'Education',     'Scholarships, school resources and literacy programmes.'),
  (4, 'Community',     'Local neighbourhood support and emergency relief.'),
  (5, 'Animal Welfare','Rescue, rehoming and shelter support for animals.');

-- ---------------------------------------------------------------------------
-- Events
-- event_date uses DATE_ADD(NOW(), ...) so upcoming events stay upcoming.
-- latitude / longitude are the real coordinates of each location and are what
-- the Open-Meteo weather API is queried with.
-- ---------------------------------------------------------------------------
INSERT INTO events
  (event_id, category_id, event_name, description, event_date, end_date,
   location_name, address, latitude, longitude, capacity, ticket_price, status) VALUES
  (1, 2, 'Coastal Clean-Up Charity Walk',
      'A 5 km sponsored walk along the foreshore. Every kilometre cleaned raises money for marine conservation and the ticket price includes a reusable clean-up kit.',
      DATE_ADD(CURDATE(), INTERVAL 12 DAY) + INTERVAL 9 HOUR, DATE_ADD(CURDATE(), INTERVAL 12 DAY) + INTERVAL 13 HOUR,
      'Lismore Riverside Park', 'Riverside Park, Lismore NSW 2480',
      -28.813000, 153.278000, 200, 15.00, 'Active'),

  (2, 1, 'Charity Fun Run for Regional Health',
      'A timed 10 km fun run raising funds for medical equipment at the regional hospital. Walkers and families are welcome on the 3 km course.',
      DATE_ADD(CURDATE(), INTERVAL 25 DAY) + INTERVAL 7 HOUR, DATE_ADD(CURDATE(), INTERVAL 25 DAY) + INTERVAL 12 HOUR,
      'Coffs Harbour Jetty Foreshore', 'Marina Drive, Coffs Harbour NSW 2450',
      -30.296000, 153.142000, 500, 25.00, 'Active'),

  (3, 3, 'Books for Brighter Futures Gala',
      'An evening gala dinner with a silent auction supporting literacy programmes in rural schools. Ticket price includes a three course meal.',
      DATE_ADD(CURDATE(), INTERVAL 40 DAY) + INTERVAL 18 HOUR, DATE_ADD(CURDATE(), INTERVAL 40 DAY) + INTERVAL 22 HOUR,
      'Lismore City Hall', '1 Bounty Street, Lismore NSW 2480',
      -28.810000, 153.276000, 150, 85.00, 'Active'),

  (4, 5, 'Paws and Pals Animal Rescue Open Day',
      'Meet the rescue animals looking for a home, join a guided shelter tour and take part in the sponsored dog walk. Free entry with donations welcome.',
      DATE_ADD(CURDATE(), INTERVAL 6 DAY) + INTERVAL 10 HOUR, DATE_ADD(CURDATE(), INTERVAL 6 DAY) + INTERVAL 16 HOUR,
      'Ballina Animal Rescue Shelter', '22 Fox Street, Ballina NSW 2478',
      -28.864000, 153.565000, 300, 0.00, 'Active'),

  (5, 4, 'Winter Warmth Community Appeal',
      'A fundraising drive collecting blankets, warm clothing and non-perishable food for families in need across the Northern Rivers region.',
      DATE_ADD(CURDATE(), INTERVAL 18 DAY) + INTERVAL 8 HOUR, DATE_ADD(CURDATE(), INTERVAL 18 DAY) + INTERVAL 16 HOUR,
      'Byron Bay Community Centre', '1 Gilmore Crescent, Byron Bay NSW 2481',
      -28.643000, 153.612000, 250, 10.00, 'Active'),

  (6, 2, 'Rainforest Revegetation Day',
      'A hands-on tree planting morning restoring a corridor of subtropical rainforest. Tools, gloves and a barbecue lunch are provided.',
      DATE_SUB(CURDATE(), INTERVAL 35 DAY) + INTERVAL 8 HOUR, DATE_SUB(CURDATE(), INTERVAL 35 DAY) + INTERVAL 14 HOUR,
      'Nightcap National Park', 'Terania Creek Road, The Channon NSW 2480',
      -28.575000, 153.301000, 120, 5.00, 'Past'),

  (7, 1, 'Mental Health Awareness Breakfast',
      'A community breakfast with guest speakers sharing lived experience of mental health recovery. All proceeds fund local counselling services.',
      DATE_SUB(CURDATE(), INTERVAL 70 DAY) + INTERVAL 7 HOUR, DATE_SUB(CURDATE(), INTERVAL 70 DAY) + INTERVAL 10 HOUR,
      'Southern Cross University Lismore', 'Military Road, East Lismore NSW 2480',
      -28.818000, 153.300000, 180, 35.00, 'Past'),

  (8, 3, 'Regional Scholarship Trivia Night',
      'A trivia night raising funds for first-in-family university scholarships. This event has been suspended while a new venue is confirmed.',
      DATE_ADD(CURDATE(), INTERVAL 55 DAY) + INTERVAL 18 HOUR, DATE_ADD(CURDATE(), INTERVAL 55 DAY) + INTERVAL 22 HOUR,
      'Tweed Heads Civic Centre', 'Brett Street, Tweed Heads NSW 2485',
      -28.177000, 153.541000, 220, 20.00, 'Suspended');

-- ---------------------------------------------------------------------------
-- Registrations (14 records across 5 events)
-- registration_date is deliberately staggered so the event page can prove it
-- lists registrations newest first.
-- ---------------------------------------------------------------------------
INSERT INTO registrations
  (registration_id, event_id, full_name, email, phone, registration_date, tickets, notes) VALUES
  (1,  1, 'Amelia Nguyen',    'amelia.nguyen@example.com',   '0412 345 678', DATE_SUB(NOW(), INTERVAL 21 DAY), 2, 'Bringing two reusable clean-up kits.'),
  (2,  1, 'Ben Carter',       'ben.carter@example.com',      '0413 456 789', DATE_SUB(NOW(), INTERVAL 17 DAY), 1, NULL),
  (3,  1, 'Chloe Adams',      'chloe.adams@example.com',     '0414 567 890', DATE_SUB(NOW(), INTERVAL 9 DAY),  4, 'Family group of four.'),
  (4,  1, 'Daniel Okafor',    'daniel.okafor@example.com',   '0415 678 901', DATE_SUB(NOW(), INTERVAL 3 DAY),  1, 'Vegetarian lunch please.'),
  (5,  2, 'Priya Sharma',     'priya.sharma@example.com',    '0416 789 012', DATE_SUB(NOW(), INTERVAL 20 DAY), 3, NULL),
  (6,  2, 'Ethan Brooks',     'ethan.brooks@example.com',    '0417 890 123', DATE_SUB(NOW(), INTERVAL 14 DAY), 1, 'Registered for the 10 km course.'),
  (7,  2, 'Fatima Al-Hassan', 'fatima.alhassan@example.com', '0418 901 234', DATE_SUB(NOW(), INTERVAL 5 DAY),  2, NULL),
  (8,  3, 'Grace Liu',        'grace.liu@example.com',       '0419 012 345', DATE_SUB(NOW(), INTERVAL 11 DAY), 2, 'Table of two near the stage.'),
  (9,  3, 'Henry Walsh',      'henry.walsh@example.com',     '0420 123 456', DATE_SUB(NOW(), INTERVAL 6 DAY),  1, NULL),
  (10, 3, 'Isla Robertson',   'isla.robertson@example.com',  '0421 234 567', DATE_SUB(NOW(), INTERVAL 2 DAY),  2, 'Gluten free meal required.'),
  (11, 4, 'Jacob Meyer',      'jacob.meyer@example.com',     '0422 345 678', DATE_SUB(NOW(), INTERVAL 8 DAY),  3, 'Two adults and one child.'),
  (12, 4, 'Kavya Patel',      'kavya.patel@example.com',     '0423 456 789', DATE_SUB(NOW(), INTERVAL 4 DAY),  1, NULL),
  (13, 5, 'Liam O''Connor',   'liam.oconnor@example.com',    '0424 567 890', DATE_SUB(NOW(), INTERVAL 7 DAY),  2, 'Donating blankets as well.'),
  (14, 5, 'Mia Fernandez',    'mia.fernandez@example.com',   '0425 678 901', DATE_SUB(NOW(), INTERVAL 1 DAY),  4, 'Collecting on behalf of a community group.');
