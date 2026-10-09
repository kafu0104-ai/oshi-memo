// Frozen baseline: Sites source b081a0ecf2402e3898e2c732569c4cd06559fe4e.
import {extractOfficialFields,extractOfficialPerformances} from './fixtures/official-import-before-v1';
import {OfficialDiscovery,httpPageReader} from '../src/services/officialDiscovery';
const urls=['https://expo.mappa.co.jp/','https://15th.utapri.tv/event/','https://agf-ikebukuro.jp/s/agf2026/'];
const output=document.querySelector('#results')!;
document.querySelector<HTMLButtonElement>('#run')!.onclick=async e=>{
 (e.currentTarget as HTMLButtonElement).disabled=true;const results:unknown[]=[];
 for(const url of urls){
  output.textContent=JSON.stringify(results,null,2)+`\n確認中：${url}`;
  const discovery=new OfficialDiscovery(url,httpPageReader);const started=Date.now();const after=await discovery.search();
  const page=discovery.primary;
  results.push({url,at:new Date().toISOString(),elapsedMs:Date.now()-started,before:page?{fields:extractOfficialFields(page.html),performances:extractOfficialPerformances(page.html)}:null,after:after.candidates.map(c=>({source:c.sourceUrl,fields:c.fields,performance:c.performance,confirmation:c.confirmation})),visited:after.visited,issues:after.issues});
 }
 output.textContent=JSON.stringify(results,null,2);document.querySelector<HTMLButtonElement>('#run')!.disabled=false;
};
