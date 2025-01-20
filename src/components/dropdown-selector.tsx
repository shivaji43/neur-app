'use client';

import * as React from 'react';

import { Check, ChevronsUpDown, Filter } from 'lucide-react';

import { FilterValues } from '@/app/(user)/saved-prompts/page';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { cn } from '@/lib/utils';

import { Popover, PopoverContent, PopoverTrigger } from './ui/pop-over';

export function Combobox({
  disabled,
  setFilter,
  filter,
  filterOptions,
}: {
  disabled: boolean;
  filter: string;
  setFilter: React.Dispatch<React.SetStateAction<FilterValues>>;
  filterOptions: { value: string; label: string }[];
}) {
  const [open, setOpen] = React.useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          disabled={disabled}
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-auto justify-between"
        >
          {
            filterOptions.find((filterOption) => filterOption.value === filter)
              ?.label
          }
          <Filter className="opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0">
        <Command>
          <CommandList>
            <CommandEmpty>No framework found.</CommandEmpty>
            <CommandGroup>
              {filterOptions.map((filterOption) => (
                <CommandItem
                  key={filterOption.value}
                  value={filterOption.value}
                  onSelect={(currentValue: any) => {
                    setFilter(currentValue as FilterValues);
                    setOpen(false);
                  }}
                >
                  {filterOption.label}
                  <Check
                    className={cn(
                      'ml-auto',
                      filter === filterOption.value
                        ? 'opacity-100'
                        : 'opacity-0',
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
