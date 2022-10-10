import axios from 'axios';
import _ from 'lodash';
import i18next from 'i18next';
import { object, string } from 'yup';
import { parseFeedFromRssHtml, parsePostsFromRssHtml, parseUpdatedRssHtml } from './parsers.js';
import {
  handleNetworkError,
  hanldeInvalidRssError,
  handleInvalidUrlError,
  checkForEmptyRssUrlError,
  checkForAlreadyExistsError,
} from './error-handlers.js';
import render from './view.js';

const validateUrl = (url) => {
  const urlSchema = object({
    url: string().url(),
  });

  return urlSchema.validate(url);
};

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
    elements: {
      form: document.querySelector('form'),
      input: document.querySelector('input'),
      feedback: document.querySelector('.feedback'),
      feeds: document.querySelector('div.feeds'),
      posts: document.querySelector('div.posts'),
    },
  };

  const { ui, rss, elements } = state;

  const getRssHtml = (url) => {
    const parser = new DOMParser();

    return axios.get(`https://allorigins.hexlet.app/get?disableCache=true&url=${encodeURIComponent(url)}`)
      .then((response) => response.data)
      .then((data) => parser.parseFromString(data.contents, 'text/xml'));
  };

  const getNewRSS = (url) => {
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

        render(state);
      })
      .catch((e) => hanldeInvalidRssError(state, e));
  };

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

  elements.form.addEventListener('submit', (event) => {
    event.preventDefault();
    const formData = new FormData(event.target);
    state.ui.form.isRefreshed = false;

    const url = formData.get('url');

    validateUrl({ url })
      .then(() => {
        if (checkForAlreadyExistsError(state, url)) {
          return;
        }

        getNewRSS(url);
      })
      .then(() => render(state))
      .catch((e) => handleInvalidUrlError(state, e));
  });

  render(state);
  watchForUpdates();
};
