/* eslint-disable no-param-reassign */
import i18next from 'i18next';
import onChange from 'on-change';

const isEmpty = (items) => items.length === 0;

const elements = {
  form: document.querySelector('form'),
  input: document.querySelector('input'),
  feedback: document.querySelector('.feedback'),
  feeds: document.querySelector('div.feeds'),
  posts: document.querySelector('div.posts'),
};

const createContainerHtmlElement = (type) => {
  const titleTag = type === 'feeds' ? 'h2' : 'h4';
  const titleText = type === 'feeds'
    ? i18next.t('cardTitles.feeds')
    : i18next.t('cardTitles.posts');

  const card = document.createElement('div');
  const cardBody = document.createElement('div');
  const cardTitle = document.createElement(titleTag);
  const feedsList = document.createElement('ul');

  card.classList.add('card', 'border-0');
  cardBody.classList.add('card-body');
  cardTitle.classList.add('card-title', titleTag);
  feedsList.classList.add('list-group', 'border-0', 'rounded-0');

  cardTitle.textContent = titleText;

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

  feedsContainerElement.innerHTML = createContainerHtmlElement('feeds');

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
  buttonElement.textContent = i18next.t('postPreviewBtnText');

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

  postsContainerElement.innerHTML = createContainerHtmlElement('posts');

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
    const post = watchedState.rss.posts.filter((item) => item.id === postId).at(0);

    postElement.addEventListener('click', () => {
      const modal = document.getElementById('modal');
      const modalTitle = modal.querySelector('.modal-title');
      const modalBody = modal.querySelector('.modal-body');
      const modalLink = modal.querySelector('a');

      if (!watchedState.ui.readPostsIds.includes(post.id)) {
        watchedState.ui.readPostsIds = [...watchedState.ui.readPostsIds, post.id];
      }

      modalTitle.textContent = post.title;
      modalBody.textContent = post.description;
      modalLink.href = post.link;

      watchedState.form.input.isValid = true;
      watchedState.form.message = 'yup.rssView';
    });
  });
};

const renderView = (state) => {
  const { form, rss } = state;

  if (!isEmpty(rss.feeds)) {
    renderFeedsList(rss.feeds);
    renderPostsList(state);
    renderInputValidity(form.input.isValid);
  }

  elements.feedback.textContent = state.form.message;
};

const handleViewChange = (watchedState, type, value = undefined) => {
  switch (type) {
    case 'message updated':
      renderInputValidity(watchedState.form.input.isValid);
      elements.feedback.textContent = i18next.t(watchedState.form.message);
      break;
    case 'new rss added':
      renderView(watchedState);
      addEventListenerToPosts(watchedState);
      elements.form.reset();
      elements.input.focus();
      break;
    case 'rss updated':
      renderPostsList(watchedState);
      addEventListenerToPosts(watchedState);
      break;
    case 'post has been watched':
      renderWatchedPostStatus(watchedState.rss.posts.filter(
        (post) => post.id === value.at(-1),
      ).at(0));
      break;
    default:
      throw new Error(`Unexpected type of view change: ${type}`);
  }
};

const render = (state) => {
  const watchedState = onChange(state, (path, value) => {
    switch (path) {
      case 'form.message':
        handleViewChange(watchedState, 'message updated');
        break;
      case 'rss':
        handleViewChange(watchedState, 'new rss added');
        break;
      case 'rss.posts':
        handleViewChange(watchedState, 'rss updated');
        break;
      case 'ui.readPostsIds':
        handleViewChange(watchedState, 'post has been watched', value);
        break;
      default:
    }
  });

  renderView(state);
  return { watchedState };
};

export default render;
