'use strict';

// External dependencies
const config = require('config');

// Internal dependencies
const render = require('./helpers/render');
const feeds = require('./helpers/feeds');
const Review = require('../models/review.js');
const ReviewProvider = require('./handlers/review-provider');
const reviewHandlers = require('./handlers/review-handlers');
const BlogPost = require('../models/blog-post');

// Standard routes

let routes = ReviewProvider.getDefaultRoutes('review');

routes.addFromThing = {
  path: '/new/review/thing/:id',
  methods: ['GET', 'POST']
};

let router = ReviewProvider.bakeRoutes(null, routes);

// Additional routes

// We show two query results on the front-page, the team developers blog
// and a feed of recent reviews, filtered to include only trusted ones.
router.get('/', function(req, res) {

  let queries = [Review.getFeed({
    onlyTrusted: true
  })];

  if (config.frontPageTeamBlog)
    queries.push(BlogPost.getMostRecentBlogPosts(config.frontPageTeamBlog, {
      limit: 3
    }));

  Promise.all(queries)

  .then(queryResults => {

    // Promise.all helpfully keeps order in which promises were passed
    let feedItems = queryResults[0].feedItems;
    let offsetDate = queryResults[0].offsetDate;
    let blogPosts = config.frontPageTeamBlog ? queryResults[1].blogPosts : undefined;
    let blogPostsOffsetDate = config.frontPageTeamBlog ? queryResults[1].offsetDate : undefined;

    // Set review permissions
    feedItems.forEach(item => {
      item.populateUserInfo(req.user);
      if (item.thing)
        item.thing.populateUserInfo(req.user);
    });

    // Set post permissions
    if (blogPosts)
      blogPosts.forEach(post => {
        post.populateUserInfo(req.user);
      });

    let embeddedFeeds = feeds.getEmbeddedFeeds(req, {
      atomURLPrefix: `/feed/atom`,
      atomURLTitleKey: `atom feed of all reviews`,
    });

    if (config.frontPageTeamBlog) {
      embeddedFeeds = embeddedFeeds.concat(feeds.getEmbeddedFeeds(req, {
        atomURLPrefix: `/team/${config.frontPageTeamBlog}/blog/atom`,
        atomURLTitleKey: config.frontPageTeamBlogKey
      }));
    }

    let paginationURL;
    if (offsetDate)
      paginationURL = `/feed/before/${offsetDate.toISOString()}`;

    render.template(req, res, 'index', {
      titleKey: 'welcome',
      deferPageHeader: true,
      feedItems,
      blogPosts,
      blogKey: config.frontPageTeamBlogKey,
      showBlog: config.frontPageTeamBlog ? true : false,
      team: config.frontPageTeamBlog ? {
        id: config.frontPageTeamBlog
      } : undefined,
      paginationURL,
      blogPostsUTCISODate: blogPostsOffsetDate ? blogPostsOffsetDate.toISOString() : undefined,
      embeddedFeeds
    });
  });

});


router.get('/feed', reviewHandlers.getFeedHandler({ deferPageHeader: true }));

router.get('/feed/atom', function(req, res) {
  res.redirect(`/feed/atom/${req.locale}`);
});

router.get('/feed/atom/:language', reviewHandlers.getFeedHandler({
  format: 'atom'
}));

router.get('/feed/before/:utcisodate', reviewHandlers.getFeedHandler({ deferPageHeader: true }));

router.get('/new', (req, res) => {
  res.redirect('/new/review');
});


module.exports = router;
