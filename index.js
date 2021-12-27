const express = require('express');
const fs = require('fs');
const lodash = require('lodash');
const xmlConvert = require('xml-js');
const app = express();
const port = 6000;

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

app.use(rawBodyMiddleware);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

function getDebugRequest(req) {
  const url = new URL(`${req.protocol}://${req.get('host')}${req.originalUrl}`);
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

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
});
