import { getLunarDate } from "@dqcai/vn-lunar";

export type VietnameseCalendarLocale = "vi" | "en";

export type VietnameseHoliday = {
  id: "new-year" | "lunar-new-year" | "hung-kings" | "reunification" | "labour" | "national-day";
  label: string;
};

export type VietnameseCalendarDay = {
  lunarDay: number;
  lunarMonth: number;
  lunarYear: number;
  isLeapMonth: boolean;
  lunarLabel: string;
  holiday: VietnameseHoliday | null;
};

type HolidayDefinition = {
  id: VietnameseHoliday["id"];
  label: Record<VietnameseCalendarLocale, string>;
  matches: (solar: { day: number; month: number }, lunar: { day: number; month: number }) => boolean;
};

const VIETNAMESE_HOLIDAYS: HolidayDefinition[] = [
  { id: "new-year", label: { vi: "Tết Dương lịch", en: "New Year's Day" }, matches: solar => solar.day === 1 && solar.month === 1 },
  { id: "lunar-new-year", label: { vi: "Tết Nguyên Đán", en: "Lunar New Year" }, matches: (_solar, lunar) => lunar.day === 1 && lunar.month === 1 },
  { id: "hung-kings", label: { vi: "Giỗ Tổ Hùng Vương", en: "Hung Kings' Festival" }, matches: (_solar, lunar) => lunar.day === 10 && lunar.month === 3 },
  { id: "reunification", label: { vi: "Ngày Giải phóng miền Nam", en: "Reunification Day" }, matches: solar => solar.day === 30 && solar.month === 4 },
  { id: "labour", label: { vi: "Quốc tế Lao động", en: "International Labour Day" }, matches: solar => solar.day === 1 && solar.month === 5 },
  { id: "national-day", label: { vi: "Quốc khánh", en: "National Day" }, matches: solar => solar.day === 2 && solar.month === 9 },
];

/**
 * Converts a locally displayed Gregorian date to the Vietnamese lunar date.
 * This deliberately labels statutory/cultural dates only, not annual leave or make-up days.
 */
export function getVietnameseCalendarDay(date: Date, locale: VietnameseCalendarLocale = "vi"): VietnameseCalendarDay {
  const lunar = getLunarDate(date.getDate(), date.getMonth() + 1, date.getFullYear());
  const solar = { day: date.getDate(), month: date.getMonth() + 1 };
  const holidayDefinition = VIETNAMESE_HOLIDAYS.find(item => item.matches(solar, lunar));
  const lunarLabel = locale === "vi"
    ? `${lunar.day}/${lunar.month}${lunar.leap ? " nhuận" : ""} ÂL`
    : `L ${lunar.day}/${lunar.month}${lunar.leap ? " leap" : ""}`;

  return {
    lunarDay: lunar.day,
    lunarMonth: lunar.month,
    lunarYear: lunar.year,
    isLeapMonth: lunar.leap,
    lunarLabel,
    holiday: holidayDefinition ? { id: holidayDefinition.id, label: holidayDefinition.label[locale] } : null,
  };
}
