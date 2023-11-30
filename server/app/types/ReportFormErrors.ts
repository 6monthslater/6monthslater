export interface ReportFormErrorRow {
  eventDesc: boolean;
  date: boolean;
  criticality: boolean;
}

export interface ReportFormErrors {
  main: string[];
  purchaseDate?: string;
  rows: {
    [key: string]: ReportFormErrorRow;
  };
}
