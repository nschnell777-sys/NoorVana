import React, { useEffect, useState, useRef } from 'react';
import {
  Box, Typography, Card, CardContent, Button, TextField, IconButton,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
  CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import { getCommunityPosts, createCommunityPost, updateCommunityPost, deleteCommunityPost } from '../services/api';
import Toast from '../components/Toast';
import { formatDate } from '../utils/formatters';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3000';

const ACCEPT = 'image/gif,image/png,image/jpeg,image/webp,video/mp4,video/webm,video/quicktime';

const MediaPreview = ({ src, mediaType, maxHeight = 120 }) => {
  if (!src) return null;
  const fullSrc = src.startsWith('/') ? `${API_BASE}${src}` : src;
  if (mediaType === 'video') {
    return <video src={fullSrc} controls style={{ maxWidth: '100%', maxHeight, borderRadius: 4 }} />;
  }
  return <img src={fullSrc} alt="" style={{ maxWidth: '100%', maxHeight, borderRadius: 4 }} />;
};

const CommunityPage = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [mediaFile, setMediaFile] = useState(null);
  const [mediaPreview, setMediaPreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' });
  const fileInputRef = useRef(null);

  // Edit state
  const [editOpen, setEditOpen] = useState(false);
  const [editPost, setEditPost] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editBody, setEditBody] = useState('');
  const [editMediaFile, setEditMediaFile] = useState(null);
  const [editMediaPreview, setEditMediaPreview] = useState(null);
  const [editSaving, setEditSaving] = useState(false);
  const editFileRef = useRef(null);

  const fetchPosts = async () => {
    try {
      const res = await getCommunityPosts({ limit: 50 });
      setPosts(res.data.posts || []);
    } catch (err) {
      console.error('Failed to load community posts', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPosts(); }, []);

  // Create form file handling
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setMediaFile(file);
    const url = URL.createObjectURL(file);
    setMediaPreview({ url, type: file.type.startsWith('video/') ? 'video' : 'image' });
  };

  const clearFile = () => {
    setMediaFile(null);
    setMediaPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) return;
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('title', title.trim());
      formData.append('body', body.trim());
      if (mediaFile) formData.append('media', mediaFile);
      await createCommunityPost(formData);
      setTitle('');
      setBody('');
      clearFile();
      setToast({ open: true, message: 'Post created', severity: 'success' });
      fetchPosts();
    } catch (err) {
      setToast({ open: true, message: err.response?.data?.error?.message || 'Failed to create post', severity: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this post?')) return;
    try {
      await deleteCommunityPost(id);
      setToast({ open: true, message: 'Post deleted', severity: 'success' });
      fetchPosts();
    } catch (err) {
      setToast({ open: true, message: 'Failed to delete post', severity: 'error' });
    }
  };

  // Edit handlers
  const openEdit = (post) => {
    setEditPost(post);
    setEditTitle(post.title);
    setEditBody(post.body);
    setEditMediaFile(null);
    setEditMediaPreview(null);
    setEditOpen(true);
  };

  const handleEditFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setEditMediaFile(file);
    const url = URL.createObjectURL(file);
    setEditMediaPreview({ url, type: file.type.startsWith('video/') ? 'video' : 'image' });
  };

  const handleSaveEdit = async () => {
    if (!editTitle.trim() || !editBody.trim()) return;
    setEditSaving(true);
    try {
      const formData = new FormData();
      formData.append('title', editTitle.trim());
      formData.append('body', editBody.trim());
      if (editMediaFile) formData.append('media', editMediaFile);
      await updateCommunityPost(editPost.id, formData);
      setEditOpen(false);
      setToast({ open: true, message: 'Post updated', severity: 'success' });
      fetchPosts();
    } catch (err) {
      setToast({ open: true, message: err.response?.data?.error?.message || 'Failed to update', severity: 'error' });
    } finally {
      setEditSaving(false);
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>News</Typography>

      {/* Create Post Form */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>Create Post</Typography>
          <Box component="form" onSubmit={handleCreate} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              fullWidth
            />
            <TextField
              label="Body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              required
              fullWidth
              multiline
              rows={4}
            />
            <Box>
              <Button
                variant="outlined"
                component="label"
                startIcon={<CloudUploadIcon />}
              >
                {mediaFile ? mediaFile.name : 'Upload Image or Video'}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ACCEPT}
                  hidden
                  onChange={handleFileChange}
                />
              </Button>
              {mediaFile && (
                <Button size="small" color="error" onClick={clearFile} sx={{ ml: 1 }}>
                  Remove
                </Button>
              )}
            </Box>
            {mediaPreview && (
              <Box sx={{ mt: 1 }}>
                {mediaPreview.type === 'video' ? (
                  <video src={mediaPreview.url} controls style={{ maxWidth: 300, maxHeight: 180, borderRadius: 4 }} />
                ) : (
                  <img src={mediaPreview.url} alt="Preview" style={{ maxWidth: 300, maxHeight: 180, borderRadius: 4 }} />
                )}
              </Box>
            )}
            <Box>
              <Button type="submit" variant="contained" disabled={submitting || !title.trim() || !body.trim()}>
                {submitting ? 'Posting...' : 'Create Post'}
              </Button>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Posts List */}
      <Typography variant="h6" gutterBottom>Posts</Typography>
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Title</TableCell>
                <TableCell>Body</TableCell>
                <TableCell>Media</TableCell>
                <TableCell>Author</TableCell>
                <TableCell>Date</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {posts.map((post) => (
                <TableRow key={post.id}>
                  <TableCell sx={{ fontWeight: 600 }}>{post.title}</TableCell>
                  <TableCell sx={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {post.body}
                  </TableCell>
                  <TableCell>
                    {post.media_url ? (
                      <MediaPreview src={post.media_url} mediaType={post.media_type} maxHeight={50} />
                    ) : '-'}
                  </TableCell>
                  <TableCell>{post.author_name}</TableCell>
                  <TableCell>{formatDate(post.created_at)}</TableCell>
                  <TableCell align="right">
                    <IconButton color="primary" onClick={() => openEdit(post)} title="Edit">
                      <EditIcon />
                    </IconButton>
                    <IconButton color="error" onClick={() => handleDelete(post.id)} title="Delete">
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
              {posts.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} align="center">No posts yet</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Edit Post Dialog */}
      <Dialog open={editOpen} onClose={() => setEditOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Post</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label="Title"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              required
              fullWidth
            />
            <TextField
              label="Body"
              value={editBody}
              onChange={(e) => setEditBody(e.target.value)}
              required
              fullWidth
              multiline
              rows={4}
            />
            {/* Current media */}
            {editPost?.media_url && !editMediaFile && (
              <Box>
                <Typography variant="caption" color="text.secondary">Current media:</Typography>
                <Box sx={{ mt: 0.5 }}>
                  <MediaPreview src={editPost.media_url} mediaType={editPost.media_type} maxHeight={140} />
                </Box>
              </Box>
            )}
            {/* New file preview */}
            {editMediaPreview && (
              <Box>
                <Typography variant="caption" color="text.secondary">New media:</Typography>
                <Box sx={{ mt: 0.5 }}>
                  {editMediaPreview.type === 'video' ? (
                    <video src={editMediaPreview.url} controls style={{ maxWidth: '100%', maxHeight: 140, borderRadius: 4 }} />
                  ) : (
                    <img src={editMediaPreview.url} alt="Preview" style={{ maxWidth: '100%', maxHeight: 140, borderRadius: 4 }} />
                  )}
                </Box>
              </Box>
            )}
            <Box>
              <Button variant="outlined" component="label" startIcon={<CloudUploadIcon />} size="small">
                {editMediaFile ? editMediaFile.name : 'Replace Media'}
                <input
                  ref={editFileRef}
                  type="file"
                  accept={ACCEPT}
                  hidden
                  onChange={handleEditFileChange}
                />
              </Button>
              {editMediaFile && (
                <Button size="small" color="error" onClick={() => { setEditMediaFile(null); setEditMediaPreview(null); if (editFileRef.current) editFileRef.current.value = ''; }} sx={{ ml: 1 }}>
                  Remove New File
                </Button>
              )}
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveEdit} disabled={editSaving || !editTitle.trim() || !editBody.trim()}>
            {editSaving ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      <Toast {...toast} onClose={() => setToast({ ...toast, open: false })} />
    </Box>
  );
};

export default CommunityPage;
