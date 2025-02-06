const express = require('express');
const router = express.Router();
const db = require('../config/db');

// 获取所有已发布文章
router.get('/posts', async (req, res) => {
    try {
        const [posts] = await db.query(
            'SELECT * FROM posts WHERE status = ? ORDER BY publish_date DESC',
            ['published']
        );
        res.json(posts);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// 发布新文章
router.post('/posts', async (req, res) => {
    try {
        const { title, content, author } = req.body;
        const [result] = await db.query(
            'INSERT INTO posts (title, content, author, status) VALUES (?, ?, ?, ?)',
            [title, content, author || '匿名', 'published']
        );
        
        const [newPost] = await db.query(
            'SELECT * FROM posts WHERE id = ?',
            [result.insertId]
        );
        
        res.status(201).json(newPost[0]);
    } catch (err) {
        console.error('发布文章失败:', err);
        res.status(400).json({ message: err.message });
    }
});

// 更新文章状态
router.patch('/posts/:id/publish', async (req, res) => {
    try {
        const [result] = await db.query(
            'UPDATE posts SET status = ? WHERE id = ?',
            ['published', req.params.id]
        );
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: '文章不存在' });
        }
        
        const [updatedPost] = await db.query(
            'SELECT * FROM posts WHERE id = ?',
            [req.params.id]
        );
        res.json(updatedPost[0]);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// 保存草稿
router.post('/posts/drafts', async (req, res) => {
    try {
        const { title, content, author } = req.body;
        const [result] = await db.query(
            'INSERT INTO posts (title, content, author, status) VALUES (?, ?, ?, ?)',
            [title, content, author || '匿名', 'draft']
        );
        
        const [newPost] = await db.query(
            'SELECT * FROM posts WHERE id = ?',
            [result.insertId]
        );
        
        res.status(201).json(newPost[0]);
    } catch (err) {
        console.error('保存草稿失败:', err);
        res.status(400).json({ message: err.message });
    }
});

// 获取所有草稿
router.get('/posts/drafts', async (req, res) => {
    try {
        const [drafts] = await db.query(
            'SELECT * FROM posts WHERE status = ? ORDER BY created_at DESC',
            ['draft']
        );
        res.json(drafts);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// 获取单个草稿
router.get('/posts/drafts/:id', async (req, res) => {
    try {
        const [draft] = await db.query(
            'SELECT * FROM posts WHERE id = ? AND status = ?',
            [req.params.id, 'draft']
        );
        
        if (draft.length === 0) {
            return res.status(404).json({ message: '草稿不存在' });
        }
        res.json(draft[0]);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// 删除草稿
router.delete('/posts/drafts/:id', async (req, res) => {
    try {
        const [result] = await db.query(
            'DELETE FROM posts WHERE id = ? AND status = ?',
            [req.params.id, 'draft']
        );
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: '草稿不存在' });
        }
        res.json({ message: '草稿已删除' });
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// 删除文章
router.delete('/posts/:id', async (req, res) => {
    try {
        const [result] = await db.query(
            'DELETE FROM posts WHERE id = ?',
            [req.params.id]
        );
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: '文章不存在' });
        }
        
        res.json({ message: '文章已删除' });
    } catch (err) {
        console.error('删除文章失败:', err);
        res.status(400).json({ message: err.message });
    }
});

// 获取单篇文章
router.get('/posts/:id', async (req, res) => {
    try {
        const [post] = await db.query(
            'SELECT * FROM posts WHERE id = ?',
            [req.params.id]
        );
        
        if (post.length === 0) {
            return res.status(404).json({ message: '文章不存在' });
        }
        
        res.json(post[0]);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
