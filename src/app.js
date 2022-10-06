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
      isUpdating: false,
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

  const getNewRSS = (url) => {
    if (!url) {
      state.ui.input.isValid = false;
      state.ui.message = i18next.t('yup.errors.emptyRSS');
      return;
    }

    const parser = new DOMParser();

    axios.get(`https://allorigins.hexlet.app/get?disableCache=true&url=${encodeURIComponent(url)}`)
      .then((response) => response.data)
      .then((data) => parser.parseFromString(data.contents, 'text/xml'))
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
        const lastPostId = _.isEmpty(posts) ? 0 : _.last(posts).id;
        const newPostId = lastPostId + 1;

        const title = rssHtml.querySelector('title').textContent;

        const description = rssHtml.querySelector('description').textContent;
        const pubDate = rssHtml.querySelector('pubDate').textContent;
        const postElements = rssHtml.querySelectorAll('item');
        const newPostsUnsorted = Array.from(postElements).reduce((postsArr, el, index) => {
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

        const newPosts = _.sortBy(newPostsUnsorted, (post) => (post.pubDate))
          .map((post, index) => {
            const id = newPostId + index;
            return { ...post, id };
          });

        const feed = {
          id: newFeedId,
          url,
          title,
          description,
          pubDate,
        };

        rss.feeds = [...rss.feeds, feed];
        ui.input.isValid = true;
        ui.message = i18next.t('yup.success');
        rss.posts = [
          ...rss.posts,
          ...newPosts,
        ];

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
};
