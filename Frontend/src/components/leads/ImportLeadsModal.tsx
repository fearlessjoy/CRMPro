import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import * as leadService from "@/services/leadService";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, FileSpreadsheet, Upload, Check, X } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface ImportLeadsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete: () => void;
}

export function ImportLeadsModal({
  open,
  onOpenChange,
  onImportComplete,
}: ImportLeadsModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [csvData, setCsvData] = useState<string[][]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [preview, setPreview] = useState(false);
  const [nameColumn, setNameColumn] = useState<number>(-1);
  const [emailColumn, setEmailColumn] = useState<number>(-1);
  const [phoneColumn, setPhoneColumn] = useState<number>(-1);
  const [addressColumn, setAddressColumn] = useState<number>(-1);
  const [progress, setProgress] = useState(0);

  const { toast } = useToast();
  const { currentUser } = useAuth();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      if (selectedFile.type !== 'text/csv' && !selectedFile.name.endsWith('.csv')) {
        setError("Please upload a CSV file");
        setFile(null);
        return;
      }
      setFile(selectedFile);
      readCSV(selectedFile);
    }
  };

  const readCSV = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        if (!event.target?.result) {
          throw new Error("Failed to read file");
        }
        
        const content = event.target.result as string;
        const rows = parseCSV(content);
        
        if (rows.length === 0) {
          throw new Error("CSV file is empty");
        }
        
        const headerRow = rows[0];
        setHeaders(headerRow);
        setCsvData(rows.slice(1));
        
        // Try to auto-detect columns
        headerRow.forEach((header, index) => {
          const lowerHeader = header.toLowerCase();
          if (lowerHeader.includes('name')) {
            setNameColumn(index);
          } else if (lowerHeader.includes('email')) {
            setEmailColumn(index);
          } else if (lowerHeader.includes('phone')) {
            setPhoneColumn(index);
          } else if (lowerHeader.includes('address') || lowerHeader.includes('location')) {
            setAddressColumn(index);
          }
        });
        
        setPreview(true);
      } catch (error) {
        console.error("Error parsing CSV:", error);
        setError(`Error parsing CSV: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    };
    
    reader.onerror = () => {
      setError("Error reading the file");
    };
    
    reader.readAsText(file);
  };

  const parseCSV = (text: string): string[][] => {
    const rows: string[][] = [];
    const lines = text.split(/\r\n|\n/);
    
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trim() === '') continue;
      
      const row: string[] = [];
      let insideQuotes = false;
      let currentValue = '';
      
      for (let j = 0; j < lines[i].length; j++) {
        const char = lines[i][j];
        
        if (char === '"') {
          insideQuotes = !insideQuotes;
        } else if (char === ',' && !insideQuotes) {
          row.push(currentValue.trim());
          currentValue = '';
        } else {
          currentValue += char;
        }
      }
      
      // Add the last value
      row.push(currentValue.trim());
      rows.push(row);
    }
    
    return rows;
  };

  const processImport = async () => {
    if (
      nameColumn === -1 ||
      emailColumn === -1 ||
      csvData.length === 0
    ) {
      setError("Please specify at least the Name and Email columns");
      return;
    }

    try {
      setIsUploading(true);
      setProgress(10);
      
      const leads = csvData.map(row => {
        // Skip rows that don't have required data
        if (!row[nameColumn] || !row[emailColumn]) {
          return null;
        }
        
        return {
          name: row[nameColumn],
          email: row[emailColumn],
          phone: phoneColumn >= 0 ? row[phoneColumn] : "",
          address: addressColumn >= 0 ? row[addressColumn] : "",
          source: "CSV Import",
          status: 'active' as const,
          createdBy: currentUser?.uid || 'system',
        };
      }).filter(lead => lead !== null);

      if (leads.length === 0) {
        throw new Error("No valid leads found in the CSV");
      }
      
      setProgress(50);
      
      // Import the leads
      const importCount = await leadService.importLeadsFromCSV(leads as any[]);
      
      setProgress(100);
      
      toast({
        title: "Import Successful",
        description: `Successfully imported ${importCount} leads`,
      });
      
      onImportComplete();
      onOpenChange(false);
    } catch (error) {
      console.error("Error importing leads:", error);
      setError(`Error importing leads: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Import Leads from CSV</DialogTitle>
          <DialogDescription>
            Upload a CSV file with lead information. The file should have columns for Name, Email, Phone, and Address.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {!preview ? (
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="csv-file">Select CSV File</Label>
              <div className="border-2 border-dashed rounded-md p-6 text-center">
                <FileSpreadsheet className="mx-auto h-12 w-12 text-muted-foreground" />
                <div className="mt-4 flex text-sm leading-6 text-muted-foreground">
                  <label
                    htmlFor="csv-file"
                    className="relative cursor-pointer rounded-md bg-transparent font-semibold text-primary hover:text-primary/80"
                  >
                    <span>Upload a file</span>
                    <Input
                      id="csv-file"
                      type="file"
                      accept=".csv"
                      className="sr-only"
                      onChange={handleFileChange}
                    />
                  </label>
                  <p className="pl-1">or drag and drop</p>
                </div>
                <p className="text-xs leading-5 text-muted-foreground">
                  CSV file up to 10MB
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 py-4">
            <h3 className="font-medium">CSV Preview</h3>
            
            <div className="grid grid-cols-4 gap-4">
              <div>
                <Label htmlFor="name-column">Name Column</Label>
                <select
                  id="name-column"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={nameColumn}
                  onChange={(e) => setNameColumn(Number(e.target.value))}
                >
                  <option value="-1">Select column</option>
                  {headers.map((header, index) => (
                    <option key={index} value={index}>
                      {header}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <Label htmlFor="email-column">Email Column</Label>
                <select
                  id="email-column"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={emailColumn}
                  onChange={(e) => setEmailColumn(Number(e.target.value))}
                >
                  <option value="-1">Select column</option>
                  {headers.map((header, index) => (
                    <option key={index} value={index}>
                      {header}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <Label htmlFor="phone-column">Phone Column</Label>
                <select
                  id="phone-column"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={phoneColumn}
                  onChange={(e) => setPhoneColumn(Number(e.target.value))}
                >
                  <option value="-1">Select column</option>
                  {headers.map((header, index) => (
                    <option key={index} value={index}>
                      {header}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <Label htmlFor="address-column">Address Column</Label>
                <select
                  id="address-column"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={addressColumn}
                  onChange={(e) => setAddressColumn(Number(e.target.value))}
                >
                  <option value="-1">Select column</option>
                  {headers.map((header, index) => (
                    <option key={index} value={index}>
                      {header}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="border rounded-md overflow-auto max-h-48">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted border-b">
                    {headers.map((header, index) => (
                      <th key={index} className="px-4 py-2 text-left">
                        {header}
                        {index === nameColumn && (
                          <span className="ml-1 text-primary">(Name)</span>
                        )}
                        {index === emailColumn && (
                          <span className="ml-1 text-primary">(Email)</span>
                        )}
                        {index === phoneColumn && (
                          <span className="ml-1 text-primary">(Phone)</span>
                        )}
                        {index === addressColumn && (
                          <span className="ml-1 text-primary">(Address)</span>
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {csvData.slice(0, 5).map((row, rowIndex) => (
                    <tr key={rowIndex} className="border-b">
                      {row.map((cell, cellIndex) => (
                        <td key={cellIndex} className="px-4 py-2">
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                  {csvData.length > 5 && (
                    <tr>
                      <td colSpan={headers.length} className="px-4 py-2 text-center text-muted-foreground">
                        ...and {csvData.length - 5} more rows
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            
            {isUploading && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Importing leads...</span>
                  <span>{progress}%</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          {preview ? (
            <>
              <Button 
                variant="outline" 
                onClick={() => {
                  setPreview(false);
                  setFile(null);
                  setCsvData([]);
                  setHeaders([]);
                }}
              >
                <X className="mr-2 h-4 w-4" />
                Cancel
              </Button>
              <Button 
                onClick={processImport} 
                disabled={isUploading || nameColumn === -1 || emailColumn === -1}
              >
                {isUploading ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Importing...
                  </span>
                ) : (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Import Leads
                  </>
                )}
              </Button>
            </>
          ) : (
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 