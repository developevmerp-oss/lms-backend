const pg = require('pg');
const client = new pg.Client('postgres://postgres:postgres@localhost:5432/art_lms_db');
client.connect().then(() => {
  return client.query('SELECT email, password FROM "Users"');
}).then(res => {
  console.log(res.rows);
  client.end();
});
