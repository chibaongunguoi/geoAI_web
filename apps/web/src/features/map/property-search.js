export function propertySearchAnswerText(result) {
  return result?.answer?.text || "";
}

export function densityRegions(result) {
  const regions = result?.map?.type === "property-density" ? result.map.regions : [];
  return Array.isArray(regions) ? regions : [];
}

export function densitySummaryRows(result) {
  return densityRegions(result).map((region, index) => ({
    id: region.id || `density-${index + 1}`,
    label: region.label || `Vung ${index + 1}`,
    count: Number(region.count || 0)
  }));
}

export function hasDensityResult(result) {
  return densityRegions(result).length > 0;
}
