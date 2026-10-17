'use strict';

/**
 * MySQL data access layer.
 *
 * Every statement is parameterised (the "?" placeholders are expanded safely by
 * mysql2) which prevents SQL injection. Sorting cannot use a placeholder, so the
 * allowed sort keys are whitelisted in SORT_SQL below.
 */

/** Whitelisted ORDER BY fragments. Never interpolate user input directly. */
const SORT_SQL = {
  date_asc: 'e.event_date ASC',
  date_desc: 'e.event_date DESC',
  name: 'e.event_name ASC',
  popular: 'tickets_sold DESC, e.event_date ASC'
};

/** Columns selected for every event response (keeps all shapes identical). */
const EVENT_COLUMNS = `
  e.event_id, e.category_id, c.category_name, e.event_name, e.description,
  e.event_date, e.end_date, e.location_name, e.address, e.latitude, e.longitude,
  e.capacity, e.ticket_price, e.image_url, e.status, e.created_at, e.updated_at,
  (SELECT COUNT(*) FROM registrations r WHERE r.event_id = e.event_id) AS registration_count,
  (SELECT COALESCE(SUM(r.tickets), 0) FROM registrations r WHERE r.event_id = e.event_id) AS tickets_sold
`;

/**
 * @param {import('mysql2/promise').Pool} pool
 * @param {(fn: (conn: any) => Promise<any>) => Promise<any>} withTransaction
 */
