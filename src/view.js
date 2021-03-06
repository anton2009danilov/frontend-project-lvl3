import axios from 'axios';
import onChange from 'on-change';
import { object, string } from 'yup';
import i18next from 'i18next';
import ru from './locales/ru.js';

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

  const renderFeeds = () => {
    const { feeds, posts } = elements;

    feeds.innerHTML = `
      <div class="card border-0">
        <div class="card-body">
        <h2 class="card-title h4">Фиды</h2>
        </div>
        <ul class="list-group border-0 rounded-0"></ul>
      </div>
    `;

    posts.innerHTML = `
      <div class="card border-0">
        <div class="card-body">
          <h2 class="card-title h4">Посты</h2>
        </div>
        <ul class="list-group border-0 rounded-0"></ul>
      </div>
    `;

    const feedsList = feeds.querySelector('ul');

    watchedState.feeds.forEach((feed) => {
      const li = document.createElement('li');
      li.classList.add('list-group-item', 'border-0', 'border-end-0');
      li.innerHTML = `
        <h3 class="h6 m-0">${feed.title}</h3>
        <p class="m-0 small text-black-50">${feed.description}</p>
      `;
      feedsList.append(li);
    });

    const postList = posts.querySelector('ul');

    watchedState.posts.forEach((post, index) => {
      const postElement = document.createElement('li');
      postElement.classList.add('list-group-item', 'd-flex', 'justify-content-between', 'align-items-start', 'border-0', 'border-end-0');
      postElement.innerHTML = `
        <a 
          href="${post.link}"
          class="fw-normal link-secondary"
          data-id="${index}"
          target="_blank"
          rel="noopener noreferrer"
        >
          ${post.title}
        </a>
        <button
          type="button"
          class="btn btn-outline-primary btn-sm"
          data-id="${index}"
          data-bs-toggle="modal"
          data-bs-target="#modal"
        >
          Просмотр
        </button>
      `;

      postList.append(postElement);

      postElement.addEventListener('click', (e) => {
        const modal = document.getElementById('modal');
        const modalTitle = modal.querySelector('.modal-title');
        const modalBody = modal.querySelector('.modal-body');
        const modalLink = modal.querySelector('a');

        if (e.target.tagName === 'BUTTON') {
          modalTitle.textContent = post.title;
          modalBody.textContent = post.description;
          modalLink.href = post.link;
        }
      });
    });
  };

  const getRSS = (url) => {
    const parser = new DOMParser();

    axios.get(url)
      .then((response) => response.data)
      .then((data) => parser.parseFromString(data, 'text/xml'))
      .then((rssHtml) => {
        const title = rssHtml.querySelector('title').textContent;
        const description = rssHtml.querySelector('description').textContent;
        const itemsElements = rssHtml.querySelectorAll('item');
        const items = Array.from(itemsElements).map((el) => ({
          title: el.querySelector('title').textContent,
          link: el.querySelector('link').textContent,
          description: el.querySelector('description').textContent,
        }));

        const feed = {
          url, title, description,
        };
        watchedState.feeds = [...watchedState.feeds, feed];
        watchedState.posts = [...watchedState.posts, ...items];
        watchedState.isValid = true;
        watchedState.message = i18next.t('yup.success');
        renderFeeds();
      })
      .catch(() => {
        watchedState.isValid = false;
        watchedState.message = i18next.t('yup.errors.invalidRSS');
      });
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
        const isRepeated = feeds.some((feed) => feed.url === data.url);

        if (isRepeated) {
          watchedState.message = i18next.t('yup.errors.alreadyExists');
          watchedState.isValid = false;
          return;
        }

        getRSS(data.url);
      })
      .catch(() => {
        watchedState.message = i18next.t('yup.errors.invalidURL');
        watchedState.isValid = false;
      });
  });
};
