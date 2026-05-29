async function testAPI(q) {
  try {
    const res = await fetch("http://localhost:4000/properties?query=" + encodeURIComponent(q) + "&limit=10", {
      method: "GET",
      headers: { "Content-Type": "application/json" }
    });
    const data = await res.json();
    let result = `Query: "${q}"\n`;
    if (data.answer) result += `Answer: ${data.answer.text}\n`;
    if (data.items) result += `Items: ${data.items.length}\n`;
    if (data.map && data.map.regions) result += `Regions: ${data.map.regions.length}\n`;
    console.log(result);
  } catch (e) {
    console.error(e.message);
  }
}

async function main() {
  const demoQueries = [
    // 1. Relational Spatial
    "tìm khách sạn gần Nhat Minh Academy",
    "quán cafe trong bán kính 1km quanh Cầu Rồng",
    
    // 2. Risk Overlap
    "các trường học dễ bị ngập lụt ở Hải Châu",
    "khu vực dễ ngập lụt ở phường Hòa Khánh Bắc",
    
    // 3. Density
    "khu vực có nhiều khách sạn nhất ở Sơn Trà",
    "nơi nào có mật độ trường học cao nhất ở Đà Nẵng",
    "khu vực có nhiều trường học ở Hải Châu",
    
    // 4. Count & Normal
    "có bao nhiêu nhà hàng ở quận Ngũ Hành Sơn",
    "hiển thị danh sách bệnh viện tại quận Thanh Khê"
  ];
  
  for (let q of demoQueries) {
    await testAPI(q);
  }
}
main();
