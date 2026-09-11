# Reference library and DSM demo import

## Shared medication reference

Every signed-in account can search the same manufacturer-submitted US drug-label dataset through `/api/library/medications`. The Medication Reference page and Knowledge Base both include this search. It uses openFDA directly, with links to the corresponding DailyMed label. No model request or paid AI token is needed for source lookup.

Search covers harmonized generic and brand names across the indexed label dataset, returns ten products per page, and keeps manufacturer, route, original label date and dataset update date visible. Users select the specific product. Label sections include boxed warnings, contraindications, interactions, adverse reactions and other available text sections. Tables and original formatting remain in the linked source label; plain-text sections must not substitute for those tables. FDA listing does not establish approval. This is not an exhaustive interaction-checking, international drug, compounding or off-label prescribing database.

The public source updates weekly. Runtime caches are bounded to 40 search/label results and expire after one hour; requested records then refresh from the source. Nothing is copied into each clinician's private tables. This is a live searchable library, not an offline download of the complete dataset. Timeouts, response-size bounds and source-schema validation fail explicitly, with a DailyMed fallback link.

Before broader release, size the traffic against openFDA's current API quota, add a dedicated source API key if needed, and consider a durable versioned cache and scheduled refresh. A full bulk import should preserve label set IDs, version/effective dates, withdrawal/replacement status and source attribution. DailyMed provides full and daily/weekly/monthly releases for that future workflow. RxNorm can add normalized drug identifiers and synonyms; downloading its full releases requires accepting the free UMLS license. None of these future jobs or subscriptions were enabled in this release.

Sources:
- [openFDA drug labels and weekly update cadence](https://open.fda.gov/apis/drug/label/)
- [openFDA data licensing](https://open.fda.gov/license/)
- [DailyMed bulk releases](https://dailymed.nlm.nih.gov/dailymed/spl-resources-all-drug-labels.cfm)
- [RxNorm terms](https://www.nlm.nih.gov/research/umls/rxnorm/docs/termsofservice.html)

## Medication response latency

The old page waited for a full model response, then added a client-side typewriter animation. It now renders the completed response immediately. General AI reference tasks use GPT-5 mini with minimal reasoning, a 4,096-token completion ceiling and a concise-response instruction. Clinical conversations and SOAP notes retain their separate 8,192-token/low-reasoning configuration. Model request ceilings are not monthly dollar limits. Free source lookup is the default library workflow; comparisons and explanations remain optional AI requests.

## Private DSM demo material

The user identified a local DSM-5 PDF in `WeTalk-Lib` and requested its inclusion for testing/demos. The supplied file is labeled DSM-5 (2013), not DSM-5-TR. The original contains 970 scanned pages. It is preserved locally and split into 28 private PDF parts below the existing 2 MiB download limit. Local Tesseract OCR creates searchable text; the original PDF page positions are included in text markers and source titles. OCR may introduce recognition errors, so source PDFs remain the reference for verification.

The import belongs to the administrator's private Knowledge Base. No DSM text or PDF is committed to Git, deployed as a public asset, or seeded into other accounts. Subscriber-wide licensing remains separate: [APA permissions and electronic product licensing](https://www.appi.org/Support/Customer-Information/Permissions).

Both clinical conversations and DSM Lookup retrieve owner-scoped knowledge chunks. DSM Lookup passes retrieved excerpts to the model, returns source metadata, and displays authenticated PDF links. When no private source is retrieved, the interface identifies the answer as general AI output. Prompts distinguish the 2013 edition from DSM-5-TR and partial excerpts from the complete manual. This is functional retrieval, not a claim of clinical validation or exhaustive criteria coverage.

PDF ingestion now checks actual extracted page text; parser-generated page markers cannot make an image-only document appear searchable. Such uploads return an explicit OCR-required message. Large imports use batched embedding updates while retaining the owner and content-version conditions. Full-text retrieval searches all indexed chunks; the bounded lexical-vector fallback runs only when full-text retrieval returns fewer than five excerpts.

## Verification notes

The production source-search route explicitly selects supported query fields so platform routing parameters cannot be mistaken for application inputs. Initial live browser verification caught this issue; the corrected search was then checked against the real source.

A production sample returned 164 sertraline labels, with a dataset date of 2026-09-11. Measured request durations were 943 ms for search, 391 ms for opening a label, 115 ms for a repeated search and 2,746 ms for a short AI medication explanation. These are individual observations, not latency guarantees. The live label contained boxed-warning and interaction sections and an original-source link. Anonymous access was rejected. The Chrome-based browser CLI verified search, selection and rendering; the older in-app native bridge was not used.

The Knowledge Base catalog returns short previews instead of transmitting every imported document's full text when the page opens. Full content remains indexed and available for owned retrieval and per-record access.

DSM OCR completed for all 970 pages, producing 28 privately stored parts and 2,168 indexed chunks with local lexical embeddings. Live authenticated checks verified the 28-part catalog (about 41 KB of previews), source metadata, PDF download and anonymous denial. A long-question retrieval check initially over-ranked introductory edition text; diagnostic queries now omit lookup/edition instructions and expand common abbreviations such as ADHD and PTSD before retrieval. Topic-specific retrieval was checked against the imported ADHD chapter. This does not replace broader clinical relevance evaluation.
