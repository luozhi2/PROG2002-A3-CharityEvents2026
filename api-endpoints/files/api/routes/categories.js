'use strict';

/**
 * Category endpoints - used by the client website filter and by the admin forms.
 *   GET /api/categories        all categories with their event counts
 *   GET /api/categories/:id    one category
 */

const express = require('express');
const { getRepository } = require('../db');
const { categoryJson, ok, fail } = require('../lib/responses');

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const rows = await getRepository().listCategories();
    ok(res, { count: rows.length, categories: rows.map(categoryJson) });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const rows = await getRepository().listCategories();
    const category = rows.find((c) => Number(c.category_id) === id);
    if (!category) return fail(res, 404, `No category found with id ${req.params.id}.`);
    ok(res, categoryJson(category));
  } catch (error) {
    next(error);
  }
});

module.exports = router;
