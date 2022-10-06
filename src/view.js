import axios from 'axios';
import _ from 'lodash';
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
    const { feeds: feedsContainerElement, posts: postsContainerElement } = elements;

    feedsContainerElement.innerHTML = `
      <div class="card border-0">
        <div class="card-body">
        <h2 class="card-title h4">Фиды</h2>
        </div>
        <ul class="list-group border-0 rounded-0"></ul>
      </div>
    `;

    postsContainerElement.innerHTML = `
      <div class="card border-0">
        <div class="card-body">
          <h2 class="card-title h4">Посты</h2>
        </div>
        <ul class="list-group border-0 rounded-0"></ul>
      </div>
    `;

    const feedsList = feedsContainerElement.querySelector('ul');

    state.rss.feeds.forEach((feed) => {
      const li = document.createElement('li');
      li.classList.add('list-group-item', 'border-0', 'border-end-0');
      li.innerHTML = `
        <h3 class="h6 m-0">${feed.title}</h3>
        <p class="m-0 small text-black-50">${feed.description}</p>
      `;
      feedsList.append(li);
    });

    const postList = postsContainerElement.querySelector('ul');

    state.rss.posts.forEach((post, postIndex) => {
      const postElement = document.createElement('li');
      postElement.classList.add('list-group-item', 'd-flex', 'justify-content-between', 'align-items-start', 'border-0', 'border-end-0');
      postElement.innerHTML = `
        <a 
          href="${post.link}"
          class="${post.isRead ? 'fw-normal' : 'fw-bold'}"
          style="color: ${!post.isRead && 'blue'};"
          data-post_id="${post.id}"
          target="_blank"
          rel="noopener noreferrer"
        >
          ${post.title}
        </a>
        <button
          type="button"
          class="btn btn-outline-primary btn-sm"
          data-post_id="${post.id}"
          data-bs-toggle="modal"
          data-bs-target="#modal"
        >
          Просмотр
        </button>
      `;

      postList.prepend(postElement);

      postElement.addEventListener('click', (e) => {
        const modal = document.getElementById('modal');
        const modalTitle = modal.querySelector('.modal-title');
        const modalBody = modal.querySelector('.modal-body');
        const modalLink = modal.querySelector('a');

        if (e.target.tagName === 'BUTTON') {
          watchedState.rss.posts[postIndex] = { ...post, isRead: true };

          modalTitle.textContent = post.title;
          modalBody.textContent = post.description;
          modalLink.href = post.link;

          watchedState.form.input.isValid = true;
          watchedState.ui.message = i18next.t('yup.rssView');
          renderFeeds();
        }
      });
    });
  };

  const getNewRSS = (url) => {
    if (!url) {
      watchedState.form.input.isValid = false;
      watchedState.ui.message = i18next.t('yup.errors.emptyRSS');
      return;
    }

    const parser = new DOMParser();

    axios.get(`https://allorigins.hexlet.app/get?disableCache=true&url=${encodeURIComponent(url)}`)
      .then((response) => response.data)
      .then((data) => parser.parseFromString(data.contents, 'text/xml'))
      .catch((e) => {
        watchedState.form.input.isValid = false;
        watchedState.ui.message = i18next.t('yup.errors.networkError');
        throw (e);
      })
      .then((rssHtml) => {
        const { feeds, posts } = state.rss;

        const lastFeedId = _.isEmpty(feeds) ? 0 : _.last(feeds).id;
        const newFeedId = lastFeedId + 1;
        const lastPostId = _.isEmpty(posts) ? 0 : _.last(posts).id;
        const newPostId = lastPostId + 1;

        const title = rssHtml.querySelector('title').textContent;

        const description = rssHtml.querySelector('description').textContent;
        const pubDate = rssHtml.querySelector('pubDate').textContent;
        const postElements = rssHtml.querySelectorAll('item');
        const newPostsUnsorted = Array.from(postElements).reduce((postsArr, el, index) => {
          const id = newPostId + index;

          return [
            ...postsArr,
            {
              feedId: newFeedId,
              title: el.querySelector('title').textContent,
              link: el.querySelector('link').textContent,
              description: el.querySelector('description').textContent,
              pubDate: el.querySelector('pubDate').textContent,
              isRead: false,
              id,
            },
          ];
        }, []);

        const newPosts = _.sortBy(newPostsUnsorted, (post) => (post.pubDate))
          .map((post, index) => {
            const id = newPostId + index;
            return { ...post, id };
          });

        const feed = {
          id: newFeedId,
          url,
          title,
          description,
          pubDate,
        };

        watchedState.rss.feeds = [...watchedState.rss.feeds, feed];
        watchedState.form.input.isValid = true;
        watchedState.ui.message = i18next.t('yup.success');
        watchedState.rss.posts = [
          ...watchedState.rss.posts,
          ...newPosts,
        ];
        renderFeeds();
      })
      .catch((e) => {
        if (e.message !== 'Network Error') {
          watchedState.form.input.isValid = false;
          watchedState.ui.message = i18next.t('yup.errors.invalidRSS');
          throw (e);
        }
      });
  };

  const updateRSS = () => {
    state.rss.feeds.forEach((feed, index) => {
      const { id, url } = feed;
      const currentPosts = _.filter(state.rss.posts, ({ feedId }) => feedId === id);

      const parser = new DOMParser();

      axios.get(`https://allorigins.hexlet.app/get?disableCache=true&url=${encodeURIComponent(url)}`)
        .then((response) => response.data)
        .then((data) => parser.parseFromString(data.contents, 'text/xml'))
        .then((rssHtml) => {
          const postElements = rssHtml.querySelectorAll('item');
          const posts = Array.from(postElements).map((el) => ({
            feedId: id,
            title: el.querySelector('title').textContent,
            link: el.querySelector('link').textContent,
            description: el.querySelector('description').textContent,
            pubDate: el.querySelector('pubDate').textContent,
          }));

          const newPubDate = rssHtml.querySelector('pubDate').textContent;
          const diffPosts = _.differenceWith(posts, currentPosts.map((el) => _.omit(el, ['id', 'isRead'])), _.isEqual);

          watchedState.rss.feeds[index] = { ...feed, pubDate: newPubDate };

          if (!_.isEmpty(diffPosts)) {
            const lastPostId = _.isEmpty(state.rss.posts) ? 0 : _.last(state.rss.posts).id;

            const newPosts = _.sortBy(diffPosts, (post) => (post.pubDate))
              .map((post, postIndex) => {
                const newPostId = lastPostId + postIndex + 1;
                return { ...post, id: newPostId };
              });

            watchedState.rss.posts = [
              ...watchedState.rss.posts,
              ...newPosts,
            ];

            renderFeeds();
          }
        })
        .catch((e) => { throw (e); });
    });

    const timeStep = 5000;
    setTimeout(updateRSS, timeStep);
  };

  elements.form.addEventListener('submit', (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    e.target.reset();
    elements.input.focus();

    const url = formData.get('url');

    validateUrl({ url })
      .then((data) => {
        const { feeds } = watchedState.rss;
        const isRepeated = feeds.some((feed) => feed.url === data.url);

        if (isRepeated) {
          watchedState.ui.message = i18next.t('yup.errors.alreadyExists');
          watchedState.form.input.isValid = false;
          return;
        }

        getNewRSS(data.url);
      })
      .catch(() => {
        watchedState.ui.message = i18next.t('yup.errors.invalidURL');
        watchedState.form.input.isValid = false;
      });
  });

  updateRSS();
};
