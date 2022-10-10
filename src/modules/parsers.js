import _ from 'lodash';

const parseFeedFromRssHtml = (rssHtml, lastFeedId, url) => {
  const newFeedId = lastFeedId + 1;

  const title = rssHtml.querySelector('title').textContent;
  const description = rssHtml.querySelector('description').textContent;
  const pubDate = rssHtml.querySelector('pubDate').textContent;

  return {
    id: newFeedId,
    url,
    title,
    description,
    pubDate,
  };
};

const parsePostsFromRssHtml = (rssHtml, lastPostId, lastFeedId) => {
  const postElements = rssHtml.querySelectorAll('item');
  const newPostId = lastPostId + 1;
  const newFeedId = lastFeedId + 1;

  const newPostsUnsorted = Array.from(postElements).reduce((postsArr, el, index) => {
    const id = newPostId + index;

    return [
      ...postsArr,
      {
        feedId: newFeedId,
        title: el.querySelector('title').textContent,
        link: el.querySelector('link').textContent,
        description: el.querySelector('description').textContent,
        pubDate: el.querySelector('pubDate').textContent,
        isRead: false,
        id,
      },
    ];
  }, []);

  return _.sortBy(newPostsUnsorted, (post) => (post.pubDate))
    .map((post, index) => {
      const id = newPostId + index;
      return { ...post, id };
    });
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
  const updatedFeed = { ...feed, pubDate: newPubDate };

  return [updatedFeed, index, posts];
};

export { parseFeedFromRssHtml, parsePostsFromRssHtml, parseUpdatedRssHtml };
