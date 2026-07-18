const pool = require('/root/app/server/src/config/db');
(async () => {
  try {
    const [cart] = await pool.query("SELECT * FROM job_carts WHERE id = 11");
    console.log("CART:", cart);
    const [services] = await pool.query("SELECT * FROM job_services WHERE job_cart_id = 11");
    console.log("SERVICES:", services);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
