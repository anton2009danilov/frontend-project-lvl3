import onChange from 'on-change';
import { object, string } from 'yup';
import i18next from 'i18next';
import {
  handleInvalidUrlError,
  checkForAlreadyExistsError,
} from './modules/error-handlers.js';
import addNewRSS from './modules/add-new-rss.js';
import updateRss from './modules/update-rss.js';
import renderView from './modules/renderers.js';

import ru from './locales/ru.js';

const validateUrl = (url) => {
  const urlSchema = object({
    url: string().url(),
  });

  return urlSchema.validate(url);
};

i18next.init({
  lng: 'ru',
  debug: true,
  resources: {
    ru,
  },
});

const elements = {
  form: document.querySelector('form'),
  input: document.querySelector('input'),
  feedback: document.querySelector('.feedback'),
  feeds: document.querySelector('div.feeds'),
  posts: document.querySelector('div.posts'),
};

const watchForUpdates = (watchedState) => {
  const timeStep = 5000;
  setTimeout(watchForUpdates, timeStep);

  updateRss(watchedState);
};

const render = (state) => {
  const watchedState = onChange(state, (path, value) => {
    if (path === 'ui.form.isRefreshed' && value) {
      elements.form.reset();
      elements.input.focus();
      return;
    }

    if (path === 'ui.message') {
      render(state);
      return;
    }

    if (path === 'rss') {
      render(state);
    }
  });

  const watchApp = () => {
    if (!state.isAppWatched) {
      elements.form.addEventListener('submit', (event) => {
        event.preventDefault();
        const formData = new FormData(event.target);
        watchedState.ui.form.isRefreshed = false;

        const url = formData.get('url');

        validateUrl({ url })
          .then(() => {
            if (checkForAlreadyExistsError(watchedState, url)) {
              return false;
            }

            return addNewRSS(watchedState, url);
          })
          .catch((e) => handleInvalidUrlError(watchedState, e));
      });

      watchForUpdates(watchedState);

      watchedState.isAppWatched = true;
    }
  };

  watchApp();
  renderView(watchedState);
};

export default render;
