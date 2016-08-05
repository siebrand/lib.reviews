'use strict';
const BlogPostProvider = require('./handlers/blog-post-provider');

let router = BlogPostProvider.bakeRoutes(null, {
  read: '/team/:id/post/:postID',
  add: '/team/:id/new/post',
  edit: '/team/:id/post/:postID/edit',
  delete: '/team/:id/post/:postID/delete',
});

module.exports = router;
