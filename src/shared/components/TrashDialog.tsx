import { useState, useEffect } from "react";
import { Search, Filter, Trash2, Archive, MoreHorizontal, X, ChevronRight, Folder, RotateCcw, MessageSquare } from "lucide-react";
import { Dialog, DialogContent, DialogHeader } from "@/shared/components/ui/dialog";
import { Input } from "@/shared/components/ui/input";
import { Button } from "@/shared/components/ui/button";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { Avatar, AvatarFallback } from "@/shared/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/shared/components/ui/tabs";
// import { supabase } from "@/integrations/supabase/client";
import { useTestUser } from "@/contexts/TestUserContext";
import { format } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";

interface DeletedItem {
  id: string;
  name: string;
  type: string;
  deletedFrom: string[];
  deletedBy: {
    name: string;
    initials: string;
  };
  deletedDate: string;
  originalData?: any;
}

interface DeletedUpdate {
  id: string;
  text: string;
  item_id: string;
  test_user_id: string;
  timestamp: string;
  updated_at: string;
  deleted_at?: string;
}

interface TrashDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TrashDialog({ open, onOpenChange }: TrashDialogProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedItems, setSelectedItems] = useState<Record<string, boolean>>({});
  const [deletedItems, setDeletedItems] = useState<DeletedItem[]>([]);
  const [archivedItems, setArchivedItems] = useState<DeletedItem[]>([]);
  const [deletedUpdates, setDeletedUpdates] = useState<DeletedUpdate[]>([]);
  const { currentUser } = useTestUser();

  // Load deleted updates and items from database
  useEffect(() => {
    const loadDeletedData = async () => {
      // if (!open) return;

      // try {
      //   // Load deleted updates
      //   const { data: updatesData, error: updatesError } = await supabase
      //     .from('updates')
      //     .select('*')
      //     .eq('deleted', true)
      //     .order('updated_at', { ascending: false });

      //   if (updatesError) throw updatesError;
      //   setDeletedUpdates(updatesData || []);

      //   // Load deleted items
      //   const { data: itemsData, error: itemsError } = await supabase
      //     .from('items')
      //     .select('*, groups(name, board_id, boards(name))')
      //     .eq('deleted', true)
      //     .order('updated_at', { ascending: false });

      //   if (itemsError) throw itemsError;

      //   // Format deleted items for display
      //   const formattedItems: DeletedItem[] = (itemsData || []).map((item: any) => ({
      //     id: item.id,
      //     name: item.name,
      //     type: item.parent_item_id ? "Subitem" : "Item",
      //     deletedFrom: [item.groups?.boards?.name || 'Unknown Board', item.groups?.name || 'Unknown Group'],
      //     deletedBy: { name: currentUser.name, initials: currentUser.name.split(' ').map(n => n[0]).join('') },
      //     deletedDate: format(new Date(item.updated_at), 'MMM d, yyyy'),
      //     originalData: item,
      //   }));

      //   setDeletedItems(formattedItems);
      // } catch (error) {
      //   console.error('Error loading deleted data:', error);
      // }
    };

    loadDeletedData();
  }, [open, currentUser]);

  const filteredItems = deletedItems.filter((item) => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    
    return (
      item.name.toLowerCase().includes(query) ||
      item.type.toLowerCase().includes(query) ||
      item.deletedFrom.some(location => location.toLowerCase().includes(query))
    );
  });

  const filteredArchivedItems = archivedItems.filter((item) => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    
    return (
      item.name.toLowerCase().includes(query) ||
      item.type.toLowerCase().includes(query) ||
      item.deletedFrom.some(location => location.toLowerCase().includes(query))
    );
  });

  const filteredUpdates = deletedUpdates.filter((update) => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = update.text;
    const textContent = tempDiv.textContent || tempDiv.innerText || "";
    
    return textContent.toLowerCase().includes(query);
  });

  const handleRestore = async () => {
    // const selectedItemIds = Object.keys(selectedItems).filter(id => selectedItems[id]);
    // if (selectedItemIds.length === 0) return;

    // try {
    //   // Check if any selected items are updates
    //   const updateIds = selectedItemIds.filter(id => deletedUpdates.some(u => u.id === id));
      
    //   if (updateIds.length > 0) {
    //     // Restore updates
    //     const { error } = await supabase
    //       .from('updates')
    //       .update({ deleted: false })
    //       .in('id', updateIds);

    //     if (error) throw error;

    //     // Remove from local state
    //     setDeletedUpdates(prev => prev.filter(u => !updateIds.includes(u.id)));
    //   }

    //   // Check if any selected items are board items
    //   const itemIds = selectedItemIds.filter(id => deletedItems.some(i => i.id === id));
      
    //   if (itemIds.length > 0) {
    //     // Restore items
    //     const { error } = await supabase
    //       .from('items')
    //       .update({ deleted: false })
    //       .in('id', itemIds);

    //     if (error) throw error;

    //     // Remove from local state
    //     setDeletedItems(prev => prev.filter(i => !itemIds.includes(i.id)));
    //   }

    //   // Remove archived items if any
    //   const remainingArchived = archivedItems.filter(item => !selectedItemIds.includes(item.id));
    //   setArchivedItems(remainingArchived);
    //   localStorage.setItem('archived-items', JSON.stringify(remainingArchived));
    
    //   setSelectedItems({});
    
    //   window.dispatchEvent(new CustomEvent('updates-restored'));
    // } catch (error) {
    //   console.error('Error restoring items:', error);
    // }
  };

  const handleDeletePermanently = async () => {
    // const selectedItemIds = Object.keys(selectedItems).filter(id => selectedItems[id]);
    // if (selectedItemIds.length === 0) return;

    // try {
    //   // Check if any selected items are updates
    //   const updateIds = selectedItemIds.filter(id => deletedUpdates.some(u => u.id === id));
      
    //   if (updateIds.length > 0) {
    //     // Permanently delete updates
    //     const { error } = await supabase
    //       .from('updates')
    //       .delete()
    //       .in('id', updateIds);

    //     if (error) throw error;

    //     // Remove from local state
    //     setDeletedUpdates(prev => prev.filter(u => !updateIds.includes(u.id)));
    //   }

    //   // Check if any selected items are board items
    //   const itemIds = selectedItemIds.filter(id => deletedItems.some(i => i.id === id));
      
    //   if (itemIds.length > 0) {
    //     // Permanently delete items
    //     const { error } = await supabase
    //       .from('items')
    //       .delete()
    //       .in('id', itemIds);

    //     if (error) throw error;

    //     // Remove from local state
    //     setDeletedItems(prev => prev.filter(i => !itemIds.includes(i.id)));
    //   }

    //   // Remove archived items permanently
    //   const remainingArchived = archivedItems.filter(item => !selectedItemIds.includes(item.id));
    //   setArchivedItems(remainingArchived);
    //   localStorage.setItem('archived-items', JSON.stringify(remainingArchived));
    
    //   setSelectedItems({});
    // } catch (error) {
    //   console.error('Error deleting items permanently:', error);
    // }
  };

  const selectedCount = Object.values(selectedItems).filter(Boolean).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[1400px] h-[90vh] p-0 gap-0">
        <DialogHeader className="px-8 py-6 border-b border-border">
          <div>
            <h2 className="text-3xl font-bold mb-2">Trash</h2>
            <p className="text-sm text-muted-foreground">
              This is your account trash for deleted workspaces, boards, docs, dashboards, items and columns.
              <br />
              After 30 days from the deletion date it will be deleted permanently and will no longer be accessible.{" "}
              <a href="#" className="text-primary hover:underline">Learn more</a>
            </p>
          </div>
        </DialogHeader>

        <Tabs defaultValue="trash" className="flex-1 flex flex-col">
          <div className="px-8 border-b border-border">
            <TabsList className="bg-transparent p-0 h-12">
              <TabsTrigger
                value="trash"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Trash
              </TabsTrigger>
              <TabsTrigger
                value="archive"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
              >
                <Archive className="h-4 w-4 mr-2" />
                Archive
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="trash" className="flex-1 flex flex-col m-0 p-0">
            <div className="px-8 py-4 border-b border-border">
              <div className="flex items-center gap-4">
                <div className="relative flex-1 max-w-xs">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 bg-muted/50 border-border"
                  />
                </div>
                <Button variant="outline" size="sm">
                  <Filter className="h-4 w-4 mr-2" />
                  Filters
                </Button>
              </div>
            </div>

            <div className="flex-1 overflow-auto">
              <table className="w-full">
                <thead className="sticky top-0 bg-card border-b border-border">
                  <tr>
                    <th className="text-left p-4 font-medium text-sm text-muted-foreground w-12">
                      <Checkbox />
                    </th>
                    <th className="text-left p-4 font-medium text-sm text-muted-foreground">Name</th>
                    <th className="text-left p-4 font-medium text-sm text-muted-foreground w-32">Type</th>
                    <th className="text-left p-4 font-medium text-sm text-muted-foreground">Deleted from</th>
                    <th className="text-left p-4 font-medium text-sm text-muted-foreground w-48">Deleted by</th>
                    <th className="text-left p-4 font-medium text-sm text-muted-foreground w-32">Date</th>
                    <th className="text-left p-4 font-medium text-sm text-muted-foreground w-20">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.length === 0 && filteredUpdates.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-muted-foreground">
                        {searchQuery ? `No items found matching "${searchQuery}"` : "No deleted items"}
                      </td>
                    </tr>
                  ) : (
                    <>
                      {filteredItems.map((item) => (
                        <tr key={item.id} className="border-b border-border hover:bg-hover/50">
                          <td className="p-4">
                            <Checkbox
                              checked={selectedItems[item.id] || false}
                              onCheckedChange={(checked) =>
                                setSelectedItems((prev) => ({ ...prev, [item.id]: checked as boolean }))
                              }
                            />
                          </td>
                          <td className="p-4">
                            <span className="font-medium">{item.name}</span>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Folder className="h-4 w-4" />
                              <span className="text-sm">{item.type}</span>
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              {item.deletedFrom.map((location, idx) => (
                                <div key={idx} className="flex items-center gap-1">
                                  {idx > 0 && <ChevronRight className="h-3 w-3" />}
                                  <span>{location}</span>
                                </div>
                              ))}
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <Avatar className="h-6 w-6">
                                <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                                  {item.deletedBy.initials}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-sm">{item.deletedBy.name}</span>
                            </div>
                          </td>
                          <td className="p-4">
                            <span className="text-sm text-muted-foreground">{item.deletedDate}</span>
                          </td>
                          <td className="p-4">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem>Restore</DropdownMenuItem>
                                <DropdownMenuItem className="text-destructive">
                                  Delete Permanently
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                        </tr>
                      ))}
                      {filteredUpdates.map((update) => {
                        const tempDiv = document.createElement("div");
                        tempDiv.innerHTML = update.text;
                        const textContent = tempDiv.textContent || tempDiv.innerText || "";
                        const preview = textContent.length > 60 ? textContent.substring(0, 60) + "..." : textContent;
                        
                        return (
                          <tr key={update.id} className="border-b border-border hover:bg-hover/50">
                            <td className="p-4">
                              <Checkbox
                                checked={selectedItems[update.id] || false}
                                onCheckedChange={(checked) =>
                                  setSelectedItems((prev) => ({ ...prev, [update.id]: checked as boolean }))
                                }
                              />
                            </td>
                            <td className="p-4">
                              <span className="font-medium">{preview}</span>
                            </td>
                            <td className="p-4">
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <MessageSquare className="h-4 w-4" />
                                <span className="text-sm">Update</span>
                              </div>
                            </td>
                            <td className="p-4">
                              <span className="text-sm text-muted-foreground">Board item</span>
                            </td>
                            <td className="p-4">
                              <div className="flex items-center gap-2">
                                <Avatar className="h-6 w-6">
                                  <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                                    {currentUser.name.split(' ').map(n => n[0]).join('')}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="text-sm">{currentUser.name}</span>
                              </div>
                            </td>
                            <td className="p-4">
                              <span className="text-sm text-muted-foreground">
                                {format(new Date(update.updated_at), 'MMM d, yyyy')}
                              </span>
                            </td>
                            <td className="p-4">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={async () => {
                                    try {
                                      // const { error } = await supabase
                                      //   .from('updates')
                                      //   .update({ deleted: false })
                                      //   .eq('id', update.id);
                                      
                                      // if (error) throw error;
                                      
                                      // setDeletedUpdates(prev => prev.filter(u => u.id !== update.id));
                                      // setSelectedItems(prev => {
                                      //   const updated = { ...prev };
                                      //   delete updated[update.id];
                                      //   return updated;
                                      // });
                                      window.dispatchEvent(new CustomEvent('updates-restored'));
                                    } catch (error) {
                                      console.error('Error restoring update:', error);
                                    }
                                  }}>
                                    <RotateCcw className="h-4 w-4 mr-2" />
                                    Restore
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    className="text-destructive"
                                    onClick={async () => {
                                      try {
                                        // const { error } = await supabase
                                        //   .from('updates')
                                        //   .delete()
                                        //   .eq('id', update.id);
                                        
                                        // if (error) throw error;
                                        
                                        // setDeletedUpdates(prev => prev.filter(u => u.id !== update.id));
                                        // setSelectedItems(prev => {
                                        //   const updated = { ...prev };
                                        //   delete updated[update.id];
                                        //   return updated;
                                        // });
                                      } catch (error) {
                                        console.error('Error deleting update:', error);
                                      }
                                    }}
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete Permanently
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </td>
                          </tr>
                        );
                      })}
                    </>
                  )}
                </tbody>
              </table>
            </div>
          </TabsContent>

          <TabsContent value="archive" className="flex-1 flex flex-col m-0 p-0">
            <div className="flex-1 overflow-auto">
              {filteredArchivedItems.length === 0 ? (
                <div className="flex-1 flex items-center justify-center py-12">
                  <div className="text-center">
                    <Archive className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-xl font-semibold mb-2">No archived items</h3>
                    <p className="text-muted-foreground">Archived items will appear here</p>
                  </div>
                </div>
              ) : (
                <table className="w-full">
                  <thead className="sticky top-0 bg-card border-b border-border">
                    <tr>
                      <th className="text-left p-4 font-medium text-sm text-muted-foreground w-12">
                        <Checkbox />
                      </th>
                      <th className="text-left p-4 font-medium text-sm text-muted-foreground">Name</th>
                      <th className="text-left p-4 font-medium text-sm text-muted-foreground w-32">Type</th>
                      <th className="text-left p-4 font-medium text-sm text-muted-foreground">Archived from</th>
                      <th className="text-left p-4 font-medium text-sm text-muted-foreground w-48">Archived by</th>
                      <th className="text-left p-4 font-medium text-sm text-muted-foreground w-32">Date</th>
                      <th className="text-left p-4 font-medium text-sm text-muted-foreground w-20">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredArchivedItems.map((item) => (
                      <tr key={item.id} className="border-b border-border hover:bg-hover/50">
                        <td className="p-4">
                          <Checkbox
                            checked={selectedItems[item.id] || false}
                            onCheckedChange={(checked) =>
                              setSelectedItems((prev) => ({ ...prev, [item.id]: checked as boolean }))
                            }
                          />
                        </td>
                        <td className="p-4">
                          <span className="font-medium">{item.name}</span>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Folder className="h-4 w-4" />
                            <span className="text-sm">{item.type}</span>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            {item.deletedFrom.map((location, idx) => (
                              <div key={idx} className="flex items-center gap-1">
                                {idx > 0 && <ChevronRight className="h-3 w-3" />}
                                <span>{location}</span>
                              </div>
                            ))}
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6">
                              <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                                {item.deletedBy.initials}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm">{item.deletedBy.name}</span>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className="text-sm text-muted-foreground">{item.deletedDate}</span>
                        </td>
                        <td className="p-4">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>Restore</DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive">
                                Delete Permanently
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Bulk Actions Toolbar */}
        {selectedCount > 0 && (
          <div className="absolute bottom-0 left-0 right-0 bg-[#1e293b] border-t border-[#334155] shadow-lg py-4 px-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="bg-blue-600 rounded-full w-8 h-8 flex items-center justify-center text-white font-semibold text-sm">
                  {selectedCount}
                </div>
                <span className="text-white font-medium">Items selected</span>
              </div>
              
              <div className="flex items-center gap-4">
                <button 
                  onClick={handleRestore}
                  className="flex items-center gap-2 text-white hover:text-gray-300 transition-colors"
                >
                  <RotateCcw className="h-5 w-5" />
                  <span>Restore</span>
                </button>
                
                <button 
                  onClick={handleDeletePermanently}
                  className="flex items-center gap-2 text-white hover:text-gray-300 transition-colors"
                >
                  <Trash2 className="h-5 w-5" />
                  <span>Delete Permanently</span>
                </button>
                
                <button
                  onClick={() => setSelectedItems({})}
                  className="text-gray-400 hover:text-white transition-colors ml-4"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
