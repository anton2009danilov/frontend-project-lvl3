import onChange from 'on-change';
import { object, string } from 'yup';

const validateUrl = (url) => {
  const urlSchema = object({
    url: string().url(),
  });

  return urlSchema.validate(url);
};

export default (state) => {
  const elements = {
    form: document.querySelector('form'),
    input: document.querySelector('input'),
    feedback: document.querySelector('.feedback'),
    feeds: document.querySelector('div.feeds'),
    posts: document.querySelector('div.posts'),
  };

  const watchedState = onChange(state, (path, value) => {
    if (path === 'isValid') {
      if (value) {
        elements.input.classList.remove('is-invalid');
        elements.feedback.classList.remove('text-danger');
        elements.feedback.classList.add('text-success');
        return;
      }

      elements.input.classList.add('is-invalid');
      elements.feedback.classList.add('text-danger');
      elements.feedback.classList.remove('text-success');
    }

    if (path === 'message') {
      elements.feedback.textContent = value;
    }
  });

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
          watchedState.isValid = false;
          return;
        }

        watchedState.feeds = [...feeds, data];
        watchedState.isValid = true;
        watchedState.message = 'RSS успешно загружен';
      })
      .catch((err) => {
        [watchedState.message] = err.errors;
        watchedState.isValid = false;
      });
  });
};
