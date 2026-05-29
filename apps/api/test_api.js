async function main() {
  const q = "khách sạn gần Nhat Minh Academy";
  try {
    const res = await fetch("http://localhost:4000/properties/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: q, limit: 5 })
    });
    const data = await res.json();
    console.log(JSON.stringify(data, null, 2));
  } catch (e) {
    console.error(e);
  }
}

main();
