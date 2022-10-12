import _ from 'lodash';
import i18next from 'i18next';
import getRssHtml from './get-rss-html.js';
import { parseRssFromHtml } from './parsers.js';
import {
  handleNetworkError,
  handleInvalidRssError,
  checkForEmptyRssUrlError,
} from './error-handlers.js';

const addNewRSS = (watchedState, url) => {
  const { form, rss } = watchedState;

  if (checkForEmptyRssUrlError(watchedState, url)) {
    return;
  }

  getRssHtml(url)
    .catch((e) => handleNetworkError(watchedState, e))
    .then((rssHtml) => {
      const { feeds, posts } = rss;

      const newFeedId = _.isEmpty(feeds) ? 1 : _.last(feeds).id + 1;
      const newPostId = _.isEmpty(posts) ? 1 : _.last(posts).id + 1;

      const newRss = parseRssFromHtml(rssHtml, url);

      newRss.feeds = newRss.feeds.map((feed) => _.set(feed, 'id', newFeedId));
      const newPostsUnsorted = newRss.posts.map((post, index) => ({
        ...post,
        feedId: newFeedId,
        id: newPostId + index,
      }));

      newRss.posts = _.sortBy(newPostsUnsorted, (post) => (post.pubDate));

      watchedState.rss = {
        feeds: _.concat(rss.feeds, newRss.feeds),
        posts: _.concat(rss.posts, newRss.posts),
      };

      form.input.isValid = true;
      form.message = i18next.t('yup.success');
    })
    .catch((e) => handleInvalidRssError(watchedState, e));
};

export default addNewRSS;
