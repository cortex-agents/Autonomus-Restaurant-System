'use client'

import { useState } from "react";
import { useMenu } from "@/hooks/useMenu";
import { Button } from "@/components/ui/button";
import MenuItemForm from "@/components/menu/MenuItemForm";
import { ArrowPathIcon, ListBulletIcon } from "@heroicons/react/24/outline";
import { HomeIcon } from "lucide-react";


export default function MenuPage() {
  const {
    menuData: { categories: menuCategories, uncategorized },
    categories: allCategories,
    isLoading,
    error,
    refetch,
    createMenuItem,
    isCreating,
    updateMenuItem,
    isUpdating,
    deleteMenuItem,
    isDeleting,
    toggleItemAvailable,
    isToggling
  } = useMenu();

  const [editingItemId, setEditingItemId] = useState<string | null>(null); // null means creating new item
  const [itemToEdit, setItemToEdit] = useState<any | null>(null); // data to initialize form with

  // Handle creating a new item
  const handleCreate = async (itemData: any) => {
    try {
      await createMenuItem(itemData);
    } catch (err) {
      console.error("Failed to create item:", err);
      // Error handling would be improved in a real implementation
    }
  };

  // Handle updating an item
  const handleUpdate = async (itemData: any) => {
    if (editingItemId) {
      try {
        await updateMenuItem({ id: editingItemId, item: itemData });
      } catch (err) {
        console.error("Failed to update item:", err);
        // Error handling would be improved in a real implementation
      }
    }
  };

  // Handle deleting an item
  const handleDelete = async (id: string) => {
    try {
      await deleteMenuItem(id);
    } catch (err) {
      console.error("Failed to delete item:", err);
      // Error handling would be improved in a real implementation
    }
  };

  // Handle toggling availability
  const handleToggleAvailability = async (id: string, isAvailable: boolean) => {
    try {
      await toggleItemAvailable({ id, isAvailable: !isAvailable });
    } catch (err) {
      console.error("Failed to toggle availability:", err);
      // Error handling would be improved in a real implementation
    }
  };

  // Handle starting edit
  const handleStartEdit = (item: any | null) => {
    if (item === null) {
      // Creating new item
      setEditingItemId(null);
      setItemToEdit(null);
    } else {
      // Editing existing item
      setEditingItemId(item.id);
      setItemToEdit(item);
    }
  };

  // Handle canceling edit
  const handleCancelEdit = () => {
    setEditingItemId(null);
    setItemToEdit(null);
  };

  if (isLoading) {
    return (
      <div className="min-h-[calc(100vh-64px)] py-8">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-primary/20 border-t-primary mb-4"></div>
            <p className={`font-display text-lg font-medium text-foreground mb-2`}>
              Loading menu...
            </p>
            <p className={`font-body text-sm text-muted-foreground`}>
              Fetching your restaurant's menu items
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[calc(100vh-64px)] py-8">
        <div className="max-w-7xl mx-auto px-4">
          <div className="p-6 bg-destructive/5 border border-destructive/25 text-destructive rounded-xl">
            <p className={`font-body font-medium`}>
              Error loading menu: {error instanceof Error ? error.message : String(error)}
            </p>
            <div className="mt-4 flex justify-center">
              <Button onClick={() => refetch()} className="px-4 py-2">
                Retry
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Calculate menu stats
  const totalMenuItems = menuCategories.reduce((sum, cat) => 
    sum + (cat.items?.length || 0), 0
  ) + (uncategorized?.length || 0);
  
  const availableMenuItems = menuCategories.reduce((sum, cat) => 
    sum + (cat.items?.filter(item => item.is_available).length || 0), 0
  ) + (uncategorized?.filter(item => item.is_available).length || 0);

  return (
    <div className="min-h-[calc(100vh-64px)] bg-background">
      {/* Header */}
      <div className="bg-card shadow-sm border-b border-border">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h1 className="font-display text-2xl font-bold text-foreground">
                Menu Management
              </h1>
              <p className="font-body mt-1 text-sm text-muted-foreground">
                {totalMenuItems} total items • {availableMenuItems} available
              </p>
            </div>
            <Button
              variant="default"
              onClick={() => {
                setEditingItemId(null);
                setItemToEdit(null);
              }}
              className="hover:bg-accent/5"
            >
              <ArrowPathIcon className="h-4 w-4 mr-2" />
              <span className="font-body">Add Item</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Menu Stats */}
      <div className="px-6 py-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-3 gap-6 mb-6">
            <div className="bg-card rounded-xl p-6 shadow-sm border border-border">
              <div className="flex items-center justify-between mb-3">
                <div className="flex-1 space-y-1">
                  <p className="font-body text-sm font-medium text-muted-foreground">
                    Total Items
                  </p>
                  <p className="font-display text-2xl font-bold text-foreground">
                    {totalMenuItems}
                  </p>
                </div>
                <div className="w-10 h-10 bg-primary/10 rounded flex items-center justify-center">
                  <HomeIcon className="h-5 w-5 text-primary" />
                </div>
              </div>
            </div>
            
            <div className="bg-card rounded-xl p-6 shadow-sm border border-border">
              <div className="flex items-center justify-between mb-3">
                <div className="flex-1 space-y-1">
                  <p className="font-body text-sm font-medium text-muted-foreground">
                    Available Items
                  </p>
                  <p className="font-display text-2xl font-bold text-foreground">
                    {availableMenuItems}
                  </p>
                </div>
                <div className="w-10 h-10 bg-success/10 rounded flex items-center justify-center">
                  <HomeIcon className="h-5 w-5 text-success" />
                </div>
              </div>
            </div>
            
            <div className="bg-card rounded-xl p-6 shadow-sm border border-border">
              <div className="flex items-center justify-between mb-3">
                <div className="flex-1 space-y-1">
                  <p className="font-body text-sm font-medium text-muted-foreground">
                    Categories
                  </p>
                  <p className="font-display text-2xl font-bold text-foreground">
                    {allCategories.length}
                  </p>
                </div>
                <div className="w-10 h-10 bg-accent/10 rounded flex items-center justify-center">
                  <ListBulletIcon className="h-5 w-5 text-accent" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-6 pb-8">
        <div className="max-w-7xl mx-auto">
          {/* Edit/Create Form */}
          {editingItemId !== null && (
            <div className="bg-card rounded-xl p-6 shadow-md mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display text-xl font-bold text-foreground">
                  {editingItemId ? 'Edit Menu Item' : 'Add New Item'}
                </h2>
                <Button
                  variant="outline"
                  onClick={handleCancelEdit}
                  className="hover:bg-accent/5"
                >
                  <ArrowPathIcon className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              </div>

              <MenuItemForm
                item={itemToEdit}
                onSave={editingItemId !== null ? handleUpdate : handleCreate}
                onCancel={handleCancelEdit}
                categories={allCategories.map((cat: any) => ({
                  id: cat.id,
                  name: cat.name
                }))}
                isSaving={editingItemId !== null ? isUpdating : isCreating}
              />
            </div>
          )}

          {/* Menu Categories */}
          <div className="space-y-6">
            {menuCategories.map((category: any) => (
              <div key={category.id} className="border rounded-xl p-6 bg-card shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-display text-lg font-medium text-foreground">
                    {category.name}
                  </h3>
                  <div className="flex items-center space-x-3">
                    <p className="font-body text-sm font-medium text-muted-foreground">
                      {category.items?.length || 0} items
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        // Start creating new item in this category
                        handleStartEdit(null);
                        // Set temporary item data with pre-filled category_id
                        setItemToEdit({
                          id: `new-${Date.now()}`, // Temporary ID
                          name: "",
                          description: null,
                          base_price: 0,
                          category_id: category.id, // Pre-filled category
                          is_available: true,
                          variants: [{ name: "", price_delta: 0 }],
                          addons: [{ name: "", price: 0 }],
                          created_at: new Date().toISOString()
                        });
                      }}
                      disabled={isCreating || isUpdating}
                    >
                      + Add Item
                    </Button>
                  </div>
                </div>

                {category.items && category.items.length > 0 ? (
                  <div className="space-y-4">
                    {category.items.map((item: any) => (
                      <div key={item.id} className="border-t pt-4">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h4 className="font-display text-base font-medium text-foreground">
                              {item.name}
                            </h4>
                            {item.description && (
                              <p className="font-body text-sm text-muted-foreground mt-1">
                                {item.description}
                              </p>
                            )}
                            <div className="mt-2 space-y-1">
                              {item.variants && item.variants.length > 0 && (
                                <>
                                  <h5 className="font-body text-xs font-medium text-muted-foreground mb-1">
                                    Variants:
                                  </h5>
                                  <div className="text-sm space-y-0.5">
                                    {item.variants.map((variant: any) => (
                                      <div key={`${item.id}-variant-${variant.name}`} className="flex justify-between">
                                        <span className="font-body">{variant.name}</span>
                                        <span className="font-body">
                                          ₨{variant.price_delta >= 0 ? '+' : ''}{variant.price_delta}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                          <div className="ml-4 flex flex-col items-end space-x-3">
                            <div className="flex items-center space-x-3">
                              <span className="font-body text-sm font-medium text-muted-foreground">
                                Available:
                              </span>
                              <button
                                onClick={() => handleToggleAvailability(item.id, item.is_available)}
                                disabled={isToggling || isUpdating || isCreating}
                                className={`h-4 w-4 rounded-full ${
                                  item.is_available
                                    ? "bg-primary"
                                    : "bg-muted"
                                }`}
                              />
                            </div>
                            <div className="flex items-center space-x-2 mt-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleStartEdit(item)}
                                disabled={isCreating || isUpdating}
                              >
                                Edit
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleDelete(item.id)}
                                disabled={isDeleting || isCreating || isUpdating}
                              >
                                Delete
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center py-4 text-muted-foreground">
                    No items in this category yet
                  </p>
                )}
              </div>
            ))}
            
            {/* Uncategorized Items */}
            {uncategorized && uncategorized.length > 0 && (
              <div className="border rounded-xl p-6 bg-card shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-display text-lg font-medium text-foreground">
                    Uncategorized Items
                  </h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      handleStartEdit(null);
                      setItemToEdit({
                        id: `new-${Date.now()}`,
                        name: "",
                        description: null,
                        base_price: 0,
                        category_id: null,
                        is_available: true,
                        variants: [{ name: "", price_delta: 0 }],
                        addons: [{ name: "", price: 0 }],
                        created_at: new Date().toISOString()
                      });
                    }}
                    disabled={isCreating || isUpdating}
                  >
                    + Add Item
                  </Button>
                </div>

                {uncategorized.length > 0 ? (
                  <div className="space-y-4">
                    {uncategorized.map((item: any) => (
                      <div key={item.id} className="border-t pt-4">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h4 className="font-display text-base font-medium text-foreground">
                              {item.name}
                            </h4>
                            {item.description && (
                              <p className="font-body text-sm text-muted-foreground mt-1">
                                {item.description}
                              </p>
                            )}
                            <div className="mt-2 space-y-1">
                              {item.variants && item.variants.length > 0 && (
                                <>
                                  <h5 className="font-body text-xs font-medium text-muted-foreground mb-1">
                                    Variants:
                                  </h5>
                                  <div className="text-sm space-y-0.5">
                                    {item.variants.map((variant: any) => (
                                      <div key={`${item.id}-variant-${variant.name}`} className="flex justify-between">
                                        <span className="font-body">{variant.name}</span>
                                        <span className="font-body">
                                          ₨{variant.price_delta >= 0 ? '+' : ''}{variant.price_delta}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                          <div className="ml-4 flex flex-col items-end space-x-3">
                            <div className="flex items-center space-x-3">
                              <span className="font-body text-sm font-medium text-muted-foreground">
                                Available:
                              </span>
                              <button
                                onClick={() => handleToggleAvailability(item.id, item.is_available)}
                                disabled={isToggling || isUpdating || isCreating}
                                className={`h-4 w-4 rounded-full ${
                                  item.is_available
                                    ? "bg-primary"
                                    : "bg-muted"
                                }`}
                              />
                            </div>
                            <div className="flex items-center space-x-2 mt-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleStartEdit(item)}
                                disabled={isCreating || isUpdating}
                              >
                                Edit
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleDelete(item.id)}
                                disabled={isDeleting || isCreating || isUpdating}
                              >
                                Delete
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center py-4 text-muted-foreground">
                    No uncategorized items yet
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
