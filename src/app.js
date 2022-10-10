import render from './view.js';

export default () => {
  const state = {
    isAppRunning: false,
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
