import render from './view.js';

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

  render(state);
};