function createSqlRepository(pool, withTransaction) {
  return {
    kind: 'mysql',

    async listCategories() {
      const [rows] = await pool.query(`
        SELECT c.category_id, c.category_name, c.description,
               (SELECT COUNT(*) FROM events e WHERE e.category_id = c.category_id) AS event_count
        FROM categories c
        ORDER BY c.category_name ASC
      `);
      return rows;
    },

    async listEvents({ search, category_id, status, sort } = {}) {
      const where = [];
      const params = [];

      if (search) {
        where.push('(e.event_name LIKE ? OR e.location_name LIKE ? OR e.description LIKE ?)');
        const like = `%${search}%`;
        params.push(like, like, like);
      }
      if (category_id) {
        where.push('e.category_id = ?');
        params.push(category_id);
      }
      if (status) {
        where.push('e.status = ?');
        params.push(status);
      }

      const orderBy = SORT_SQL[sort] || SORT_SQL.date_asc;
      const sql = `
        SELECT ${EVENT_COLUMNS}
        FROM events e
        JOIN categories c ON c.category_id = e.category_id
        ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
        ORDER BY ${orderBy}
      `;
      const [rows] = await pool.query(sql, params);
      return rows;
    },

    async getEvent(eventId) {
      const [rows] = await pool.query(`
        SELECT ${EVENT_COLUMNS}, c.description AS category_description
        FROM events e
        JOIN categories c ON c.category_id = e.category_id
        WHERE e.event_id = ?
      `, [eventId]);
      return rows[0] || null;
    },

    async listRegistrationsForEvent(eventId, order = 'DESC') {
      const direction = order === 'ASC' ? 'ASC' : 'DESC';
      const [rows] = await pool.query(`
        SELECT registration_id, event_id, full_name, email, phone, registration_date, tickets, notes
        FROM registrations
        WHERE event_id = ?
        ORDER BY registration_date ${direction}, registration_id ${direction}
      `, [eventId]);
      return rows;
    },

    async listAllRegistrations() {
      const [rows] = await pool.query(`
        SELECT r.registration_id, r.event_id, e.event_name, e.event_date,
               r.full_name, r.email, r.phone, r.registration_date, r.tickets, r.notes
        FROM registrations r
        JOIN events e ON e.event_id = r.event_id
        ORDER BY r.registration_date DESC
      `);
      return rows;
    },

    async createEvent(data) {
      const [result] = await pool.query(`
        INSERT INTO events
          (category_id, event_name, description, event_date, end_date, location_name, address,
           latitude, longitude, capacity, ticket_price, image_url, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        data.category_id, data.event_name, data.description ?? null, data.event_date,
        data.end_date ?? null, data.location_name, data.address ?? null,
        data.latitude ?? null, data.longitude ?? null, data.capacity,
        data.ticket_price, data.image_url ?? null, data.status
      ]);
      return this.getEvent(result.insertId);
    },

    async updateEvent(eventId, data) {
      const [result] = await pool.query(`
        UPDATE events SET
          category_id = ?, event_name = ?, description = ?, event_date = ?, end_date = ?,
          location_name = ?, address = ?, latitude = ?, longitude = ?, capacity = ?,
          ticket_price = ?, image_url = ?, status = ?
        WHERE event_id = ?
      `, [
        data.category_id, data.event_name, data.description ?? null, data.event_date,
        data.end_date ?? null, data.location_name, data.address ?? null,
        data.latitude ?? null, data.longitude ?? null, data.capacity,
        data.ticket_price, data.image_url ?? null, data.status, eventId
      ]);
      if (result.affectedRows === 0) return null;
      return this.getEvent(eventId);
    },

    async deleteEvent(eventId) {
      const [result] = await pool.query('DELETE FROM events WHERE event_id = ?', [eventId]);
      return result.affectedRows > 0;
    },

    async countRegistrationsForEvent(eventId) {
      const [rows] = await pool.query(
        'SELECT COUNT(*) AS count, COALESCE(SUM(tickets), 0) AS tickets FROM registrations WHERE event_id = ?',
        [eventId]
      );
      return { count: Number(rows[0].count), tickets: Number(rows[0].tickets) };
    },

    async findRegistrationByEmail(eventId, email) {
      const [rows] = await pool.query(
        'SELECT registration_id, full_name, email FROM registrations WHERE event_id = ? AND email = ?',
        [eventId, email]
      );
      return rows[0] || null;
    },

    async createRegistration(data) {
      const [result] = await pool.query(`
        INSERT INTO registrations (event_id, full_name, email, phone, registration_date, tickets, notes)
        VALUES (?, ?, ?, ?, NOW(), ?, ?)
      `, [data.event_id, data.full_name, data.email, data.phone, data.tickets, data.notes ?? null]);

      const [rows] = await pool.query(`
        SELECT registration_id, event_id, full_name, email, phone, registration_date, tickets, notes
        FROM registrations WHERE registration_id = ?
      `, [result.insertId]);
      return rows[0];
    },

    /**
     * Runs the capacity check and the insert inside one transaction so two
     * simultaneous registrations cannot oversell the last ticket.
     */
    async createRegistrationGuarded(eventId, payload) {
      return withTransaction(async (conn) => {
        const [rows] = await conn.query(
          'SELECT COALESCE(SUM(tickets), 0) AS tickets FROM registrations WHERE event_id = ? FOR UPDATE',
          [eventId]
        );
        const [dup] = await conn.query(
          'SELECT registration_id FROM registrations WHERE event_id = ? AND email = ?',
          [eventId, payload.email]
        );
        const [eventRows] = await conn.query(
          'SELECT capacity, status FROM events WHERE event_id = ?', [eventId]
        );
        const event = eventRows[0];
        const result = { ticketsSold: Number(rows[0].tickets), duplicate: !!dup[0], event };

        if (result.duplicate) return { conflict: 'duplicate', ...result };
        if (result.ticketsSold + payload.tickets > event.capacity) {
          return { conflict: 'capacity', ...result };
        }

        const [insert] = await conn.query(`
          INSERT INTO registrations (event_id, full_name, email, phone, registration_date, tickets, notes)
          VALUES (?, ?, ?, ?, NOW(), ?, ?)
        `, [eventId, payload.full_name, payload.email, payload.phone, payload.tickets, payload.notes ?? null]);

        const [created] = await conn.query(
          'SELECT * FROM registrations WHERE registration_id = ?', [insert.insertId]
        );
        return { registration: created[0] };
      });
    },

    async getEventCoordinates(eventId) {
      const [rows] = await pool.query(
        'SELECT event_id, event_name, location_name, latitude, longitude FROM events WHERE event_id = ?',
        [eventId]
      );
      return rows[0] || null;
    },

    async close() {
      await pool.end();
    }
  };
}

module.exports = { createSqlRepository, SORT_SQL };
