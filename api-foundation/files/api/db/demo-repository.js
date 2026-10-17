'use strict';

/**
 * In-memory data access layer.
 *
 * It mirrors db/mysql-repository.js behaviour exactly and is used when MySQL is
 * not configured or not reachable, so the website and the API tests can be run
 * before the database has been imported on SCU cPanel. Results are copies, so
 * callers can never mutate the seed data by accident.
 */

const seed = require('./demo-data');

const clone = (value) => JSON.parse(JSON.stringify(value));

function compareEvents(a, b, sort) {
  switch (sort) {
    case 'date_desc': return new Date(b.event_date) - new Date(a.event_date);
    case 'name': return a.event_name.localeCompare(b.event_name);
    case 'popular': return (b.tickets_sold - a.tickets_sold) || (new Date(a.event_date) - new Date(b.event_date));
    default: return new Date(a.event_date) - new Date(b.event_date);
  }
}

function createDemoRepository() {
  const categories = clone(seed.categories);
  let events = clone(seed.events);
  let registrations = clone(seed.registrations);
  let nextEventId = Math.max(...events.map((e) => e.event_id)) + 1;
  let nextRegistrationId = Math.max(...registrations.map((r) => r.registration_id)) + 1;

  /** Attach the aggregate columns and the category name to an event. */
  function decorate(event) {
    const category = categories.find((c) => c.category_id === Number(event.category_id));
    const regs = registrations.filter((r) => Number(r.event_id) === Number(event.event_id));
    return {
      ...event,
      category_name: category ? category.category_name : 'Uncategorised',
      category_description: category ? category.description : null,
      registration_count: regs.length,
      tickets_sold: regs.reduce((total, r) => total + Number(r.tickets), 0)
    };
  }

  return {
    kind: 'demo',
    demoEvents: () => clone(events),
    demoRegistrations: () => clone(registrations),

    async listCategories() {
      return categories
        .map((c) => ({
          ...c,
          event_count: events.filter((e) => Number(e.category_id) === Number(c.category_id)).length
        }))
        .sort((a, b) => a.category_name.localeCompare(b.category_name));
    },

    async listEvents({ search, category_id, status, sort } = {}) {
      let rows = events.slice();
      if (search) {
        const needle = String(search).toLowerCase();
        rows = rows.filter((e) =>
          e.event_name.toLowerCase().includes(needle) ||
          e.location_name.toLowerCase().includes(needle) ||
          (e.description || '').toLowerCase().includes(needle));
      }
      if (category_id) rows = rows.filter((e) => Number(e.category_id) === Number(category_id));
      if (status) rows = rows.filter((e) => e.status === status);
      return rows.map(decorate).sort((a, b) => compareEvents(a, b, sort));
    },

    async getEvent(eventId) {
      const event = events.find((e) => Number(e.event_id) === Number(eventId));
      return event ? decorate(clone(event)) : null;
    },

    async listRegistrationsForEvent(eventId, order = 'DESC') {
      const rows = registrations
        .filter((r) => Number(r.event_id) === Number(eventId))
        .sort((a, b) => {
          const diff = new Date(b.registration_date) - new Date(a.registration_date);
          return order === 'ASC' ? -diff : diff;
        });
      return clone(rows);
    },

    async listAllRegistrations() {
      return registrations
        .map((r) => {
          const event = events.find((e) => Number(e.event_id) === Number(r.event_id));
          return {
            ...clone(r),
            event_name: event ? event.event_name : 'Unknown event',
            event_date: event ? event.event_date : null
          };
        })
        .sort((a, b) => new Date(b.registration_date) - new Date(a.registration_date));
    },

    async createEvent(data) {
      const event = {
        event_id: nextEventId++,
        category_id: Number(data.category_id),
        event_name: data.event_name,
        description: data.description ?? null,
        event_date: data.event_date,
        end_date: data.end_date ?? null,
        location_name: data.location_name,
        address: data.address ?? null,
        latitude: data.latitude ?? null,
        longitude: data.longitude ?? null,
        capacity: Number(data.capacity),
        ticket_price: Number(data.ticket_price).toFixed(2),
        image_url: data.image_url ?? null,
        status: data.status,
        created_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
        updated_at: new Date().toISOString().slice(0, 19).replace('T', ' ')
      };
      events.push(event);
      return decorate(clone(event));
    },

    async updateEvent(eventId, data) {
      const index = events.findIndex((e) => Number(e.event_id) === Number(eventId));
      if (index === -1) return null;
      events[index] = {
        ...events[index],
        category_id: Number(data.category_id),
        event_name: data.event_name,
        description: data.description ?? null,
        event_date: data.event_date,
        end_date: data.end_date ?? null,
        location_name: data.location_name,
        address: data.address ?? null,
        latitude: data.latitude ?? null,
        longitude: data.longitude ?? null,
        capacity: Number(data.capacity),
        ticket_price: Number(data.ticket_price).toFixed(2),
        image_url: data.image_url ?? null,
        status: data.status,
        updated_at: new Date().toISOString().slice(0, 19).replace('T', ' ')
      };
      return decorate(clone(events[index]));
    },

    async deleteEvent(eventId) {
      const index = events.findIndex((e) => Number(e.event_id) === Number(eventId));
      if (index === -1) return false;
      events.splice(index, 1);
      return true;
    },

    async countRegistrationsForEvent(eventId) {
      const rows = registrations.filter((r) => Number(r.event_id) === Number(eventId));
      return {
        count: rows.length,
        tickets: rows.reduce((total, r) => total + Number(r.tickets), 0)
      };
    },

    async findRegistrationByEmail(eventId, email) {
      const row = registrations.find(
        (r) => Number(r.event_id) === Number(eventId) && r.email.toLowerCase() === String(email).toLowerCase()
      );
      return row ? clone(row) : null;
    },

    async createRegistration(data) {
      const registration = {
        registration_id: nextRegistrationId++,
        event_id: Number(data.event_id),
        full_name: data.full_name,
        email: data.email,
        phone: data.phone,
        registration_date: new Date().toISOString().slice(0, 19).replace('T', ' '),
        tickets: Number(data.tickets),
        notes: data.notes ?? null
      };
      registrations.push(registration);
      return clone(registration);
    },

    /**
     * Same contract as the MySQL version: returns either { conflict } or
     * { registration } so the route can respond with 409 or 201.
     */
    async createRegistrationGuarded(eventId, payload) {
      const event = events.find((e) => Number(e.event_id) === Number(eventId));
      const existing = registrations.filter((r) => Number(r.event_id) === Number(eventId));
      const ticketsSold = existing.reduce((total, r) => total + Number(r.tickets), 0);
      const duplicate = existing.some((r) => r.email.toLowerCase() === payload.email.toLowerCase());

      if (duplicate) return { conflict: 'duplicate', ticketsSold, event };
      if (ticketsSold + payload.tickets > Number(event.capacity)) {
        return { conflict: 'capacity', ticketsSold, event };
      }
      const registration = await this.createRegistration({ ...payload, event_id: eventId });
      return { registration, ticketsSold };
    },

    async getEventCoordinates(eventId) {
      const event = events.find((e) => Number(e.event_id) === Number(eventId));
      if (!event) return null;
      return {
        event_id: event.event_id,
        event_name: event.event_name,
        location_name: event.location_name,
        latitude: event.latitude,
        longitude: event.longitude
      };
    },

    async close() { /* nothing to release */ }
  };
}

module.exports = { createDemoRepository };
