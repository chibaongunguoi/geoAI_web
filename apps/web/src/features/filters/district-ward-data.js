/**
 * Static district and ward data for Đà Nẵng city.
 * Contains the 7 districts (quận/huyện) and their wards (phường/xã),
 * sorted alphabetically using Vietnamese locale collation.
 */

/**
 * Vietnamese locale collator for consistent alphabetical sorting.
 */
const viCollator = new Intl.Collator("vi", { sensitivity: "base" });

/**
 * The 7 districts of Đà Nẵng.
 */
export const DISTRICTS = [
  "Hải Châu",
  "Thanh Khê",
  "Sơn Trà",
  "Ngũ Hành Sơn",
  "Liên Chiểu",
  "Cẩm Lệ",
  "Hòa Vang",
];

/**
 * Mapping of each district to its wards, sorted alphabetically (Vietnamese locale).
 */
export const WARDS_BY_DISTRICT = {
  "Hải Châu": [
    "Bình Hiên",
    "Bình Thuận",
    "Hải Châu I",
    "Hải Châu II",
    "Hòa Cường Bắc",
    "Hòa Cường Nam",
    "Hòa Thuận Đông",
    "Hòa Thuận Tây",
    "Nam Dương",
    "Phước Ninh",
    "Thạch Thang",
    "Thanh Bình",
    "Thuận Phước",
  ].sort(viCollator.compare),

  "Thanh Khê": [
    "An Khê",
    "Chính Gián",
    "Hòa Khê",
    "Tam Thuận",
    "Tân Chính",
    "Thạc Gián",
    "Thanh Khê Đông",
    "Thanh Khê Tây",
    "Vĩnh Trung",
    "Xuân Hà",
  ].sort(viCollator.compare),

  "Sơn Trà": [
    "An Hải Bắc",
    "An Hải Đông",
    "An Hải Tây",
    "Mân Thái",
    "Nại Hiên Đông",
    "Phước Mỹ",
    "Thọ Quang",
  ].sort(viCollator.compare),

  "Ngũ Hành Sơn": [
    "Hòa Hải",
    "Hòa Quý",
    "Khuê Mỹ",
    "Mỹ An",
  ].sort(viCollator.compare),

  "Liên Chiểu": [
    "Hòa Hiệp Bắc",
    "Hòa Hiệp Nam",
    "Hòa Khánh Bắc",
    "Hòa Khánh Nam",
    "Hòa Minh",
  ].sort(viCollator.compare),

  "Cẩm Lệ": [
    "Hòa An",
    "Hòa Phát",
    "Hòa Thọ Đông",
    "Hòa Thọ Tây",
    "Hòa Xuân",
    "Khuê Trung",
  ].sort(viCollator.compare),

  "Hòa Vang": [
    "Hòa Bắc",
    "Hòa Châu",
    "Hòa Khương",
    "Hòa Liên",
    "Hòa Nhơn",
    "Hòa Ninh",
    "Hòa Phong",
    "Hòa Phú",
    "Hòa Sơn",
    "Hòa Tiến",
    "Hòa Phước",
  ].sort(viCollator.compare),
};

/**
 * Returns the list of wards for a given district.
 * Returns an empty array if the district is not found or is empty/null.
 *
 * @param {string} district - The district name
 * @returns {string[]} Array of ward names, alphabetically sorted (Vietnamese locale)
 */
export function getWardsForDistrict(district) {
  if (!district) return [];
  return WARDS_BY_DISTRICT[district] || [];
}
