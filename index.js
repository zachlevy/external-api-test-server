const express = require('express');
const fs = require('fs');
const app = express();
const port = 6000;

app.get('/', (req, res) => {
  const content = fs.readFileSync('./README.md');
  res.status(200).send(content);
});

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
});
