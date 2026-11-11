import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useGameAnalytics } from "@/hooks/useGameAnalytics";
import { supabase } from "@/integrations/supabase/client";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Gamepad2, Users, Trophy, Globe, Calendar as CalendarIcon, Clock, BarChart3, LineChart as LineChartIcon, ChevronDown, RotateCcw } from "lucide-react";
import { type AnalyticsMetric, ANALYTICS_METRICS, type ChartType, type AnalyticsFilters, AGE_GROUP_OPTIONS } from "@/types/admin";
import { DEFAULT_ACTIVE_FILTERS, filterMetric, type ActiveFilters, type FilterKey, GLOBAL_CONTEST } from "@/utils/gameAnalytics";
import { AnalyticsFilterDropdown } from "./AnalyticsFilterDropdown";
import { format } from "date-fns";

export function AnalyticsDashboard() {
  const [metric,setMetric]=useState<AnalyticsMetric>("match");
  const [chartType,setChartType]=useState<ChartType>("bar");
  const [filters,setFilters]=useState<AnalyticsFilters>({contests:[],countries:[],ageGroups:[],ads:[]});
  const [active,setActive]=useState<ActiveFilters>(DEFAULT_ACTIVE_FILTERS);
  const [dateFrom,setDateFrom]=useState(new Date(Date.now()-7*86400000));
  const [dateTo,setDateTo]=useState(new Date());
  const [options,setOptions]=useState<Record<FilterKey,{value:string;label:string}[]>>({contests:[{value:GLOBAL_CONTEST,label:"The Global Estimator Challenge"}],countries:[],ageGroups:AGE_GROUP_OPTIONS,ads:[]});
  const {analytics,loading,error,refetch}=useGameAnalytics(metric,filters,dateFrom,dateTo,active);
  useEffect(()=>{
    const load=async()=>{
      const [contests,players,ads]=await Promise.all([supabase.from("contests").select("id,name").order("name"),supabase.from("players").select("country"),supabase.from("ad_campaigns").select("id,title").order("created_at",{ascending:false})]);
      setOptions({contests:[{value:GLOBAL_CONTEST,label:"The Global Estimator Challenge"},...(contests.data??[]).map((c)=>({value:c.id,label:c.name}))],countries:[...new Set((players.data??[]).flatMap((p)=>p.country?[p.country]:[]))].sort().map((c)=>({value:c,label:c})),ageGroups:AGE_GROUP_OPTIONS,ads:(ads.data??[]).map((a)=>({value:a.id,label:a.title || "Untitled ad"}))});
    };
    void load();
    const channel=supabase.channel(`analytics-options-${crypto.randomUUID()}`);
    for(const table of ["contests","players","ad_campaigns"]) channel.on("postgres_changes",{event:"*",schema:"public",table},()=>void load());
    channel.subscribe();return ()=>{void supabase.removeChannel(channel);};
  },[]);
  const toggle=(key:FilterKey)=>{
    const next={...active,[key]:!active[key]};setActive(next);
    if(next[key]) {setFilters((prev)=>({...prev,[key]:[]}));setMetric((prev)=>filterMetric(prev,next,true));}
  };
  const label=ANALYTICS_METRICS.find((m)=>m.value===metric)?.label ?? "Match";
  const bucketLabel=analytics && analytics.bucketMs<=3600000 ? "Hour":analytics && analytics.bucketMs>86400000 ? "Week":"Day";
  const timestampLabel=(value:number)=>format(new Date(value),bucketLabel==="Hour" ? "MMM d HH:mm":"MMM d");
  const summary=analytics?.summary;
  const cards=[{label:"Matches",value:summary?.matches??0,icon:Gamepad2},{label:"Rounds",value:summary?.rounds??0,icon:RotateCcw},{label:"Amount of Runtime",value:`${((summary?.runtimeSeconds??0)/60).toLocaleString(undefined,{maximumFractionDigits:2})} min`,icon:Clock},{label:"Participants",value:summary?.participants??0,icon:Users},{label:"Contests",value:summary?.contests??0,icon:Trophy},{label:"Countries",value:summary?.countries??0,icon:Globe}];
  return <div className="space-y-6 min-w-0" aria-busy={loading}>
    <h2 className="text-2xl font-bold">Analytics Dashboard</h2>
    <div className="flex flex-wrap items-center gap-3">
      {([['contests','Contest'],['countries','Country'],['ageGroups','Age'],['ads','Ads']] as [FilterKey,string][]).map(([key,title])=><AnalyticsFilterDropdown key={key} title={title} items={options[key]} selected={filters[key]} active={active[key]} onToggle={()=>toggle(key)} onChange={(values)=>setFilters((prev)=>({...prev,[key]:values}))} />)}
      <div className="ml-auto flex flex-wrap items-center gap-2">
        <Popover><PopoverTrigger asChild><Button variant="outline" size="sm" aria-label="T1 start date"><CalendarIcon className="mr-1 h-3.5 w-3.5"/>T1: {format(dateFrom,"MMM d, yyyy")}</Button></PopoverTrigger><PopoverContent className="w-auto p-0" align="end"><Calendar mode="single" selected={dateFrom} disabled={{after:dateTo}} onSelect={(date)=>date && setDateFrom(date)} initialFocus /></PopoverContent></Popover>
        <span className="text-muted-foreground">–</span>
        <Popover><PopoverTrigger asChild><Button variant="outline" size="sm" aria-label="T2 end date"><CalendarIcon className="mr-1 h-3.5 w-3.5"/>T2: {format(dateTo,"MMM d, yyyy")}</Button></PopoverTrigger><PopoverContent className="w-auto p-0" align="end"><Calendar mode="single" selected={dateTo} disabled={{before:dateFrom}} onSelect={(date)=>date && setDateTo(date)} initialFocus /></PopoverContent></Popover>
      </div>
    </div>
    {error && <div role="alert" className="flex items-center gap-3 text-destructive">{error}<Button variant="outline" size="sm" onClick={()=>void refetch()}>Retry</Button></div>}
    <section className="border-y border-border py-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-lg font-semibold">{label} by {bucketLabel} <span className="text-sm font-normal text-muted-foreground">({format(dateFrom,"MMM d")} – {format(dateTo,"MMM d, yyyy")})</span></h3>
        <DropdownMenu><DropdownMenuTrigger asChild><Button variant="outline" size="sm" className="gap-2" aria-label="Y-axis metric">{label}<ChevronDown className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end">{ANALYTICS_METRICS.map((m)=><DropdownMenuItem key={m.value} disabled={m.value==="ads" && active.ads} onClick={()=>setMetric(m.value)}>{m.label}</DropdownMenuItem>)}</DropdownMenuContent></DropdownMenu>
      </div>
      <div className="w-full min-w-0 h-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          {chartType==="bar" ? <BarChart data={analytics?.points??[]}><XAxis dataKey="timestamp" tickFormatter={timestampLabel} minTickGap={28} stroke="hsl(var(--muted-foreground))"/><YAxis width={65} allowDecimals={metric==="runtime"} stroke="hsl(var(--muted-foreground))"/><Tooltip labelFormatter={(v)=>timestampLabel(Number(v))} formatter={(v:number)=>[`${v.toLocaleString(undefined,{maximumFractionDigits:2})}${metric==="runtime" ? " min":""}`,label]} contentStyle={{backgroundColor:"hsl(var(--popover))",borderColor:"hsl(var(--border))",borderRadius:6}}/><Bar dataKey="count" fill="hsl(var(--primary))" radius={[4,4,0,0]}/></BarChart> : <LineChart data={analytics?.points??[]}><XAxis dataKey="timestamp" tickFormatter={timestampLabel} minTickGap={28} stroke="hsl(var(--muted-foreground))"/><YAxis width={65} allowDecimals={metric==="runtime"} stroke="hsl(var(--muted-foreground))"/><Tooltip labelFormatter={(v)=>timestampLabel(Number(v))} formatter={(v:number)=>[`${v.toLocaleString(undefined,{maximumFractionDigits:2})}${metric==="runtime" ? " min":""}`,label]} contentStyle={{backgroundColor:"hsl(var(--popover))",borderColor:"hsl(var(--border))",borderRadius:6}}/><Line dataKey="count" type="linear" stroke="hsl(var(--primary))" strokeWidth={2} dot={false}/></LineChart>}
        </ResponsiveContainer>
      </div>
      <div className="flex gap-2"><Button variant={chartType==="bar"?"default":"outline"} size="sm" onClick={()=>setChartType("bar")}><BarChart3 className="mr-1.5 h-4 w-4"/>Bar Chart</Button><Button variant={chartType==="line"?"default":"outline"} size="sm" onClick={()=>setChartType("line")}><LineChartIcon className="mr-1.5 h-4 w-4"/>Line Chart</Button></div>
    </section>
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4" aria-label="Analytics summary">{cards.map((card)=><div key={card.label} className="border border-border rounded-md p-4 min-w-0"><div className="flex items-center gap-2 text-muted-foreground mb-2"><card.icon className="h-4 w-4 shrink-0"/><span className="text-sm">{card.label}</span></div><p className="text-xl font-bold break-words">{card.value.toLocaleString()}</p></div>)}</div>
  </div>;
}
