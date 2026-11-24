import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const Pagination = ({ className, ...props }) => (
  <nav
    role="navigation"
    aria-label="pagination"
    className={cn("mx-auto flex w-full justify-center", className)}
    {...props}
  />
);

const PaginationContent = React.forwardRef(({ className, ...props }, ref) => (
  <ul ref={ref} className={cn("flex flex-row items-center gap-1", className)} {...props} />
));
PaginationContent.displayName = "PaginationContent";

const PaginationItem = React.forwardRef(({ className, ...props }, ref) => (
  <li ref={ref} className={cn("", className)} {...props} />
));
PaginationItem.displayName = "PaginationItem";

const PaginationLink = ({ className, isActive, ...props }) => (
  <Button
    variant={isActive ? "default" : "outline"}
    size="icon"
    className={cn("h-8 w-8", className)}
    type="button"
    {...props}
  />
);

const PaginationPrevious = ({ className, ...props }) => (
  <Button variant="outline" size="icon" className={cn("h-8 w-8", className)} type="button" {...props}>
    <ChevronLeft className="h-4 w-4" />
  </Button>
);

const PaginationNext = ({ className, ...props }) => (
  <Button variant="outline" size="icon" className={cn("h-8 w-8", className)} type="button" {...props}>
    <ChevronRight className="h-4 w-4" />
  </Button>
);

export {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext
};
