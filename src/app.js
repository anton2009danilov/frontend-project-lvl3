import _ from 'lodash';
import { parseUpdatedRssHtml } from './parsers.js';
import getRssHtml from './get-rss-html.js';
import render from './view.js';

export default () => {
  const state = {
    ui: {
      form: {
        isRefreshed: true,
      },
      input: {
        isValid: true,
      },
      message: null,
    },
    rss: {
      feeds: [],
      posts: [],
    },
  };

  const { rss } = state;

  const renderUpdatedRss = (feed, index, posts) => {
    const { id } = feed;
    const currentPosts = _.filter(rss.posts, ({ feedId }) => feedId === id);
    const diffPosts = _.differenceWith(posts, currentPosts.map((el) => _.omit(el, ['id', 'isRead'])), _.isEqual);

    if (!_.isEmpty(diffPosts)) {
      rss.feeds[index] = { ...feed };

      const lastPostId = _.isEmpty(rss.posts) ? 0 : _.last(rss.posts).id;

      const newPosts = _.sortBy(diffPosts, (post) => (post.pubDate))
        .map((post, postIndex) => {
          const newPostId = lastPostId + postIndex + 1;
          return { ...post, id: newPostId };
        });

      rss.posts = [
        ...rss.posts,
        ...newPosts,
      ];

      render(state);
    }
  };

  const updateRSS = () => rss.feeds.forEach((feed, index) => {
    const { url } = feed;

    getRssHtml(url)
      .then((rssHtml) => parseUpdatedRssHtml(rssHtml, feed, index))
      .then((data) => {
        const [updatedFeed, updatedFeedIndex, posts] = data;
        renderUpdatedRss(updatedFeed, updatedFeedIndex, posts);
      })
      .catch((e) => { throw (e); });
  });

  const watchForUpdates = () => {
    const timeStep = 5000;
    setTimeout(watchForUpdates, timeStep);

    updateRSS();
  };

  render(state);
  watchForUpdates();
};
