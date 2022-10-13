import _ from 'lodash';
import axios from 'axios';
import i18next from 'i18next';
import { object, string } from 'yup';
import ru from './locales/ru.js';
import render from './view.js';
import { parseRssFromHtml, parseUpdatedRssHtml } from './parsers.js';

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

  i18next.init({
    lng: 'ru',
    debug: true,
    resources: {
      ru,
    },
  });

  const changeUiState = (message) => {
    view.form.input.isValid = false;
    view.form.message = message;
  };

  const handleNetworkError = (e) => {
    changeUiState(i18next.t('yup.errors.networkError'));
    throw (e);
  };

  const handleInvalidRssError = (e) => {
    if (e.message !== 'Network Error') {
      changeUiState(i18next.t('yup.errors.invalidRss'));
      throw (e);
    }
  };

  const handleInvalidUrlError = () => {
    changeUiState(i18next.t('yup.errors.invalidUrl'));
  };

  const checkForEmptyRssUrlError = (url) => {
    if (!url) {
      changeUiState(i18next.t('yup.errors.emptyRssUrl'));
      return true;
    }

    return false;
  };

  const checkForAlreadyExistsError = (url) => {
    const { feeds } = view.rss;
    const isRepeated = feeds.some((feed) => feed.url === url);

    if (isRepeated) {
      changeUiState(i18next.t('yup.errors.alreadyExists'));
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

  const addNewRss = (url) => {
    const { form, rss } = view;

    if (checkForEmptyRssUrlError(url)) {
      return;
    }

    getRssHtml(url)
      .catch((e) => handleNetworkError(e))
      .then((rssHtml) => {
        const { feeds, posts } = rss;

        const newFeedId = !feeds.length ? 1 : feeds.at(-1).id + 1;
        const newPostId = !posts.length ? 1 : posts.at(-1).id + 1;

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
      .catch((e) => handleInvalidRssError(e));
  };

  const updateRss = () => {
    view.rss.feeds.forEach((feed, index) => {
      const { url } = feed;

      getRssHtml(url)
        .then((rssHtml) => parseUpdatedRssHtml(rssHtml, feed, index))
        .then(([changedFeed, updatedFeedIndex, posts]) => {
          const { id } = changedFeed;

          const currentPosts = view.rss.posts.filter(({ feedId }) => feedId === id);
          const diffPosts = _.differenceWith(posts, currentPosts.map((el) => _.omit(el, ['id', 'isRead'])), _.isEqual);

          if (!_.isEmpty(diffPosts)) {
            const lastPostId = _.isEmpty(view.rss.posts)
              ? 0
              : _.last(view.rss.posts).id;

            const newPosts = _.sortBy(diffPosts, (post) => (post.pubDate))
              .map((post, postIndex) => {
                const newPostId = lastPostId + postIndex + 1;
                return { ...post, id: newPostId };
              });

            view.rss.posts = [...view.rss.posts, ...newPosts];

            _.set(view.rss.feeds, updatedFeedIndex, changedFeed);
          }
        })
        .catch((e) => { throw (e); });
    });
  };

  const watchForUpdates = () => {
    const timeStep = 5000;
    setTimeout(watchForUpdates, timeStep);

    updateRss();
  };

  const form = document.querySelector('form');
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const formData = new FormData(event.target);
    view.form.isRefreshed = false;

    const url = formData.get('url');

    validateUrl({ url })
      .then(() => {
        if (checkForAlreadyExistsError(url)) {
          return false;
        }

        return addNewRss(url);
      })
      .catch((e) => handleInvalidUrlError(e));
  });

  watchForUpdates();

  view.ui.isStateWatched = true;
};

export default app;
