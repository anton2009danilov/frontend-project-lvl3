import i18next from 'i18next';
import { object, string } from 'yup';
import ru from './locales/ru.js';
import render from './view.js';
import {
  handleInvalidUrlError,
  checkForAlreadyExistsError,
} from './modules/error-handlers.js';
import addNewRSS from './modules/add-new-rss.js';
import updateRss from './modules/update-rss.js';

i18next.init({
  lng: 'ru',
  debug: true,
  resources: {
    ru,
  },
});

const validateUrl = (url) => {
  const urlSchema = object({
    url: string().url(),
  });

  return urlSchema.validate(url);
};

export default () => {
  const state = {
    form: {
      isRefreshed: true,
      message: null,
      input: {
        isValid: true,
      },
    },
    ui: {
      isStateWatched: false,
    },
    rss: {
      feeds: [],
      posts: [],
    },
  };

  const view = render(state);

  const watchForUpdates = () => {
    const timeStep = 5000;
    setTimeout(watchForUpdates, timeStep);

    updateRss(view);
  };

  const watchApp = () => {
    if (!state.ui.isStateWatched) {
      const form = document.querySelector('form');
      form.addEventListener('submit', (event) => {
        event.preventDefault();
        const formData = new FormData(event.target);
        view.form.isRefreshed = false;

        const url = formData.get('url');

        validateUrl({ url })
          .then(() => {
            if (checkForAlreadyExistsError(view, url)) {
              return false;
            }

            return addNewRSS(view, url);
          })
          .catch((e) => handleInvalidUrlError(view, e));
      });

      watchForUpdates();

      view.ui.isStateWatched = true;
    }
  };

  watchApp(view);
};
