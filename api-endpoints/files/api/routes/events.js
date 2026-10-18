'use strict';

/**
 * Event endpoints.
 *
 *   GET    /api/events                 list + search + filter + sort (client website)
 *   GET    /api/events/:id             one event WITH its registrations (latest first)
 *   POST   /api/events                 create an event (admin website)
 *   PUT    /api/events/:id             update an event (admin website)
 *   DELETE /api/events/:id             delete an event, blocked while registrations exist
 *   GET    /api/events/:id/registrations  registrations for one event
 *
 * The list endpoint deliberately returns every status so the admin site can show
 * Active, Past and Suspended events; the client website asks for status=Active.
 */

const express = require('express');
const { getRepository } = require('../db');
const { validateEvent } = require('../lib/validate');
const { eventJson, registrationJson, ok, fail } = require('../lib/responses');

const router = express.Router();

/** Read a positive integer route parameter, or null when it is not one. */
function parseId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

/** Only these values are accepted for ?sort= ; anything else falls back to date_asc. */
const SORT_KEYS = new Set(['date_asc', 'date_desc', 'name', 'popular']);
const STATUS_KEYS = new Set(['Active', 'Past', 'Suspended']);

// ---------------------------------------------------------------------------
// GET /api/events - search, filter and sort
// ---------------------------------------------------------------------------
router.get('/', async (req, res, next) => {
  try {
    const search = (req.query.search || '').toString().trim();
    const status = STATUS_KEYS.has(req.query.status) ? req.query.status : null;
    const categoryId = parseId(req.query.category_id);
    const sort = SORT_KEYS.has(req.query.sort) ? req.query.sort : 'date_asc';

    const rows = await getRepository().listEvents({
      search: search || null,
      category_id: categoryId,
      status,
      sort
    });

    ok(res, {
      count: rows.length,
      filters: { search: search || null, status, category_id: categoryId, sort },
      events: rows.map(eventJson)
    });
  } catch (error) {
    next(error);
  }
});

// ---------------------------------------------------------------------------
// GET /api/events/:id - single event plus its registrations, newest first.
// This is the "improved event details" endpoint required by Part 2.
// ---------------------------------------------------------------------------
router.get('/:id', async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return fail(res, 400, 'The event id must be a positive integer.');

    const repository = getRepository();
    const event = await repository.getEvent(id);
    if (!event) return fail(res, 404, `No event found with id ${id}.`);

    const registrations = await repository.listRegistrationsForEvent(id, 'DESC');

    ok(res, {
      ...eventJson(event),
      registrations: registrations.map(registrationJson)
    });
  } catch (error) {
    next(error);
  }
});

// ---------------------------------------------------------------------------
// GET /api/events/:id/registrations
// ---------------------------------------------------------------------------
router.get('/:id/registrations', async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return fail(res, 400, 'The event id must be a positive integer.');

    const repository = getRepository();
    const event = await repository.getEvent(id);
    if (!event) return fail(res, 404, `No event found with id ${id}.`);

    const order = req.query.order === 'asc' ? 'ASC' : 'DESC';
    const rows = await repository.listRegistrationsForEvent(id, order);
    const summary = await repository.countRegistrationsForEvent(id);

    ok(res, {
      event_id: id,
      event_name: event.event_name,
      capacity: Number(event.capacity),
      registration_count: summary.count,
      tickets_sold: summary.tickets,
      registrations: rows.map(registrationJson)
    });
  } catch (error) {
    next(error);
  }
});

// ---------------------------------------------------------------------------
// POST /api/events - create (admin website)
// ---------------------------------------------------------------------------
router.post('/', async (req, res, next) => {
  try {
    const { errors, data } = await validateEvent(req.body);
    if (errors.length) return fail(res, 400, 'The event could not be saved because some fields are invalid.', errors);

    const created = await getRepository().createEvent(data);
    ok(res, { message: `Event "${created.event_name}" was created.`, event: eventJson(created) }, 201);
  } catch (error) {
    next(error);
  }
});

// ---------------------------------------------------------------------------
// PUT /api/events/:id - update (admin website)
// ---------------------------------------------------------------------------
router.put('/:id', async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return fail(res, 400, 'The event id must be a positive integer.');

    const repository = getRepository();
    if (!(await repository.getEvent(id))) return fail(res, 404, `No event found with id ${id}.`);

    const { errors, data } = await validateEvent(req.body);
    if (errors.length) return fail(res, 400, 'The event could not be updated because some fields are invalid.', errors);

    const current = await repository.countRegistrationsForEvent(id);
    if (Number(data.capacity) < current.tickets) {
      return fail(res, 409,
        `Capacity cannot be reduced to ${data.capacity} because ${current.tickets} tickets have already been sold.`,
        [`Smallest allowed capacity for this event is ${current.tickets}.`]);
    }

    const updated = await repository.updateEvent(id, data);
    ok(res, { message: `Event "${updated.event_name}" was updated.`, event: eventJson(updated) });
  } catch (error) {
    next(error);
  }
});

// ---------------------------------------------------------------------------
// DELETE /api/events/:id
// Data integrity rule from the brief: an event can only be deleted when it has
// not received any registrations.
// ---------------------------------------------------------------------------
router.delete('/:id', async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return fail(res, 400, 'The event id must be a positive integer.');

    const repository = getRepository();
    const event = await repository.getEvent(id);
    if (!event) return fail(res, 404, `No event found with id ${id}.`);

    const { count, tickets } = await repository.countRegistrationsForEvent(id);
    if (count > 0) {
      return fail(res, 409,
        `"${event.event_name}" cannot be deleted because it already has ${count} registration(s) ` +
        `covering ${tickets} ticket(s). Remove the registrations first or suspend the event instead.`,
        [`registration_count: ${count}`, `tickets_sold: ${tickets}`]);
    }

    await repository.deleteEvent(id);
    ok(res, { message: `Event "${event.event_name}" was deleted.`, event_id: id });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
