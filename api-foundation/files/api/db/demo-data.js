'use strict';

/**
 * Demonstration dataset used when MySQL is not reachable (USE_DEMO_DATA=true or a
 * failed database connection). The values mirror api/seed.sql so the website
 * shows the same information before and after the database is imported.
 *
 * TIMEZONE CONVENTION - see lib/timezone.js for the full explanation:
 * every datetime here is an **Australia/Sydney wall-clock** value, exactly as it
 * would be stored in a MySQL DATETIME column. "2026-10-28 09:00:00" means 9:00 am
 * in Sydney. The API converts these to real UTC instants on the way out, so a
 * browser in any timezone renders the time the organiser actually intended.
 *
 * Dates are computed relative to today so upcoming events stay upcoming, but the
 * time of day is always the intended Sydney local time: an event advertised for
 * 9:00 am is at 9:00 am whichever machine loads the demo.
 */

const { sydneyWallClockIn } = require('../lib/timezone');

/** A Sydney wall-clock datetime `days` from today. */
const at = (days, hour, minute = 0) => sydneyWallClockIn(days, hour, minute);

/** A Sydney wall-clock datetime `days` in the past, at a fixed time of day. */
const daysAgo = (days, hour, minute = 0) => at(-days, hour, minute);

const categories = [
  { category_id: 1, category_name: 'Health', description: 'Fundraising for hospitals, medical research and patient support.' },
  { category_id: 2, category_name: 'Environment', description: 'Conservation, clean-up and sustainability projects.' },
  { category_id: 3, category_name: 'Education', description: 'Scholarships, school resources and literacy programmes.' },
  { category_id: 4, category_name: 'Community', description: 'Local neighbourhood support and emergency relief.' },
  { category_id: 5, category_name: 'Animal Welfare', description: 'Rescue, rehoming and shelter support for animals.' }
];

const events = [
  {
    event_id: 1, category_id: 2, event_name: 'Coastal Clean-Up Charity Walk',
    description: 'A 5 km sponsored walk along the foreshore. Every kilometre cleaned raises money for marine conservation and the ticket price includes a reusable clean-up kit.',
    event_date: at(12, 9), end_date: at(12, 13),
    location_name: 'Lismore Riverside Park', address: 'Riverside Park, Lismore NSW 2480',
    latitude: -28.813, longitude: 153.278, capacity: 200, ticket_price: '15.00',
    image_url: null, status: 'Active'
  },
  {
    event_id: 2, category_id: 1, event_name: 'Charity Fun Run for Regional Health',
    description: 'A timed 10 km fun run raising funds for medical equipment at the regional hospital. Walkers and families are welcome on the 3 km course.',
    event_date: at(25, 7), end_date: at(25, 12),
    location_name: 'Coffs Harbour Jetty Foreshore', address: 'Marina Drive, Coffs Harbour NSW 2450',
    latitude: -30.296, longitude: 153.142, capacity: 500, ticket_price: '25.00',
    image_url: null, status: 'Active'
  },
  {
    event_id: 3, category_id: 3, event_name: 'Books for Brighter Futures Gala',
    description: 'An evening gala dinner with a silent auction supporting literacy programmes in rural schools. Ticket price includes a three course meal.',
    event_date: at(40, 18), end_date: at(40, 22),
    location_name: 'Lismore City Hall', address: '1 Bounty Street, Lismore NSW 2480',
    latitude: -28.81, longitude: 153.276, capacity: 150, ticket_price: '85.00',
    image_url: null, status: 'Active'
  },
  {
    event_id: 4, category_id: 5, event_name: 'Paws and Pals Animal Rescue Open Day',
    description: 'Meet the rescue animals looking for a home, join a guided shelter tour and take part in the sponsored dog walk. Free entry with donations welcome.',
    event_date: at(6, 10), end_date: at(6, 16),
    location_name: 'Ballina Animal Rescue Shelter', address: '22 Fox Street, Ballina NSW 2478',
    latitude: -28.864, longitude: 153.565, capacity: 300, ticket_price: '0.00',
    image_url: null, status: 'Active'
  },
  {
    event_id: 5, category_id: 4, event_name: 'Winter Warmth Community Appeal',
    description: 'A fundraising drive collecting blankets, warm clothing and non-perishable food for families in need across the Northern Rivers region.',
    event_date: at(18, 8), end_date: at(18, 16),
    location_name: 'Byron Bay Community Centre', address: '1 Gilmore Crescent, Byron Bay NSW 2481',
    latitude: -28.643, longitude: 153.612, capacity: 250, ticket_price: '10.00',
    image_url: null, status: 'Active'
  },
  {
    event_id: 6, category_id: 2, event_name: 'Rainforest Revegetation Day',
    description: 'A hands-on tree planting morning restoring a corridor of subtropical rainforest. Tools, gloves and a barbecue lunch are provided.',
    event_date: at(-35, 8), end_date: at(-35, 14),
    location_name: 'Nightcap National Park', address: 'Terania Creek Road, The Channon NSW 2480',
    latitude: -28.575, longitude: 153.301, capacity: 120, ticket_price: '5.00',
    image_url: null, status: 'Past'
  },
  {
    event_id: 7, category_id: 1, event_name: 'Mental Health Awareness Breakfast',
    description: 'A community breakfast with guest speakers sharing lived experience of mental health recovery. All proceeds fund local counselling services.',
    event_date: at(-70, 7), end_date: at(-70, 10),
    location_name: 'Southern Cross University Lismore', address: 'Military Road, East Lismore NSW 2480',
    latitude: -28.818, longitude: 153.3, capacity: 180, ticket_price: '35.00',
    image_url: null, status: 'Past'
  },
  {
    event_id: 8, category_id: 3, event_name: 'Regional Scholarship Trivia Night',
    description: 'A trivia night raising funds for first-in-family university scholarships. This event has been suspended while a new venue is confirmed.',
    event_date: at(55, 18), end_date: at(55, 22),
    location_name: 'Tweed Heads Civic Centre', address: 'Brett Street, Tweed Heads NSW 2485',
    latitude: -28.177, longitude: 153.541, capacity: 220, ticket_price: '20.00',
    image_url: null, status: 'Suspended'
  }
];

