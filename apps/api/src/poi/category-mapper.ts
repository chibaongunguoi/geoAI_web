import { Injectable } from "@nestjs/common";

const CATEGORY_MAP: Record<string, string> = {
  restaurant: "Nh\u00e0 h\u00e0ng",
  vietnamese_restaurant: "Nh\u00e0 h\u00e0ng Vi\u1ec7t Nam",
  seafood_restaurant: "Nh\u00e0 h\u00e0ng h\u1ea3i s\u1ea3n",
  fast_food_restaurant: "Nh\u00e0 h\u00e0ng th\u1ee9c \u0103n nhanh",
  vegetarian_restaurant: "Nh\u00e0 h\u00e0ng chay",
  diner: "Qu\u00e1n \u0103n",
  cafe: "Qu\u00e1n c\u00e0 ph\u00ea",
  coffee_shop: "Qu\u00e1n c\u00e0 ph\u00ea",
  desserts: "B\u00e1nh/ng\u1ecdt",
  school: "Tr\u01b0\u1eddng h\u1ecdc",
  elementary_school: "Tr\u01b0\u1eddng ti\u1ec3u h\u1ecdc",
  preschool: "Tr\u01b0\u1eddng m\u1eabu gi\u00e1o",
  kindergarten: "Nh\u00e0 tr\u1ebb",
  university: "\u0110\u1ea1i h\u1ecdc",
  hospital: "B\u1ec7nh vi\u1ec7n",
  pharmacy: "Nh\u00e0 thu\u1ed1c",
  clinic: "Ph\u00f2ng kh\u00e1m",
  bank: "Ng\u00e2n h\u00e0ng",
  atm: "ATM",
  hotel: "Kh\u00e1ch s\u1ea1n",
  resort: "Khu ngh\u1ec9 d\u01b0\u1ee1ng",
  lodge: "Nh\u00e0 ngh\u1ec9",
  accommodation: "L\u01b0u tr\u00fa",
  supermarket: "Si\u00eau th\u1ecb",
  market: "Ch\u1ee3",
  convenience_store: "C\u1eeda h\u00e0ng ti\u1ec7n l\u1ee3i",
  gas_station: "Tr\u1ea1m x\u0103ng",
  temple: "Ch\u00f9a/\u0110\u1ec1n",
  bar: "Qu\u00e1n bar",
  post_office: "B\u01b0u \u0111i\u1ec7n",
  police: "C\u00f4ng an",
  fire_station: "Tr\u1ea1m c\u1ee9u h\u1ecfa",
  park: "C\u00f4ng vi\u00ean",
  playground: "S\u00e2n ch\u01a1i",
  swimming_pool: "H\u1ed3 b\u01a1i",
  sports_centre: "Trung t\u00e2m th\u1ec3 thao"
};

@Injectable()
export class CategoryMapper {
  private readonly entries = Object.entries(CATEGORY_MAP);
  private readonly aliases: Record<string, string[]> = {
    cafe: ["cafe", "coffee_shop"],
    "ca phe": ["cafe", "coffee_shop"],
    "c\u00e0 ph\u00ea": ["cafe", "coffee_shop"],
    "nha hang": ["restaurant", "vietnamese_restaurant", "seafood_restaurant", "fast_food_restaurant", "vegetarian_restaurant", "diner"],
    "nh\u00e0 h\u00e0ng": ["restaurant", "vietnamese_restaurant", "seafood_restaurant", "fast_food_restaurant", "vegetarian_restaurant", "diner"],
    "quan an": ["restaurant", "vietnamese_restaurant", "seafood_restaurant", "fast_food_restaurant", "vegetarian_restaurant", "diner"],
    "qu\u00e1n \u0103n": ["restaurant", "vietnamese_restaurant", "seafood_restaurant", "fast_food_restaurant", "vegetarian_restaurant", "diner"],
    "khach san": ["hotel", "resort", "lodge", "accommodation"],
    "kh\u00e1ch s\u1ea1n": ["hotel", "resort", "lodge", "accommodation"],
    "benh vien": ["hospital", "clinic"],
    "b\u1ec7nh vi\u1ec7n": ["hospital", "clinic"],
    "sieu thi": ["supermarket", "market", "convenience_store"],
    "si\u00eau th\u1ecb": ["supermarket", "market", "convenience_store"],
    "truong hoc": ["school", "elementary_school", "preschool", "kindergarten", "university"],
    "tr\u01b0\u1eddng h\u1ecdc": ["school", "elementary_school", "preschool", "kindergarten", "university"],
    "cong vien": ["park", "playground"],
    "c\u00f4ng vi\u00ean": ["park", "playground"],
    "ho boi": ["swimming_pool"],
    "h\u1ed3 b\u01a1i": ["swimming_pool"]
  };

  findCategories(keyword: string): string[] {
    if (!keyword || !keyword.trim()) return [];
    const lower = keyword.toLowerCase();
    const normalized = this.normalize(lower);
    const aliases = Object.entries(this.aliases)
      .filter(([alias]) => lower.includes(alias) || normalized.includes(this.normalize(alias)))
      .flatMap(([, categories]) => categories);
    const matches = this.entries
      .filter(
        ([key, label]) =>
          key.toLowerCase().includes(lower) ||
          lower.includes(key.toLowerCase()) ||
          this.normalize(key).includes(normalized) ||
          normalized.includes(this.normalize(key)) ||
          label.toLowerCase().includes(lower) ||
          lower.includes(label.toLowerCase()) ||
          this.normalize(label).includes(normalized) ||
          normalized.includes(this.normalize(label))
      )
      .map(([key]) => key);
    return [...new Set([...aliases, ...matches])];
  }

  getVietnameseLabel(category: string): string {
    return CATEGORY_MAP[category] || category;
  }

  knownCategories(): string[] {
    return Object.keys(CATEGORY_MAP);
  }

  isPoiQuery(keyword: string): boolean {
    return this.findCategories(keyword).length > 0;
  }

  private normalize(value: string): string {
    return value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\u0111/g, "d")
      .replace(/\u0110/g, "D")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  }
}
