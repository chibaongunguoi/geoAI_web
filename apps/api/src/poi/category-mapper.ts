import { Injectable } from "@nestjs/common";

const CATEGORY_MAP: Record<string, string> = {
  restaurant: "Nhà hàng",
  cafe: "Quán cà phê",
  school: "Trường học",
  hospital: "Bệnh viện",
  pharmacy: "Nhà thuốc",
  bank: "Ngân hàng",
  hotel: "Khách sạn",
  supermarket: "Siêu thị",
  gas_station: "Trạm xăng",
  temple: "Chùa/Đền",
  bar: "Quán bar",
  clinic: "Phòng khám",
  kindergarten: "Nhà trẻ",
  university: "Đại học",
  market: "Chợ",
  convenience_store: "Cửa hàng tiện lợi",
  atm: "ATM",
  post_office: "Bưu điện",
  police: "Công an",
  fire_station: "Trạm cứu hỏa",
};

@Injectable()
export class CategoryMapper {
  private readonly entries = Object.entries(CATEGORY_MAP);

  /**
   * Returns all Overture category IDs matching a Vietnamese or English keyword.
   * Case-insensitive substring match against both Vietnamese labels and English identifiers.
   */
  findCategories(keyword: string): string[] {
    if (!keyword || !keyword.trim()) return [];
    const lower = keyword.toLowerCase();
    return this.entries
      .filter(
        ([key, label]) =>
          key.toLowerCase().includes(lower) ||
          label.toLowerCase().includes(lower),
      )
      .map(([key]) => key);
  }

  /**
   * Returns Vietnamese label for an Overture category ID.
   * Returns the original string if no mapping exists.
   */
  getVietnameseLabel(category: string): string {
    return CATEGORY_MAP[category] || category;
  }
}
