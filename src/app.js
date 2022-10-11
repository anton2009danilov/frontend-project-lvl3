import render from './view.js';

export default () => {
  const state = {
    isAppWatched: false,
    newRssUrl: null,
    ui: {
      form: {
        isRefreshed: true,
      },
      input: {
        isValid: true,
      },
      message: null,
    },
    rss: {
      feeds: [],
      posts: [],
    },
  };

  render(state);
};
