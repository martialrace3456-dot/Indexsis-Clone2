import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, ChevronDown, X } from "lucide-react";
import { toggleAdTarget } from "@/utils/adSpecification";

interface Props {
  label: string;
  options: { value: string; label: string }[];
  selected: string[];
  onChange: (selected: string[]) => void;
}

export function AdTargetSelector({ label, options, selected, onChange }: Props) {
  const [search, setSearch] = useState("");
  const visible = options.filter((option) => option.label.toLowerCase().includes(search.toLowerCase()));
  return <div className="space-y-2">
    <div className="text-sm font-medium">{label} (multiple)</div>
    <Popover onOpenChange={() => setSearch("")}>
      <PopoverTrigger asChild>
        <Button variant="outline" aria-label={`Select ${label.toLowerCase()}`} className="w-full justify-between">
          {selected.length ? `${selected.length} selected` : "All"}<ChevronDown className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 max-w-[calc(100vw-2rem)] p-2">
        <Input aria-label={`Search ${label.toLowerCase()}`} placeholder={`Search ${label.toLowerCase()}`} value={search} onChange={(e) => setSearch(e.target.value)} className="mb-2" />
        <Button variant="ghost" role="menuitemcheckbox" aria-checked={selected.length === 0} onClick={() => onChange(toggleAdTarget(selected, null))} className="w-full justify-between border-b rounded-none">
          All{selected.length === 0 && <Check className="h-4 w-4" />}
        </Button>
        <div className="max-h-48 overflow-y-auto" role="menu" aria-label={label}>
          {visible.map((option) => <Button key={option.value} role="menuitemcheckbox" aria-checked={selected.includes(option.value)} variant="ghost" className="w-full justify-between h-auto min-h-9 text-left whitespace-normal gap-2" onClick={() => onChange(toggleAdTarget(selected, option.value))}>
            <span>{option.label}</span>{selected.includes(option.value) && <Check className="h-4 w-4 shrink-0" />}
          </Button>)}
          {!visible.length && <p className="p-2 text-sm text-muted-foreground">No matches.</p>}
        </div>
      </PopoverContent>
    </Popover>
    {selected.length > 0 && <div className="flex flex-wrap gap-1">
      {selected.map((value) => <Button key={value} variant="secondary" size="sm" className="h-auto min-h-7 max-w-full text-xs whitespace-normal" onClick={() => onChange(toggleAdTarget(selected, value))} aria-label={`Remove ${options.find((o) => o.value === value)?.label ?? value}`}>
        {options.find((o) => o.value === value)?.label ?? value}<X className="h-3 w-3 ml-1 shrink-0" />
      </Button>)}
    </div>}
  </div>;
}