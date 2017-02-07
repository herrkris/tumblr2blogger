var tumblr = require('tumblr.js');
var client = tumblr.createClient({
  consumer_key: 'consumer_key',
  consumer_secret: 'consumer_secret',
  token: 'token',
  token_secret: 'token_secret'
});
var moment = require('moment');
var blogName = 'blog_name';
var posts = [];
var postsToRequest = 0;
var offset = 0;
var readline = require('readline');

var google = require('googleapis');
var OAuth2Client = google.auth.OAuth2;
var blogger = google.blogger('v3');

// Client ID and client secret are available at
// https://code.google.com/apis/console
var CLIENT_ID = 'client_id';
var CLIENT_SECRET = 'client_secret';
var REDIRECT_URL = 'redirect_url';

var oauth2Client = new OAuth2Client(CLIENT_ID, CLIENT_SECRET, REDIRECT_URL);

var rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function getAccessToken (oauth2Client, callback) {
  // generate consent page url
  var url = oauth2Client.generateAuthUrl({
    access_type: 'offline', // will return a refresh token
    scope: ['https://www.googleapis.com/auth/blogger', 'https://www.googleapis.com/auth/blogger.readonly']
  });

  console.log('Visit the url: ', url);
  rl.question('Enter the code here:', function (code) {
    // request access token
    oauth2Client.getToken(code, function (err, tokens) {
      if (err) {
        return callback(err);
      }
      // set tokens to the client
      // TODO: tokens should be set by OAuth2 client.
      oauth2Client.setCredentials(tokens);
      callback();
    });
  });
}

var addPost = () => {
  if (posts.length) {
    const post = posts.shift();
    const thumbnail = post.photos[0].alt_sizes[post.photos[0].alt_sizes.length - 1 ].url
    const date = moment.unix(post.timestamp).format();
    const title = post.summary.length ? post.summary : post.tags[0];
    const content = `<a href="${post.link_url}" target="_blank"><img src="${post.photos[0].original_size.url}"></a>`;

    blogger.posts.insert({ blogId: 'blodId', auth: oauth2Client, resource: { title: title, content: content, published: date } }, function (err, post) {
      if (err) {
        return console.log('An error occured', err);
      }
      console.log('Import successful for: ', post.title);
    });

    setTimeout(addPost, 1050);
  } else {
    console.log('fertig');
  }
}

var getPosts = () => {
  if (postsToRequest > 0) {
    client.blogPosts(blogName, { offset: offset }, (err, resp) => {
      posts = posts.concat(resp.posts);
      offset += 20;
      postsToRequest -= 20;
      getPosts();
    });
  } else {
      console.log('Requesting access token for blogger');
      getAccessToken(oauth2Client, addPost);
  }
};

console.log('Fetching information for ' + blogName);
client.blogInfo(blogName, (err, resp) => {
  postsToRequest = resp.blog.total_posts;
  console.log('Found ' + postsToRequest + ' posts. Starting to fetch ...');
  getPosts();
});