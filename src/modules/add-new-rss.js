import _ from 'lodash';
import i18next from 'i18next';
import getRssHtml from './get-rss-html.js';
import { parseRssFromHtml } from './parsers.js';
import {
  handleNetworkError,
  hanldeInvalidRssError,
  checkForEmptyRssUrlError,
} from './error-handlers.js';

const addNewRSS = (watchedState, url) => {
  const { ui, rss } = watchedState;

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

      newRss.feeds = [...newRss.feeds.map((feed) => ({ ...feed, id: newFeedId }))];
      const newPostsUnsorted = newRss.posts.map((post, index) => ({
        ...post,
        feedId: newFeedId,
        id: newPostId + index,
      }));

      newRss.posts = _.sortBy(newPostsUnsorted, (post) => (post.pubDate));

      watchedState.rss = {
        feeds: [...rss.feeds, ...newRss.feeds],
        posts: [...rss.posts, ...newRss.posts],
      };

      ui.input.isValid = true;
      ui.message = i18next.t('yup.success');
    })
    .catch((e) => hanldeInvalidRssError(watchedState, e));
};

export default addNewRSS;
