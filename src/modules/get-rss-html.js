import axios from 'axios';

const getRssHtml = (url) => {
  const parser = new DOMParser();

  return axios.get(`https://allorigins.hexlet.app/get?disableCache=true&url=${encodeURIComponent(url)}`)
    .then((response) => response.data)
    .then((data) => parser.parseFromString(data.contents, 'text/xml'));
};

export default getRssHtml;
