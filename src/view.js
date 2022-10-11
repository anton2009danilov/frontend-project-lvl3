import _ from 'lodash';
import onChange from 'on-change';
import { object, string } from 'yup';
import i18next from 'i18next';
import {
  handleInvalidUrlError,
  checkForAlreadyExistsError,
} from './modules/error-handlers.js';
import addNewRSS from './modules/add-new-rss.js';
import { parseUpdatedRssHtml } from './modules/parsers.js';
import getRssHtml from './modules/get-rss-html.js';
import ru from './locales/ru.js';

const validateUrl = (url) => {
  const urlSchema = object({
    url: string().url(),
  });

  return urlSchema.validate(url);
};

i18next.init({
  lng: 'ru',
  debug: true,
  resources: {
    ru,
  },
});

const elements = {
  form: document.querySelector('form'),
  input: document.querySelector('input'),
  feedback: document.querySelector('.feedback'),
  feeds: document.querySelector('div.feeds'),
  posts: document.querySelector('div.posts'),
};

const render = (state) => {
  const renderInputValidity = () => {
    if (state.ui.input.isValid) {
      elements.input.classList.remove('is-invalid');
      elements.feedback.classList.remove('text-danger');
      elements.feedback.classList.add('text-success');
      return;
    }

    elements.input.classList.add('is-invalid');
    elements.feedback.classList.add('text-danger');
    elements.feedback.classList.remove('text-success');
  };

  const watchedState = onChange(state, (path, value) => {
    if (path === 'ui.form.isRefreshed' && value) {
      elements.form.reset();
      elements.input.focus();
      return;
    }

    if (path === 'ui.message') {
      render(state);
      return;
    }

    if (path === 'rss') {
      render(state);
    }
  });

  const { rss } = state;

  const createFeedHtml = () => `
    <div class="card border-0">
      <div class="card-body">
      <h2 class="card-title h4">Фиды</h2>
      </div>
      <ul class="list-group border-0 rounded-0"></ul>
    </div>
  `;

  const renderAllFeeds = () => {
    const { feeds: feedsContainerElement } = elements;

    feedsContainerElement.innerHTML = createFeedHtml();

    const feedsList = feedsContainerElement.querySelector('ul');

    rss.feeds.forEach((feed) => {
      const li = document.createElement('li');
      li.classList.add('list-group-item', 'border-0', 'border-end-0');
      li.innerHTML = `
        <h3 class="h6 m-0">${feed.title}</h3>
        <p class="m-0 small text-black-50">${feed.description}</p>
      `;
      feedsList.append(li);
    });
  };

  const createPostHtml = (post) => `
    <a 
      href="${post.link}"
      class="${post.isRead ? 'fw-normal' : 'fw-bold'}"
      style="color: ${!post.isRead && 'blue'};"
      data-post_id="${post.id}"
      target="_blank"
      rel="noopener noreferrer"
    >
      ${post.title}
    </a>
    <button
      type="button"
      class="btn btn-outline-primary btn-sm"
      data-post_id="${post.id}"
      data-bs-toggle="modal"
      data-bs-target="#modal"
    >
      Просмотр
    </button>
  `;

  const renderSinglePost = (post, postIndex, renderFn) => {
    const postElement = document.createElement('li');
    postElement.classList.add('list-group-item', 'd-flex', 'justify-content-between', 'align-items-start', 'border-0', 'border-end-0');
    postElement.innerHTML = createPostHtml(post);

    postElement.addEventListener('click', (e) => {
      const modal = document.getElementById('modal');
      const modalTitle = modal.querySelector('.modal-title');
      const modalBody = modal.querySelector('.modal-body');
      const modalLink = modal.querySelector('a');

      if (e.target.tagName === 'BUTTON') {
        watchedState.rss.posts[postIndex] = _.set(post, 'isRead', true);

        modalTitle.textContent = post.title;
        modalBody.textContent = post.description;
        modalLink.href = post.link;

        watchedState.ui.input.isValid = true;
        watchedState.ui.message = i18next.t('yup.rssView');
        renderFn();
      }
    });

    return postElement;
  };

  const renderAllPosts = () => {
    const { posts: postsContainerElement } = elements;

    postsContainerElement.innerHTML = `
      <div class="card border-0">
        <div class="card-body">
          <h2 class="card-title h4">Посты</h2>
        </div>
        <ul class="list-group border-0 rounded-0"></ul>
      </div>
    `;

    const postList = postsContainerElement.querySelector('ul');

    rss.posts.forEach((post, postIndex) => {
      const view = renderSinglePost(post, postIndex, renderAllPosts);
      postList.prepend(view);
    });
  };

  const renderView = () => {
    if (!_.isEmpty(state.rss.feeds)) {
      renderAllFeeds();
      renderAllPosts();
      renderInputValidity();
    }

    if (!state.ui.form.isRefreshed) {
      watchedState.ui.form.isRefreshed = true;
    }

    elements.feedback.textContent = state.ui.message;
  };

  const updateRss = () => {
    state.rss.feeds.forEach((feed, index) => {
      const { url } = feed;

      getRssHtml(url)
        .then((rssHtml) => parseUpdatedRssHtml(rssHtml, feed, index))
        .then(([changedFeed, updatedFeedIndex, posts]) => {
          const { id } = changedFeed;
          const currentPosts = _.filter(state.rss.posts, ({ feedId }) => feedId === id);
          const diffPosts = _.differenceWith(posts, currentPosts.map((el) => _.omit(el, ['id', 'isRead'])), _.isEqual);

          if (!_.isEmpty(diffPosts)) {
            const lastPostId = _.isEmpty(rss.posts) ? 0 : _.last(rss.posts).id;

            const newPosts = _.sortBy(diffPosts, (post) => (post.pubDate))
              .map((post, postIndex) => {
                const newPostId = lastPostId + postIndex + 1;
                return _.set(post, 'id', newPostId);
              });

            const updatedFeeds = _.set(_.clone(state).rss.feeds, updatedFeedIndex, changedFeed);
            const updatedPosts = _.concat(state.rss.posts, newPosts);

            watchedState.rss = {
              feeds: updatedFeeds,
              posts: updatedPosts,
            };
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

  if (!state.isAppRunning) {
    elements.form.addEventListener('submit', (event) => {
      event.preventDefault();
      const formData = new FormData(event.target);
      watchedState.ui.form.isRefreshed = false;

      const url = formData.get('url');

      validateUrl({ url })
        .then(() => {
          if (checkForAlreadyExistsError(watchedState, url)) {
            return false;
          }

          return addNewRSS(watchedState, url);
        })
        .catch((e) => handleInvalidUrlError(watchedState, e));
    });

    watchForUpdates();

    watchedState.isAppRunning = true;
  }

  renderView();
};

export default render;
