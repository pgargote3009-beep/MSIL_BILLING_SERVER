const id = '6a478c7f26f462711e148b21';

async function run() {
  try {
    const getRes = await fetch(`http://localhost:5000/api/products/${id}`);
    const product = await getRes.json();

    const putRes = await fetch(`http://localhost:5000/api/products/${id}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        itemName: product.itemName,
        category: product.category,
        size: product.size,
        mrpPrice: product.mrpPrice,
        retailPrice: product.retailPrice,
        stock: product.stock
      })
    });

    const text = await putRes.text();
    console.log(JSON.stringify({ status: putRes.status, body: text }, null, 2));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

run();
