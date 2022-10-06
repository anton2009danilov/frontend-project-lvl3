import render from './view.js';

export default () => {
  const state = {
    ui: {
      message: null,
    },
    rss: {
      input: {
        isValid: false,
      },
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
