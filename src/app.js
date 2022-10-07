import axios from 'axios';
import _ from 'lodash';
import i18next from 'i18next';
import { object, string } from 'yup';
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

  const parsePostsFromRssHtml = (rssHtml, newPostId, newFeedId) => {
    const postElements = rssHtml.querySelectorAll('item');

    return Array.from(postElements).reduce((postsArr, el, index) => {
      const id = newPostId + index;

      return [
        ...postsArr,
        {
          feedId: newFeedId,
          title: el.querySelector('title').textContent,
          link: el.querySelector('link').textContent,
          description: el.querySelector('description').textContent,
          pubDate: el.querySelector('pubDate').textContent,
          isRead: false,
          id,
        },
      ];
    }, []);
  };

  const getNewRSS = (url) => {
    if (!url) {
      state.ui.input.isValid = false;
      state.ui.message = i18next.t('yup.errors.emptyRSS');
      return;
    }

    getRssHtml(url)
      .catch((e) => {
        state.ui.input.isValid = false;
        state.ui.message = i18next.t('yup.errors.networkError');
        render(state);
        throw (e);
      })
      .then((rssHtml) => {
        const { feeds, posts } = rss;

        const lastFeedId = _.isEmpty(feeds) ? 0 : _.last(feeds).id;
        const newFeedId = lastFeedId + 1;

        const title = rssHtml.querySelector('title').textContent;
        const description = rssHtml.querySelector('description').textContent;
        const pubDate = rssHtml.querySelector('pubDate').textContent;

        const feed = {
          id: newFeedId,
          url,
          title,
          description,
          pubDate,
        };

        rss.feeds = [...rss.feeds, feed];

        const lastPostId = _.isEmpty(posts) ? 0 : _.last(posts).id;
        const newPostId = lastPostId + 1;

        const newPostsUnsorted = parsePostsFromRssHtml(rssHtml, newPostId, newFeedId);

        const newPosts = _.sortBy(newPostsUnsorted, (post) => (post.pubDate))
          .map((post, index) => {
            const id = newPostId + index;
            return { ...post, id };
          });

        rss.posts = [
          ...rss.posts,
          ...newPosts,
        ];

        ui.input.isValid = true;
        ui.message = i18next.t('yup.success');

        render(state);
      })
      .catch((e) => {
        if (e.message !== 'Network Error') {
          ui.input.isValid = false;
          ui.message = i18next.t('yup.errors.invalidRSS');
          render(state);
          throw (e);
        }
      });
  };

  const parseUpdatedFeedHtml = (rssHtml, feed, index) => {
    const { id } = feed;
    const currentPosts = _.filter(rss.posts, ({ feedId }) => feedId === id);
    const postElements = rssHtml.querySelectorAll('item');

    const posts = Array.from(postElements).map((el) => ({
      feedId: id,
      title: el.querySelector('title').textContent,
      link: el.querySelector('link').textContent,
      description: el.querySelector('description').textContent,
      pubDate: el.querySelector('pubDate').textContent,
    }));

    const newPubDate = rssHtml.querySelector('pubDate').textContent;
    const diffPosts = _.differenceWith(posts, currentPosts.map((el) => _.omit(el, ['id', 'isRead'])), _.isEqual);

    rss.feeds[index] = { ...feed, pubDate: newPubDate };

    return diffPosts;
  };

  const renderUpdatedFeed = (diffPosts) => {
    if (!_.isEmpty(diffPosts)) {
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
      .then((rssHtml) => parseUpdatedFeedHtml(rssHtml, feed, index))
      .then(renderUpdatedFeed)
      .catch((e) => { throw (e); });
  });

  const watchForUpdates = () => {
    const timeStep = 5000;
    setTimeout(watchForUpdates, timeStep);

    updateRSS();
  };

  elements.form.addEventListener('submit', (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    e.target.reset();
    elements.input.focus();

    const url = formData.get('url');

    validateUrl({ url })
      .then((data) => {
        const { feeds } = state.rss;
        const isRepeated = feeds.some((feed) => feed.url === data.url);

        if (isRepeated) {
          ui.message = i18next.t('yup.errors.alreadyExists');
          ui.input.isValid = false;
          render(state);
          return;
        }

        getNewRSS(data.url);
        render(state);
      })
      .catch(() => {
        ui.message = i18next.t('yup.errors.invalidURL');
        ui.input.isValid = false;
        render(state);
      });
  });

  render(state);
  watchForUpdates();
};
