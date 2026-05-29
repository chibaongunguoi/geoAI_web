import { Injectable, Logger } from "@nestjs/common";

export type ParsedSpatialQuery = {
  isRelational: boolean;
  targetCategory?: string;
  referenceName?: string;
  distanceMeters?: number;
  district?: string;
  ward?: string;
  riskType?: "flood" | "landslide";
};

export type ParsedDensityQuery = {
  intent: "density" | "list" | "unknown";
  direction?: "highest" | "lowest";
  district?: string;
  ward?: string;
  searchTerms?: string[];  // POI keywords to filter by (e.g. ["khach san"], ["nha hang"])
};

export type ParsedPropertyQuery = {
  intent: "relational_spatial" | "risk" | "density" | "count" | "list" | "unknown";
  targetCategory?: string | null;
  referenceName?: string | null;
  distanceMeters?: number | null;
  district?: string | null;
  ward?: string | null;
  riskType?: "flood" | "landslide" | null;
  direction?: "highest" | "lowest" | null;
  searchTerms?: string[];
};

@Injectable()
export class GroqService {
  private readonly logger = new Logger(GroqService.name);
  private readonly apiKey = process.env.GROQ_API_KEY || "";
  private readonly apiUrl = "https://api.groq.com/openai/v1/chat/completions";

