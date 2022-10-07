import onChange from 'on-change';
import i18next from 'i18next';
import render from './view.js';

const changeUiState = (state, message) => {
  const watchedState = onChange(state, () => {});
  watchedState.ui.input.isValid = false;
  watchedState.ui.message = message;
};

const handleNetworkError = (state, e) => {
  changeUiState(state, i18next.t('yup.errors.networkError'));
  render(state);
  throw (e);
};

const hanldeInvalidRssError = (state, e) => {
  if (e.message !== 'Network Error') {
    changeUiState(state, i18next.t('yup.errors.invalidRss'));
    render(state);
    throw (e);
  }
};

const handleInvalidUrlError = (state) => {
  changeUiState(state, i18next.t('yup.errors.invalidUrl'));
  render(state);
};

const checkForEmptyRssUrlError = (state, url) => {
  if (!url) {
    changeUiState(state, i18next.t('yup.errors.emptyRssUrl'));
    return true;
  }

  return false;
};

const checkForAlreadyExistsError = (state, url) => {
  const { feeds } = state.rss;
  const isRepeated = feeds.some((feed) => feed.url === url);

  if (isRepeated) {
    changeUiState(state, i18next.t('yup.errors.alreadyExists'));
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
