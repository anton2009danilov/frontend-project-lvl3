import onChange from 'on-change';
import { object, string } from 'yup';

export default () => {
  const state = {
    inputUrl: null,
    message: null,
    feeds: [],
  };

  const elements = {
    form: document.querySelector('form'),
    input: document.querySelector('input'),
    feeds: document.querySelector('div.feeds'),
    posts: document.querySelector('div.posts'),
  };

  const watchedState = onChange(state, (path, value, prevValue) => {
    console.log(state);
  });

  const validateUrl = (url) => {
    const urlSchema = object({
      url: string().url(),
    });

    return urlSchema.validate(url);
  };

  elements.form.addEventListener('submit', (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    e.target.reset();
    elements.input.focus();

    const url = formData.get('url');

    validateUrl({ url })
      .then((data) => {
        const { feeds } = watchedState;
        console.log(feeds, data);

        const isRepeated = feeds.some((feed) => feed.url === data.url);

        if (isRepeated) {
          watchedState.message = 'RSS уже существует';
          return;
        }

        watchedState.feeds = [...feeds, data];
        watchedState.message = 'RSS успешно загружен';
      })
      .catch((err) => {
        [watchedState.message] = err.errors;
      });
  });

  // const watched = initView(state, elements);
  // console.log(watchedState);
  // const feedsContainer = document.querySelector('div.feeds');
  // const postsContainer = document.querySelector('div.posts');
};
