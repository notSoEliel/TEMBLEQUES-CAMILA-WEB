import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "./button";
import { cn } from "@/lib/utils";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  limit: number;
  onLimitChange?: (limit: number) => void;
  totalResults?: number;
  className?: string;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  limit,
  onLimitChange,
  totalResults,
  className,
}) => {
  // Always show pagination if onLimitChange is provided, to allow changing the limit
  if (totalPages <= 1 && !onLimitChange) return null;

  const renderPageButtons = () => {
    const buttons = [];
    const maxVisible = 5;
    
    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);
    
    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }

    for (let i = start; i <= end; i++) {
      buttons.push(
        <Button
          key={i}
          variant={currentPage === i ? "default" : "outline"}
          size="sm"
          onClick={() => onPageChange(i)}
          className={cn(
            "w-9 h-9 font-medium transition-all duration-200",
            currentPage === i 
              ? "bg-primary text-primary-foreground shadow-sm" 
              : "hover:bg-muted"
          )}
        >
          {i}
        </Button>
      );
    }
    return buttons;
  };

  return (
    <div className={cn("flex flex-col sm:flex-row items-center justify-between gap-4 mt-8 py-4 border-t", className)}>
      <div className="flex items-center gap-4 order-2 sm:order-1">
        {onLimitChange && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground whitespace-nowrap">Ver:</span>
            <select
              value={limit}
              onChange={(e) => onLimitChange(Number(e.target.value))}
              className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              {[5, 10, 15, 20, 50].map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
          </div>
        )}
        {totalResults !== undefined && (
          <span className="text-sm text-muted-foreground whitespace-nowrap">
            Total: <span className="font-semibold text-foreground">{totalResults}</span>
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 order-1 sm:order-2">
        <Button
          variant="outline"
          size="icon"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className="h-9 w-9"
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>

        <div className="flex items-center gap-1">
          {totalPages > 0 ? renderPageButtons() : <span className="text-sm px-2">1</span>}
        </div>

        <Button
          variant="outline"
          size="icon"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages || totalPages === 0}
          className="h-9 w-9"
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};
