import axios from 'axios';
import _ from 'lodash';
import onChange from 'on-change';
import i18next from 'i18next';
import ru from './locales/ru.js';

i18next.init({
  lng: 'ru',
  debug: true,
  resources: {
    ru,
  },
});

export default (state) => {
  const { elements, rss } = state;

  const watchedState = onChange(state, (path, value) => {
    if (path === 'ui.input.isValid') {
      if (value) {
        elements.input.classList.remove('is-invalid');
        elements.feedback.classList.remove('text-danger');
        elements.feedback.classList.add('text-success');
        return;
      }

      elements.input.classList.add('is-invalid');
      elements.feedback.classList.add('text-danger');
      elements.feedback.classList.remove('text-success');
    }

    if (path === 'ui.message') {
      elements.feedback.textContent = value;
    }
  });

  const renderFeeds = () => {
    const { feeds: feedsContainerElement, posts: postsContainerElement } = elements;

    feedsContainerElement.innerHTML = `
      <div class="card border-0">
        <div class="card-body">
        <h2 class="card-title h4">Фиды</h2>
        </div>
        <ul class="list-group border-0 rounded-0"></ul>
      </div>
    `;

    postsContainerElement.innerHTML = `
      <div class="card border-0">
        <div class="card-body">
          <h2 class="card-title h4">Посты</h2>
        </div>
        <ul class="list-group border-0 rounded-0"></ul>
      </div>
    `;

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

    const postList = postsContainerElement.querySelector('ul');

    rss.posts.forEach((post, postIndex) => {
      const postElement = document.createElement('li');
      postElement.classList.add('list-group-item', 'd-flex', 'justify-content-between', 'align-items-start', 'border-0', 'border-end-0');
      postElement.innerHTML = `
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

      postList.prepend(postElement);

      postElement.addEventListener('click', (e) => {
        const modal = document.getElementById('modal');
        const modalTitle = modal.querySelector('.modal-title');
        const modalBody = modal.querySelector('.modal-body');
        const modalLink = modal.querySelector('a');

        if (e.target.tagName === 'BUTTON') {
          watchedState.rss.posts[postIndex] = { ...post, isRead: true };

          modalTitle.textContent = post.title;
          modalBody.textContent = post.description;
          modalLink.href = post.link;

          watchedState.ui.input.isValid = true;
          watchedState.ui.message = i18next.t('yup.rssView');
          renderFeeds();
        }
      });
    });
  };

  const updateRSS = () => rss.feeds.forEach((feed, index) => {
    const { id, url } = feed;
    const currentPosts = _.filter(rss.posts, ({ feedId }) => feedId === id);

    const parser = new DOMParser();

    axios.get(`https://allorigins.hexlet.app/get?disableCache=true&url=${encodeURIComponent(url)}`)
      .then((response) => response.data)
      .then((data) => parser.parseFromString(data.contents, 'text/xml'))
      .then((rssHtml) => {
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

        watchedState.rss.feeds[index] = { ...feed, pubDate: newPubDate };

        if (!_.isEmpty(diffPosts)) {
          const lastPostId = _.isEmpty(rss.posts) ? 0 : _.last(rss.posts).id;

          const newPosts = _.sortBy(diffPosts, (post) => (post.pubDate))
            .map((post, postIndex) => {
              const newPostId = lastPostId + postIndex + 1;
              return { ...post, id: newPostId };
            });

          watchedState.rss.posts = [
            ...watchedState.rss.posts,
            ...newPosts,
          ];

          renderFeeds();
        }
      })
      .catch((e) => { throw (e); });
  });

  const watchForUpdates = () => {
    const timeStep = 5000;
    setTimeout(watchForUpdates, timeStep);

    updateRSS();
  };

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

  if (!_.isEmpty(state.rss.feeds)) {
    renderFeeds();
    renderInputValidity();
  }

  elements.feedback.textContent = state.ui.message;

  if (!state.rss.isWatchedForUpdates) {
    watchedState.rss.isWatchedForUpdates = true;
    watchForUpdates();
  }
};
