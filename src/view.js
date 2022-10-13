import _ from 'lodash';
import i18next from 'i18next';
import onChange from 'on-change';

const elements = {
  form: document.querySelector('form'),
  input: document.querySelector('input'),
  feedback: document.querySelector('.feedback'),
  feeds: document.querySelector('div.feeds'),
  posts: document.querySelector('div.posts'),
};

const createFeedsContainerHtml = () => {
  const card = document.createElement('div');
  const cardBody = document.createElement('div');
  const cardTitle = document.createElement('h2');
  const feedsList = document.createElement('ul');

  card.classList.add('card', 'border-0');
  cardBody.classList.add('card-body');
  cardTitle.classList.add('card-title', 'h4');
  feedsList.classList.add('list-group', 'border-0', 'rounded-0');

  cardTitle.textContent = 'Фиды';

  cardBody.append(cardTitle);
  card.append(cardBody, feedsList);

  return card.outerHTML;
};

const createPostsContainerHtml = () => {
  const card = document.createElement('div');
  const cardBody = document.createElement('div');
  const cardTitle = document.createElement('h2');
  const feedsList = document.createElement('ul');

  card.classList.add('card', 'border-0');
  cardBody.classList.add('card-body');
  cardTitle.classList.add('card-title', 'h4');
  feedsList.classList.add('list-group', 'border-0', 'rounded-0');

  cardTitle.textContent = 'Посты';

  cardBody.append(cardTitle);
  card.append(cardBody, feedsList);

  return card.outerHTML;
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

const renderFeedsList = (feeds) => {
  const { feeds: feedsContainerElement } = elements;

  feedsContainerElement.innerHTML = createFeedsContainerHtml();

  const feedsList = feedsContainerElement.querySelector('ul');

  feeds.forEach((feed) => {
    const listItem = document.createElement('li');
    listItem.classList.add('list-group-item', 'border-0', 'border-end-0');

    const title = document.createElement('h3');
    title.classList.add('h6', 'm-0');
    title.textContent = feed.title;

    const description = document.createElement('p');
    description.classList.add('m-0', 'small', 'text-black-50');
    description.textContent = feed.description;

    listItem.append(title, description);
    feedsList.append(listItem);
  });
};

const renderSinglePost = (post) => {
  const postElement = document.createElement('li');
  postElement.classList.add('list-group-item', 'd-flex', 'justify-content-between', 'align-items-start', 'border-0', 'border-end-0');

  const linkElement = document.createElement('a');
  linkElement.setAttribute('href', `${post.link}`);
  linkElement.setAttribute('style', `color: ${!post.isRead && 'blue'};`);
  linkElement.setAttribute('target', '_blank');
  linkElement.setAttribute('rel', 'noopener noreferrer');
  linkElement.dataset.post_id = post.id;
  linkElement.classList.add(`${post.isRead ? 'fw-normal' : 'fw-bold'}`);
  linkElement.textContent = post.title;

  const buttonElement = document.createElement('button');
  buttonElement.classList.add('btn', 'btn-outline-primary', 'btn-sm');
  buttonElement.setAttribute('type', 'button');
  buttonElement.dataset.post_id = post.id;
  buttonElement.dataset.bsToggle = 'modal';
  buttonElement.dataset.bsTarget = '#modal';
  buttonElement.textContent = 'Просмотр';

  postElement.append(linkElement, buttonElement);

  return postElement;
};

const renderPostsList = (state) => {
  const { posts: postsContainerElement } = elements;

  postsContainerElement.innerHTML = createPostsContainerHtml();

  const postList = postsContainerElement.querySelector('ul');

  state.rss.posts.forEach((post, postIndex) => {
    const view = renderSinglePost(post);

    view.addEventListener('click', (e) => {
      const modal = document.getElementById('modal');
      const modalTitle = modal.querySelector('.modal-title');
      const modalBody = modal.querySelector('.modal-body');
      const modalLink = modal.querySelector('a');

      if (e.target.tagName === 'BUTTON') {
        _.set(
          state,
          `rss.posts.${postIndex}`,
          _.set(post, 'isRead', true),
        );

        modalTitle.textContent = post.title;
        modalBody.textContent = post.description;
        modalLink.href = post.link;

        _.set(state, 'form.input.isValid', true);
        _.set(state, 'form.message', i18next.t('yup.rssView'));

        renderPostsList(state);
      }
    });
    postList.prepend(view);
  });
};

const renderView = (watchedState) => {
  const { form, rss } = watchedState;

  if (!_.isEmpty(rss.feeds)) {
    renderFeedsList(rss.feeds);
    renderPostsList(watchedState);
    renderInputValidity(form.input.isValid);
  }

  if (!watchedState.form.isRefreshed) {
    _.set(watchedState, 'form.isRefreshed', true);
  }

  elements.feedback.textContent = watchedState.form.message;
};

const render = (state) => {
  const watchedState = onChange(state, (path, value) => {
    if (path === 'form.isRefreshed' && value) {
      elements.form.reset();
      elements.input.focus();
      return;
    }

    if (path === 'form.message') {
      renderInputValidity(state.form.input.isValid);
      elements.feedback.textContent = state.form.message;
      return;
    }

    if (path === 'rss') {
      renderView(watchedState);
    }

    if (path === 'rss.posts') {
      renderPostsList(watchedState);
    }
  });

  renderView(watchedState);
  return watchedState;
};

export default render;
