// Remove lookup instructions and edition metadata that otherwise outrank the disorder.
const instructions=new Set(('using use only my private uploaded supplied retrieved excerpt excerpts source sources reference references dsm tr pdf manual book edition name identify missing information keep answer words word under over briefly brief summarize summary explain overview diagnostic diagnosis criteria clinical guidance considerations include including give provide show tell about please according').split(' '));
const aliases:Record<string,string>={adhd:'attention deficit hyperactivity',ptsd:'posttraumatic stress',ocd:'obsessive compulsive',gad:'generalized anxiety',mdd:'major depressive'};
export function diagnosticRetrievalQuery(query:string){
 const tokens=query.toLowerCase().match(/[\p{L}]{2,}/gu)??[];
 const terms=tokens.filter(token=>!instructions.has(token)).flatMap(token=>(aliases[token]??token).split(' '));
 return [...new Set(terms)].join(' ')||query;
}
