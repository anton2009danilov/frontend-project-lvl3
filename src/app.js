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
  _.set(watchedState, 'form.input.isValid', false);
  _.set(watchedState, 'form.message', message);
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

const addNewRss = (watchedState, url) => {
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

      _.set(
        watchedState,
        'rss',
        {
          feeds: _.concat(rss.feeds, newRss.feeds),
          posts: _.concat(rss.posts, newRss.posts),
        },
      );

      form.input.isValid = true;
      form.message = i18next.t('yup.success');
    })
    .catch((e) => handleInvalidRssError(watchedState, e));
};

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

          _.set(
            watchedState,
            'rss',
            {
              feeds: updatedFeeds,
              posts: updatedPosts,
            },
          );
        }
      })
      .catch((e) => { throw (e); });
  });
};

const app = () => {
  const state = {
    form: {
      isRefreshed: true,
      message: null,
      input: {
        isValid: true,
      },
    },
    ui: {
      isStateWatched: false,
    },
    rss: {
      feeds: [],
      posts: [],
    },
  };

  const view = render(state);

  const watchForUpdates = () => {
    const timeStep = 5000;
    setTimeout(watchForUpdates, timeStep);

    updateRss(view);
  };

  const watchApp = () => {
    if (!state.ui.isStateWatched) {
      const form = document.querySelector('form');
      form.addEventListener('submit', (event) => {
        event.preventDefault();
        const formData = new FormData(event.target);
        view.form.isRefreshed = false;

        const url = formData.get('url');

        validateUrl({ url })
          .then(() => {
            if (checkForAlreadyExistsError(view, url)) {
              return false;
            }

            return addNewRss(view, url);
          })
          .catch((e) => handleInvalidUrlError(view, e));
      });

      watchForUpdates();

      view.ui.isStateWatched = true;
    }
  };

  watchApp(view);
};

export default app;
