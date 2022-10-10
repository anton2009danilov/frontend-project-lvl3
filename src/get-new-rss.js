import i18next from 'i18next';
import getRssHtml from './get-rss-html.js';
import { parseFeedFromRssHtml, parsePostsFromRssHtml } from './parsers.js';
import {
  handleNetworkError,
  hanldeInvalidRssError,
  checkForEmptyRssUrlError,
} from './error-handlers.js';

const getNewRSS = (url, state, render) => {
  const { ui, rss } = state;

  if (checkForEmptyRssUrlError(state, url)) {
    return;
  }

  getRssHtml(url)
    .catch((e) => handleNetworkError(state, e))
    .then((rssHtml) => {
      const { feeds, posts } = rss;

      const lastFeedId = _.isEmpty(feeds) ? 0 : _.last(feeds).id;
      const feed = parseFeedFromRssHtml(rssHtml, lastFeedId, url);
      rss.feeds = [...rss.feeds, feed];

      const lastPostId = _.isEmpty(posts) ? 0 : _.last(posts).id;
      const newPosts = parsePostsFromRssHtml(rssHtml, lastPostId, lastFeedId);
      rss.posts = [
        ...rss.posts,
        ...newPosts,
      ];

      ui.input.isValid = true;
      ui.message = i18next.t('yup.success');

      render();
    })
    .catch((e) => hanldeInvalidRssError(state, e));
};

export default getNewRSS;
