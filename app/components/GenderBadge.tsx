import type { Gender } from "@/lib/types";

const MALE_SVG = `<svg viewBox="0 0 24 24" width="70%" height="70%" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="10" cy="14.5" r="4.5"/><path d="M13.2 11.3 19 5.5M19 5.5h-4.2M19 5.5v4.2"/></svg>`;
const FEMALE_SVG = `<svg viewBox="0 0 24 24" width="70%" height="70%" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="9" r="4.5"/><path d="M12 13.5V20M9.2 16.8h5.6"/></svg>`;

export function genderSvg(gender: Gender): string {
  return gender === "male" ? MALE_SVG : FEMALE_SVG;
}

export function createGenderBadge(gender: Gender): HTMLSpanElement {
  const badge = document.createElement("span");
  badge.className = `gender-badge ${gender}`;
  badge.title = gender === "male" ? "Male" : "Female";
  badge.innerHTML = genderSvg(gender);
  return badge;
}

export default function GenderBadge({
  gender,
  large = false,
}: {
  gender: Gender;
  large?: boolean;
}) {
  const tone =
    gender === "male"
      ? "border-[#8ec5ff] bg-[#5096ff]/20 text-[#8ec5ff]"
      : "border-[#ff9ec4] bg-[#ff78aa]/20 text-[#ff9ec4]";
  return (
    <span
      className={`gender-badge inline-flex items-center justify-center rounded-full border-[1.5px] ${tone} ${
        large ? "gender-badge-lg h-11 w-11" : "h-4 w-4"
      }`}
      title={gender === "male" ? "Male" : "Female"}
      dangerouslySetInnerHTML={{ __html: genderSvg(gender) }}
    />
  );
}
