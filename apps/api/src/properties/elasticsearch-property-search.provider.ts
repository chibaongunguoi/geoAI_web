import { Client } from "@elastic/elasticsearch";
import {
  PropertySearchProvider,
  PropertySearchProviderInput,
  PropertySearchProviderResult,
  PropertySearchProviderRow
} from "./property-search-provider";

type HydrationPrisma = {
  buildingProperty: {
    findMany: (args: unknown) => Promise<unknown[]>;
  };
};

type ElasticsearchClient = {
  ping: () => Promise<unknown>;
  search: (args: unknown) => Promise<{
    hits?: {
      hits?: Array<{
        _id?: string;
        _score?: number;
        _source?: { id?: string };
      }>;
    };
  }>;
};

type FetchLike = (
  input: string,
  init?: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
  }
) => Promise<{
  ok: boolean;
  status?: number;
  json: () => Promise<unknown>;
}>;

type ElasticsearchPropertySearchOptions = {
  client?: ElasticsearchClient;
  fetch?: FetchLike;
  indexName?: string;
  embeddingServiceUrl?: string;
  embeddingModel?: string;
};

const DEFAULT_INDEX_NAME = "building_properties_v1";
const DEFAULT_EMBEDDING_SERVICE_URL = "http://localhost:5055";
const DEFAULT_EMBEDDING_MODEL = "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2";
const EMBEDDING_DIMENSIONS = 384;

export class ElasticsearchPropertySearchProvider implements PropertySearchProvider {
  private readonly client: ElasticsearchClient;
  private readonly fetchImpl: FetchLike;
  private readonly indexName: string;
  private readonly embeddingServiceUrl: string;
  private readonly embeddingModel: string;

  constructor(
    private readonly prisma: HydrationPrisma,
    options: ElasticsearchPropertySearchOptions = {}
  ) {
    this.client = options.client || this.createClient();
    this.fetchImpl = options.fetch || this.defaultFetch();
    this.indexName = options.indexName || process.env.PROPERTY_INDEX_NAME || DEFAULT_INDEX_NAME;
    this.embeddingServiceUrl =
      options.embeddingServiceUrl ||
      process.env.EMBEDDING_SERVICE_URL ||
      DEFAULT_EMBEDDING_SERVICE_URL;
    this.embeddingModel =
      options.embeddingModel || process.env.EMBEDDING_MODEL || DEFAULT_EMBEDDING_MODEL;
  }

  async search(input: PropertySearchProviderInput): Promise<PropertySearchProviderResult> {
    await this.client.ping();
    const queryVector = await this.embed(input.normalizedQuery || input.query || "");
    const hits = await this.searchHits(input, queryVector);
    const ids = this.uniqueHitIds(hits).slice(0, input.limit);

    if (ids.length === 0) {
      return {
        items: [],
        searchMode: "elasticsearch-minilm-hybrid",
        semanticModel: this.embeddingModel
      };
    }

    const rows = (await this.prisma.buildingProperty.findMany({
      where: {
        id: { in: ids },
        deletedAt: null
      }
    })) as PropertySearchProviderRow[];
    const rowById = new Map(rows.map((row) => [row.id, row]));

    return {
      items: ids.map((id) => rowById.get(id)).filter((row): row is PropertySearchProviderRow => Boolean(row)),
      searchMode: "elasticsearch-minilm-hybrid",
      semanticModel: this.embeddingModel
    };
  }

  private createClient(): ElasticsearchClient {
    const node = process.env.ELASTICSEARCH_URL || "http://localhost:9200";
    const username = process.env.ELASTICSEARCH_USERNAME;
    const password = process.env.ELASTICSEARCH_PASSWORD;

    return new Client({
      node,
      auth: username && password ? { username, password } : undefined
    }) as unknown as ElasticsearchClient;
  }

  private defaultFetch(): FetchLike {
    if (!globalThis.fetch) {
      throw new Error("Global fetch is required for MiniLM embedding requests");
    }

    return globalThis.fetch.bind(globalThis) as FetchLike;
  }

  private async embed(text: string) {
    const response = await this.fetchImpl(`${this.embeddingServiceUrl.replace(/\/$/, "")}/embed`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        texts: [text],
        model: this.embeddingModel
      })
    });

    if (!response.ok) {
      throw new Error(`Embedding service failed with HTTP ${response.status || "unknown"}`);
    }

    const payload = (await response.json()) as { embeddings?: unknown };
    const embedding = Array.isArray(payload.embeddings) ? payload.embeddings[0] : undefined;

    if (!Array.isArray(embedding) || embedding.length !== EMBEDDING_DIMENSIONS) {
      throw new Error("Embedding service returned an invalid MiniLM vector");
    }

    return embedding.map((value) => Number(value));
  }

  private async searchHits(input: PropertySearchProviderInput, queryVector: number[]) {
    const filters: unknown[] = [{ term: { deleted: false } }];

    if (input.status) {
      filters.push({ term: { status: input.status } });
    }

    if (input.source) {
      filters.push({ term: { source: input.source } });
    }

    const response = await this.client.search({
      index: this.indexName,
      size: Math.max(input.limit * 2, input.limit),
      query: {
        bool: {
          must: [
            {
              multi_match: {
                query: input.query || input.normalizedQuery,
                fields: [
                  "code^5",
                  "name^4",
                  "addressLine^4",
                  "street^3",
                  "ward^2",
                  "district^2",
                  "searchText^2",
                  "searchTextNormalized"
                ],
                fuzziness: "AUTO",
                operator: "or"
              }
            }
          ],
          filter: filters
        }
      },
      knn: {
        field: "embedding",
        query_vector: queryVector,
        k: Math.max(input.limit * 2, input.limit),
        num_candidates: Math.max(input.limit * 10, 100),
        filter: filters
      }
    });

    return response.hits?.hits || [];
  }

  private uniqueHitIds(hits: Array<{ _id?: string; _source?: { id?: string } }>) {
    const ids: string[] = [];
    const seen = new Set<string>();

    for (const hit of hits) {
      const id = hit._id || hit._source?.id;
      if (!id || seen.has(id)) {
        continue;
      }

      seen.add(id);
      ids.push(id);
    }

    return ids;
  }
}

export const PROPERTY_SEARCH_INDEX_MAPPING = {
  mappings: {
    properties: {
      id: { type: "keyword" },
      code: { type: "keyword" },
      overtureId: { type: "keyword" },
      name: { type: "text" },
      addressLine: { type: "text" },
      street: { type: "text" },
      ward: { type: "keyword", fields: { text: { type: "text" } } },
      district: { type: "keyword", fields: { text: { type: "text" } } },
      city: { type: "keyword", fields: { text: { type: "text" } } },
      propertyType: { type: "keyword" },
      status: { type: "keyword" },
      source: { type: "keyword" },
      centroidLat: { type: "double" },
      centroidLng: { type: "double" },
      bbox: { type: "object", enabled: false },
      searchText: { type: "text" },
      searchTextNormalized: { type: "text" },
      embedding: {
        type: "dense_vector",
        dims: EMBEDDING_DIMENSIONS,
        index: true,
        similarity: "cosine"
      },
      deleted: { type: "boolean" },
      updatedAt: { type: "date" },
      deletedAt: { type: "date" }
    }
  }
};
