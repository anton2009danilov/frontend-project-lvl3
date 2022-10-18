import axios from 'axios';

const parseFeedFromRssHtml = (rssHtml, url) => {
  const title = rssHtml.querySelector('title').textContent;
  const description = rssHtml.querySelector('description').textContent;

  return {
    url,
    title,
    description,
  };
};

const parsePostsFromRssHtml = (rssHtml) => {
  const postElements = rssHtml.querySelectorAll('item');

  const posts = Array.from(postElements).map((el) => ({
    title: el.querySelector('title').textContent,
    link: el.querySelector('link').textContent,
    description: el.querySelector('description').textContent,
  }));

  return posts;
};

const parseRssFromHtml = (url) => {
  const parser = new DOMParser();

  return axios.get(`https://allorigins.hexlet.app/get?disableCache=true&url=${encodeURIComponent(url)}`)
    .then((response) => parser.parseFromString(response.data.contents, 'text/xml'))
    .then((rssHtml) => ({
      feeds: [parseFeedFromRssHtml(rssHtml, url)],
      posts: parsePostsFromRssHtml(rssHtml),
    }));
};

export default parseRssFromHtml;
