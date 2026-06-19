import { Router } from 'express';
import db from '../config/database.js';
import { authenticate } from '../middleware/auth.js';
import { sanitize, sanitizeRich } from '../utils/sanitize.js';

const router = Router();

// GET /api/knowledge-base
router.get('/', authenticate, async (req, res) => {
  try {
    const { search, category_id } = req.query;
    let query = db('knowledge_base_articles')
      .select('knowledge_base_articles.*', 'categories.name as category_name', 'users.full_name as author_name')
      .leftJoin('categories', 'knowledge_base_articles.category_id', 'categories.id')
      .join('users', 'knowledge_base_articles.created_by', 'users.id')
      .where('knowledge_base_articles.is_published', true);

    if (search) {
      const s = `%${search}%`;
      query = query.where(function () {
        this.where('knowledge_base_articles.title', 'like', s)
          .orWhere('knowledge_base_articles.symptoms', 'like', s)
          .orWhere('knowledge_base_articles.resolution_steps', 'like', s);
      });
    }
    if (category_id) query = query.where('knowledge_base_articles.category_id', category_id);

    const articles = await query.orderBy('knowledge_base_articles.updated_at', 'desc');
    res.json({ articles });
  } catch (error) {
    console.error('List articles error:', error);
    res.status(500).json({ error: 'Failed to fetch articles.' });
  }
});

// GET /api/knowledge-base/suggestions
router.get('/suggestions', authenticate, async (req, res) => {
  try {
    const { title, category_id } = req.query;
    let query = db('knowledge_base_articles')
      .select('id', 'title', 'symptoms', 'category_id')
      .where('is_published', true);

    if (category_id) query = query.where('category_id', category_id);
    if (title) {
      const words = title.toLowerCase().split(/\s+/).filter((w) => w.length > 1).slice(0, 5);
      if (words.length > 0) {
        query = query.where(function () {
          for (const word of words) {
            this.orWhere('title', 'like', `%${word}%`).orWhere('symptoms', 'like', `%${word}%`);
          }
        });
      }
    }

    const suggestions = await query.limit(5);
    res.json({ suggestions });
  } catch (error) {
    console.error('Suggestions error:', error);
    res.status(500).json({ error: 'Failed to get suggestions.' });
  }
});

// GET /api/knowledge-base/:id
router.get('/:id', authenticate, async (req, res) => {
  try {
    const article = await db('knowledge_base_articles')
      .select('knowledge_base_articles.*', 'categories.name as category_name', 'users.full_name as author_name')
      .leftJoin('categories', 'knowledge_base_articles.category_id', 'categories.id')
      .join('users', 'knowledge_base_articles.created_by', 'users.id')
      .where('knowledge_base_articles.id', req.params.id)
      .first();

    if (!article) return res.status(404).json({ error: 'Article not found.' });
    res.json({ article });
  } catch (error) {
    console.error('Get article error:', error);
    res.status(500).json({ error: 'Failed to fetch article.' });
  }
});

// POST /api/knowledge-base
router.post('/', authenticate, async (req, res) => {
  try {
    const { title, category_id, asset_type, symptoms, resolution_steps } = req.body;
    if (!title || !symptoms || !resolution_steps) {
      return res.status(400).json({ error: 'Title, symptoms, and resolution steps are required.' });
    }

    const [article] = await db('knowledge_base_articles').insert({
      title: sanitize(title),
      category_id: category_id || null,
      asset_type: asset_type ? sanitize(asset_type) : null,
      symptoms: sanitizeRich(symptoms),
      resolution_steps: sanitizeRich(resolution_steps),
      created_by: req.user.id,
      is_published: true,
      created_at: new Date(),
      updated_at: new Date(),
    }).returning('*');

    res.status(201).json(article);
  } catch (error) {
    console.error('Create article error:', error);
    res.status(500).json({ error: 'Failed to create article.' });
  }
});

// PUT /api/knowledge-base/:id
router.put('/:id', authenticate, async (req, res) => {
  try {
    const updates = { updated_at: new Date(), updated_by: req.user.id };
    const allowed = ['title', 'category_id', 'asset_type', 'symptoms', 'resolution_steps', 'is_published'];
    for (const f of allowed) {
      if (req.body[f] !== undefined) {
        updates[f] = typeof req.body[f] === 'string' ? sanitize(req.body[f]) : req.body[f];
      }
    }

    await db('knowledge_base_articles').where({ id: req.params.id }).update(updates);
    const article = await db('knowledge_base_articles').where({ id: req.params.id }).first();
    res.json(article);
  } catch (error) {
    console.error('Update article error:', error);
    res.status(500).json({ error: 'Failed to update article.' });
  }
});

// POST /api/knowledge-base/:id/link/:ticketId
router.post('/:id/link/:ticketId', authenticate, async (req, res) => {
  try {
    const existing = await db('ticket_knowledge_links')
      .where({ article_id: req.params.id, ticket_id: req.params.ticketId }).first();
    if (existing) return res.status(409).json({ error: 'Already linked.' });

    await db('ticket_knowledge_links').insert({
      ticket_id: parseInt(req.params.ticketId),
      article_id: parseInt(req.params.id),
      linked_by: req.user.id,
      created_at: new Date(),
    });

    res.status(201).json({ message: 'Article linked to ticket.' });
  } catch (error) {
    console.error('Link article error:', error);
    res.status(500).json({ error: 'Failed to link article.' });
  }
});

export default router;
