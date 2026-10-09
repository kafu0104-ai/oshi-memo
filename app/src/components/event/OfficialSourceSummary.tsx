import {fieldLabels,type OfficialReport,type Field} from '../../services/officialCandidates';
export const importStatusLabels={found:'反映済み',notFound:'未発見',ambiguous:'要確認・候補あり',unsupported:'未対応',notApplied:'取得済み・未反映',error:'取得エラー'};
export default function OfficialSourceSummary({report}:{report?:OfficialReport}){
 if(!report)return null;
 return <details className="official-source-summary"><summary>公式情報の出典・取得状況</summary><p>取得日時：{report.fetchedAt} ／ 確認したURL：{report.visited.length}件</p><p>読み取り時の記録です。反映後に手編集した内容とは異なる場合があります。</p>
 {Object.entries(report.fields).map(([key,item])=><div key={key}><strong>{fieldLabels[key as Field]}：{importStatusLabels[item.status]}</strong>{item.reason&&<p>{item.reason}</p>}{item.applied?.map((e,i)=><p key={i}>{e.value} ／ <a href={e.sourceUrl} target="_blank" rel="noopener noreferrer">出典</a>（{e.method}・{e.fetchedAt}）<br/>{e.excerpt}</p>)}</div>)}
 <details><summary>保存した読み取り候補を見る</summary>{report.candidates.map(c=><div key={c.id}><strong>{c.label}</strong><p>{c.confirmation}</p>{Object.entries(c.fields).map(([key,value])=><p key={key}>{fieldLabels[key as Field]}：{value} <a href={c.evidence[key as Field]?.sourceUrl} target="_blank" rel="noopener noreferrer">出典</a></p>)}{c.unresolved&&<p>年などの確認が必要：{Object.values(c.unresolved).join(" ／ ")}</p>}{c.notices?.map((n,i)=><p key={i}>{n.label}：{n.value} <a href={n.sourceUrl} target="_blank" rel="noopener noreferrer">出典</a></p>)}</div>)}</details>
 {report.issues.map((issue,i)=><p key={i}>{issue.reason} <a href={issue.url} target="_blank" rel="noopener noreferrer">対象ページ</a></p>)}
 </details>;
}
