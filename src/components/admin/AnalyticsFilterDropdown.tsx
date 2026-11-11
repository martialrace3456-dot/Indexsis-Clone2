import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuCheckboxItem, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { ChevronDown, Power } from "lucide-react";
import { toggleSelection } from "@/utils/gameAnalytics";
interface Props { title: string; items: {value:string;label:string}[]; selected:string[]; active:boolean; onToggle:()=>void; onChange:(values:string[])=>void }
export function AnalyticsFilterDropdown({title,items,selected,active,onToggle,onChange}:Props) {
  const [search,setSearch]=useState("");
  return <div className="inline-flex items-center gap-1">
    <Button size="icon" variant={active ? "default":"outline"} className="h-8 w-8" aria-label={`${active ? "Deactivate":"Activate"} ${title} filter`} title={`${active ? "Deactivate":"Activate"} ${title} filter`} onClick={onToggle}><Power className="h-3.5 w-3.5" /></Button>
    <DropdownMenu onOpenChange={(open)=>{setSearch("");if(open && !active) onToggle();}}>
      <DropdownMenuTrigger asChild><Button variant="outline" size="sm" className="gap-1" aria-label={`${title} selections`}>{title}: {active ? selected.length ? `${selected.length} selected`:"All":"Off"}<ChevronDown className="h-3.5 w-3.5" /></Button></DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuCheckboxItem checked={!selected.length} onSelect={(e)=>e.preventDefault()} onCheckedChange={()=>onChange([])}>All</DropdownMenuCheckboxItem>
        {items.filter((item)=>item.value==="global").map((item)=><DropdownMenuCheckboxItem key={item.value} checked={selected.includes(item.value)} onSelect={(e)=>e.preventDefault()} onCheckedChange={()=>onChange(toggleSelection(selected,item.value))}>{item.label}</DropdownMenuCheckboxItem>)}
        <DropdownMenuSeparator />
        <Input aria-label={`Search ${title}`} placeholder="Search…" value={search} onChange={(e)=>setSearch(e.target.value)} onKeyDown={(e)=>e.stopPropagation()} className="mb-1 h-8" />
        <div className="max-h-56 overflow-y-auto">{items.filter((item)=>item.value!=="global" && item.label.toLowerCase().includes(search.toLowerCase())).map((item)=><DropdownMenuCheckboxItem key={item.value} checked={selected.includes(item.value)} onSelect={(e)=>e.preventDefault()} onCheckedChange={()=>onChange(toggleSelection(selected,item.value))}>{item.label}</DropdownMenuCheckboxItem>)}</div>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onToggle}>{active ? "Deactivate":"Activate"} filter</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  </div>;
}
