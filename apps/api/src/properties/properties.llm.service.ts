import { Injectable, Logger } from '@nestjs/common';

export interface SpatialIntent {
  isSpatial: boolean;
  referenceEntity?: string;
  targetEntity?: string;
  radiusMeters?: number;
}

@Injectable()
export class PropertiesLlmService {
  private readonly logger = new Logger(PropertiesLlmService.name);
  private readonly groqApiKey = process.env.GROQ_API_KEY || "";
  private readonly groqApiUrl = 'https://api.groq.com/openai/v1/chat/completions';

  async parseSpatialIntent(query: string): Promise<SpatialIntent> {
    const isSpatialQuery = /\b(gan|cach|xung quanh|ban kinh)\b/i.test(
      query.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    );

    if (!isSpatialQuery) {
      return { isSpatial: false };
    }

    try {
      const response = await fetch(this.groqApiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.groqApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            {
              role: 'system',
              content: `You are an AI that parses Vietnamese spatial search queries into a JSON object.
Rules:
- Determine if the query asks for a spatial relationship (e.g., A near B).
- If it does, set isSpatial to true.
- Extract the reference entity (the anchor point, e.g., "quán cafe ABC") into "referenceEntity".
- Extract the target entity (what the user is looking for, e.g., "trường học") into "targetEntity".
- Extract the radius in meters into "radiusMeters" (default to 500 if not specified).
- Ensure output is strictly valid JSON.
Example: "tìm quán bún bò cách trường đại học bách khoa 2km"
JSON: { "isSpatial": true, "referenceEntity": "trường đại học bách khoa", "targetEntity": "quán bún bò", "radiusMeters": 2000 }
Example: "nhà thuốc gần siêu thị coopmart"
JSON: { "isSpatial": true, "referenceEntity": "siêu thị coopmart", "targetEntity": "nhà thuốc", "radiusMeters": 500 }
`
            },
            {
              role: 'user',
              content: query
            }
          ],
          response_format: { type: 'json_object' },
          temperature: 0.1
        })
      });

      if (!response.ok) {
        throw new Error(`Groq API error: ${response.statusText}`);
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content;
      
      if (!content) {
        return { isSpatial: false };
      }

      const parsed = JSON.parse(content) as SpatialIntent;
      if (parsed.isSpatial && parsed.referenceEntity && parsed.targetEntity) {
        if (!parsed.radiusMeters) parsed.radiusMeters = 500;
        return parsed;
      }
      
      return { isSpatial: false };
    } catch (error) {
      this.logger.error(`Error parsing spatial intent with Groq LLM: ${error}`);
      return { isSpatial: false };
    }
  }
}
