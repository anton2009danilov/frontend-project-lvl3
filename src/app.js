/* eslint-disable no-param-reassign */
import axios from 'axios';
import _ from 'lodash';

import i18next from 'i18next';
import { object, string } from 'yup';
import ru from './locales/ru.js';
import render from './view.js';
import parseRssFromHtml from './parsers.js';

const isEmpty = (items) => items.length === 0;

const omit = (elements, omittedKey) => elements.map((element) => Object.entries(element)
  .reduce((modifiedElement, [key, value]) => {
    if (key !== omittedKey) {
      return { ...modifiedElement, [key]: value };
    }

    return modifiedElement;
  }, {}));

const validateUrl = (url, watchedState) => {
  const urlSchema = object({
    url: string().url().min(1),
  });

  const isRepeated = watchedState.rss.feeds.some((feed) => feed.url === url);

  if (isRepeated) {
    return Promise.reject(new Error('RSS already exists'));
  }

  return urlSchema.validate({ url });
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

  const { watchedState } = render(state);

  const addNewRss = (url) => {
    const { form, rss } = watchedState;

    const request = axios.get(`https://allorigins.hexlet.app/get?disableCache=true&url=${encodeURIComponent(url)}`);

    parseRssFromHtml(request, url)
      .then((newRss) => {
        const newFeedId = _.uniqueId('feed_');

        newRss.feed = { ...newRss.feed, id: newFeedId };

        newRss.posts = newRss.posts.map((post) => ({
          ...post,
          feedId: newFeedId,
          id: _.uniqueId('post_'),
        }));

        watchedState.rss = {
          feeds: [...rss.feeds, newRss.feed],
          posts: [...rss.posts, ...newRss.posts],
        };

        form.input.isValid = true;
        form.message = 'yup.success';
      })
      .catch((e) => {
        if (e.message === 'Network Error') {
          watchedState.form.input.isValid = false;
          watchedState.form.message = 'yup.errors.networkError';
          throw (e);
        }

        watchedState.form.input.isValid = false;
        watchedState.form.message = 'yup.errors.invalidRss';
        throw (e);
      });
  };

  const updateRss = (feed) => {
    const request = axios.get(`https://allorigins.hexlet.app/get?disableCache=true&url=${encodeURIComponent(feed.url)}`);

    return parseRssFromHtml(request, feed.url)
      .then((rss) => {
        const posts = rss.posts.map((post) => ({ ...post, feedId: feed.id }));
        const currentPosts = watchedState.rss.posts.filter(({ feedId }) => feedId === feed.id);

        const diffPosts = _.differenceWith(
          posts,
          omit(currentPosts, 'id'),
          _.isEqual,
        );

        if (!isEmpty(diffPosts)) {
          const newPosts = diffPosts.map((post) => {
            const newPostId = _.uniqueId('post_');
            return { ...post, id: newPostId };
          });

          watchedState.rss.posts = [...watchedState.rss.posts, ...newPosts];
        }
      });
  };

  const watchForUpdates = () => {
    const timeStep = 5000;

    Promise.allSettled(watchedState.rss.feeds.map((feed, index) => updateRss(feed, index)))
      .then(() => setTimeout(watchForUpdates, timeStep));
  };

  const form = document.querySelector('form');

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const formData = new FormData(event.target);

    const url = formData.get('url');

    validateUrl(url, watchedState)
      .then(() => addNewRss(url))
      .catch((e) => {
        if (e.toString() === 'Error: RSS already exists') {
          watchedState.form.input.isValid = false;
          watchedState.form.message = 'yup.errors.alreadyExists';
          return;
        }

        if (e.toString() === 'ValidationError: url must be at least 1 characters') {
          watchedState.form.input.isValid = false;
          watchedState.form.message = 'yup.errors.emptyRssUrl';
          return;
        }

        watchedState.form.input.isValid = false;
        watchedState.form.message = 'yup.errors.invalidUrl';
      });
  });

  watchForUpdates();
};

export default app;
