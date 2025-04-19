import { User, UserRole } from "@/lib/types";
import { Region, District } from "@/lib/types";

export function getUserRegionAndDistrict(
  user: User | null,
  regions: Region[],
  districts: District[]
): { regionId: string | null; districtId: string | null } {
  if (!user) return { regionId: null, districtId: null };

  let regionId: string | null = null;
  let districtId: string | null = null;

  // For district engineers, find both region and district
  if (user.role === "district_engineer" && user.region && user.district) {
    const userRegion = regions.find(r => r.name === user.region);
    if (userRegion) {
      regionId = userRegion.id;
      const userDistrict = districts.find(d => d.name === user.district && d.regionId === userRegion.id);
      if (userDistrict) {
        districtId = userDistrict.id;
      }
    }
  }
  // For regional engineers, find only region
  else if (user.role === "regional_engineer" && user.region) {
    const userRegion = regions.find(r => r.name === user.region);
    if (userRegion) {
      regionId = userRegion.id;
    }
  }

  return { regionId, districtId };
}

export function validateUserRoleAssignment(
  role: UserRole,
  region: string | undefined,
  district: string | undefined,
  regions: Region[],
  districts: District[]
): { isValid: boolean; error?: string } {
  // For global engineers, no region/district needed
  if (role === "global_engineer") {
    return { isValid: true };
  }

  // For regional and district engineers, region is required
  if (!region) {
    return { isValid: false, error: "Region is required" };
  }

  // Validate region exists
  const selectedRegion = regions.find(r => r.name === region);
  if (!selectedRegion) {
    return { isValid: false, error: "Invalid region selected" };
  }

  // For district engineers, district is required
  if (role === "district_engineer") {
    if (!district) {
      return { isValid: false, error: "District is required for District Engineers" };
    }

    // Validate district exists and belongs to selected region
    const selectedDistrict = districts.find(d => 
      d.name === district && d.regionId === selectedRegion.id
    );
    if (!selectedDistrict) {
      return { isValid: false, error: "Selected district does not belong to the selected region" };
    }
  }

  return { isValid: true };
}

export function getFilteredRegionsAndDistricts(
  user: User | null,
  regions: Region[],
  districts: District[],
  selectedRegionId?: string
): { filteredRegions: Region[]; filteredDistricts: District[] } {
  // For global engineers, show all regions
  const filteredRegions = user?.role === "global_engineer"
    ? regions
    : regions.filter(r => user?.region ? r.name === user.region : true);

  // Show districts only for the selected region
  const filteredDistricts = selectedRegionId
    ? districts.filter(d => d.regionId === selectedRegionId)
    : [];

  return { filteredRegions, filteredDistricts };
} 