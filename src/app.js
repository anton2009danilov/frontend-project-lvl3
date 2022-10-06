import render from './view.js';

export default () => {
  const state = {
    ui: {
      input: {
        isValid: false,
      },
      message: null,
    },
    rss: {
      feeds: [],
      posts: [],
    },
    elements: {
      form: document.querySelector('form'),
      input: document.querySelector('input'),
      feedback: document.querySelector('.feedback'),
      feeds: document.querySelector('div.feeds'),
      posts: document.querySelector('div.posts'),
    },
  };

  render(state);
};
