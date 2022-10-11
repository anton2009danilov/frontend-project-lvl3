import _ from 'lodash';
import i18next from 'i18next';

const elements = {
  form: document.querySelector('form'),
  input: document.querySelector('input'),
  feedback: document.querySelector('.feedback'),
  feeds: document.querySelector('div.feeds'),
  posts: document.querySelector('div.posts'),
};

const renderInputValidity = (isValid) => {
  if (isValid) {
    elements.input.classList.remove('is-invalid');
    elements.feedback.classList.remove('text-danger');
    elements.feedback.classList.add('text-success');
    return;
  }

  elements.input.classList.add('is-invalid');
  elements.feedback.classList.add('text-danger');
  elements.feedback.classList.remove('text-success');
};

const createFeedHtml = () => `
    <div class="card border-0">
      <div class="card-body">
      <h2 class="card-title h4">Фиды</h2>
      </div>
      <ul class="list-group border-0 rounded-0"></ul>
    </div>
  `;

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

const renderFeedsList = (feeds) => {
  const { feeds: feedsContainerElement } = elements;

  feedsContainerElement.innerHTML = createFeedHtml();

  const feedsList = feedsContainerElement.querySelector('ul');

  feeds.forEach((feed) => {
    const li = document.createElement('li');
    li.classList.add('list-group-item', 'border-0', 'border-end-0');
    li.innerHTML = `
        <h3 class="h6 m-0">${feed.title}</h3>
        <p class="m-0 small text-black-50">${feed.description}</p>
      `;
    feedsList.append(li);
  });
};

const renderSinglePost = (post) => {
  const postElement = document.createElement('li');
  postElement.classList.add('list-group-item', 'd-flex', 'justify-content-between', 'align-items-start', 'border-0', 'border-end-0');
  postElement.innerHTML = createPostHtml(post);

  return postElement;
};

const renderPostsList = (watchedState) => {
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

  watchedState.rss.posts.forEach((post, postIndex) => {
    const view = renderSinglePost(post);
    view.addEventListener('click', (e) => {
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
        renderPostsList(watchedState);
      }
    });
    postList.prepend(view);
  });
};

export {
  renderInputValidity,
  renderFeedsList,
  renderPostsList,
};
