import onChange from 'on-change';
import i18next from 'i18next';
import render from './view.js';

const handleNetworkError = (state, e) => {
  const watchedState = onChange(state, () => {});
  watchedState.ui.input.isValid = false;
  watchedState.ui.message = i18next.t('yup.errors.networkError');
  render(state);
  throw (e);
};

const hanldeInvalidRssError = (state, e) => {
  if (e.message !== 'Network Error') {
    const watchedState = onChange(state, () => {});
    watchedState.ui.input.isValid = false;
    watchedState.ui.message = i18next.t('yup.errors.invalidRss');
    render(state);
    throw (e);
  }
};

const handleInvalidUrlError = (state) => {
  const watchedState = onChange(state, () => {});
  watchedState.ui.message = i18next.t('yup.errors.invalidUrl');
  watchedState.ui.input.isValid = false;
  render(state);
};

const checkForEmptyRssUrlError = (state, url) => {
  if (!url) {
    const watchedState = onChange(state, () => {});
    watchedState.ui.input.isValid = false;
    watchedState.ui.message = i18next.t('yup.errors.emptyRssUrl');
    return true;
  }

  return false;
};

const checkForAlreadyExistsError = (state, url) => {
  const { feeds } = state.rss;
  const isRepeated = feeds.some((feed) => feed.url === url);

  if (isRepeated) {
    const watchedState = onChange(state, () => {});
    watchedState.ui.message = i18next.t('yup.errors.alreadyExists');
    watchedState.ui.input.isValid = false;
    render(state);
    return true;
  }

  return false;
};

export {
  handleNetworkError,
  hanldeInvalidRssError,
  handleInvalidUrlError,
  checkForEmptyRssUrlError,
  checkForAlreadyExistsError,
};
