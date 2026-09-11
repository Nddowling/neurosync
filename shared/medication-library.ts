export interface MedicationSummary {
 id:string; setId:string; brandNames:string[]; genericNames:string[]; manufacturers:string[];
 routes:string[]; productTypes:string[]; labelDate:string; sourceUrl:string;
}
export interface MedicationSearch {results:MedicationSummary[];total:number;offset:number;limit:number;datasetUpdated:string;retrievedAt:string}
export interface MedicationLabel extends MedicationSummary {sections:{key:string;title:string;text:string}[];datasetUpdated:string;retrievedAt:string}
