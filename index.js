const express = require('express');
const fs = require('fs');
const lodash = require('lodash');
const xmlConvert = require('xml-js');
const app = express();
const port = process.env.PORT || 6000;

function rawBodyMiddleware(req, res, next) {
  req.rawBody = null;
  req.on('data', function(chunk) {
    if (req.rawBody === null && !lodash.isUndefined(chunk)) {
      req.rawBody = '';
    }
    req.rawBody += chunk;
  });
  next();
}

// allow req.protocol to be received correctly through heroku proxy
// https://stackoverflow.com/questions/40459511/in-express-js-req-protocol-is-not-picking-up-https-for-my-secure-link-it-alwa
app.enable('trust proxy');

app.use(rawBodyMiddleware);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

function getDebugRequest(req) {
  const url = new URL(`${req.secure ? 'https' : 'http'}://${req.get('host')}${req.originalUrl}`);
  return {
    headers: req.rawHeaders,
    body: req.rawBody,
    httpMethod: req.method,
    url
  };
}

app.get('/', (req, res) => {
  const content = fs.readFileSync('./README.md');
  res.status(200).send(content);
});

app.all('/responses/status-code/:statusCode.json', (req, res) => {
  const responseBody = {
    request: getDebugRequest(req)
  };
  const statusCode = req.params.statusCode;
  res.status(statusCode).send(responseBody);
});

app.all('/responses/status-code/:statusCode.xml', (req, res) => {
  const responseBody = {
    request: getDebugRequest(req)
  };
  const statusCode = req.params.statusCode;
  res.set('Content-Type', 'text/xml');
  // TODO there's a bug where the url is being stripped
  const xmlResponseBody = xmlConvert.json2xml(responseBody, {compact: true});
  res.status(statusCode).send(xmlResponseBody);
});

app.all('/responses/none', (/* req, res */) => {
  return;
});

app.all('/responses/long', (req, res) => {
  let duration = 10 * 1000; // 10 seconds
  console.log({
    'req.body': req.body
  });
  if (req.body && req.body.duration) {
    duration = req.body.duration;
  }
  setTimeout(() => {
    res.status(200).send();
  }, duration);
});

app.all('/responses/socket-hangup', (req, res) => {
  res.write('partial response');
  res.destroy();
});

app.all('/responses/redirects/:redirectCount', (req, res) => {
  if (req.params.redirectCount) {
    const parsedRedirectCount = parseInt(req.params.redirectCount);
    if (parsedRedirectCount > 0) {
      const newRedirectCount = parsedRedirectCount - 1;
      res.redirect(`/responses/redirects/${newRedirectCount}`);
      return;
    }
  }
  res.status(200).send();
});

app.all('/responses/file-download', (req, res) => {
  res.status(200).download('files/sample.png');
});

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
});
