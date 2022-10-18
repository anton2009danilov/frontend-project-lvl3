import _ from 'lodash';
import axios from 'axios';
import i18next from 'i18next';
import { object, string } from 'yup';
import ru from './locales/ru.js';
import render from './view.js';
import { parseRssFromHtml, parseUpdatedRssHtml } from './parsers.js';

const isEmpty = (items) => items.length === 0;

const omitPostsIds = (posts) => posts.map((el) => ({
  description: el.description,
  feedId: el.feedId,
  link: el.link,
  pubDate: el.pubDate,
  title: el.title,
}));

const changeUiState = (watchedState, message) => {
  watchedState.form.input.isValid = false;
  watchedState.form.message = message;
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

const app = () => {
  i18next.init({
    lng: 'ru',
    debug: true,
    resources: {
      ru,
    },
  });

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

  const wathedState = render(state);

  const addNewRss = (url) => {
    const { form, rss } = wathedState;

    if (checkForEmptyRssUrlError(wathedState, url)) {
      return;
    }

    getRssHtml(url)
      .catch((e) => handleNetworkError(wathedState, e))
      .then((rssHtml) => {
        const newFeedId = _.uniqueId('feed_');
        const newRss = parseRssFromHtml(rssHtml, url);

        newRss.feeds = newRss.feeds.map((feed) => ({ ...feed, id: newFeedId }));

        newRss.posts = newRss.posts.map((post) => ({
          ...post,
          feedId: newFeedId,
          id: _.uniqueId('post_'),
        }));

        wathedState.rss = {
          feeds: [...rss.feeds, ...newRss.feeds],
          posts: [...rss.posts, ...newRss.posts],
        };

        form.input.isValid = true;
        form.message = i18next.t('yup.success');
      })
      .catch((e) => handleInvalidRssError(wathedState, e));
  };

  const updateRss = (feed) => getRssHtml(feed.url)
    .then((rssHtml) => parseUpdatedRssHtml(rssHtml, feed.id))
    .then((posts) => {
      const { id } = feed;

      const currentPosts = wathedState.rss.posts.filter(({ feedId }) => feedId === id);

      const diffPosts = _.differenceWith(
        posts,
        omitPostsIds(currentPosts),
        _.isEqual,
      );

      if (!isEmpty(diffPosts)) {
        const newPosts = diffPosts.map((post) => {
          const newPostId = _.uniqueId('post_');
          return { ...post, id: newPostId };
        });

        wathedState.rss.posts = [...wathedState.rss.posts, ...newPosts];
      }
    })
    .catch((e) => { throw (e); });

  const watchForUpdates = () => {
    const timeStep = 5000;

    Promise.allSettled(wathedState.rss.feeds.map((feed, index) => updateRss(feed, index)))
      .then(() => setTimeout(watchForUpdates, timeStep));
  };

  const form = document.querySelector('form');

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const formData = new FormData(event.target);

    const url = formData.get('url');

    validateUrl({ url })
      .then(() => {
        if (checkForAlreadyExistsError(wathedState, url)) {
          return false;
        }

        return addNewRss(url);
      })
      .catch((e) => handleInvalidUrlError(wathedState, e));
  });

  watchForUpdates();
};

export default app;
