const { Client } = require('ssh2');
const c = new Client();
c.on('ready', () => {
  const query = `
    UPDATE packages SET price_hatchback = 1200, price_medium_hatchback = 1200, price_sedan = 1200, price_premium_sedan = 1200, price_suv = 1200 WHERE name = 'Bronze Package - Basic Wash';
    UPDATE packages SET price_hatchback = 1650, price_medium_hatchback = 1650, price_sedan = 1650, price_premium_sedan = 1650, price_suv = 1650 WHERE name = 'Bronze Package - Premium Clean';
    
    UPDATE packages SET price_hatchback = 2000, price_medium_hatchback = 2000, price_sedan = 2000, price_premium_sedan = 2000, price_suv = 2000 WHERE name = 'Silver Package - Basic Wash';
    UPDATE packages SET price_hatchback = 2750, price_medium_hatchback = 2750, price_sedan = 2750, price_premium_sedan = 2750, price_suv = 2750 WHERE name = 'Silver Package - Premium Clean';
    
    UPDATE packages SET price_hatchback = 3200, price_medium_hatchback = 3200, price_sedan = 3200, price_premium_sedan = 3200, price_suv = 3200 WHERE name = 'Gold Package - Basic Wash';
    UPDATE packages SET price_hatchback = 4400, price_medium_hatchback = 4400, price_sedan = 4400, price_premium_sedan = 4400, price_suv = 4400 WHERE name = 'Gold Package - Premium Clean';
    
    UPDATE packages SET price_hatchback = 4000, price_medium_hatchback = 4000, price_sedan = 4000, price_premium_sedan = 4000, price_suv = 4000 WHERE name = 'Diamond Package - Basic Wash';
    UPDATE packages SET price_hatchback = 5500, price_medium_hatchback = 5500, price_sedan = 5500, price_premium_sedan = 5500, price_suv = 5500 WHERE name = 'Diamond Package - Premium Clean';
    
    UPDATE packages SET price_hatchback = 4800, price_medium_hatchback = 4800, price_sedan = 4800, price_premium_sedan = 4800, price_suv = 4800 WHERE name = 'Platinum Package - Basic Wash';
    UPDATE packages SET price_hatchback = 6600, price_medium_hatchback = 6600, price_sedan = 6600, price_premium_sedan = 6600, price_suv = 6600 WHERE name = 'Platinum Package - Premium Clean';
  `;
  c.exec('mysql -u root -p"1234" gk_autoherb -e "' + query + '"', (err, stream) => {
    if (err) throw err;
    stream.on('close', () => c.end())
          .on('data', d => process.stdout.write(d))
          .stderr.on('data', d => process.stderr.write(d));
  });
}).connect({ host: '187.127.151.21', port: 22, username: 'root', password: 'AryanSingh123@' });
