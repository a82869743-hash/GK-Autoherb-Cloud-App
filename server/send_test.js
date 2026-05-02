async function test() {
  const url = `https://2factor.in/API/R1/?module=TRANS_SMS&apikey=53af389f-418d-11f1-9800-0200cd936042&to=918238538098&from=GKAUTO&msg=GK AutoHerb: Your job card 13 is ready. Track here https://gkautobook.cloud/job/13`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    console.log('R1 result:', data);
  } catch(e) { console.log('R1 error', e.message); }
}
test();
