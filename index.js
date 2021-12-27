const express = require('express');
const fs = require('fs');
const app = express();
const port = 6000;

function getDebugRequest(req) {
  const url = new URL(`${req.protocol}://${req.get('host')}${req.originalUrl}`);
  return {
    headers: req.rawHeaders,
    ...(req.body && { body: req.rawBody.toString('utf8') }),
    url
  };
}

app.get('/', (req, res) => {
  const content = fs.readFileSync('./README.md');
  res.status(200).send(content);
});

app.get('/responses/:statusCode.json', (req, res) => {
  const responseBody = {
    request: getDebugRequest(req)
  };
  const statusCode = req.params.statusCode;
  res.status(statusCode).send(responseBody);
});
app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
});
