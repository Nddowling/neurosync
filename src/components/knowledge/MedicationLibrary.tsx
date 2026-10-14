import {useEffect,useRef,useState} from 'react';
import {useQuery} from '@tanstack/react-query';
import {Search,ExternalLink,Loader2,BookOpen} from 'lucide-react';
import {request} from '@/api/client';
import type {MedicationLabel,MedicationSearch} from '../../../shared/medication-library';
const common=['Sertraline','Fluoxetine','Escitalopram','Venlafaxine','Duloxetine','Bupropion','Mirtazapine','Lithium','Lamotrigine','Quetiapine','Aripiprazole','Risperidone','Olanzapine','Clozapine','Buspirone','Methylphenidate','Atomoxetine','Guanfacine'];
export default function MedicationLibrary(){
 const [input,setInput]=useState('');const [query,setQuery]=useState('');const [offset,setOffset]=useState(0);const [selected,setSelected]=useState<string|null>(null);
 const search=useQuery({queryKey:['medication-library',query,offset],queryFn:()=>request<MedicationSearch>(`/api/library/medications?query=${encodeURIComponent(query)}&offset=${offset}`),enabled:query.length>=2,staleTime:3600000,retry:false});
 const detail=useQuery({queryKey:['medication-label',selected],queryFn:()=>request<MedicationLabel>(`/api/library/medications/${selected}`),enabled:!!selected,staleTime:3600000,retry:false});
 const detailRef=useRef<HTMLElement>(null);
 useEffect(()=>{if(selected&&detail.data)detailRef.current?.scrollIntoView({behavior:'smooth',block:'start'});},[selected,detail.data]);
 const lookup=(value:string)=>{setInput(value);setQuery(value.trim());setOffset(0);setSelected(null);};
 return <div className="rounded-2xl border border-gray-200 bg-white p-5 space-y-4">
  <div className="flex items-center gap-2"><BookOpen className="h-5 w-5 text-teal-700"/><h3 className="font-semibold text-gray-900">Medication label library</h3><span className="ml-auto text-xs text-teal-700">Included for every account</span></div>
  <p className="text-sm text-gray-600">Search manufacturer-submitted US medication labels by generic or brand name. Direct source lookup uses no AI credits.</p>
  <form className="flex gap-2" onSubmit={event=>{event.preventDefault();lookup(input);}}>
   <label className="flex-1"><span className="sr-only">Generic or brand medication name</span><input value={input} onChange={event=>setInput(event.target.value)} minLength={2} maxLength={80} required placeholder="Medication name, e.g. sertraline or Zoloft" className="w-full rounded-lg border border-gray-300 p-3 text-sm"/></label>
   <button type="submit" disabled={input.trim().length<2||search.isFetching} className="rounded-lg bg-teal-800 text-white px-4 text-sm disabled:opacity-50 flex items-center gap-2"><Search className="h-4 w-4"/>Find labels</button>
  </form>
  <p className="text-xs text-gray-500">Enter medication names only; do not enter patient information here.</p>
  {!query&&<div><p className="text-xs font-medium text-gray-500 mb-2">Common psychiatric medications</p><div className="flex flex-wrap gap-2">{common.map(name=><button key={name} onClick={()=>lookup(name)} className="rounded-full border border-gray-200 px-3 py-1 text-xs hover:bg-teal-50">{name}</button>)}</div></div>}
  {search.isFetching&&<p role="status" className="text-sm flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin"/>Looking up source labels…</p>}
  {search.isError&&<p role="alert" className="text-sm text-red-700">Label search is unavailable. Check the medication name and try again, or <a className="underline" href="https://dailymed.nlm.nih.gov/dailymed/" target="_blank" rel="noreferrer">search DailyMed</a>. <button className="underline" onClick={()=>void search.refetch()}>Retry</button></p>}
  {search.data&&<>
   <p className="text-xs text-gray-500">{search.data.total} matching labels · FDA dataset updated {search.data.datasetUpdated}. Choose the correct manufacturer and formulation.</p>
   {search.data.results.length===0&&<p className="text-sm">No labels found. Try the generic name or check DailyMed; this index does not include every product.</p>}
   <div className="space-y-2">{search.data.results.map(row=><button key={row.id} onClick={()=>setSelected(row.id)} aria-pressed={selected===row.id} className={`w-full text-left rounded-lg border p-3 ${selected===row.id?'border-teal-600 bg-teal-50':'border-gray-200 hover:bg-gray-50'}`}>
    <span className="block text-sm font-semibold">{row.brandNames.join(' / ')||row.genericNames.join(' / ')||'Product label'}</span>
    <span className="block text-xs text-gray-600 mt-1">{row.genericNames.join(' / ')} · {row.routes.join(', ')}</span>
    <span className="block text-xs text-gray-500 mt-1">{row.manufacturers.join(', ')||'Manufacturer not supplied'} · Label {row.labelDate}</span>
   </button>)}</div>
   {search.data.total>10&&<div className="flex justify-between text-sm"><button disabled={offset===0||search.isFetching} onClick={()=>{setOffset(offset-10);setSelected(null);}} className="disabled:opacity-40">Previous</button><span>{offset+1}–{Math.min(offset+10,search.data.total)} of {search.data.total}</span><button disabled={offset+10>=search.data.total||offset>=1000||search.isFetching} onClick={()=>{setOffset(offset+10);setSelected(null);}} className="disabled:opacity-40">Next</button></div>}
  </>}
  {selected&&detail.isFetching&&<p role="status" className="text-sm">Opening label…</p>}
  {selected&&detail.isError&&<p role="alert" className="text-sm text-red-700">This label could not be loaded. <button className="underline" onClick={()=>void detail.refetch()}>Retry</button></p>}
  {selected&&detail.data&&<article ref={detailRef} className="border-t pt-4 space-y-3 scroll-mt-4">
   <div className="flex items-start justify-between gap-3"><h4 className="font-semibold">{detail.data.brandNames.join(' / ')||detail.data.genericNames.join(' / ')}</h4><button className="text-sm underline" onClick={()=>setSelected(null)}>Close label</button></div>
   <p className="text-xs text-gray-500">Label date {detail.data.labelDate} · Retrieved {new Date(detail.data.retrievedAt).toLocaleDateString()} · Dataset {detail.data.datasetUpdated}</p>
   <a href={detail.data.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm text-teal-800 underline">Open full DailyMed label and tables<ExternalLink className="h-3 w-3"/></a>
   <p className="text-xs text-gray-600">Plain-text sections below omit the original tables and formatting. Verify the full source label, including formulation and warnings, before use.</p>
   {detail.data.sections.map(section=><details key={`${detail.data!.id}:${section.key}`} open={section.key==='boxed_warning'} className={`rounded-lg border p-3 ${section.key==='boxed_warning'?'border-amber-300 bg-amber-50':'border-gray-200'}`}><summary className="cursor-pointer font-medium text-sm capitalize">{section.title}</summary><p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-700 mt-3">{section.text}</p></details>)}
  </article>}
  <p className="text-xs text-gray-500 border-t pt-3">Source: <a className="underline" href="https://open.fda.gov/apis/drug/label/" target="_blank" rel="noreferrer">FDA drug-label dataset</a>, updated weekly; cached lookups refresh within one hour when requested. Listing does not establish FDA approval. openFDA advises against relying on its data for medical-care decisions. This is a label reference, not a complete interaction checker.</p>
 </div>;
}
