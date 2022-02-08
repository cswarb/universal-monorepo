const express = require('express');
const cors = require('cors');

const app = express();
const port = 3000;

app.use(cors());

app.get('/api/things', (req, res) => {
  console.log('hit: /api/things');
  return res.json([{ name: '1', id: '1' }, { name: '2', id: '2' } ])
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
});