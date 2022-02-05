import render from './view.js';

export default () => {
  const state = {
    inputUrl: null,
    message: null,
    isValid: false,
    feeds: [],
    posts: [],
  };

  render(state);
};
