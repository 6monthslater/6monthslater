export interface ReportFormErrors {
  main: string[];
  purchaseDate?: string;
  rows: {
    [key: string]: {
      eventDesc: boolean;
      date: boolean;
    };
  };
}
