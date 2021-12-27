const express = require('express');
const fs = require('fs');
const xmlConvert = require('xml-js');
const app = express();
const port = 6000;

function getDebugRequest(req) {
  const url = new URL(`${req.protocol}://${req.get('host')}${req.originalUrl}`);
  return {
    headers: req.rawHeaders,
    ...(req.body && { body: req.rawBody.toString('utf8') }),
    httpMethod: req.method,
    url
  };
}

app.get('/', (req, res) => {
  const content = fs.readFileSync('./README.md');
  res.status(200).send(content);
});

app.all('/responses/:statusCode.json', (req, res) => {
  const responseBody = {
    request: getDebugRequest(req)
  };
  const statusCode = req.params.statusCode;
  res.status(statusCode).send(responseBody);
});

app.all('/responses/:statusCode.xml', (req, res) => {
  const responseBody = {
    request: getDebugRequest(req)
  };
  const statusCode = req.params.statusCode;
  res.set('Content-Type', 'text/xml');
  const xmlResponseBody = xmlConvert.json2xml(responseBody, {compact: true});
  res.status(statusCode).send(xmlResponseBody);
});

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
});
