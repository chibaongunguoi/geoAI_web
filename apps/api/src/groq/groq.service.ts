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

@Injectable()
export class GroqService {
  private readonly logger = new Logger(GroqService.name);
  private readonly apiKey = process.env.GROQ_API_KEY || "";
  private readonly apiUrl = "https://api.groq.com/openai/v1/chat/completions";

  async parseSpatialQuery(query: string): Promise<ParsedSpatialQuery> {
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
}
