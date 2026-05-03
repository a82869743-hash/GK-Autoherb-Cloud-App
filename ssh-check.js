const { Client } = require('ssh2');
const conn = new Client();
conn.on('ready', () => {
  conn.exec('mysql -u root -p1234 -D gk_autoherb -e "DESCRIBE staff_salary;"', (err, stream) => {
    if (err) throw err;
    stream.on('close', () => conn.end())
      .on('data', (data) => console.log(data.toString()))
      .stderr.on('data', (data) => console.error(data.toString()));
  });
}).connect({
  host: '187.127.151.21',
  port: 22,
  username: 'root',
  password: 'AryanSingh123@'
});
