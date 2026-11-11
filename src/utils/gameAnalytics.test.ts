/// <reference types="node" />
import { test } from "node:test";
import assert from "node:assert/strict";
import { analyticsRange, buildAnalytics, DEFAULT_ACTIVE_FILTERS, filterMetric, matchesFilters, toggleSelection, type AnalyticsRecord } from "./gameAnalytics";
const from=new Date(2026,0,1), to=new Date(2026,0,1);
const start=from.getTime();
const filters={contests:[],countries:[],ageGroups:[],ads:[]};
const record=(id:string,seconds:number):AnalyticsRecord=>({id,matchId:id,playerKey:id,contestId:null,country:"Nepal",ageGroup:"above_18",start,end:start+seconds*1000,seconds,round:1,completed:true});
test("runtime sums 10 and 20 player minutes to 30 minutes",()=>{
  const result=buildAnalytics([record("one",600),record("two",1200)],[],[],[],filters,DEFAULT_ACTIVE_FILTERS,from,to,"runtime");
  assert.equal(result.summary.runtimeSeconds,1800);assert.equal(result.points.reduce((s,p)=>s+p.count,0),30);
});
test("date range includes the entire T2 day",()=>{assert.equal(analyticsRange(from,to).end,new Date(2026,0,2).getTime());});
test("inverted date range is rejected",()=>{assert.throws(()=>analyticsRange(new Date(2026,0,2),from));});
test("All excludes specifics and specific selections allow multiple values",()=>{assert.deepEqual(toggleSelection(["Nepal"],"all"),[]);assert.deepEqual(toggleSelection(["Nepal"],"India"),["Nepal","India"]);});
test("Contest Country Age start active and Ads starts inactive",()=>{assert.deepEqual(DEFAULT_ACTIVE_FILTERS,{contests:true,countries:true,ageGroups:true,ads:false});});
test("activation switches to runtime and active Ads disables Ads metric",()=>{assert.equal(filterMetric("match",DEFAULT_ACTIVE_FILTERS,true),"runtime");assert.equal(filterMetric("ads",{...DEFAULT_ACTIVE_FILTERS,ads:true}),"runtime");});
test("global selection matches null contest and specific attributes exclude unknown players",()=>{assert.equal(matchesFilters(record("one",600),{...filters,contests:["global"]},DEFAULT_ACTIVE_FILTERS),true);assert.equal(matchesFilters({...record("one",600),country:null},{...filters,countries:["Nepal"]},DEFAULT_ACTIVE_FILTERS),false);});
test("ad-filtered runtime counts only exposure and unions simultaneous ads",()=>{
 const r=record("one",1200);
 const exposures=["ad-a","ad-b"].map((id)=>({interval_id:"one",campaign_id:id,started_at:new Date(start).toISOString(),ended_at:new Date(start+600000).toISOString(),seconds:600}));
 const result=buildAnalytics([r],exposures,[],[],filters,{...DEFAULT_ACTIVE_FILTERS,ads:true},from,to,"runtime");
 assert.equal(result.summary.runtimeSeconds,600);assert.equal(result.summary.matches,1);assert.equal(result.summary.participants,1);
});
test("historical games never fabricate ad exposure",()=>{assert.equal(buildAnalytics([record("one",600)],[],[],[],filters,{...DEFAULT_ACTIVE_FILTERS,ads:true},from,to,"runtime").summary.matches,0);});
test("multi-day campaigns span actual dates rather than repeat every hour",()=>{
 const result=buildAnalytics([],[],[{id:"ad",start:start+86400000,end:start+2*86400000}],[],filters,DEFAULT_ACTIVE_FILTERS,from,new Date(2026,0,3),"ads");
 assert.deepEqual(result.points.map((p)=>p.count),[0,1,0]);
});
test("country filters affect all six summaries and chart runtime together",()=>{
 const result=buildAnalytics([record("nepal",600),{...record("india",1200),country:"India",contestId:"private"}],[],[],[],{...filters,countries:["Nepal"]},DEFAULT_ACTIVE_FILTERS,from,to,"runtime");
 assert.deepEqual(result.summary,{matches:1,rounds:1,runtimeSeconds:600,participants:1,contests:1,countries:1});
 assert.equal(result.points.reduce((sum,point)=>sum+point.count,0),10);
});
test("runtime is clipped to the selected range",()=>{
 const r={...record("crossing",1200),start:start-600000,end:start+600000};
 assert.equal(buildAnalytics([r],[],[],[],filters,DEFAULT_ACTIVE_FILTERS,from,to,"runtime").summary.runtimeSeconds,600);
});