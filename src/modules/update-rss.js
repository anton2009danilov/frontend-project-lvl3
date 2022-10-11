import _ from 'lodash';
import { parseUpdatedRssHtml } from './parsers.js';
import getRssHtml from './get-rss-html.js';

const updateRss = (watchedState) => {
  watchedState.rss.feeds.forEach((feed, index) => {
    const { url } = feed;

    getRssHtml(url)
      .then((rssHtml) => parseUpdatedRssHtml(rssHtml, feed, index))
      .then(([changedFeed, updatedFeedIndex, posts]) => {
        const { id } = changedFeed;
        const currentPosts = _.filter(watchedState.rss.posts, ({ feedId }) => feedId === id);
        const diffPosts = _.differenceWith(posts, currentPosts.map((el) => _.omit(el, ['id', 'isRead'])), _.isEqual);

        if (!_.isEmpty(diffPosts)) {
          const lastPostId = _.isEmpty(watchedState.rss.posts)
            ? 0
            : _.last(watchedState.rss.posts).id;

          const newPosts = _.sortBy(diffPosts, (post) => (post.pubDate))
            .map((post, postIndex) => {
              const newPostId = lastPostId + postIndex + 1;
              return _.set(post, 'id', newPostId);
            });

          const updatedFeeds = _.set(
            _.clone(watchedState).rss.feeds,
            updatedFeedIndex,
            changedFeed,
          );

          const updatedPosts = _.concat(watchedState.rss.posts, newPosts);

          watchedState.rss = {
            feeds: updatedFeeds,
            posts: updatedPosts,
          };
        }
      })
      .catch((e) => { throw (e); });
  });
};

export default updateRss;
