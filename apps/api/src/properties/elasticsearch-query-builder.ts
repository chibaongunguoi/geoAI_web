import { PropertySearchProviderInput } from "./property-search-provider";

export class ElasticsearchQueryBuilder {
  constructor(
    private readonly indexName: string,
    private readonly defaultLimit: number = 10
  ) {}

  buildHybridSearchQuery(input: PropertySearchProviderInput, queryVector: number[]) {
    const filters = this.buildFilters(input);
    const should = this.buildShouldConditions(input);
    const size = Math.max(input.limit * 2, input.limit || this.defaultLimit);

    return {
      index: this.indexName,
      size,
      query: {
        script_score: {
          query: {
            bool: {
              filter: filters,
              should
            }
          },
          script: {
            source: "(_score * 0.5) + (cosineSimilarity(params.query_vector, 'embedding') + 1.0)",
            params: {
              query_vector: queryVector
            }
          }
        }
      }
    };
  }

  private buildFilters(input: PropertySearchProviderInput): unknown[] {
    const filters: unknown[] = [
      { term: { deleted: false } },
      { exists: { field: "embedding" } }
    ];

    if (input.status) {
      filters.push({ term: { status: input.status } });
    }

    if (input.propertyType) {
      filters.push({ term: { propertyType: input.propertyType } });
    }

    if (input.source) {
      filters.push({ term: { source: input.source } });
    }

    for (const term of this.locationTerms(input.filters)) {
      filters.push({ match_phrase: { searchTextNormalized: term } });
    }

    return filters;
  }

  private buildShouldConditions(input: PropertySearchProviderInput): unknown[] {
    return [
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
    ];
  }

  private locationTerms(filters?: PropertySearchProviderInput["filters"]) {
    return [filters?.ward, filters?.district]
      .map((term) => this.normalizeSearchText(term || ""))
      .filter((term): term is string => Boolean(term && term.trim().length >= 3));
  }

  private normalizeSearchText(value: string) {
    return value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d")
      .replace(/Đ/g, "D")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim()
      .replace(/\s+/g, " ");
  }
}
