export interface DataRow {
  [key: string]: any;
}

export type FilterOperator = 'contains' | 'equals' | 'gt' | 'lt' | 'startsWith' | 'endsWith' | 'notEquals';

export interface FilterCondition {
  id: string;
  column: string;
  operator: FilterOperator;
  value: string;
}

export interface SortConfig {
  column: string;
  direction: 'asc' | 'desc' | null;
}

export interface ExcelSheet {
  name: string;
  columns: string[];
  rows: DataRow[];
}

export interface ExcelData {
  fileName: string;
  sheets: ExcelSheet[];
}
