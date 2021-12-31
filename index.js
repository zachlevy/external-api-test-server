const express = require('express');
const fs = require('fs');
const lodash = require('lodash');
const xmlConvert = require('xml-js');
const app = express();
const port = process.env.PORT || 6000;

// reverse proxies on prebuilt production environments like heroku, nginx, cloudflare have timeouts
// afterwards they respond with a 5xx status and HTML
let maxReverseProxyTimeout = 30 * 1000;
if (process.env.MAX_REVERSE_PROXY_TIMEOUT_MS) {
  maxReverseProxyTimeout = parseInt(process.env.MAX_REVERSE_PROXY_TIMEOUT_MS);
}

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

function getHeaderTuples(rawHeaders) {
  // rawHeaders are an array of both header names and values
  // even indexed rawHeaders are names, and odd are values
  // convert this to an arry of tuples like [headerName, headerValue]
  // do this to preserve any duplicates rather than losing duplicates in a map
  const headerTuples = [];
  rawHeaders.forEach((rawHeader, index) => {
    const headerTupleIndex = Math.floor(index / 2);
    if (!headerTuples[headerTupleIndex]) {
      headerTuples[headerTupleIndex] = [];
    }
    headerTuples[headerTupleIndex].push(rawHeader);
  });
  return headerTuples;
}

function getDebugRequest(req) {
  const url = new URL(`${req.secure ? 'https' : 'http'}://${req.get('host')}${req.originalUrl}`);
  return {
    headers: getHeaderTuples(req.rawHeaders),
    body: req.rawBody,
    httpMethod: req.method,
    url
  };
}

app.get('/', (req, res) => {
  const content = fs.readFileSync('./README.md');
  res.status(200).send(content);
});

app.all('/responses/empty', (req, res) => {
  res.status(200).send();
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
  const startedAt = new Date();
  let duration = 10 * 1000; // 10 seconds
  if (req.query?.duration) {
    duration = parseInt(req.query.duration);
  }
  if (req.body && req.body.duration) {
    duration = req.body.duration;
  }

  // timeout 1s before the max timeout, or when specified
  duration = Math.max(0, Math.min(duration, maxReverseProxyTimeout - 1000));
  setTimeout(() => {
    const responseBody = {
      response: {
        duration: Date.now() - startedAt.getTime()
      },
      request: getDebugRequest(req)
    };
    res.status(200).send(responseBody);
  }, duration);
});

app.all('/responses/socket-hangup', (req, res) => {
  res.write('partial response');
  res.destroy();
});

// used for retry responses
const remainingRetryCountByRetryKey = {};

// the route with a retry key needs to be called multiple times for a success responses
app.all('/responses/retries/:retryKey/count/:retryCount', (req, res) => {
  const initialRetryCount = parseInt(req.params.retryCount);
  const retryKey = req.params.retryKey;

  if (!remainingRetryCountByRetryKey.hasOwnProperty(retryKey)) {
    remainingRetryCountByRetryKey[retryKey] = initialRetryCount;
  }

  if (remainingRetryCountByRetryKey[retryKey] > 0) {
    remainingRetryCountByRetryKey[retryKey] = remainingRetryCountByRetryKey[retryKey] - 1;
    res.write('retry request');
    res.destroy();
    return;
  }

  const responseBody = {
    request: getDebugRequest(req)
  };
  res.status(200).send(responseBody);
});

app.all('/responses/redirects/:redirectCount', (req, res) => {
  if (req.params.redirectCount) {
    const parsedRedirectCount = parseInt(req.params.redirectCount);
    if (parsedRedirectCount > 0) {
      const newRedirectCount = parsedRedirectCount - 1;
      // recursively redirect
      res.redirect(`/responses/redirects/${newRedirectCount}`);
      return;
    }
  }
  const responseBody = {
    request: getDebugRequest(req)
  };
  res.status(200).send(responseBody);
});

app.all('/responses/headers/set-cookies', (req, res) => {
  res.cookie('cookieOneName', 'cookieOneValue', { maxAge: 86400 * 1000, httpOnly: true });
  res.cookie('cookieTwoName', 'cookieTwoValue', { maxAge: 86400 * 1000, httpOnly: true });
  const responseBody = {
    request: getDebugRequest(req)
  };
  res.status(200).send(responseBody);
});

app.all('/responses/file-download', (req, res) => {
  res.status(200).download('files/sample.png');
});

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
});
