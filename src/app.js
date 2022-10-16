import _ from 'lodash';
import axios from 'axios';
import i18next from 'i18next';
import { object, string } from 'yup';
import ru from './locales/ru.js';
import render from './view.js';
import { parseRssFromHtml, parseUpdatedRssHtml } from './parsers.js';

i18next.init({
  lng: 'ru',
  debug: true,
  resources: {
    ru,
  },
});

const changeUiState = (watchedState, message) => {
  const state = watchedState;
  state.form.input.isValid = false;
  state.form.message = message;
};

const handleNetworkError = (watchedState, e) => {
  changeUiState(watchedState, i18next.t('yup.errors.networkError'));
  throw (e);
};

const handleInvalidRssError = (watchedState, e) => {
  if (e.message !== 'Network Error') {
    changeUiState(watchedState, i18next.t('yup.errors.invalidRss'));
    throw (e);
  }
};

const handleInvalidUrlError = (watchedState) => {
  changeUiState(watchedState, i18next.t('yup.errors.invalidUrl'));
};

const checkForEmptyRssUrlError = (watchedState, url) => {
  if (!url) {
    changeUiState(watchedState, i18next.t('yup.errors.emptyRssUrl'));
    return true;
  }

  return false;
};

const checkForAlreadyExistsError = (watchedState, url) => {
  const { feeds } = watchedState.rss;
  const isRepeated = feeds.some((feed) => feed.url === url);

  if (isRepeated) {
    changeUiState(watchedState, i18next.t('yup.errors.alreadyExists'));
    return true;
  }

  return false;
};

const validateUrl = (url) => {
  const urlSchema = object({
    url: string().url(),
  });

  return urlSchema.validate(url);
};

const getRssHtml = (url) => {
  const parser = new DOMParser();

  return axios.get(`https://allorigins.hexlet.app/get?disableCache=true&url=${encodeURIComponent(url)}`)
    .then((response) => response.data)
    .then((data) => parser.parseFromString(data.contents, 'text/xml'));
};

const generateNewId = (items) => (!items.length
  ? 1
  : _.last(_.sortBy(items, (el) => el.id)).id + 1);

const app = () => {
  const state = {
    form: {
      message: null,
      input: {
        isValid: true,
      },
    },
    ui: {
      readPostsIds: [],
    },
    rss: {
      feeds: [],
      posts: [],
    },
  };

  const view = render(state);

  const addNewRss = (url) => {
    const { form, rss } = view;

    if (checkForEmptyRssUrlError(view, url)) {
      return;
    }

    getRssHtml(url)
      .catch((e) => handleNetworkError(view, e))
      .then((rssHtml) => {
        const { feeds, posts } = rss;

        const newFeedId = generateNewId(feeds);
        const newPostId = generateNewId(posts);

        const newRss = parseRssFromHtml(rssHtml, url);
        newRss.feeds = newRss.feeds.map((feed) => ({ ...feed, id: newFeedId }));

        const newPostsUnsorted = newRss.posts.map((post, index) => ({
          ...post,
          feedId: newFeedId,
          id: newPostId + index,
        }));

        newRss.posts = _.sortBy(newPostsUnsorted, (post) => (post.pubDate));

        view.rss = {
          feeds: [...rss.feeds, ...newRss.feeds],
          posts: [...rss.posts, ...newRss.posts],
        };

        form.input.isValid = true;
        form.message = i18next.t('yup.success');
      })
      .catch((e) => handleInvalidRssError(view, e));
  };

  const updateRss = (feed) => getRssHtml(feed.url)
    .then((rssHtml) => parseUpdatedRssHtml(rssHtml, feed.id))
    .then((posts) => {
      const { id } = feed;

      const currentPosts = view.rss.posts.filter(({ feedId }) => feedId === id);
      const diffPosts = _.differenceWith(posts, currentPosts.map((el) => _.omit(el, ['id'])), _.isEqual);

      if (!_.isEmpty(diffPosts)) {
        const lastPostId = _.isEmpty(view.rss.posts)
          ? 0
          : _.last(_.sortBy(view.rss.posts, (el) => el.id)).id;

        const newPosts = _.sortBy(diffPosts, (post) => (post.pubDate))
          .map((post, postIndex) => {
            const newPostId = lastPostId + postIndex + 1;
            return { ...post, id: newPostId };
          });

        view.rss.posts = [...view.rss.posts, ...newPosts];
      }
    })
    .catch((e) => { throw (e); });

  const watchForUpdates = () => {
    const timeStep = 5000;

    Promise.allSettled(view.rss.feeds.map((feed, index) => updateRss(feed, index)))
      .then(() => setTimeout(watchForUpdates, timeStep));
  };

  const form = document.querySelector('form');

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const formData = new FormData(event.target);

    const url = formData.get('url');

    validateUrl({ url })
      .then(() => {
        if (checkForAlreadyExistsError(view, url)) {
          return false;
        }

        return addNewRss(url);
      })
      .catch((e) => handleInvalidUrlError(view, e));
  });

  watchForUpdates();
};

export default app;
