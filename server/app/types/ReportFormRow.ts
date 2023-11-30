export interface ReportFormRow {
  id: string;
  eventDesc: string;
  date: Date | undefined;
  criticality: number[];
}
