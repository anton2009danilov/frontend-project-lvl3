import _ from 'lodash';

const parseFeedFromRssHtml = (rssHtml, url) => {
  const title = rssHtml.querySelector('title').textContent;
  const description = rssHtml.querySelector('description').textContent;
  const pubDate = rssHtml.querySelector('pubDate').textContent;

  return {
    url,
    title,
    description,
    pubDate,
  };
};

const parsePostsFromRssHtml = (rssHtml) => {
  const postElements = rssHtml.querySelectorAll('item');

  const newPosts = Array.from(postElements).reduce(
    (postsArr, el) => _.concat(
      postsArr,
      {
        title: el.querySelector('title').textContent,
        link: el.querySelector('link').textContent,
        description: el.querySelector('description').textContent,
        pubDate: el.querySelector('pubDate').textContent,
      },
    ),
    [],
  );

  return newPosts;
};

const parseUpdatedRssHtml = (rssHtml, feed, index) => {
  const { id } = feed;
  const postElements = rssHtml.querySelectorAll('item');

  const posts = Array.from(postElements).map((el) => ({
    feedId: id,
    title: el.querySelector('title').textContent,
    link: el.querySelector('link').textContent,
    description: el.querySelector('description').textContent,
    pubDate: el.querySelector('pubDate').textContent,
  }));

  const newPubDate = rssHtml.querySelector('pubDate').textContent;
  const updatedFeed = _.set(feed, 'pubDate', newPubDate);

  return [updatedFeed, index, posts];
};

const parseRssFromHtml = (html, url) => ({
  feeds: [parseFeedFromRssHtml(html, url)],
  posts: parsePostsFromRssHtml(html),
});

export { parseRssFromHtml, parseUpdatedRssHtml };
