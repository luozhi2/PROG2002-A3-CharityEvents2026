'use strict';

/**
 * Registration endpoints.
 *
 *   POST /api/registrations   create a registration for an event (client website)
 *   GET  /api/registrations   every registration, newest first (admin convenience)
 *
 * Business rules enforced here:
 *   - the event must exist (404);
 *   - an event that is not "Active" cannot be registered for (409);
 *   - the same email cannot register twice for the same event (409). The
 *     database unique key uq_registration_event_email is the second line of
 *     defence in case two requests race;
 *   - tickets_sold + requested tickets may not exceed the event capacity (409).
 */

const express = require('express');
const { getRepository } = require('../db');
const { validateRegistration } = require('../lib/validate');
const { registrationJson, eventJson, ok, fail } = require('../lib/responses');

const router = express.Router();

// ---------------------------------------------------------------------------
// GET /api/registrations
// ---------------------------------------------------------------------------
router.get('/', async (req, res, next) => {
  try {
    const rows = await getRepository().listAllRegistrations();
    ok(res, { count: rows.length, registrations: rows.map(registrationJson) });
  } catch (error) {
    next(error);
  }
});

// ---------------------------------------------------------------------------
// POST /api/registrations
// ---------------------------------------------------------------------------
router.post('/', async (req, res, next) => {
  try {
    const { errors, data } = validateRegistration(req.body);
    if (errors.length) {
      return fail(res, 400, 'The registration could not be submitted because some fields are invalid.', errors);
    }

    const repository = getRepository();
    const event = await repository.getEvent(data.event_id);
    if (!event) return fail(res, 404, `No event found with id ${data.event_id}.`);

    if (event.status !== 'Active') {
      return fail(res, 409,
        `"${event.event_name}" is currently ${event.status.toLowerCase()} and is not accepting registrations.`);
    }

    // The repository performs the duplicate and capacity checks and the insert
    // atomically (SELECT ... FOR UPDATE inside a transaction when MySQL is used).
    const result = await repository.createRegistrationGuarded(data.event_id, data);

    if (result.conflict === 'duplicate') {
      return fail(res, 409,
        `${data.email} has already registered for "${event.event_name}". ` +
        'Only one registration per person is allowed for each event.');
    }
    if (result.conflict === 'capacity') {
      const remaining = Math.max(0, Number(event.capacity) - result.ticketsSold);
      return fail(res, 409,
        `Only ${remaining} ticket(s) remain for "${event.event_name}", but ${data.tickets} were requested.`);
    }

    const updatedEvent = await repository.getEvent(data.event_id);
    ok(res, {
      message: `Registration confirmed for ${data.full_name} - ${data.tickets} ticket(s) to "${event.event_name}".`,
      registration: registrationJson(result.registration),
      event: eventJson(updatedEvent)
    }, 201);
  } catch (error) {
    // A race between two requests is caught by the unique key; translate the
    // raw MySQL error into the same friendly 409 the client already handles.
    if (error && error.code === 'ER_DUP_ENTRY') {
      return fail(res, 409, 'That email has already registered for this event.');
    }
    next(error);
  }
});

module.exports = router;
