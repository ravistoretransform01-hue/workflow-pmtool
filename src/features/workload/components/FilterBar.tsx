import { useState } from "react";
import { Search, ChevronDown, Eye } from "lucide-react";
import { Input } from "@/shared/ui/input";
import { Button } from "@/shared/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/shared/ui/popover";
import type { Status, Priority } from "@/features/cms/types/types";
import type { TaskGroup } from "@/features/workload/components/WorkloadBoard";
import { useTaskFilters } from "@/features/workload/hooks";

interface FilterBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  filterState: ReturnType<typeof useTaskFilters>;
  members: any[];
  statuses: Status[];
  priorities: Priority[];
  labels: any[];
  groups: TaskGroup[];
  onAddNewGroup: () => void;
  isLoadingGroups: boolean;
}

export function FilterBar({
  searchQuery,
  onSearchChange,
  filterState,
  members,
  statuses,
  priorities,
  labels,
  groups,
  onAddNewGroup,
  isLoadingGroups,
}: FilterBarProps) {
  const [personSearch, setPersonSearch] = useState("");
  const [statusSearch, setStatusSearch] = useState("");
  const [prioritySearch, setPrioritySearch] = useState("");
  const [labelSearch, setLabelSearch] = useState("");
  const [groupSearch, setGroupSearch] = useState("");

  const filteredMembers = (members || []).filter(m => (m?.name || "").toLowerCase().includes(personSearch.toLowerCase()));
  const filteredStatuses = (statuses || []).filter(s => (s?.name || "").toLowerCase().includes(statusSearch.toLowerCase()));
  const filteredPriorities = (priorities || []).filter(p => (p?.name || "").toLowerCase().includes(prioritySearch.toLowerCase()));
  const filteredLabels = (labels || []).filter(l => (l?.label_name || "").toLowerCase().includes(labelSearch.toLowerCase()));
  const filteredGroups = (groups || []).filter(g => (g?.name || "").toLowerCase().includes(groupSearch.toLowerCase()));

  return (
    <div className="border-b border-border px-6 py-4 flex items-center gap-3 flex-wrap flex-shrink-0">
      {/* New Group Button */}
      <Button
        variant="default"
        size="sm"
        onClick={onAddNewGroup}
        disabled={isLoadingGroups}
      >
        New Group
      </Button>

      {/* Search and Filters */}
      <div className="flex items-center gap-3 flex-1">
        {/* Search */}
        <div className="relative max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10 pointer-events-none" />
          <Input
            placeholder="Search items..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 h-8 bg-background border-border w-48"
          />
        </div>

        {/* Done Items Checkbox */}
        <label className="flex items-center gap-2 cursor-pointer px-3 py-2 rounded hover:bg-hover transition-colors">
          <input
            type="checkbox"
            checked={filterState.showDoneItemsOnly}
            onChange={(e) => filterState.setShowDoneItemsOnly(e.target.checked)}
            className="cursor-pointer"
          />
          <span className="text-sm font-medium">Done Items</span>
        </label>


        {/* Show/Hide Filter Popover */}
        <Popover>
          <PopoverTrigger asChild>
            <button className="flex items-center px-3 gap-2 text-sm font-medium text-foreground cursor-pointer">
              <Eye className="h-4 w-4" />
              Only Show
            </button>
          </PopoverTrigger>

          <PopoverContent
            align="start"
            className="w-64 max-h-96 p-0 bg-card border-2 border-primary/20 flex flex-col"
          >
            <div className="space-y-1 overflow-y-auto flex-1 p-2 scrollbar-hide">
              {/* Person Filter Dropdown */}
              <div className="border border-primary/30 rounded-md bg-background">
                <button
                  onClick={() => filterState.toggleFilterDropdown("persons")}
                  className="w-full flex items-center justify-between px-3 py-2 hover:bg-primary/5 transition-colors"
                >
                  <span className="text-sm font-medium">Person</span>
                  <ChevronDown
                    className={`h-4 w-4 transition-transform ${
                      filterState.openFilterDropdowns.persons ? "rotate-180" : ""
                    }`}
                  />
                </button>
                {filterState.openFilterDropdowns.persons && (
                  <div className="border-t border-primary/20 bg-primary/5 p-2 space-y-1">
                    <div className="relative mb-2">
                      <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                      <Input
                        placeholder="Search person..."
                        value={personSearch}
                        onChange={(e) => setPersonSearch(e.target.value)}
                        className="pl-7 h-7 text-xs bg-background/50 border-primary/20"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                    <div className="max-h-40 overflow-y-auto scrollbar-hide space-y-1">
                      {filteredMembers.map((member) => (
                        <label
                          key={member.user_id}
                          className="flex items-center gap-2 cursor-pointer px-2 py-1 rounded hover:bg-primary/10 text-sm transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={filterState.taskFilters.persons.has(
                              String(member.user_id)
                            )}
                            onChange={(e) => {
                              const newPersons = new Set(
                                filterState.taskFilters.persons
                              );
                              if (e.target.checked) {
                                newPersons.add(String(member.user_id));
                              } else {
                                newPersons.delete(String(member.user_id));
                              }
                              filterState.setTaskFilters({
                                ...filterState.taskFilters,
                                persons: newPersons,
                              });
                            }}
                            className="cursor-pointer"
                          />
                          <span className="truncate">{member.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Status Filter Dropdown */}
              <div className="border border-primary/30 rounded-md bg-background">
                <button
                  onClick={() => filterState.toggleFilterDropdown("statuses")}
                  className="w-full flex items-center justify-between px-3 py-2 hover:bg-primary/5 transition-colors"
                >
                  <span className="text-sm font-medium">Status</span>
                  <ChevronDown
                    className={`h-4 w-4 transition-transform ${
                      filterState.openFilterDropdowns.statuses ? "rotate-180" : ""
                    }`}
                  />
                </button>
                {filterState.openFilterDropdowns.statuses && (
                  <div className="border-t border-primary/20 bg-primary/5 p-2 space-y-1">
                    <div className="relative mb-2">
                      <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                      <Input
                        placeholder="Search status..."
                        value={statusSearch}
                        onChange={(e) => setStatusSearch(e.target.value)}
                        className="pl-7 h-7 text-xs bg-background/50 border-primary/20"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                    <div className="max-h-40 overflow-y-auto scrollbar-hide space-y-1">
                      {filteredStatuses.map((status) => (
                        <label
                          key={status.id}
                          className="flex items-center gap-2 cursor-pointer px-2 py-1 rounded hover:bg-primary/10 text-sm transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={filterState.taskFilters.statuses.has(
                              String(status.id)
                            )}
                            onChange={(e) => {
                              const newStatuses = new Set(
                                filterState.taskFilters.statuses
                              );
                              if (e.target.checked) {
                                newStatuses.add(String(status.id));
                              } else {
                                newStatuses.delete(String(status.id));
                              }
                              filterState.setTaskFilters({
                                ...filterState.taskFilters,
                                statuses: newStatuses,
                              });
                            }}
                            className="cursor-pointer"
                          />
                          <div className="flex items-center gap-2 overflow-hidden">
                            <div
                              className="w-3 h-3 rounded-full shrink-0"
                              style={{
                                backgroundColor: status.color_code,
                              }}
                            />
                            <span className="truncate">{status.name}</span>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Priority Filter Dropdown */}
              <div className="border border-primary/30 rounded-md bg-background">
                <button
                  onClick={() =>
                    filterState.toggleFilterDropdown("priorities")
                  }
                  className="w-full flex items-center justify-between px-3 py-2 hover:bg-primary/5 transition-colors"
                >
                  <span className="text-sm font-medium">Priority</span>
                  <ChevronDown
                    className={`h-4 w-4 transition-transform ${
                      filterState.openFilterDropdowns.priorities
                        ? "rotate-180"
                        : ""
                    }`}
                  />
                </button>
                {filterState.openFilterDropdowns.priorities && (
                  <div className="border-t border-primary/20 bg-primary/5 p-2 space-y-1">
                    <div className="relative mb-2">
                      <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                      <Input
                        placeholder="Search priority..."
                        value={prioritySearch}
                        onChange={(e) => setPrioritySearch(e.target.value)}
                        className="pl-7 h-7 text-xs bg-background/50 border-primary/20"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                    <div className="max-h-40 overflow-y-auto scrollbar-hide space-y-1">
                      {filteredPriorities.map((priority) => (
                        <label
                          key={priority.id}
                          className="flex items-center gap-2 cursor-pointer px-2 py-1 rounded hover:bg-primary/10 text-sm transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={filterState.taskFilters.priorities.has(
                              String(priority.id)
                            )}
                            onChange={(e) => {
                              const newPriorities = new Set(
                                filterState.taskFilters.priorities
                              );
                              if (e.target.checked) {
                                newPriorities.add(String(priority.id));
                              } else {
                                newPriorities.delete(String(priority.id));
                              }
                              filterState.setTaskFilters({
                                ...filterState.taskFilters,
                                priorities: newPriorities,
                              });
                            }}
                            className="cursor-pointer"
                          />
                          <div className="flex items-center gap-2 overflow-hidden">
                            <div
                              className="w-3 h-3 rounded-full shrink-0"
                              style={{
                                backgroundColor: priority.color_code,
                              }}
                            />
                            <span className="truncate">{priority.name}</span>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Label Filter Dropdown */}
              <div className="border border-primary/30 rounded-md bg-background">
                <button
                  onClick={() => filterState.toggleFilterDropdown("labels")}
                  className="w-full flex items-center justify-between px-3 py-2 hover:bg-primary/5 transition-colors"
                >
                  <span className="text-sm font-medium">Label</span>
                  <ChevronDown
                    className={`h-4 w-4 transition-transform ${
                      filterState.openFilterDropdowns.labels ? "rotate-180" : ""
                    }`}
                  />
                </button>
                {filterState.openFilterDropdowns.labels && (
                  <div className="border-t border-primary/20 bg-primary/5 p-2 space-y-1">
                    <div className="relative mb-2">
                      <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                      <Input
                        placeholder="Search label..."
                        value={labelSearch}
                        onChange={(e) => setLabelSearch(e.target.value)}
                        className="pl-7 h-7 text-xs bg-background/50 border-primary/20"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                    <div className="max-h-40 overflow-y-auto scrollbar-hide space-y-1">
                      {filteredLabels.map((label) => (
                        <label
                          key={label.id}
                          className="flex items-center gap-2 cursor-pointer px-2 py-1 rounded hover:bg-primary/10 text-sm transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={filterState.taskFilters.labels.has(
                              String(label.id)
                            )}
                            onChange={(e) => {
                              const newLabels = new Set(
                                filterState.taskFilters.labels
                              );
                              if (e.target.checked) {
                                newLabels.add(String(label.id));
                              } else {
                                newLabels.delete(String(label.id));
                              }
                              filterState.setTaskFilters({
                                ...filterState.taskFilters,
                                labels: newLabels,
                              });
                            }}
                            className="cursor-pointer"
                          />
                          <div className="flex items-center gap-2 overflow-hidden">
                            <div
                              className="w-3 h-3 rounded-full shrink-0"
                              style={{
                                backgroundColor: label.label_color,
                              }}
                            />
                            <span className="truncate">{label.label_name}</span>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Group Filter Dropdown */}
              <div className="border border-primary/30 rounded-md bg-background">
                <button
                  onClick={() => filterState.toggleFilterDropdown("groups")}
                  className="w-full flex items-center justify-between px-3 py-2 hover:bg-primary/5 transition-colors"
                >
                  <span className="text-sm font-medium">Group</span>
                  <ChevronDown
                    className={`h-4 w-4 transition-transform ${
                      filterState.openFilterDropdowns.groups ? "rotate-180" : ""
                    }`}
                  />
                </button>
                {filterState.openFilterDropdowns.groups && (
                  <div className="border-t border-primary/20 bg-primary/5 p-2 space-y-1">
                    <div className="relative mb-2">
                      <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                      <Input
                        placeholder="Search group..."
                        value={groupSearch}
                        onChange={(e) => setGroupSearch(e.target.value)}
                        className="pl-7 h-7 text-xs bg-background/50 border-primary/20"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                    <div className="max-h-40 overflow-y-auto scrollbar-hide space-y-1">
                      {filteredGroups.map((group) => (
                        <label
                          key={group.id}
                          className="flex items-center gap-2 cursor-pointer px-2 py-1 rounded hover:bg-primary/10 text-sm transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={filterState.taskFilters.groups.has(
                              group.id
                            )}
                            onChange={(e) => {
                              const newGroups = new Set(
                                filterState.taskFilters.groups
                              );
                              if (e.target.checked) {
                                newGroups.add(group.id);
                              } else {
                                newGroups.delete(group.id);
                              }
                              filterState.setTaskFilters({
                                ...filterState.taskFilters,
                                groups: newGroups,
                              });
                            }}
                            className="cursor-pointer"
                          />
                          <div className="flex items-center gap-2 overflow-hidden">
                            <div
                              className="w-3 h-3 rounded-full shrink-0"
                              style={{ backgroundColor: group.color }}
                            />
                            <span className="truncate">{group.name}</span>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>


            {/* Clear Filters Button - Fixed at bottom */}
            {(filterState.taskFilters.persons.size > 0 ||
              filterState.taskFilters.statuses.size > 0 ||
              filterState.taskFilters.priorities.size > 0 ||
              filterState.taskFilters.labels.size > 0 ||
              filterState.taskFilters.groups.size > 0 ||
              filterState.taskFilters.commentDateFilter !== null) && (
              <div className="border-t border-primary/20 bg-primary/5 p-2 shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => {
                    filterState.clearFilters();
                  }}
                >
                  Clear All Filters
                </Button>
              </div>
            )}
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
