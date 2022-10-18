import _ from 'lodash';
import axios from 'axios';
import i18next from 'i18next';
import { object, string } from 'yup';
import ru from './locales/ru.js';
import render from './view.js';
import { parseRssFromHtml, parsePostsFromRssHtml } from './parsers.js';

const isEmpty = (items) => items.length === 0;

const omit = (elements, omittedKey) => elements.map((element) => Object.entries(element)
  .reduce((modifiedElement, [key, value]) => {
    if (key !== omittedKey) {
      return { ...modifiedElement, [key]: value };
    }

    return modifiedElement;
  }, {}));

const validateUrl = (url) => {
  const urlSchema = object({
    url: string().url(),
  });

  return urlSchema.validate(url);
};

const getRssHtml = (url) => {
  const parser = new DOMParser();

  return axios.get(`https://allorigins.hexlet.app/get?disableCache=true&url=${encodeURIComponent(url)}`)
    .then((response) => parser.parseFromString(response.data.contents, 'text/xml'));
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

  const watchedState = render(state);

  const addNewRss = (url) => {
    const { form, rss } = watchedState;

    if (!url) {
      watchedState.form.input.isValid = false;
      watchedState.form.message = 'yup.errors.emptyRssUrl';
      return;
    }

    getRssHtml(url)
      .catch((e) => {
        watchedState.form.input.isValid = false;
        watchedState.form.message = 'yup.errors.networkError';
        throw (e);
      })
      .then((rssHtml) => {
        const newFeedId = _.uniqueId('feed_');
        const newRss = parseRssFromHtml(rssHtml, url);

        newRss.feeds = newRss.feeds.map((feed) => ({ ...feed, id: newFeedId }));

        newRss.posts = newRss.posts.map((post) => ({
          ...post,
          feedId: newFeedId,
          id: _.uniqueId('post_'),
        }));

        watchedState.rss = {
          feeds: [...rss.feeds, ...newRss.feeds],
          posts: [...rss.posts, ...newRss.posts],
        };

        form.input.isValid = true;
        form.message = 'yup.success';
      })
      .catch((e) => {
        if (e.message !== 'Network Error') {
          watchedState.form.input.isValid = false;
          watchedState.form.message = 'yup.errors.invalidRss';
          throw (e);
        }
      });
  };

  const updateRss = (feed) => getRssHtml(feed.url)
    .then((rssHtml) => parsePostsFromRssHtml(rssHtml)
      .map((post) => ({ ...post, feedId: feed.id })))
    .then((posts) => {
      const { id } = feed;

      const currentPosts = watchedState.rss.posts.filter(({ feedId }) => feedId === id);

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
    })
    .catch((e) => { throw (e); });

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

    validateUrl({ url })
      .then(() => {
        const isRepeated = watchedState.rss.feeds.some((feed) => feed.url === url);

        if (isRepeated) {
          watchedState.form.input.isValid = false;
          watchedState.form.message = 'yup.errors.alreadyExists';
          return true;
        }

        return addNewRss(url);
      })
      .catch(() => {
        watchedState.form.input.isValid = false;
        watchedState.form.message = 'yup.errors.invalidUrl';
      });
  });

  watchForUpdates();
};

export default app;
