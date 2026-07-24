// Validation module for BD_LOCATIONS.
// Expected minimum thana/upazila counts per district (BBS upazila count +
// metropolitan thanas where a metro police exists). Use as a sanity check —
// if a district's actual count drops below the expected minimum, something is
// missing.
import { BD_LOCATIONS, BD_DISTRICTS } from "./bd-locations";

// Minimum expected entries. Districts with metro police include extra thanas.
export const EXPECTED_MIN_COUNTS: Record<string, number> = {
  Bagerhat: 9, Bandarban: 7, Barguna: 6,
  Barishal: 14,           // 10 upazila + 4 BMP thanas
  Bhola: 7, Bogura: 12, Brahmanbaria: 9, Chandpur: 8, Chapainawabganj: 5,
  Chattogram: 31,         // 15 upazila + 16 CMP thanas
  Chuadanga: 4,
  Cumilla: 19,            // 17 upazila + 2 metro thanas
  "Cox's Bazar": 9,       // 8 upazila + Eidgaon
  Dhaka: 55,              // 5 upazila + 50 DMP thanas
  Dinajpur: 13, Faridpur: 9, Feni: 6, Gaibandha: 7,
  Gazipur: 13,            // 5 upazila + 8 GMP thanas
  Gopalganj: 5, Habiganj: 9, Jamalpur: 7, Jashore: 8, Jhalokati: 4,
  Jhenaidah: 6, Joypurhat: 5, Khagrachhari: 9,
  Khulna: 17,             // 9 upazila + 8 KMP thanas
  Kishoreganj: 13, Kurigram: 9, Kushtia: 6, Lakshmipur: 5, Lalmonirhat: 5,
  Madaripur: 5, Magura: 4, Manikganj: 7, Meherpur: 3, Moulvibazar: 7,
  Munshiganj: 6,
  Mymensingh: 15,         // 13 upazila + MMP thanas
  Naogaon: 11, Narail: 3,
  Narayanganj: 7,         // 5 upazila + Fatullah + Siddhirganj
  Narsingdi: 6, Natore: 7, Netrokona: 10, Nilphamari: 6, Noakhali: 9,
  Pabna: 9, Panchagarh: 5, Patuakhali: 8, Pirojpur: 7, Rajbari: 5,
  Rajshahi: 21,           // 9 upazila + 12 RMP thanas
  Rangamati: 10,
  Rangpur: 14,            // 8 upazila + 6 RpMP thanas
  Satkhira: 7, Shariatpur: 6, Sherpur: 5, Sirajganj: 9, Sunamganj: 12,
  Sylhet: 19,             // 13 upazila + 6 SMP thanas
  Tangail: 12, Thakurgaon: 5,
};

export const TOTAL_DISTRICTS_EXPECTED = 64;

export type ValidationIssue =
  | { type: "missing_district"; district: string }
  | { type: "extra_district"; district: string }
  | { type: "empty"; district: string }
  | { type: "duplicate_thana"; district: string; thana: string }
  | { type: "count_below_min"; district: string; actual: number; expected: number }
  | { type: "district_count_mismatch"; actual: number; expected: number };

export interface ValidationResult {
  ok: boolean;
  issues: ValidationIssue[];
  summary: {
    districts: number;
    totalThanas: number;
    perDistrict: Array<{ district: string; actual: number; expected: number; delta: number }>;
  };
}

export function validateBDLocations(): ValidationResult {
  const issues: ValidationIssue[] = [];
  const districts = BD_DISTRICTS;

  if (districts.length !== TOTAL_DISTRICTS_EXPECTED) {
    issues.push({
      type: "district_count_mismatch",
      actual: districts.length,
      expected: TOTAL_DISTRICTS_EXPECTED,
    });
  }

  const expectedDistricts = Object.keys(EXPECTED_MIN_COUNTS);
  for (const d of expectedDistricts) {
    if (!(d in BD_LOCATIONS)) issues.push({ type: "missing_district", district: d });
  }
  for (const d of districts) {
    if (!(d in EXPECTED_MIN_COUNTS)) issues.push({ type: "extra_district", district: d });
  }

  const perDistrict: ValidationResult["summary"]["perDistrict"] = [];
  let totalThanas = 0;

  for (const d of districts) {
    const list = BD_LOCATIONS[d] ?? [];
    totalThanas += list.length;
    const expected = EXPECTED_MIN_COUNTS[d] ?? 0;
    perDistrict.push({ district: d, actual: list.length, expected, delta: list.length - expected });

    if (list.length === 0) issues.push({ type: "empty", district: d });

    if (expected && list.length < expected) {
      issues.push({ type: "count_below_min", district: d, actual: list.length, expected });
    }

    const seen = new Set<string>();
    for (const t of list) {
      const key = t.trim().toLowerCase();
      if (seen.has(key)) issues.push({ type: "duplicate_thana", district: d, thana: t });
      seen.add(key);
    }
  }

  perDistrict.sort((a, b) => a.district.localeCompare(b.district));

  return {
    ok: issues.length === 0,
    issues,
    summary: { districts: districts.length, totalThanas, perDistrict },
  };
}

export function formatValidationReport(r: ValidationResult): string {
  const lines: string[] = [];
  lines.push(`Districts: ${r.summary.districts} / ${TOTAL_DISTRICTS_EXPECTED}`);
  lines.push(`Total thanas: ${r.summary.totalThanas}`);
  lines.push(`Status: ${r.ok ? "OK ✅" : `${r.issues.length} issue(s) ❌`}`);
  if (r.issues.length) {
    lines.push("");
    lines.push("Issues:");
    for (const i of r.issues) {
      switch (i.type) {
        case "missing_district": lines.push(`  • Missing district: ${i.district}`); break;
        case "extra_district": lines.push(`  • Unexpected district: ${i.district}`); break;
        case "empty": lines.push(`  • Empty thana list: ${i.district}`); break;
        case "duplicate_thana": lines.push(`  • Duplicate in ${i.district}: ${i.thana}`); break;
        case "count_below_min": lines.push(`  • ${i.district}: ${i.actual} < expected ${i.expected}`); break;
        case "district_count_mismatch": lines.push(`  • District count ${i.actual} ≠ ${i.expected}`); break;
      }
    }
  }
  lines.push("");
  lines.push("Per-district counts (actual / expected [delta]):");
  for (const p of r.summary.perDistrict) {
    const mark = p.actual < p.expected ? "❌" : p.actual === p.expected ? "✅" : "➕";
    lines.push(`  ${mark} ${p.district}: ${p.actual} / ${p.expected} [${p.delta >= 0 ? "+" : ""}${p.delta}]`);
  }
  return lines.join("\n");
}
