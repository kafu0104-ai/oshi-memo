export interface Event {
  id: string;
  title: string;

  tagIds?: string[];

  startDate: string;
  endDate: string;
  venue: string;

  officialUrl?: string;
  memo?: string;
}