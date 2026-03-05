const fs = require('fs');
const path = require('path');
const db = require('../db');
const logger = require('../utils/logger');

const UPLOADS_DIR = path.join(__dirname, '..', '..', 'uploads', 'community');

/**
 * Helper to delete a media file from disk.
 */
const deleteMediaFile = (mediaUrl) => {
  if (!mediaUrl) return;
  const filename = path.basename(mediaUrl);
  const filePath = path.join(UPLOADS_DIR, filename);
  fs.unlink(filePath, (err) => {
    if (err && err.code !== 'ENOENT') {
      logger.warn('Failed to delete media file', { filePath, error: err.message });
    }
  });
};

/**
 * Determine media_type from mimetype string.
 */
const getMediaType = (mimetype) => {
  if (!mimetype) return null;
  if (mimetype.startsWith('video/')) return 'video';
  if (mimetype.startsWith('image/')) return 'image';
  return null;
};

/**
 * GET /api/v1/admin/community  OR  GET /api/v1/clients/community
 * Paginated list of community posts, newest first.
 */
const getCommunityPosts = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
    const offset = (page - 1) * limit;

    const [posts, countResult] = await Promise.all([
      db('community_posts')
        .orderBy('created_at', 'desc')
        .limit(limit)
        .offset(offset),
      db('community_posts').count('* as count').first()
    ]);

    res.json({
      posts,
      pagination: {
        page,
        limit,
        total: parseInt(countResult.count, 10),
        totalPages: Math.ceil(parseInt(countResult.count, 10) / limit)
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/v1/admin/community
 * Admin creates a community post with optional file upload.
 */
const createCommunityPost = async (req, res, next) => {
  try {
    const { title, body } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: { code: 'MISSING_TITLE', message: 'Title is required' } });
    }
    if (!body || !body.trim()) {
      return res.status(400).json({ error: { code: 'MISSING_BODY', message: 'Body is required' } });
    }

    const insertData = {
      title: title.trim(),
      body: body.trim(),
      author_name: req.user.name || 'NoorVana Team'
    };

    if (req.file) {
      insertData.media_url = `/uploads/community/${req.file.filename}`;
      insertData.media_type = getMediaType(req.file.mimetype);
    }

    const [post] = await db('community_posts').insert(insertData).returning('*');

    // SQLite fallback
    const result = post || await db('community_posts')
      .orderBy('created_at', 'desc')
      .first();

    logger.info('Community post created', { postId: result.id, adminId: req.user.user_id });
    res.status(201).json({ post: result });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/v1/admin/community/:id
 * Admin edits a community post.
 */
const updateCommunityPost = async (req, res, next) => {
  try {
    const { id } = req.params;

    const existing = await db('community_posts').where({ id }).first();
    if (!existing) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Post not found' } });
    }

    const updateData = {
      updated_at: new Date().toISOString()
    };

    const { title, body } = req.body;
    if (title !== undefined) updateData.title = title.trim();
    if (body !== undefined) updateData.body = body.trim();

    if (req.file) {
      // Delete old file if it exists
      deleteMediaFile(existing.media_url);
      updateData.media_url = `/uploads/community/${req.file.filename}`;
      updateData.media_type = getMediaType(req.file.mimetype);
    }

    await db('community_posts').where({ id }).update(updateData);

    const updated = await db('community_posts').where({ id }).first();

    logger.info('Community post updated', { postId: id, adminId: req.user.user_id });
    res.json({ post: updated });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/v1/admin/community/:id
 * Admin deletes a community post and its media file.
 */
const deleteCommunityPost = async (req, res, next) => {
  try {
    const { id } = req.params;

    const existing = await db('community_posts').where({ id }).first();
    if (!existing) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Post not found' } });
    }

    await db('community_posts').where({ id }).del();

    // Delete media file from disk
    deleteMediaFile(existing.media_url);

    logger.info('Community post deleted', { postId: id, adminId: req.user.user_id });
    res.json({ message: 'Post deleted' });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getCommunityPosts,
  createCommunityPost,
  updateCommunityPost,
  deleteCommunityPost
};
