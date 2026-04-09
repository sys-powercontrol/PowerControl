import { addWeeks, addMonths, addYears, parseISO, format } from "date-fns";

export type Frequency = "WEEKLY" | "MONTHLY" | "YEARLY";

export function calculateNextDueDate(currentDueDate: string, frequency: Frequency): string {
  const date = parseISO(currentDueDate);
  let nextDate: Date;

  switch (frequency) {
    case "WEEKLY":
      nextDate = addWeeks(date, 1);
      break;
    case "MONTHLY":
      nextDate = addMonths(date, 1);
      break;
    case "YEARLY":
      nextDate = addYears(date, 1);
      break;
    default:
      nextDate = addMonths(date, 1);
  }

  return format(nextDate, "yyyy-MM-dd");
}
