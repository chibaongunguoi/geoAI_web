const { Client } = require("@elastic/elasticsearch");

async function test() {
  try {
    const fetch = globalThis.fetch;
    const q = "những quán cafe đẹp ở Hải Châu";
    console.log(`Testing query: "${q}"...`);
    
    console.log("1. Fetching embedding from MiniLM service...");
    const res = await fetch("http://localhost:5055/embed", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ texts: [q], model: "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2" })
    });
    
    if (!res.ok) {
      console.log("MiniLM service not running or error:", res.status);
      return;
    }
    
    const data = await res.json();
    const vector = data.embeddings[0];
    console.log("-> Got vector of length:", vector.length);

    console.log("2. Querying Elasticsearch directly...");
    const client = new Client({ node: "http://localhost:9200" });
    const result = await client.search({
      index: "building_properties_v1",
      size: 5,
      query: {
        script_score: {
          query: {
            bool: {
              filter: [
                { term: { deleted: false } },
                { exists: { field: "embedding" } }
              ]
            }
          },
          script: {
            source: "cosineSimilarity(params.query_vector, 'embedding') + 1.0",
            params: { query_vector: vector }
          }
        }
      }
    });

    console.log("\nKết quả từ Elasticsearch:");
    if (result.hits.hits.length === 0) {
      console.log("Không tìm thấy kết quả nào.");
    } else {
      result.hits.hits.forEach(h => {
        console.log(`- Tên: ${h._source.name || 'Không tên'}, Địa chỉ: ${h._source.addressLine || 'Không địa chỉ'}, Phường/Quận: ${h._source.ward || ''} ${h._source.district || ''}, Điểm: ${h._score}`);
      });
    }
  } catch (err) {
    console.error("Error:", err);
  }
}
test();
