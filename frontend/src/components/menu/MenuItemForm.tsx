import * as React from "react";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import CategorySelector from "@/components/menu/CategorySelector";
import AvailabilityToggle from "@/components/menu/AvailabilityToggle";
import { formatCurrency } from "@/lib/format";

interface MenuItemFormProps {
  item: any | null; // MenuItem type or null for new item
  onSave: (item: any) => Promise<void>;
  onCancel: () => void;
  categories: Array<{ id: string; name: string }>;
  isSaving: boolean;
}

const MenuItemForm = ({
  item,
  onSave,
  onCancel,
  categories,
  isSaving,
}: MenuItemFormProps) => {
  const isEditMode = !!item;
  const [name, setName] = useState(item?.name ?? "");
  const [description, setDescription] = useState(item?.description ?? "");
  const [basePrice, setBasePrice] = useState(item?.base_price ?? "");
  const [categoryId, setCategoryId] = useState(item?.category_id ?? null);
  const [isAvailable, setIsAvailable] = useState(item?.is_available ?? true);
  const [variants, setVariants] = useState<Array<{ name: string; price_delta: string }>>(
    item?.variants?.map((v: any) => ({ name: v.name, price_delta: String(v.price_delta) })) ?? [{ name: "", price_delta: "" }]
  );
  const [addons, setAddons] = useState<Array<{ name: string; price: string }>>(
    item?.addons?.map((a: any) => ({ name: a.name, price: String(a.price) })) ?? [{ name: "", price: "" }]
  );

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate form
    if (!name.trim()) {
      alert("Please enter a name");
      return;
    }

    if (!basePrice.trim() || parseFloat(basePrice) < 0) {
      alert("Please enter a valid price");
      return;
    }

    // Prepare item data
    const itemData = {
      name: name.trim(),
      description: description.trim() || null,
      base_price: parseFloat(basePrice),
      category_id: categoryId || null,
      is_available: isAvailable,
      variants: variants
        .filter((v) => v.name.trim() !== "")
        .map((v) => ({ name: v.name.trim(), price_delta: parseFloat(v.price_delta) || 0 })),
      addons: addons
        .filter((a) => a.name.trim() !== "")
        .map((a) => ({ name: a.name.trim(), price: parseFloat(a.price) || 0 })),
    };

    try {
      await onSave(itemData);
      onCancel(); // Close form
    } catch (err) {
      alert(`Failed to save item: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
  };

  // Handle adding variant
  const addVariant = () => {
    setVariants([...variants, { name: "", price_delta: "" }]);
  };

  // Handle removing variant
  const removeVariant = (index: number) => {
    if (variants.length <= 1) {
      alert("At least one variant is required");
      return;
    }
    setVariants(variants.filter((_, i) => i !== index));
  };

  // Handle adding addon
  const addAddon = () => {
    setAddons([...addons, { name: "", price: "" }]);
  };

  // Handle removing addon
  const removeAddon = (index: number) => {
    if (addons.length <= 1) {
      alert("At least one addon is required");
      return;
    }
    setAddons(addons.filter((_, i) => i !== index));
  };

  return (
    <form onSubmit={handleSave} className="space-y-6">
      <div className="space-y-4">
        <div>
          <label htmlFor="name" className="text-sm font-medium text-foreground/80 mb-1">
            Item Name
          </label>
          <Input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter item name"
            required
            className="w-full"
          />
        </div>

        <div>
          <label htmlFor="description" className="text-sm font-medium text-foreground/80 mb-1">
            Description (optional)
          </label>
          <Input
            id="description"
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Enter description"
            className="w-full"
          />
        </div>

        <div>
          <label htmlFor="base-price" className="text-sm font-medium text-foreground/80 mb-1">
            Base Price (PKR)
          </label>
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-foreground/80">₨</span>
            <Input
              id="base-price"
              type="number"
              value={basePrice}
              onChange={(e) => setBasePrice(e.target.value)}
              placeholder="0.00"
              min="0"
              step="0.01"
              className="w-24"
            />
          </div>
        </div>

        <div>
          <CategorySelector
            categories={categories}
            value={categoryId}
            onChange={setCategoryId}
            placeholder="Select category (optional)"
            disabled={isSaving}
          />
        </div>

        <div className="border-t border-border pt-4">
          <AvailabilityToggle
            itemId={item?.id ?? "new-item"}
            isAvailable={isAvailable}
            disabled={isSaving}
          />
        </div>

        {/* Variants Section */}
        <div className="border-t border-border pt-4">
          <h3 className="text-sm font-medium text-foreground/80 mb-3">
            Variants
          </h3>
          <div className="space-y-2">
            {variants.map((variant, index) => (
              <div key={index} className="flex items-center space-x-3">
                <Input
                  type="text"
                  value={variant.name}
                  onChange={(e) => {
                    const newVariants = [...variants];
                    newVariants[index] = { ...newVariants[index], name: e.target.value };
                    setVariants(newVariants);
                  }}
                  placeholder="Variant name (e.g., Large, Medium)"
                  className="flex-1"
                />
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-muted-foreground">+ ₨</span>
                  <Input
                    type="number"
                    value={variant.price_delta}
                    onChange={(e) => {
                      const newVariants = [...variants];
                      newVariants[index] = { ...newVariants[index], price_delta: e.target.value };
                      setVariants(newVariants);
                    }}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    className="w-20"
                  />
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => removeVariant(index)}
                  disabled={isSaving}
                >
                  Remove
                </Button>
              </div>
            ))}
            <div className="mt-3">
              <Button
                variant="outline"
                size="sm"
                onClick={addVariant}
                disabled={isSaving}
              >
                Add Variant
              </Button>
            </div>
          </div>
        </div>

        {/* Addons Section */}
        <div className="border-t border-border pt-4">
          <h3 className="text-sm font-medium text-foreground/80 mb-3">
            Add-ons
          </h3>
          <div className="space-y-2">
            {addons.map((addon, index) => (
              <div key={index} className="flex items-center space-x-3">
                <Input
                  type="text"
                  value={addon.name}
                  onChange={(e) => {
                    const newAddons = [...addons];
                    newAddons[index] = { ...newAddons[index], name: e.target.value };
                    setAddons(newAddons);
                  }}
                  placeholder="Add-on name (e.g., Extra Cheese)"
                  className="flex-1"
                />
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-muted-foreground">+ ₨</span>
                  <Input
                    type="number"
                    value={addon.price}
                    onChange={(e) => {
                      const newAddons = [...addons];
                      newAddons[index] = { ...newAddons[index], price: e.target.value };
                      setAddons(newAddons);
                    }}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    className="w-20"
                  />
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => removeAddon(index)}
                  disabled={isSaving}
                >
                  Remove
                </Button>
              </div>
            ))}
            <div className="mt-3">
              <Button
                variant="outline"
                size="sm"
                onClick={addAddon}
                disabled={isSaving}
              >
                Add Addon
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 flex justify-end space-x-3">
        <Button
          variant="outline"
          onClick={onCancel}
          disabled={isSaving}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isSaving}
        >
          {isSaving ? "Saving..." : isEditMode ? "Update Item" : "Add Item"}
        </Button>
      </div>
    </form>
  );
};

export default MenuItemForm;