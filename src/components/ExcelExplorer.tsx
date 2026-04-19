import React, { useState, useMemo, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { 
  Search, 
  Upload, 
  Filter, 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown, 
  X, 
  Plus, 
  ChevronDown, 
  ChevronRight,
  FileSpreadsheet,
  Download,
  Trash2,
  Table as TableIcon,
  LayoutGrid,
  Settings2,
  Eye,
  EyeOff,
  Phone
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { ExcelData, ExcelSheet, DataRow, FilterCondition, FilterOperator, SortConfig } from '../types';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const OPERATORS: { label: string; value: FilterOperator }[] = [
  { label: 'Contains', value: 'contains' },
  { label: 'Equals', value: 'equals' },
  { label: 'Not Equals', value: 'notEquals' },
  { label: 'Starts With', value: 'startsWith' },
  { label: 'Ends With', value: 'endsWith' },
  { label: 'Greater Than', value: 'gt' },
  { label: 'Less Than', value: 'lt' },
];

const isPhoneNumber = (val: any): boolean => {
  if (typeof val !== 'string' && typeof val !== 'number') return false;
  const str = String(val).replace(/\s/g, '');
  // Very basic regex for phone numbers: starts with + or digit, length between 7-15
  return /^\+?[0-9]{7,15}$/.test(str);
};

export function ExcelExplorer() {
  const [data, setData] = useState<ExcelData | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<FilterCondition[]>([]);
  const [sort, setSort] = useState<SortConfig>({ column: '', direction: null });
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('cards');
  const [isLoading, setIsLoading] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<string[]>([]);
  const [activeSheetIndex, setActiveSheetIndex] = useState(0);

  const activeSheet = useMemo(() => {
    return data?.sheets[activeSheetIndex] || null;
  }, [data, activeSheetIndex]);

  // Sync viewMode with screen size
  useEffect(() => {
    const checkView = () => {
      if (window.innerWidth >= 1024) {
        setViewMode('table');
      } else {
        setViewMode('cards');
      }
    };
    checkView();
    window.addEventListener('resize', checkView);
    return () => window.removeEventListener('resize', checkView);
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        
        const sheets: ExcelSheet[] = wb.SheetNames.map(name => {
          const ws = wb.Sheets[name];
          const rows = XLSX.utils.sheet_to_json(ws) as DataRow[];
          const columns = rows.length > 0 ? Object.keys(rows[0]) : [];
          return { name, columns, rows };
        }).filter(s => s.rows.length > 0);

        if (sheets.length > 0) {
          setData({
            fileName: file.name,
            sheets
          });
          setActiveSheetIndex(0);
          setVisibleColumns(sheets[0].columns);
          setFilters([]);
          setSort({ column: '', direction: null });
        }
      } catch (err) {
        console.error("Error parsing excel:", err);
      } finally {
        setIsLoading(false);
      }
    };
    reader.readAsBinaryString(file);
  };

  const addFilter = () => {
    if (!activeSheet) return;
    setFilters([
      ...filters,
      {
        id: Math.random().toString(36).substr(2, 9),
        column: activeSheet.columns[0],
        operator: 'contains',
        value: ''
      }
    ]);
  };

  const updateFilter = (index: number, updates: Partial<FilterCondition>) => {
    const newFilters = [...filters];
    newFilters[index] = { ...newFilters[index], ...updates };
    setFilters(newFilters);
  };

  const removeFilter = (index: number) => {
    setFilters(filters.filter((_, i) => i !== index));
  };

  const clearAllFilters = () => {
    setFilters([]);
    setSearchQuery('');
  };

  const toggleSort = (column: string) => {
    if (sort.column === column) {
      if (sort.direction === 'asc') setSort({ column, direction: 'desc' });
      else if (sort.direction === 'desc') setSort({ column: '', direction: null });
      else setSort({ column, direction: 'asc' });
    } else {
      setSort({ column, direction: 'asc' });
    }
  };

  const filteredRows = useMemo(() => {
    if (!activeSheet) return [];

    let rows = [...activeSheet.rows];

    // Global Search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      rows = rows.filter(row => 
        activeSheet.columns.some(col => 
          String(row[col] ?? '').toLowerCase().includes(q)
        )
      );
    }

    // Specific Filters
    filters.forEach(f => {
      if (!f.value && f.operator !== 'equals') return;
      
      rows = rows.filter(row => {
        const val = String(row[f.column] ?? '').toLowerCase();
        const fVal = f.value.toLowerCase();
        const numVal = parseFloat(row[f.column]);
        const numFVal = parseFloat(f.value);

        switch (f.operator) {
          case 'contains': return val.includes(fVal);
          case 'equals': return val === fVal;
          case 'notEquals': return val !== fVal;
          case 'startsWith': return val.startsWith(fVal);
          case 'endsWith': return val.endsWith(fVal);
          case 'gt': return !isNaN(numVal) && numVal > numFVal;
          case 'lt': return !isNaN(numVal) && numVal < numFVal;
          default: return true;
        }
      });
    });

    // Sorting
    if (sort.column && sort.direction) {
      rows.sort((a, b) => {
        const valA = a[sort.column];
        const valB = b[sort.column];
        
        if (typeof valA === 'number' && typeof valB === 'number') {
          return sort.direction === 'asc' ? valA - valB : valB - valA;
        }
        
        const strA = String(valA ?? '').toLowerCase();
        const strB = String(valB ?? '').toLowerCase();
        
        if (strA < strB) return sort.direction === 'asc' ? -1 : 1;
        if (strA > strB) return sort.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return rows;
  }, [data, searchQuery, filters, sort]);

  const resetData = () => {
    setData(null);
    setActiveSheetIndex(0);
    setVisibleColumns([]);
    setFilters([]);
    setSort({ column: '', direction: null });
    setSearchQuery('');
  };

  const handleSheetChange = (idx: string) => {
    const index = parseInt(idx);
    setActiveSheetIndex(index);
    if (data?.sheets[index]) {
      setVisibleColumns(data.sheets[index].columns);
      setFilters([]);
      setSort({ column: '', direction: null });
    }
  };

  const toggleColumnVisibility = (column: string) => {
    setVisibleColumns(prev => 
      prev.includes(column) 
        ? prev.filter(c => c !== column) 
        : [...prev, column]
    );
  };

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] p-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full text-center space-y-6"
        >
          <div className="mx-auto w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center">
            <FileSpreadsheet className="w-10 h-10 text-primary" />
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">Excel Explorer</h1>
            <p className="text-muted-foreground">
              Upload your Excel or CSV file to start searching, filtering, and organizing your data on the go.
            </p>
          </div>
          
          <label className="block">
            <div className="mt-8 flex items-center justify-center w-full h-40 border-2 border-dashed border-muted-foreground/25 rounded-xl hover:border-primary/50 transition-colors cursor-pointer bg-card/50">
              <div className="flex flex-col items-center space-y-2">
                <Upload className="w-8 h-8 text-muted-foreground" />
                <span className="font-medium">Choose a file or drag & drop</span>
                <span className="text-xs text-muted-foreground">XLSX, XLS, or CSV</span>
              </div>
              <input type="file" className="hidden" accept=".xlsx, .xls, .csv" onChange={handleFileUpload} />
            </div>
          </label>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4 lg:p-8 space-y-6">
      {/* Header / Top Bar */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <FileSpreadsheet className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold truncate max-w-[200px] sm:max-w-md">{data.fileName}</h2>
              <p className="text-sm text-muted-foreground">
                {activeSheet?.name} • {filteredRows.length} rows found
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
             <Button variant="outline" size="sm" onClick={resetData} className="gap-2">
              <Upload className="w-4 h-4" />
              <span className="hidden sm:inline">New File</span>
            </Button>

            {activeSheet && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Settings2 className="w-4 h-4" />
                    <span className="hidden sm:inline">Columns</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 max-h-[400px] overflow-y-auto">
                  <DropdownMenuLabel>Show/Hide Columns</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {activeSheet.columns.map((col) => (
                    <DropdownMenuItem 
                      key={col} 
                      onSelect={(e) => e.preventDefault()} 
                      onClick={() => toggleColumnVisibility(col)}
                      className="flex items-center justify-between cursor-pointer"
                    >
                      <span className={cn("text-xs font-medium truncate flex-1 pr-2", !visibleColumns.includes(col) && "opacity-50")}>
                        {col}
                      </span>
                      {visibleColumns.includes(col) ? (
                        <Eye className="w-4 h-4 text-primary" />
                      ) : (
                        <EyeOff className="w-4 h-4 text-muted-foreground" />
                      )}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            <div className="flex bg-muted p-1 rounded-lg">
              <Button 
                variant={viewMode === 'table' ? 'secondary' : 'ghost'} 
                size="sm" 
                className="px-2"
                onClick={() => setViewMode('table')}
              >
                <TableIcon className="w-4 h-4" />
              </Button>
              <Button 
                variant={viewMode === 'cards' ? 'secondary' : 'ghost'} 
                size="sm" 
                className="px-2"
                onClick={() => setViewMode('cards')}
              >
                <LayoutGrid className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {data.sheets.length > 1 && (
          <ScrollArea className="w-full pb-2">
            <div className="flex gap-1 p-1 bg-muted/40 rounded-xl w-max min-w-full">
              {data.sheets.map((sheet, idx) => (
                <Button
                  key={idx}
                  variant={activeSheetIndex === idx ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => handleSheetChange(idx.toString())}
                  className={cn(
                    "flex-shrink-0 h-8 text-xs font-medium px-4 rounded-lg",
                    activeSheetIndex === idx ? "bg-background shadow-sm" : ""
                  )}
                >
                  {sheet.name}
                </Button>
              ))}
            </div>
          </ScrollArea>
        )}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-2 sticky top-4 z-20 bg-background/80 backdrop-blur-md p-2 -m-2 rounded-xl">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Search all columns..." 
            className="pl-9 h-11 bg-card rounded-xl shadow-sm border-none ring-1 ring-border focus-visible:ring-primary/50"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="lg" className="h-11 px-4 gap-2 rounded-xl shadow-sm border-none ring-1 ring-border">
              <Filter className="w-4 h-4" />
              <span>Filters</span>
              {filters.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 min-w-[20px] p-0 flex items-center justify-center">
                  {filters.length}
                </Badge>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-full sm:max-w-md flex flex-col p-0">
            <div className="p-6 pb-4 border-bottom">
              <SheetHeader>
                <SheetTitle>Filters</SheetTitle>
                <SheetDescription>
                  Apply specific conditions to refine your data view.
                </SheetDescription>
              </SheetHeader>
            </div>
            
            <ScrollArea className="flex-1 px-6">
              <div className="space-y-6 py-4">
                {filters.map((filter, idx) => (
                  <div key={filter.id} className="p-4 bg-muted/50 rounded-xl space-y-3 relative group">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-background border shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => removeFilter(idx)}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                    
                    <div className="space-y-2">
                      <Label className="text-xs uppercase tracking-wider opacity-60">Column</Label>
                      <Select defaultValue={filter.column} onValueChange={(val) => updateFilter(idx, { column: val })}>
                        <SelectTrigger className="bg-background border-none ring-1 ring-border h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {activeSheet.columns.map(col => (
                            <SelectItem key={col} value={col}>{col}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-2">
                        <Label className="text-xs uppercase tracking-wider opacity-60">Condition</Label>
                        <Select defaultValue={filter.operator} onValueChange={(val) => updateFilter(idx, { operator: val as FilterOperator })}>
                          <SelectTrigger className="bg-background border-none ring-1 ring-border h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {OPERATORS.map(op => (
                              <SelectItem key={op.value} value={op.value}>{op.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs uppercase tracking-wider opacity-60">Value</Label>
                        <Input 
                          placeholder="Value..." 
                          className="bg-background border-none ring-1 ring-border h-9"
                          value={filter.value}
                          onChange={(e) => updateFilter(idx, { value: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>
                ))}

                {filters.length === 0 && (
                  <div className="text-center py-10 space-y-2 opacity-50">
                    <Filter className="w-8 h-8 mx-auto" />
                    <p className="text-sm">No active filters</p>
                  </div>
                )}
              </div>
            </ScrollArea>

            <div className="p-6 bg-background border-t space-y-3">
              <Button onClick={addFilter} variant="outline" className="w-full gap-2 rounded-xl">
                <Plus className="w-4 h-4" />
                Add Condition
              </Button>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="ghost" onClick={clearAllFilters} disabled={filters.length === 0} className="rounded-xl">
                  Clear All
                </Button>
                 <SheetTrigger asChild>
                  <Button className="rounded-xl">Show Results</Button>
                </SheetTrigger>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Main Content View */}
      <AnimatePresence mode="wait">
        {viewMode === 'table' ? (
          <motion.div 
            key="table"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="rounded-xl border bg-card overflow-hidden shadow-sm"
          >
            <ScrollArea className="h-[calc(100vh-320px)]">
              <Table className="border-collapse">
                <TableHeader className="sticky top-0 bg-secondary/95 backdrop-blur-md z-10 shadow-sm">
                  <TableRow className="bg-secondary/20">
                    <TableHead className="w-12 text-center font-mono text-[10px] border-r border-border/50 sticky left-0 bg-secondary z-20">#</TableHead>
                    {activeSheet.columns.filter(col => visibleColumns.includes(col)).map((col) => (
                      <TableHead key={col} className="h-12 border-r border-border/50 px-0">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="w-full h-full hover:bg-transparent font-bold gap-2 text-[10px] uppercase tracking-wider px-4 justify-start"
                          onClick={() => toggleSort(col)}
                        >
                          {col}
                          {sort.column === col ? (
                            sort.direction === 'asc' ? <ArrowUp className="w-3 h-3 text-primary" /> : <ArrowDown className="w-3 h-3 text-primary" />
                          ) : (
                            <ArrowUpDown className="w-3 h-3 opacity-30" />
                          )}
                        </Button>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRows.map((row, idx) => (
                    <TableRow key={idx} className="hover:bg-muted/30 transition-colors border-b border-border/50">
                      <TableCell className="w-12 text-center font-mono text-[10px] text-muted-foreground border-r border-border/50 bg-secondary/10 sticky left-0 z-10">
                        {idx + 1}
                      </TableCell>
                      {activeSheet.columns.filter(col => visibleColumns.includes(col)).map((col) => (
                        <TableCell key={col} className="py-2 px-4 font-mono text-xs max-w-[300px] truncate border-r border-border/50">
                          <div className="flex items-center justify-between gap-2">
                            <span className="truncate">{String(row[col] ?? '-')}</span>
                            {isPhoneNumber(row[col]) && (
                              <a 
                                href={`tel:${String(row[col]).replace(/\s/g, '')}`}
                                className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary hover:bg-primary hover:text-white transition-colors flex-shrink-0"
                                title="Call"
                              >
                                <Phone className="w-3 h-3" />
                              </a>
                            )}
                          </div>
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {filteredRows.length === 0 && (
                <div className="p-20 text-center space-y-3 opacity-40">
                  <Search className="w-12 h-12 mx-auto" />
                  <p>No results match your search and filters.</p>
                </div>
              )}
            </ScrollArea>
          </motion.div>
        ) : (
          <motion.div 
            key="cards"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
          >
            {filteredRows.map((row, idx) => (
              <Card key={idx} className="overflow-hidden border-none shadow-sm ring-1 ring-border hover:ring-primary/30 transition-shadow">
                <CardHeader className="bg-muted/30 p-4 border-b">
                  <div className="flex justify-between items-start gap-2">
                    <div className="truncate flex-1">
                      <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
                        {activeSheet.columns[0]}
                      </p>
                      <p className="font-bold text-lg truncate leading-none">
                        {String(row[activeSheet.columns[0]] ?? '-')}
                      </p>
                    </div>
                    <Badge variant="outline" className="font-mono text-[10px]">#{idx + 1}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-4 space-y-4">
                  <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                    {activeSheet.columns.slice(1, 7).map((col) => (
                      <div key={col} className="min-w-0">
                        <Label className="text-[10px] uppercase opacity-50 block mb-1 truncate">{col}</Label>
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium truncate">{String(row[col] ?? '-')}</p>
                          {isPhoneNumber(row[col]) && (
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-7 w-7 rounded-full bg-primary/10 text-primary hover:bg-primary hover:text-white"
                              asChild
                            >
                              <a href={`tel:${String(row[col]).replace(/\s/g, '')}`}>
                                <Phone className="w-3 h-3" />
                              </a>
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {activeSheet.columns.length > 7 && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="w-full justify-between h-8 text-xs text-muted-foreground hover:text-primary">
                          Show all fields
                          <ChevronDown className="w-3 h-3 ml-2" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="w-[300px] max-h-[400px] overflow-y-auto">
                        <DropdownMenuLabel>All Details</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {activeSheet.columns.map(col => (
                          <div key={col} className="px-3 py-2 border-b last:border-0">
                            <Label className="text-[10px] uppercase opacity-50 block">{col}</Label>
                            <span className="text-sm break-words">{String(row[col] ?? '-')}</span>
                          </div>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </CardContent>
              </Card>
            ))}
            {filteredRows.length === 0 && (
              <div className="col-span-full p-20 text-center space-y-3 opacity-40">
                <Search className="w-12 h-12 mx-auto" />
                <p>No results match your search and filters.</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
