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

const isEmpty = (items) => items.length === 0;

const sortByPubDate = (items) => {
  const dates = items.map((item) => [item, Date.parse(item.pubDate)]);
  const sortedItems = dates.reduce(([sorted, unsorted], [item]) => {
    const minDate = Math.min(...unsorted);

    const newUnsorted = [
      ...unsorted.filter(([, date]) => date !== minDate),
      ...unsorted.filter(([, date]) => date === minDate).slice(1),
    ];

    return [
      [item, ...sorted],
      newUnsorted,
    ];
  }, [[], dates])
    .at(0);

  return sortedItems;
};

const sortById = (items) => items.reduce((sorted, item, index) => [
  ...sorted,
  items.filter((el) => el.id === index + 1).at(0),
], []);

const getLastPostId = (posts) => {
  if (isEmpty(posts)) {
    return 0;
  }

  const sortedPosts = sortById(posts);

  return sortedPosts.at(-1).id;
};

const generateNewId = (items) => {
  if (!items.length) {
    return 1;
  }

  const sortedItems = sortById(items);

  const lastItemId = sortedItems.at(-1).id;

  return lastItemId + 1;
};

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

// const generateNewId = (items) => {
//   if (!items.length) {
//     return 1;
//   }

//   const sortedItems = items.reduce((sorted, item, index) => [
//     ...sorted,
//     items.filter((el) => el.id === index + 1).at(0),
//   ], []);

//   const lastItemId = sortedItems.at(-1).id;

//   return lastItemId + 1;
// };

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

        newRss.posts = sortByPubDate(newPostsUnsorted);

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

      if (!isEmpty(diffPosts)) {
        const lastPostId = getLastPostId(view.rss.posts);

        const newPosts = sortByPubDate(diffPosts)
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
