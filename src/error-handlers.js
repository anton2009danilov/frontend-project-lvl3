import i18next from 'i18next';

const changeUiState = (watchedState, message) => {
  watchedState.ui.input.isValid = false;
  watchedState.ui.message = message;
};

const handleNetworkError = (watchedState, e) => {
  changeUiState(watchedState, i18next.t('yup.errors.networkError'));
  throw (e);
};

const hanldeInvalidRssError = (watchedState, e) => {
  if (e.message !== 'Network Error') {
    changeUiState(watchedState, i18next.t('yup.errors.invalidRss'));
    throw (e);
  }
};

const handleInvalidUrlError = (watchedState) => {
  changeUiState(watchedState, i18next.t('yup.errors.invalidUrl'));
};

const checkForEmptyRssUrlError = (watchedState, url) => {
  if (!url) {
    changeUiState(watchedState, i18next.t('yup.errors.emptyRssUrl'));
    return true;
  }

  return false;
};

const checkForAlreadyExistsError = (watchedState, url) => {
  const { feeds } = watchedState.rss;
  const isRepeated = feeds.some((feed) => feed.url === url);

  if (isRepeated) {
    changeUiState(watchedState, i18next.t('yup.errors.alreadyExists'));
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