  async parsePropertyQuery(query: string): Promise<ParsedPropertyQuery> {
    if (!this.apiKey) {
      return { intent: "unknown" };
    }

    const prompt = `
Bạn là bộ phân tích truy vấn bản đồ tài sản cho GeoAI Đà Nẵng.
Trả về đúng một JSON object, không giải thích.

Phạm vi hệ thống hiện tại: chỉ truy vấn tài sản trong quận Hải Châu và các phường thuộc quận Hải Châu.
Nếu người dùng hỏi quận khác, vẫn trích xuất tên quận đó vào "district"; backend sẽ tự giới hạn/cảnh báo.

Schema:
{
  "intent": "relational_spatial" | "risk" | "density" | "count" | "list" | "unknown",
  "targetCategory": string | null,
  "referenceName": string | null,
  "distanceMeters": number | null,
  "district": string | null,
  "ward": string | null,
  "riskType": "flood" | "landslide" | null,
  "direction": "highest" | "lowest" | null,
  "searchTerms": string[]
}

Quy tắc:
- relational_spatial: có quan hệ gần, quanh, xung quanh, trong bán kính, cách. Mốc đặt vào referenceName. Nếu không nêu bán kính, distanceMeters = 500.
- risk: hỏi tài sản/khu vực dễ ngập, lụt, lũ, sạt lở, rủi ro. riskType = flood hoặc landslide.
- density: hỏi mật độ, khu vực nhiều/tập trung/dày đặc/thưa thớt/cao nhất/thấp nhất. "nhiều trường học" là density, targetCategory = "school", searchTerms = ["truong hoc"].
- count: hỏi bao nhiêu, đếm số lượng.
- list: hỏi hiển thị danh sách, liệt kê.
- targetCategory dùng category tiếng Anh ngắn: hotel, cafe, restaurant, school, university, hospital, building, asset.
- searchTerms là từ khóa tiếng Việt không dấu phục vụ lọc mật độ/list/count, ví dụ ["khach san"], ["truong hoc"], ["toa nha"].
- Chuẩn hóa địa danh Việt Nam có dấu: Hải Châu, Thạch Thang, Thuận Phước, Hải Châu I, Hải Châu II, Bình Hiên, Bình Thuận, Hòa Cường Bắc, Hòa Cường Nam, Hòa Thuận Tây, Hòa Thuận Đông, Nam Dương, Phước Ninh, Thanh Bình.

Ví dụ:
Query: "Tìm khách sạn gần Nhat Minh Academy"
{"intent":"relational_spatial","targetCategory":"hotel","referenceName":"Nhat Minh Academy","distanceMeters":500,"district":"Hải Châu","ward":null,"riskType":null,"direction":null,"searchTerms":["khach san"]}

Query: "Các trường học dễ bị ngập lụt ở Hải Châu"
{"intent":"risk","targetCategory":"school","referenceName":null,"distanceMeters":null,"district":"Hải Châu","ward":null,"riskType":"flood","direction":null,"searchTerms":["truong hoc"]}

Query: "Khu vực có nhiều trường học ở Hải Châu"
{"intent":"density","targetCategory":"school","referenceName":null,"distanceMeters":null,"district":"Hải Châu","ward":null,"riskType":null,"direction":"highest","searchTerms":["truong hoc"]}

Query: "Có bao nhiêu tòa nhà ở quận Hải Châu?"
{"intent":"count","targetCategory":"building","referenceName":null,"distanceMeters":null,"district":"Hải Châu","ward":null,"riskType":null,"direction":null,"searchTerms":["toa nha"]}

Query: "${query}"
`;

    try {
      const response = await fetch(this.apiUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [
            { role: "system", content: "You output only valid JSON matching the requested schema." },
            { role: "user", content: prompt }
          ],
          temperature: 0,
          response_format: { type: "json_object" }
        })
      });

      if (!response.ok) {
        this.logger.error(`Groq property query API error: ${await response.text()}`);
        return { intent: "unknown" };
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      if (!content) {
        return { intent: "unknown" };
      }

      return this.normalizeParsedPropertyQuery(JSON.parse(content));
    } catch (error) {
      this.logger.error(`Failed to parse property query: ${error}`);
      return { intent: "unknown" };
    }
  }

  private normalizeParsedPropertyQuery(value: any): ParsedPropertyQuery {
    const allowedIntents = new Set(["relational_spatial", "risk", "density", "count", "list", "unknown"]);
    const intent = allowedIntents.has(value?.intent) ? value.intent : "unknown";
    const distanceMeters = Number(value?.distanceMeters);

    return {
      intent,
      targetCategory: typeof value?.targetCategory === "string" ? value.targetCategory : null,
      referenceName: typeof value?.referenceName === "string" ? value.referenceName : null,
      distanceMeters: Number.isFinite(distanceMeters) && distanceMeters > 0 ? Math.round(distanceMeters) : null,
      district: typeof value?.district === "string" ? value.district : null,
      ward: typeof value?.ward === "string" ? value.ward : null,
      riskType: value?.riskType === "flood" || value?.riskType === "landslide" ? value.riskType : null,
      direction: value?.direction === "lowest" ? "lowest" : value?.direction === "highest" ? "highest" : null,
      searchTerms: Array.isArray(value?.searchTerms)
        ? value.searchTerms.filter((term: unknown): term is string => typeof term === "string" && term.trim().length > 0)
        : []
    };
  }

  async parseSpatialQuery(query: string): Promise<ParsedSpatialQuery> {
    const parsed = await this.parsePropertyQuery(query);
    if (parsed.intent === "relational_spatial" || parsed.intent === "risk") {
      return {
        isRelational: parsed.intent === "relational_spatial",
        targetCategory: parsed.targetCategory || undefined,
        referenceName: parsed.referenceName || undefined,
        distanceMeters: parsed.distanceMeters || undefined,
        district: parsed.district || undefined,
        ward: parsed.ward || undefined,
        riskType: parsed.riskType || undefined
      };
    }

    if (!this.apiKey) {
      return { isRelational: false };
    }

    const prompt = `
Bạn là một chuyên gia phân tích ngữ nghĩa truy vấn không gian (Spatial query) và Đánh giá rủi ro (Risk query) bằng tiếng Việt.
Nhiệm vụ của bạn là trích xuất thông tin từ câu hỏi của người dùng và trả về ĐÚNG 1 ĐỐI TƯỢNG JSON.
Không giải thích, không output thêm bất kỳ text nào ngoài JSON.

Các trường cần trích xuất:
- "isRelational" (boolean): true nếu câu hỏi có chứa quan hệ không gian giữa 2 đối tượng (vd: "gần", "cạnh", "xung quanh", "trong bán kính").
- "targetCategory" (string): Loại địa điểm người dùng muốn tìm. QUAN TRỌNG: Hãy dịch loại địa điểm sang tiếng Anh theo chuẩn Overture Maps category (ví dụ: "nhà hàng" -> "restaurant", "trường học" -> "school", "quán cafe" -> "cafe", "khách sạn" -> "hotel", "bệnh viện" -> "hospital", "tòa nhà" -> "building").
- "referenceName" (string): Tên của địa điểm mốc (vd: "quán cafe ABC", "Vincom", "cầu Rồng").
- "distanceMeters" (number): Bán kính/khoảng cách tính bằng mét (mặc định là 500 nếu người dùng chỉ nói "gần" mà không rõ khoảng cách).
- "district" (string): Quận nếu có nhắc đến (vd: "Hải Châu", "Sơn Trà").
- "ward" (string): Phường/Xã nếu có nhắc đến (vd: "Thạch Thang", "Hòa Khánh Bắc").
- "riskType" (string): Loại rủi ro cần kiểm tra. Chỉ trả về "flood" (nếu có nhắc ngập, lụt, lũ) hoặc "landslide" (nếu nhắc sạt, lở). Trả về null nếu không có.

Ví dụ 1: "tìm nhà hàng gần quán cafe highland ở quận hải châu bán kính 1km"
{
  "isRelational": true,
  "targetCategory": "restaurant",
  "referenceName": "quán cafe highland",
  "distanceMeters": 1000,
  "district": "Hải Châu"
}

Ví dụ 2: "quán cafe nào dễ ngập lụt ở phường thạch thang quận hải châu"
{
  "isRelational": false,
  "targetCategory": "cafe",
  "ward": "Thạch Thang",
  "district": "Hải Châu",
  "riskType": "flood"
}

Câu hỏi: "${query}"
    `;

    try {
      const response = await fetch(this.apiUrl, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [
            { role: "system", content: "You output only valid JSON." },
            { role: "user", content: prompt }
          ],
          temperature: 0.1,
          response_format: { type: "json_object" }
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`Groq API error: ${errorText}`);
        return { isRelational: false };
      }

      const data = await response.json();
      const content = data.choices[0].message.content;
      return JSON.parse(content) as ParsedSpatialQuery;
    } catch (error) {
      this.logger.error(`Failed to parse spatial query: ${error}`);
      return { isRelational: false };
    }
  }

  async parseDensityQuery(query: string): Promise<ParsedDensityQuery> {
    if (!this.apiKey) {
      return { intent: "unknown" };
    }

    const prompt = `
Bạn là chuyên gia phân tích câu hỏi mật độ địa lý (density query) tiếng Việt cho hệ thống bản đồ thành phố Đà Nẵng.
Phân tích câu hỏi và trả về JSON với các trường sau. Không giải thích, chỉ trả về JSON.

Trường cần trích xuất:
- "intent": "density" nếu hỏi về mật độ/khu vực/nơi có nhiều/ít một loại địa điểm. "list" nếu hỏi danh sách. "unknown" nếu không rõ.
- "direction": "highest" (nhiều nhất/dày đặc nhất) hoặc "lowest" (ít nhất/thưa nhất). Mặc định "highest".
- "district": Tên quận đầy đủ (vd: "Hải Châu", "Sơn Trà", "Thanh Khê", "Liên Chiểu", "Ngũ Hành Sơn", "Cẩm Lệ", "Hòa Vang"). Null nếu không có.
- "ward": Tên phường đầy đủ chính xác theo danh sách Đà Nẵng (vd: "Thạch Thang", "Thuận Phước", "Hải Châu I"). Null nếu không có hoặc không chắc.
- "searchTerms": Mảng các từ khóa loại địa điểm bằng tiếng Việt không dấu (vd: ["khach san"], ["nha hang"], ["truong hoc"]). Để rỗng [] nếu hỏi mật độ nhà chung chung.

Ví dụ:
Query: "khu vực có khách sạn nhiều nhất hải châu"
{"intent":"density","direction":"highest","district":"Hải Châu","ward":null,"searchTerms":["khach san"]}

Query: "khu vực dày đặc nhất thạch thăng, hải châu"
{"intent":"density","direction":"highest","district":"Hải Châu","ward":"Thạch Thang","searchTerms":[]}

Query: "vùng nào ở phường thuận phước có mật độ nhà nhiều nhất"
{"intent":"density","direction":"highest","district":"Hải Châu","ward":"Thuận Phước","searchTerms":[]}

Query: "khu vực có nhà hàng nhiều nhất thanh khê"
{"intent":"density","direction":"highest","district":"Thanh Khê","ward":null,"searchTerms":["nha hang"]}

Query: "${query}"
`;

    try {
      const response = await fetch(this.apiUrl, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [
            { role: "system", content: "You output only valid JSON." },
            { role: "user", content: prompt }
          ],
          temperature: 0.0,
          response_format: { type: "json_object" }
        })
      });

      if (!response.ok) {
        this.logger.error(`Groq density API error: ${await response.text()}`);
        return { intent: "unknown" };
      }

      const data = await response.json();
      const content = data.choices[0].message.content;
      return JSON.parse(content) as ParsedDensityQuery;
    } catch (error) {
      this.logger.error(`Failed to parse density query: ${error}`);
      return { intent: "unknown" };
    }
  }
}
