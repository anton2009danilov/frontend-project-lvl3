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

const renderSinglePost = (post, isRead) => {
  const postElement = document.createElement('li');
  postElement.classList.add('list-group-item', 'd-flex', 'justify-content-between', 'align-items-start', 'border-0', 'border-end-0');

  const linkElement = document.createElement('a');
  linkElement.setAttribute('href', `${post.link}`);
  linkElement.setAttribute('target', '_blank');
  linkElement.setAttribute('rel', 'noopener noreferrer');
  linkElement.dataset.post_id = post.id;
  linkElement.textContent = post.title;

  if (isRead) {
    linkElement.classList.add('fw-normal', 'link-secondary');
  } else {
    linkElement.classList.add('fw-bold');
  }

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

const renderWatchedPostStatus = (post) => {
  const linkElement = document.querySelector(`[data-post_id="${post.id}"]`);
  linkElement.classList.remove('fw-bold');
  linkElement.classList.add('fw-normal', 'link-secondary');
};

const renderPostsList = (state) => {
  const { posts: postsContainerElement } = elements;

  postsContainerElement.innerHTML = createPostsContainerHtml();

  const postList = postsContainerElement.querySelector('ul');

  state.rss.posts.forEach((post) => {
    const isPostRead = state.ui.readPostsIds.includes(post.id);
    const view = renderSinglePost(post, isPostRead);

    postList.prepend(view);
  });
};

const addEventListenerToPosts = (watchedState) => {
  const postsElements = elements.posts.getElementsByTagName('button');

  Array.from(postsElements).forEach((postElement) => {
    const postId = postElement.dataset.post_id;
    const post = watchedState.rss.posts.filter((item) => item.id === parseInt(postId, 10))[0];

    postElement.addEventListener('click', () => {
      const modal = document.getElementById('modal');
      const modalTitle = modal.querySelector('.modal-title');
      const modalBody = modal.querySelector('.modal-body');
      const modalLink = modal.querySelector('a');

      if (!watchedState.ui.readPostsIds.includes(post.id)) {
        _.set(watchedState, 'ui.readPostsIds', [...watchedState.ui.readPostsIds, post.id]);
      }

      modalTitle.textContent = post.title;
      modalBody.textContent = post.description;
      modalLink.href = post.link;

      _.set(watchedState, 'form.input.isValid', true);
      _.set(watchedState, 'form.message', i18next.t('yup.rssView'));
    });
  });
};

const renderView = (state) => {
  const { form, rss } = state;

  if (!_.isEmpty(rss.feeds)) {
    renderFeedsList(rss.feeds);
    renderPostsList(state);
    renderInputValidity(form.input.isValid);
  }

  elements.feedback.textContent = state.form.message;
};

const render = (state) => {
  const watchedState = onChange(state, (path, value) => {
    switch (path) {
      case 'form.message':
        renderInputValidity(state.form.input.isValid);
        elements.feedback.textContent = state.form.message;
        break;
      case 'rss':
        renderView(state);
        addEventListenerToPosts(watchedState);
        elements.form.reset();
        elements.input.focus();
        break;
      case 'rss.posts':
        renderPostsList(state);
        addEventListenerToPosts(watchedState);
        break;
      case 'ui.readPostsIds':
        renderWatchedPostStatus(state.rss.posts.filter((post) => post.id === value.at(-1)).at(0));
        break;
      default:
    }
  });

  renderView(state);
  return watchedState;
};

export default render;
