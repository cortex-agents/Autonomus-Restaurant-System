import * as React from "react";
import { Input } from "@/components/ui/input";

interface CategorySelectorProps {
  categories: Array<{ id: string; name: string }>;
  value: string | null;
  onChange: (value: string | null) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

const CategorySelector = ({
  categories,
  value,
  onChange,
  placeholder = "Select category",
  className,
  disabled = false,
}: CategorySelectorProps) => {
  return (
    <div className="relative w-full">
      <label htmlFor="category-select" className="text-sm font-medium text-foreground/80 mb-1">
        Category
      </label>
      <select
        id="category-select"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value || null)}
        className={`
          flex h-10 w-full rounded-md border border-input bg-background
          px-3 py-2 text-sm ring-offset-file placeholder:text-muted-foreground
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
          focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50
          ${className ?? ""}
        `}
        disabled={disabled}
      >
        <option value="" disabled>
          {placeholder}
        </option>
        {categories.map((category) => (
          <option key={category.id} value={category.id}>
            {category.name}
          </option>
        ))}
      </select>
    </div>
  );
};

export default CategorySelector;