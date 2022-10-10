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
    }
  });

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

  const renderSinglePost = (post, postIndex, render) => {
    const postElement = document.createElement('li');
    postElement.classList.add('list-group-item', 'd-flex', 'justify-content-between', 'align-items-start', 'border-0', 'border-end-0');
    postElement.innerHTML = createPostHtml(post);

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
        render();
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

  renderView();
};