const registrations = [
  { registration_id: 1, event_id: 1, full_name: 'Amelia Nguyen', email: 'amelia.nguyen@example.com', phone: '0412 345 678', registration_date: at(-21, 10, 12), tickets: 2, notes: 'Bringing two reusable clean-up kits.' },
  { registration_id: 2, event_id: 1, full_name: 'Ben Carter', email: 'ben.carter@example.com', phone: '0413 456 789', registration_date: at(-17, 14, 35), tickets: 1, notes: null },
  { registration_id: 3, event_id: 1, full_name: 'Chloe Adams', email: 'chloe.adams@example.com', phone: '0414 567 890', registration_date: at(-9, 9, 5), tickets: 4, notes: 'Family group of four.' },
  { registration_id: 4, event_id: 1, full_name: 'Daniel Okafor', email: 'daniel.okafor@example.com', phone: '0415 678 901', registration_date: at(-3, 19, 48), tickets: 1, notes: 'Vegetarian lunch please.' },
  { registration_id: 5, event_id: 2, full_name: 'Priya Sharma', email: 'priya.sharma@example.com', phone: '0416 789 012', registration_date: at(-20, 8, 20), tickets: 3, notes: null },
  { registration_id: 6, event_id: 2, full_name: 'Ethan Brooks', email: 'ethan.brooks@example.com', phone: '0417 890 123', registration_date: at(-14, 12, 2), tickets: 1, notes: 'Registered for the 10 km course.' },
  { registration_id: 7, event_id: 2, full_name: 'Fatima Al-Hassan', email: 'fatima.alhassan@example.com', phone: '0418 901 234', registration_date: at(-5, 16, 40), tickets: 2, notes: null },
  { registration_id: 8, event_id: 3, full_name: 'Grace Liu', email: 'grace.liu@example.com', phone: '0419 012 345', registration_date: at(-11, 11, 15), tickets: 2, notes: 'Table of two near the stage.' },
  { registration_id: 9, event_id: 3, full_name: 'Henry Walsh', email: 'henry.walsh@example.com', phone: '0420 123 456', registration_date: at(-6, 20, 30), tickets: 1, notes: null },
  { registration_id: 10, event_id: 3, full_name: 'Isla Robertson', email: 'isla.robertson@example.com', phone: '0421 234 567', registration_date: at(-2, 13, 55), tickets: 2, notes: 'Gluten free meal required.' },
  { registration_id: 11, event_id: 4, full_name: 'Jacob Meyer', email: 'jacob.meyer@example.com', phone: '0422 345 678', registration_date: at(-8, 15, 25), tickets: 3, notes: 'Two adults and one child.' },
  { registration_id: 12, event_id: 4, full_name: 'Kavya Patel', email: 'kavya.patel@example.com', phone: '0423 456 789', registration_date: at(-4, 10, 50), tickets: 1, notes: null },
  { registration_id: 13, event_id: 5, full_name: "Liam O'Connor", email: 'liam.oconnor@example.com', phone: '0424 567 890', registration_date: at(-7, 17, 10), tickets: 2, notes: 'Donating blankets as well.' },
  { registration_id: 14, event_id: 5, full_name: 'Mia Fernandez', email: 'mia.fernandez@example.com', phone: '0425 678 901', registration_date: at(-1, 9, 30), tickets: 4, notes: 'Collecting on behalf of a community group.' }
];

module.exports = { categories, events, registrations };
