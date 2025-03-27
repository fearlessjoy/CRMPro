import * as React from "react";
import { useNavigate } from "react-router-dom";
import { useDebounce } from "@/hooks/useDebounce";
import { SearchResult, globalSearch } from "@/services/searchService";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { FileText, User, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface SearchCommandProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SearchCommand({ open, onOpenChange }: SearchCommandProps) {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = React.useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const [results, setResults] = React.useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [showEmpty, setShowEmpty] = React.useState(false);

  React.useEffect(() => {
    let isMounted = true;

    const performSearch = async () => {
      // Don't show empty state immediately when clearing the search
      if (!debouncedSearchQuery) {
        setResults([]);
        setShowEmpty(false);
        return;
      }

      setIsLoading(true);
      setShowEmpty(false);
      
      try {
        const searchResults = await globalSearch(debouncedSearchQuery);
        if (isMounted) {
          setResults(searchResults);
          // Only show empty state after search is complete
          setShowEmpty(searchResults.length === 0);
        }
      } catch (error) {
        console.error('Error performing search:', error);
        if (isMounted) {
          setResults([]);
          setShowEmpty(true);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    performSearch();

    return () => {
      isMounted = false;
    };
  }, [debouncedSearchQuery]);

  // Reset state when dialog closes
  React.useEffect(() => {
    if (!open) {
      setSearchQuery("");
      setResults([]);
      setShowEmpty(false);
      setIsLoading(false);
    }
  }, [open]);

  const handleSelect = React.useCallback((result: SearchResult) => {
    navigate(result.link);
    onOpenChange(false);
  }, [navigate, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0">
        <Command className="rounded-lg border shadow-md">
          <CommandInput
            placeholder="Search leads, invoices..."
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          <CommandList>
            {isLoading ? (
              <div className="py-6 text-center text-sm">
                <Loader2 className="mx-auto h-4 w-4 animate-spin" />
                <p className="mt-2 text-muted-foreground">Searching...</p>
              </div>
            ) : showEmpty ? (
              <CommandEmpty>No results found.</CommandEmpty>
            ) : results.length > 0 ? (
              <>
                <CommandGroup heading="Leads">
                  {results
                    .filter(result => result.type === 'lead')
                    .map(result => (
                      <CommandItem
                        key={result.id}
                        onSelect={() => handleSelect(result)}
                        className="flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          <div>
                            <p>{result.title}</p>
                            <p className="text-sm text-muted-foreground">
                              {result.subtitle}
                            </p>
                          </div>
                        </div>
                        {result.status && (
                          <Badge variant="outline" className="ml-2">
                            {result.status}
                          </Badge>
                        )}
                      </CommandItem>
                    ))}
                </CommandGroup>

                <CommandGroup heading="Invoices">
                  {results
                    .filter(result => result.type === 'invoice')
                    .map(result => (
                      <CommandItem
                        key={result.id}
                        onSelect={() => handleSelect(result)}
                        className="flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          <div>
                            <p>{result.title}</p>
                            <p className="text-sm text-muted-foreground">
                              {result.subtitle}
                            </p>
                          </div>
                        </div>
                        {result.status && (
                          <Badge variant="outline" className="ml-2">
                            {result.status}
                          </Badge>
                        )}
                      </CommandItem>
                    ))}
                </CommandGroup>
              </>
            ) : null}
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
} 