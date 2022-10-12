import _ from 'lodash';
import onChange from 'on-change';
import {
  renderInputValidity,
  renderFeedsList,
  renderPostsList,
} from './modules/renderers.js';

const elements = {
  form: document.querySelector('form'),
  input: document.querySelector('input'),
  feedback: document.querySelector('.feedback'),
  feeds: document.querySelector('div.feeds'),
  posts: document.querySelector('div.posts'),
};

const render = (state) => {
  const watchedState = onChange(state, (path, value) => {
    if (path === 'form.isRefreshed' && value) {
      elements.form.reset();
      elements.input.focus();
      return;
    }

    if (path === 'form.message') {
      render(state);
      return;
    }

    if (path === 'rss') {
      render(state);
    }
  });

  const { form, rss } = state;

  const renderView = () => {
    if (!_.isEmpty(rss.feeds)) {
      renderFeedsList(elements, rss.feeds);
      renderPostsList(elements, watchedState);
      renderInputValidity(elements, form.input.isValid);
    }

    if (!state.form.isRefreshed) {
      watchedState.form.isRefreshed = true;
    }

    elements.feedback.textContent = state.form.message;
  };

  renderView();
  return watchedState;
};

export default render;
