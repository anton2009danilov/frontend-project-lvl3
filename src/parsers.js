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

const parseRssFromHtml = (html, url) => ({
  feeds: [parseFeedFromRssHtml(html, url)],
  posts: parsePostsFromRssHtml(html),
});

export { parseRssFromHtml, parsePostsFromRssHtml };
