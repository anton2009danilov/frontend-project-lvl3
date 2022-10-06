import render from './view.js';

export default () => {
  const state = {
    form: {
      input: {
        isValid: false,
      },
    },
    ui: {
      message: null,
    },
    rss: {
      feeds: [],
      posts: [],
    },
  };

  render(state);
};
