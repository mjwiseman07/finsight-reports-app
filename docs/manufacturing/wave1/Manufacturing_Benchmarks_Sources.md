---
status: DRAFT / SPEC ONLY — NOT EXECUTABLE
executable: false
containsVerticalComplianceLogic: true
phase: Manufacturing Vertical Knowledge Stack — Wave 1 / MFG-K-D
artifact: Benchmarks Source Document
locked: false
---

# Manufacturing Benchmarks — Source Document
**DRAFT / SPEC ONLY — DO NOT EXECUTE. Composition-only reference. No spine code, no D0 proof, no PC gates passed.**

---

**Document Title:** US Manufacturing Operational, Cost-Accounting, Financial, Variance, and Forecast-Variance Benchmarks — Advisacor Manufacturing Vertical Knowledge Stack, Module MFG-K-D
**Prepared for:** Wiseman Financial Technologies LLC (Advisacor)
**Generated:** June 22, 2026
**Version:** v0.9 (DRAFT — composition pass; benchmark ranges sourced to primary authorities; verification flags surfaced for MFG-K-E)
**Scope:** US manufacturing benchmarks across five Advisacor sub-segments — D (Discrete), P (Process), H (Hybrid), J (Job Shop), E (Engineer-to-Order)
**Companion modules:** MFG-K-A (KPIs — `Manufacturing_KPIs_Sources.md`), MFG-K-C (Disclosures — `Manufacturing_Disclosures_Sources.md`), MFG-K-E (to be authored — verification + gap closure)
**Data Currency:** Federal Reserve G.17 release dated June 15, 2026 (May 2026 reference month); Census ASM 2022 benchmark (most recent); NYU Stern sector margins January 2026; ASCM/IMA/AICPA/ASQ/ISO standards as published through mid-2026.

---

> ## ⚠️ CRITICAL DISCLAIMER — READ BEFORE USE
>
> **These are benchmarks, not targets.** They reflect industry median, top-quartile, and world-class reference ranges drawn from federal statistical programs, professional-body standards, and published surveys. They vary **materially** by NAICS sub-sector, plant scale, automation level, capital intensity, product mix, and reporting year. They are **NOT** performance objectives, are **NOT** pass/fail thresholds, and must **NOT** be used as standalone evaluation criteria.
>
> **Use of these benchmarks:** These ranges are inputs to Advisacor's automated flagging system. Entities outside typical ranges are surfaced for human review and contextual interpretation — never automatic scoring. A metric outside the published range may reflect entirely legitimate operational circumstances (e.g., a deliberately low-turn ETO shop carrying long-cycle WIP).
>
> **Sub-segment legend (used throughout):** **D** = Discrete · **P** = Process · **H** = Hybrid · **J** = Job Shop · **E** = Engineer-to-Order. A `✓` means the benchmark applies cleanly; `◑` means it applies with documented judgment/adjustment; `—` means not applicable or not meaningfully benchmarked for that sub-segment.
>
> **Subscription / proprietary data:** ASCM/APICS benchmark microdata, RMA Annual Statement Studies, and NACM credit-survey microdata are subscription programs. Ranges cited from these are drawn from publicly available summaries, definitions, and methodology pages; the underlying microdata is paywalled and flagged ⚠ where the exact figure could not be independently confirmed from a free primary URL.
>
> **Capacity-utilization currency note:** The Federal Reserve G.17 release of June 15, 2026 reports **total industry capacity utilization at 76.2%** and **manufacturing capacity utilization at 75.7%** for May 2026, with manufacturing running **2.5 percentage points below its 1972–2025 long-run average** ([Federal Reserve G.17, May 2026](https://www.federalreserve.gov/releases/g17/current/default.htm)). The original MFG-K-D brief cited "~75.7% May 2026"; that figure is the **manufacturing** series specifically and is confirmed. Total-industry utilization is the higher 76.2% figure.

---

## How to Read This Document

Each Part below frames its tables with a one-sentence lead-in, presents benchmark ranges with inline primary-source citations, and closes (where relevant) with a **Judgment Calls & Open Items** subsection marking items ◑ (judgment applied) or ⚠ (verification needed before lock). All formulas use plain-text or `\( ... \)` / `\[ ... \]` math notation; no `$` delimiters are used.

**Table of Contents**

- [Part I — Scope, NAICS Taxonomy, and Sub-Segment Matrix](#part-i)
- [Part II — Operational Benchmarks by Sub-Segment](#part-ii)
- [Part III — Financial Benchmarks by Sub-Segment](#part-iii)
- [Part IV — Variance Benchmarks (BINDING)](#part-iv)
- [Part V — Forecast Variance Benchmarks](#part-v)
- [Part VI — Sub-Segment Profile Cards](#part-vi)
- [Part VII — Benchmark Data Routing for Advisacor](#part-vii)
- [Part VIII — Cross-Reference Map](#part-viii)
- [Part IX — Implementation Checklist](#part-ix)

---

## Part I — Scope, NAICS Taxonomy, and Sub-Segment Matrix {#part-i}

The Advisacor manufacturing vertical is scoped to NAICS Sector 31-33 (Manufacturing), which the US Census Bureau defines as establishments "engaged in the mechanical, physical, or chemical transformation of materials, substances, or components into new products" ([Census NAICS](https://www.census.gov/naics/)). The official measurement frame for sub-sector scale is the Census Annual Survey of Manufactures, which the Census Bureau notes has transitioned into the Annual Integrated Economic Survey (AIES) beginning with March 2024 collection, with the 2022 ASM Benchmark as the most recent published establishment dataset ([Census ASM](https://www.census.gov/programs-surveys/asm.html); [Census AIES](https://www.census.gov/programs-surveys/aies.html)). The full classification definitions are published in the 2022 NAICS Manual ([2022 NAICS Manual PDF](https://www.census.gov/naics/reference_files_tools/2022_NAICS_Manual.pdf)), and the broader measurement program context is the Economic Census ([Census Economic Census](https://www.census.gov/programs-surveys/economic-census.html)). Sector-level employment is tracked by the Bureau of Labor Statistics Industries at a Glance program for Sector 31-33 ([BLS Manufacturing IAG](https://www.bls.gov/iag/tgs/iag31-33.htm); [BLS 31-33 workforce](https://www.bls.gov/iag/tgs/iag31-33.htm#workforce)), and labor-productivity context is published by the BLS Productivity program ([BLS Productivity](https://www.bls.gov/productivity/)).

### I.1 — NAICS Sector 31-33 Three-Digit Subsector Taxonomy

The table below enumerates the 21 three-digit manufacturing subsectors with representative six-digit examples, framed against the Census NAICS classification manual.

| 3-Digit NAICS | Subsector | Representative 6-Digit Example | Source |
|---|---|---|---|
| 311 | Food Manufacturing | 311111 Dog and Cat Food; 311230 Breakfast Cereal | [Census NAICS](https://www.census.gov/naics/) |
| 312 | Beverage and Tobacco Product | 312120 Breweries; 312140 Distilleries | [Census NAICS](https://www.census.gov/naics/) |
| 313 | Textile Mills | 313210 Broadwoven Fabric Mills | [Census NAICS](https://www.census.gov/naics/) |
| 314 | Textile Product Mills | 314120 Curtain and Linen Mills | [Census NAICS](https://www.census.gov/naics/) |
| 315 | Apparel Manufacturing | 315250 Cut and Sew Apparel | [Census NAICS](https://www.census.gov/naics/) |
| 316 | Leather and Allied Product | 316110 Leather and Hide Tanning | [Census NAICS](https://www.census.gov/naics/) |
| 321 | Wood Product | 321113 Sawmills; 321920 Wood Container/Pallet | [Census NAICS](https://www.census.gov/naics/) |
| 322 | Paper | 322120 Paper Mills; 322130 Paperboard Mills | [Census NAICS](https://www.census.gov/naics/) |
| 323 | Printing and Related Support | 323111 Commercial Printing | [Census NAICS](https://www.census.gov/naics/) |
| 324 | Petroleum and Coal Products | 324110 Petroleum Refineries | [Census NAICS](https://www.census.gov/naics/) |
| 325 | Chemical | 325110 Petrochemicals; 325412 Pharmaceutical Preparation | [Census NAICS](https://www.census.gov/naics/) |
| 326 | Plastics and Rubber Products | 326199 Plastics Products; 326211 Tires | [Census NAICS](https://www.census.gov/naics/) |
| 327 | Nonmetallic Mineral Product | 327310 Cement; 327213 Glass Containers | [Census NAICS](https://www.census.gov/naics/) |
| 331 | Primary Metal | 331110 Iron and Steel Mills | [Census NAICS](https://www.census.gov/naics/) |
| 332 | Fabricated Metal Product | 332710 Machine Shops; 332313 Plate Work; 332812 Coating | [Census NAICS](https://www.census.gov/naics/) |
| 333 | Machinery | 333611 Turbine and Turbine Generator Sets; 333120 Construction Machinery | [Census NAICS](https://www.census.gov/naics/) |
| 334 | Computer and Electronic Product | 334413 Semiconductors; 334111 Electronic Computers | [Census NAICS](https://www.census.gov/naics/) |
| 335 | Electrical Equipment, Appliance, Component | 335312 Motors and Generators | [Census NAICS](https://www.census.gov/naics/) |
| 336 | Transportation Equipment | 336411 Aircraft; 336111 Automobile Manufacturing | [Census NAICS](https://www.census.gov/naics/) |
| 337 | Furniture and Related Product | 337110 Wood Kitchen Cabinet; 337214 Office Furniture | [Census NAICS](https://www.census.gov/naics/) |
| 339 | Miscellaneous | 339112 Surgical/Medical Instruments | [Census NAICS](https://www.census.gov/naics/) |

### I.2 — Advisacor Sub-Type → NAICS Mapping

The table below maps each Advisacor manufacturing sub-segment to its representative NAICS codes, framed for the founder onboarding NAICS-selection flow (Part VII).

| Sub-Segment | Definition | Primary NAICS Codes | Representative 6-Digit Examples | Source |
|---|---|---|---|---|
| **D — Discrete** | Distinct, countable units assembled from components; BOM-driven | 333, 334, 335, 336, 337 | 333120 Construction Machinery; 334111 Computers; 335312 Motors; 336111 Automobiles; 337214 Office Furniture | [Census NAICS](https://www.census.gov/naics/) |
| **P — Process** | Continuous/batch transformation of materials measured by weight/volume; recipe/yield-driven | 311, 312, 322, 324, 325, 326 | 311230 Cereal; 312120 Breweries; 322120 Paper Mills; 324110 Refineries; 325110 Petrochemicals; 326199 Plastics | [Census NAICS](https://www.census.gov/naics/) |
| **H — Hybrid** | Process batch upstream + discrete packaging/assembly downstream | 311 + 325 (batch + packaging); 332 + 325 (metal + coating) | 311230 + 325998 (food batch + chemical packaging); 332812 Metal Coating over 332710 machined parts | [Census NAICS](https://www.census.gov/naics/) |
| **J — Job Shop** | High-mix, low-volume custom work to customer print; recurring | 332, 333 (custom), 811 (repair where in scope) | 332710 Machine Shops; 333514 Special Dies/Tools; 811310 Industrial Machinery Repair | [Census NAICS](https://www.census.gov/naics/) |
| **E — ETO (Engineer-to-Order)** | One-off capital equipment engineered per contract; long-cycle, % completion | 333 (capital equipment), 336411, 333611, 332313 | 336411 Aircraft; 333611 Turbines/Generators; 332313 Plate Work (metal tank fabrication); 333120 large construction machinery | [Census NAICS](https://www.census.gov/naics/) |

### I.3 — Sub-Sector Scale Reference (Census ASM)

The Census ASM 2022 Benchmark is the authoritative source for sub-sector revenue (value of shipments), value added, employment, capital expenditures, and cost of materials; the table below frames the scale dimensions Advisacor uses to set default company-size bands per NAICS. Exact dollar magnitudes per six-digit code are pulled from ASM table sets at runtime and are flagged ⚠ pending MFG-K-E extraction.

| Scale Dimension | ASM Variable | Use in Advisacor | Source |
|---|---|---|---|
| Revenue scale | Total Value of Shipments | Sets revenue-band defaults per NAICS in onboarding | [Census ASM](https://www.census.gov/programs-surveys/asm.html) |
| Value creation | Value Added | Cross-check on gross-margin reasonableness | [Census ASM](https://www.census.gov/programs-surveys/asm.html) |
| Workforce scale | Total Employment / Production Workers | Employee-band defaults; labor-intensity proxy | [Census ASM](https://www.census.gov/programs-surveys/asm.html); [BLS Manufacturing IAG](https://www.bls.gov/iag/tgs/iag31-33.htm) |
| Materials intensity | Total Cost of Materials | Direct-materials % of COGS prior (Part III) | [Census ASM](https://www.census.gov/programs-surveys/asm.html) |
| Capital intensity | Total Capital Expenditures | Capex/revenue prior (Part VI) | [Census ASM](https://www.census.gov/programs-surveys/asm.html) |

The Census visualization accompanying the 2022 ASM Benchmark states that manufacturing establishments' employment and value of shipments both increased from 2021 to 2022 ([Census ASM](https://www.census.gov/programs-surveys/asm.html)). Sector-wide employment trends are corroborated by the BLS Industries at a Glance series for Sector 31-33 ([BLS Manufacturing IAG](https://www.bls.gov/iag/tgs/iag31-33.htm)).

### I.4 — Judgment Calls & Open Items (Part I)

- ◑ **Hybrid (H) has no native NAICS code.** NAICS classifies establishments by primary activity, so a hybrid plant is coded to either its process or its discrete primary activity. Advisacor treats H as a derived sub-segment flagged by the founder during onboarding (multi-activity declaration), not by NAICS lookup alone. Cross-ref Part VII multi-entity wizard.
- ◑ **Job Shop vs. ETO boundary** is operational, not NAICS-coded: both can sit under 332/333. The distinguishing test is contract cycle length and engineering content (ETO = engineered-to-print one-offs with % completion accounting; Job Shop = recurring custom-to-print). Flagged for founder confirmation.
- ⚠ **Exact ASM 2022 dollar figures** per six-digit NAICS not embedded here; to be extracted in MFG-K-E from Census ASM table sets ([Census ASM](https://www.census.gov/programs-surveys/asm.html)).

---

## Part II — Operational Benchmarks by Sub-Segment {#part-ii}

This Part documents operational KPI benchmark bands aligned to MFG-K-A Sections III (OEE), IV (Supply-Chain/Inventory), and V (Quality). Each table uses the columns **Metric | Median | Top Quartile | World-Class | D | P | H | J | E | Primary Source | Notes**. World-class figures are sourced to the originating authority (Nakajima/JIPM via ASCM for OEE; ASQ for quality; ISO 22400 for KPI definitions).

### II.1 — OEE and Its Components (MFG-OPS-01 through 04)

The following table frames Overall Equipment Effectiveness and its three multiplicative components, where `OEE = Availability × Performance × Quality`, against the ASCM/APICS CPIM body of knowledge ([ASCM CPIM](https://www.ascm.org/learning-development/certifications-credentials/cpim/)) and the standardized ISO 22400-2 KPI definitions ([ISO 22400-2 OBP](https://www.iso.org/obp/ui/en/#iso:std:iso:22400:-2:ed-1:v1:en)), with the Nakajima/JIPM world-class thresholds (85% = 90% Availability × 95% Performance × 99% Quality).

| Metric | Median | Top Quartile | World-Class | D | P | H | J | E | Primary Source | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| **OEE** | 60–65% | 70–80% | ≥85% | ✓ | ✓ | ✓ | ◑ | ◑ | [ASCM/APICS](https://www.ascm.org/); [ISO 22400](https://www.iso.org/standard/56847.html) | Nakajima/JIPM world-class = 85% (90% Availability × 95% Performance × 99% Quality). Job Shop/ETO OEE is per-workcenter, not plant-wide; ◑ because high-mix changeover depresses Availability legitimately. |
| **Availability** | 80–90% | 90% | ≥90% | ✓ | ✓ | ✓ | ◑ | ◑ | [ASCM/APICS](https://www.ascm.org/); [ISO 22400](https://www.iso.org/standard/56847.html) | `Availability = Run Time ÷ Planned Production Time`. Process plants run highest (continuous operation); job shops lowest (frequent setups). |
| **Performance** | 90–95% | 95% | ≥95% | ✓ | ✓ | ✓ | ✓ | ◑ | [ASCM/APICS](https://www.ascm.org/); [ISO 22400](https://www.iso.org/standard/56847.html) | `Performance = (Ideal Cycle Time × Total Count) ÷ Run Time`. ETO performance hard to define vs. an ideal cycle; ◑. |
| **Quality** | 95–99% | 99% | ≥99% | ✓ | ✓ | ✓ | ✓ | ✓ | [ASCM/APICS](https://www.ascm.org/); [ASQ](https://asq.org/) | `Quality = Good Count ÷ Total Count`. World-class 99%+ aligns with ASQ first-pass yield benchmarks (II.3). |

### II.2 — Reliability and Cycle Benchmarks (MFG-OPS-06, 07, 10, 11; MFG-Q reliability)

The table below frames reliability and cycle-discipline metrics; world-class SMED changeover (<10 minutes) traces to Shingo's single-minute-exchange-of-die definition adopted in ASCM/APICS lean curricula.

| Metric | Median | Top Quartile | World-Class | D | P | H | J | E | Primary Source | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| **MTBF** | Asset-specific | Higher | Maximized | ✓ | ✓ | ✓ | ✓ | ◑ | [ISO 22400](https://www.iso.org/standard/56847.html); [ASCM/APICS](https://www.ascm.org/) | `MTBF = Total Operating Time ÷ Number of Failures`. Absolute targets are asset-class-specific; benchmark is trend (rising) not level. |
| **MTTR** | Asset-specific | Lower | Minimized | ✓ | ✓ | ✓ | ✓ | ◑ | [ISO 22400](https://www.iso.org/standard/56847.html); [ASCM/APICS](https://www.ascm.org/) | `MTTR = Total Repair Time ÷ Number of Repairs`. Lower is better; world-class plants pair high MTBF with low MTTR. |
| **Cycle Time variance** | ±10–15% | ±5–10% | ±<5% | ✓ | ✓ | ✓ | ✓ | ◑ | [ISO 22400](https://www.iso.org/standard/56847.html); [ASCM/APICS](https://www.ascm.org/) | Variance of actual cycle vs. ideal/standard cycle. ETO uses milestone variance instead. |
| **Takt-time adherence** | 85–90% | 90–95% | ≥95% | ✓ | ◑ | ✓ | ◑ | — | [ASCM/APICS](https://www.ascm.org/) | Takt applies to repetitive flow (`Takt = Available Time ÷ Customer Demand`); ◑/— for process (rate-based) and ETO (project-based). |
| **Setup / Changeover (SMED)** | 30–60 min | 10–30 min | <10 min | ✓ | ◑ | ✓ | ✓ | — | [ASCM/APICS](https://www.ascm.org/) | SMED single-digit-minute target. Process plants measure grade-change/CIP time, not die exchange; ◑. |

### II.3 — Quality Benchmarks (MFG-Q-01 through 03, 08, 09)

The table below frames first-pass yield, defect, scrap, and capability metrics against the ASQ Six Sigma ([ASQ Six Sigma](https://asq.org/quality-resources/six-sigma)) and process-capability ([ASQ Process Capability](https://asq.org/quality-resources/process-capability)) bodies of knowledge; the 3.4 PPM world-class figure is the canonical Six Sigma defect level (process centered with 1.5σ shift), and capability is monitored via control charts ([ASQ Control Charts](https://asq.org/quality-resources/control-chart)).

| Metric | Median | Top Quartile | World-Class | D | P | H | J | E | Primary Source | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| **First-Pass Yield (FPY)** | 90–95% | 95–98% | ≥99% | ✓ | ✓ | ✓ | ✓ | ◑ | [ASQ](https://asq.org/); [ISO 22400](https://www.iso.org/standard/56847.html) | `FPY = Good Units First Pass ÷ Units Started`. Process plants often higher (stable recipes); ETO low-volume FPY noisy. Target 95%+ per MFG-K-A MFG-Q-01. |
| **Defect Rate / PPM** | 1,000–10,000 PPM | 100–1,000 PPM | <50 PPM (Six Sigma 3.4 PPM) | ✓ | ✓ | ✓ | ✓ | ◑ | [ASQ](https://asq.org/) | World-class <50 PPM; true Six Sigma = 3.4 defects per million opportunities (DPMO) at 6σ with 1.5σ shift. Electronics (334) runs tightest PPM. |
| **Scrap Rate** | 2–5% | 1–2% | <1% | ✓ | ✓ | ✓ | ✓ | ◑ | [ASQ](https://asq.org/); [ASCM/APICS](https://www.ascm.org/) | <2% of material cost is the manufacturing benchmark (MFG-K-A MFG-Q-03). Process yield-loss scrap structurally higher; quantified via MFG-V-10 yield variance. |
| **Rework Rate** | 2–5% | 1–3% | <1% | ✓ | ✓ | ✓ | ✓ | ◑ | [ASQ](https://asq.org/) | `Rework = Reworked Units ÷ Total Units`. Job shops carry higher rework on first-article custom runs; ◑. |
| **Cpk** | 1.00–1.33 | 1.33–1.67 | ≥1.67 | ✓ | ✓ | ✓ | ◑ | ◑ | [ASQ](https://asq.org/) | Cpk ≥1.33 = "capable" (4σ); ≥1.67 = world-class (5σ); 2.00 = 6σ. Short-run job/ETO work lacks the run length for stable Cpk; ◑. |
| **Ppk** | 1.00–1.33 | 1.33–1.67 | ≥1.67 | ✓ | ✓ | ✓ | ◑ | ◑ | [ASQ](https://asq.org/) | Ppk uses overall (long-term) sigma; Cpk uses within-subgroup sigma. Ppk ≤ Cpk when the process drifts. Same ◑ logic as Cpk. |
| **Sigma Level** | ~3–4σ | 4–5σ | 6σ (3.4 DPMO) | ✓ | ✓ | ✓ | ◑ | ◑ | [ASQ](https://asq.org/) | Maps to PPM row. 3σ ≈ 66,807 DPMO; 4σ ≈ 6,210; 5σ ≈ 233; 6σ ≈ 3.4 (with 1.5σ shift). |

### II.4 — Inventory and Supply-Chain Benchmarks (MFG-SC-01, 02, 08; MFG-FIN-07)

The table below frames inventory-efficiency and delivery benchmarks drawn from the ASCM/APICS CSCP body of knowledge ([ASCM CSCP](https://www.ascm.org/learning-development/certifications-credentials/cscp/)); process manufacturing typically turns inventory faster than discrete because of shorter, recipe-driven cycles and commodity throughput. The capacity-utilization row is anchored to the Federal Reserve G.17 capacity-utilization detail ([Fed G.17 caputl](https://www.federalreserve.gov/releases/g17/caputl.htm)) and the full release PDF ([Fed G.17 PDF](https://www.federalreserve.gov/releases/g17/Current/g17.pdf)).

| Metric | Median | Top Quartile | World-Class | D | P | H | J | E | Primary Source | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| **Inventory Turns** | 4–6x | 8–12x | >12x | ✓ | ✓ | ✓ | ◑ | ◑ | [ASCM/APICS](https://www.ascm.org/); [Census ASM](https://www.census.gov/programs-surveys/asm.html) | `Turns = COGS ÷ Average Inventory`. Process > Discrete typically (food/beverage 10–15x; heavy machinery 4–6x). ETO low (1–3x) due to long-cycle WIP; ◑. |
| **Days Inventory Outstanding (DIO)** | 60–90 days | 30–45 days | <30 days | ✓ | ✓ | ✓ | ◑ | ◑ | [ASCM/APICS](https://www.ascm.org/) | `DIO = 365 ÷ Inventory Turns`. Inverse of turns; ETO carries 120+ days legitimately. Aligns MFG-K-A MFG-FIN-07. |
| **Supplier On-Time Delivery (inbound)** | 90–95% | 95–98% | ≥98% | ✓ | ✓ | ✓ | ✓ | ✓ | [ASCM/APICS](https://www.ascm.org/) | Inbound OTD; feeds DM availability and schedule adherence. |
| **On-Time Delivery (OTD, outbound)** | 90–95% | 95–98% | ≥98% | ✓ | ✓ | ✓ | ✓ | ◑ | [ASCM/APICS](https://www.ascm.org/) | 95%+ is the cross-industry benchmark (MFG-K-A MFG-SC-08/09 family). ETO measures milestone OTD; ◑. |
| **Schedule Adherence** | 85–90% | 90–95% | ≥95% | ✓ | ✓ | ✓ | ◑ | ◑ | [ASCM/APICS](https://www.ascm.org/) | `Adherence = Scheduled Jobs Completed On Plan ÷ Total Scheduled`. Job shop/ETO adherence noisier from demand variability. |
| **Capacity Utilization** | ~75.7% (mfg, May 2026) | 80–85% | ~85% practical max | ✓ | ✓ | ✓ | ◑ | ◑ | [Federal Reserve G.17](https://www.federalreserve.gov/releases/g17/current/default.htm) | **PRIMARY = Fed G.17.** Manufacturing series 75.7% (May 2026), 2.5pp below 1972–2025 long-run average; total industry 76.2%. ~85% is the conventional practical ceiling before bottleneck. |

### II.5 — Judgment Calls & Open Items (Part II)

- ◑ **OEE world-class composition (85%)** is the Nakajima/JIPM standard popularized via ASCM/APICS and OEE.com; the 90/95/99 component split is a definitional convention, not a single citable federal statistic. Treated as an industry-standard reference, not a measured median.
- ◑ **Job Shop / ETO OEE, takt, SMED** apply at workcenter granularity only; plant-wide rollups for these sub-segments are not meaningful and are suppressed in the panel (cross-ref Part VII band logic).
- ⚠ **Inventory-turn sub-segment splits** (food 10–15x vs. machinery 4–6x) are directional industry consensus; exact sub-sector turn medians should be cross-validated against RMA Annual Statement Studies ([RMA](https://www.rmahq.org/)) and Census ASM inventory-to-shipments ratios in MFG-K-E.
- ⚠ **PPM/Cpk world-class levels** are ASQ-standard definitions; the *distribution* of actual plant performance by sub-segment is not published as a free federal dataset — flagged for MFG-K-E sourcing from ASQ Quality Progress survey summaries.

---

## Part III — Financial Benchmarks by Sub-Segment {#part-iii}

This Part documents financial benchmark bands aligned to MFG-K-A Section I (MFG-FIN-01 through 09). Sector-margin anchors are drawn from the NYU Stern (Damodaran) US industry margin dataset (January 2026 update), which compiles margins from public-company filings by sector ([NYU Stern margins](https://pages.stern.nyu.edu/~adamodar/New_Home_Page/datafile/margin.html)); cost-structure and capital-intensity anchors are drawn from Census ASM and the AIES successor program ([Census AIES](https://www.census.gov/programs-surveys/aies.html)); price-trend context from the BLS PPI program and its monthly news release ([BLS PPI news release](https://www.bls.gov/news.release/ppi.nr0.htm)); and credit/working-capital context from NACM and the RMA Annual Statement Studies ([RMA Annual Statement Studies](https://www.rmahq.org/annual-statement-studies/)). Return and working-capital ratios are corroborated against the Stern working-capital ([Stern working capital](https://pages.stern.nyu.edu/~adamodar/New_Home_Page/datafile/wcdata.html)), capex ([Stern capex](https://pages.stern.nyu.edu/~adamodar/New_Home_Page/datafile/capex.html)), and return-on-capital ([Stern ROE/ROIC](https://pages.stern.nyu.edu/~adamodar/New_Home_Page/datafile/roe.html)) datasets.

### III.1 — Margin Benchmarks by Sub-Segment

The table below frames gross, EBITDA, and net margin ranges; the manufacturing-wide gross-margin average is ~32%, with chemical/specialty and machinery sub-sectors structurally higher and food/commodity/auto lower, per the NYU Stern January 2026 sector dataset.

| Metric | Median (sector-weighted) | Top Quartile | World-Class | D | P | H | J | E | Primary Source | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| **Gross Margin** | ~32% (mfg avg) | 35–45% | >45% | ✓ | ✓ | ✓ | ◑ | ◑ | [NYU Stern Margins (Jan 2026)](https://pages.stern.nyu.edu/~adamodar/New_Home_Page/datafile/margin.html) | Machinery 37.5%, Specialty Chemical 35.1%, Packaging 24.3%, Food Processing 23.2%, Paper 17.1%, Auto Parts 15.8%, Auto & Truck 10.4%, Basic Chemical 9.3% (Stern Jan 2026). P spans the widest range (pharma high, commodity low). |
| **EBITDA Margin** | 12–20% | 20–30% | >30% | ✓ | ✓ | ✓ | ◑ | ◑ | [NYU Stern Margins (Jan 2026)](https://pages.stern.nyu.edu/~adamodar/New_Home_Page/datafile/margin.html) | Metals & Mining 29.4%, Machinery 19.6%, Specialty Chemical 18.0%, Food Processing 15.3%, Paper 14.7%, Packaging 14.4%, Basic Chemical 12.3%, Auto Parts 9.0%, Rubber & Tires 8.7%, Auto & Truck 7.5% (Stern Jan 2026). |
| **Net Margin** | 2–6% | 6–10% | >10% | ✓ | ✓ | ✓ | ◑ | ◑ | [NYU Stern Margins (Jan 2026)](https://pages.stern.nyu.edu/~adamodar/New_Home_Page/datafile/margin.html) | Machinery 10.6%, Metals & Mining 10.5%, Packaging 4.5%, Paper 3.4%, Specialty Chemical 2.9%, Food Processing 2.8%, Auto & Truck 1.3%, Auto Parts 0.7%; Basic Chemical −3.7% and Rubber & Tires −9.5% (cyclical losses, Jan 2026). |

### III.2 — Cost-Structure Benchmarks

The table below frames manufacturing cost structure; direct-materials dominance of COGS and the <65% total-manufacturing-cost-of-revenue benchmark align with MFG-K-A MFG-FIN-05 and the Census ASM cost-of-materials variable.

| Metric | Median | Top Quartile | World-Class | D | P | H | J | E | Primary Source | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| **Total Mfg Cost as % of Revenue** | 65–75% | 60–65% | <60% | ✓ | ✓ | ✓ | ✓ | ✓ | [Census ASM](https://www.census.gov/programs-surveys/asm.html); [NYU Stern Margins](https://pages.stern.nyu.edu/~adamodar/New_Home_Page/datafile/margin.html) | <65% benchmark = inverse of ~35% gross margin (MFG-K-A MFG-FIN-05). Process/commodity runs higher (thin margins). |
| **Direct Materials % of COGS** | 50–70% | — | — | ✓ | ✓ | ✓ | ✓ | ✓ | [Census ASM](https://www.census.gov/programs-surveys/asm.html) | ASM cost-of-materials ÷ value of shipments confirms materials dominance. Process highest (60–80% in refining/chemicals); ETO lower (engineering-heavy). |
| **Direct Labor % of COGS** | 10–25% | — | — | ✓ | ◑ | ✓ | ◑ | ◑ | [Census ASM](https://www.census.gov/programs-surveys/asm.html); [BLS Manufacturing IAG](https://www.bls.gov/iag/tgs/iag31-33.htm) | Lower (5–10%) in automated/continuous process; higher (25–40%) in labor-intensive job shop and ETO. |
| **Mfg Overhead % of COGS** | 15–30% | — | — | ✓ | ✓ | ✓ | ✓ | ✓ | [Census ASM](https://www.census.gov/programs-surveys/asm.html) | Capital-intensive process plants carry high fixed overhead (depreciation, energy); see MFG-V-07a/b. |
| **SG&A % of Revenue** | 8–18% | 5–8% | <5% | ✓ | ✓ | ✓ | ✓ | ◑ | [NYU Stern Margins](https://pages.stern.nyu.edu/~adamodar/New_Home_Page/datafile/margin.html) | Derived as gap between gross and operating margin in Stern dataset. ETO carries heavy engineering SG&A. |

### III.3 — Returns and Working-Capital Benchmarks

The table below frames return and working-capital metrics aligned to MFG-K-A MFG-FIN-06, 08, 09; cash-conversion-cycle and DSO/DPO context is corroborated by NACM credit benchmarks.

| Metric | Median | Top Quartile | World-Class | D | P | H | J | E | Primary Source | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| **ROIC / Return on Net Assets (RONA)** | 8–12% | 12–18% | >18% | ✓ | ✓ | ✓ | ◑ | ◑ | [NYU Stern (Damodaran)](https://pages.stern.nyu.edu/~adamodar/New_Home_Page/datafile/margin.html); [RMA](https://www.rmahq.org/) | RONA = NOPAT ÷ (Fixed Assets + Net Working Capital), MFG-K-A MFG-FIN-09. Capital-intensive process plants show lower asset turnover, pressuring RONA. |
| **Working Capital % of Revenue** | 15–25% | 10–15% | <10% | ✓ | ✓ | ✓ | ◑ | ◑ | [NACM](https://www.nacm.org/); [RMA](https://www.rmahq.org/) | ETO can run negative (customer advances/milestone billing); process commodity runs lean. |
| **DSO** | 45–60 days | 35–45 days | <35 days | ✓ | ✓ | ✓ | ✓ | ◑ | [NACM](https://www.nacm.org/) | MFG-K-A MFG-FIN-01. NACM credit surveys anchor manufacturing trade-receivable terms (net-30/net-60 dominant). |
| **DPO** | 30–45 days | 45–60 days | >60 days | ✓ | ✓ | ✓ | ✓ | ✓ | [NACM](https://www.nacm.org/) | Higher DPO improves CCC but strains supplier relations; balance flagged. |
| **Cash Conversion Cycle (CCC)** | 60–90 days | 30–60 days | <30 days | ✓ | ✓ | ✓ | ◑ | ◑ | [ASCM/APICS](https://www.ascm.org/); [NACM](https://www.nacm.org/) | `CCC = DIO + DSO − DPO` (MFG-K-A MFG-FIN-06). ETO frequently negative via advance billing; ◑. |

### III.4 — Price-Trend Context (BLS PPI)

The BLS Producer Price Index is the primary federal source for input-cost inflation that drives the Direct Materials Price Variance (MFG-V-01 / MFG-FV-01) ([BLS PPI program](https://www.bls.gov/ppi/); [BLS PPI fact sheet](https://www.bls.gov/ppi/factsheets/producer-price-index-ppi.htm); [BLS PPI data tools](https://www.bls.gov/ppi/data.htm)); the table below frames PPI usage rather than a static benchmark, since price-variance thresholds (Part IV) must be read against current PPI movement reported in the monthly news release ([BLS PPI news release](https://www.bls.gov/news.release/ppi.nr0.htm)).

| PPI Series Use | Variance Linkage | Source |
|---|---|---|
| Final demand manufacturing PPI | DM price-variance baseline; gross-margin squeeze early warning | [BLS PPI](https://www.bls.gov/ppi/) |
| Industry-level PPI (3-digit NAICS) | Sub-segment-specific input-cost trend (e.g., 325 chemicals, 324 petroleum) | [BLS PPI](https://www.bls.gov/ppi/) |
| Commodity PPI (steel, resins, energy) | Process/Hybrid DM price-variance exposure quantification | [BLS PPI](https://www.bls.gov/ppi/) |

### III.5 — Judgment Calls & Open Items (Part III)

- ◑ **"~32% manufacturing-wide gross margin"** is a sector-weighted approximation; the NYU Stern dataset shows a wide spread (9.3% basic chemical to 37.5% machinery, Jan 2026), so the panel applies *sub-sector-specific* margin bands rather than a single 32% line. The 32% figure is retained only as the documented headline reference.
- ◑ **NYU Stern is a public-company dataset**, skewing toward larger firms; SMB manufacturers (Advisacor's core) often run thinner margins. Bands are widened on the low side accordingly and cross-referenced to RMA SMB ratios.
- ⚠ **Direct Materials / Direct Labor / Overhead split percentages** are derived from ASM aggregates and industry convention, not a single published "DM/DL/OH %" table; exact splits per sub-sector flagged for MFG-K-E using ASM materials-cost and payroll variables ([Census ASM](https://www.census.gov/programs-surveys/asm.html)).
- ⚠ **RMA and NACM exact ratio medians** are paywalled; DSO/DPO/working-capital bands here are industry-consensus ranges pending RMA Annual Statement Studies extraction ([RMA](https://www.rmahq.org/); [NACM](https://www.nacm.org/)).

---

## Part IV — Variance Benchmarks (BINDING) {#part-iv}

**This Part is binding — it feeds the Command Center Manufacturing Variances panel.** It documents typical magnitude ranges, industry-acceptable thresholds, alert thresholds, and sub-segment patterns for MFG-V-01 through MFG-V-08 plus the process/hybrid mix/yield decomposition MFG-V-09/10. Variance methodology and the favorable/unfavorable sign convention follow IMA Statements on Management Accounting ([IMA strategic cost management](https://www.imanet.org/insights-and-trends/strategic-cost-management); [IMA competencies](https://www.imanet.org/career-resources/management-accounting-competencies)) and AICPA-CIMA cost-accounting standards ([AICPA-CIMA cost management](https://www.aicpa-cima.com/resources/landing/cost-management); [AICPA-CIMA cost accounting](https://www.aicpa-cima.com/cpe-learning/course/cost-accounting)); standard-vs-actual variance formulas are the standard-costing canon documented in those bodies' management-accounting guidance.

> **Variance sign convention (per MFG-K-A panel contract):** Favorable (F) = negative stored value; Unfavorable (U) = positive stored value. Thresholds below are stated as absolute percentage of standard (|variance| ÷ standard cost), direction-agnostic, unless noted.

### IV.1 — Realized Variance Magnitude & Threshold Bands

The table below frames each realized variance with its typical normal range (% of standard), the acceptable band, and the alert threshold beyond which the panel surfaces the item for review; thresholds are management-accounting conventions documented by IMA/AICPA-CIMA rather than statutory limits.

| Variance ID | Panel Field | Typical Normal Range (% of std) | Acceptable Threshold | Alert Threshold | Primary Source | Notes |
|---|---|---|---|---|---|---|
| **MFG-V-01** DM Price | `directMaterialsPriceVariance` | ±2–5% | ≤±5% | >±5% | [IMA](https://www.imanet.org/); [BLS PPI](https://www.bls.gov/ppi/) | Read against current PPI movement; commodity spikes legitimately breach ±5%. Largest single variance for Process. |
| **MFG-V-02** DM Usage (Quantity) | `directMaterialsUsageVariance` | ±2–4% | ≤±4% | >±5% | [IMA](https://www.imanet.org/); [AICPA-CIMA](https://www.aicpa-cima.com/) | Driven by scrap/yield; decomposes into mix/yield (V-09/10) for process. |
| **MFG-V-03** DL Rate | `directLaborRateVariance` | ±2–4% | ≤±4% | >±5% | [IMA](https://www.imanet.org/) | Overtime premium and labor-mix shifts; relatively stable except in tight labor markets. |
| **MFG-V-04** DL Efficiency | `directLaborEfficiencyVariance` | ±3–8% | ≤±8% | >±10% | [IMA](https://www.imanet.org/); [AICPA-CIMA](https://www.aicpa-cima.com/) | Widest normal band; learning-curve-driven. ETO breaches routinely on first articles. |
| **MFG-V-05** VOH Spending | `variableOverheadSpendingVariance` | ±3–6% | ≤±6% | >±8% | [IMA](https://www.imanet.org/) | Indirect materials, utilities, supplies vs. flexed budget. |
| **MFG-V-06** VOH Efficiency | `variableOverheadEfficiencyVariance` | ±3–8% | ≤±8% | >±10% | [IMA](https://www.imanet.org/) | Mathematically tied to DL efficiency when allocation base is labor hours. |
| **MFG-V-07a** FOH Spending (Budget) | `fixedOverheadSpendingVariance` | ±2–5% | ≤±5% | >±7% | [IMA](https://www.imanet.org/); [AICPA-CIMA](https://www.aicpa-cima.com/) | Actual fixed OH vs. static budget; should be small if budgeting is sound. |
| **MFG-V-07b** FOH Volume | `fixedOverheadVolumeVariance` | ±5–15% | ≤±10% | >±15% | [IMA](https://www.imanet.org/); [Federal Reserve G.17](https://www.federalreserve.gov/releases/g17/current/default.htm) | Pure capacity-utilization artifact; widest at low utilization. Track against Fed G.17 capacity-utilization context (75.7% mfg, May 2026). |
| **MFG-V-08** Total Mfg Cost | `totalManufacturingCostVariance` | ±3–6% (net) | ≤±5% | >±8% | [IMA](https://www.imanet.org/); [AICPA-CIMA](https://www.aicpa-cima.com/) | Sum of V-01..V-07b; offsetting components can mask large gross variances, so component drill-down is mandatory. |

### IV.2 — Process / Hybrid Mix & Yield Decomposition (MFG-V-09/10)

The table below frames the materials mix and yield variances that decompose MFG-V-02 for process and hybrid plants, where multi-input recipes make mix/yield the defining economic levers per IMA/AICPA process-costing guidance.

| Variance ID | Decomposition | Typical Normal Range | Alert Threshold | D | P | H | J | E | Primary Source | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| **MFG-V-09** DM Mix | MFG-V-02 → Mix | ±1–3% | >±4% | ◑ | ✓ | ✓ | — | — | [IMA](https://www.imanet.org/); [AICPA-CIMA](https://www.aicpa-cima.com/) | Substitution among recipe inputs; meaningful only for multi-input processes. |
| **MFG-V-10** DM Yield | MFG-V-02 → Yield | ±2–5% | >±5% | ◑ | ✓ | ✓ | — | — | [IMA](https://www.imanet.org/); [AICPA-CIMA](https://www.aicpa-cima.com/) | Output-per-input-set vs. standard; the core process-plant economic lever, tied to scrap rate (II.3). |

### IV.3 — Sub-Segment Variance Patterns

The table below frames how variance exposure differs by sub-segment, framed for the panel's sub-segment-aware threshold tuning.

| Sub-Segment | Largest Variance Exposure | Why | Threshold Tuning | Source |
|---|---|---|---|---|
| **D — Discrete** | Balanced across DM usage, DL efficiency, FOH volume | BOM-driven; standard costs well-established | Use base bands (IV.1) unchanged | [IMA](https://www.imanet.org/) |
| **P — Process** | DM Price (V-01) + DM Yield (V-10) | Commodity input exposure + yield economics dominate | Widen V-01 alert to track PPI; emphasize V-09/10 | [IMA](https://www.imanet.org/); [BLS PPI](https://www.bls.gov/ppi/) |
| **H — Hybrid** | DM Price/Yield upstream + DL Efficiency downstream | Inherits both process and discrete exposures | Apply process bands upstream, discrete bands downstream | [IMA](https://www.imanet.org/); [AICPA-CIMA](https://www.aicpa-cima.com/) |
| **J — Job Shop** | FOH Volume (V-07b) + DL Efficiency (V-04) | Demand variability drives volume swings; high-mix labor variance | Widen V-07b alert (>±18%) given demand variability | [IMA](https://www.imanet.org/) |
| **E — ETO** | DL Efficiency (V-04) | Learning curves on one-off engineered builds | Widen V-04 normal band to ±10–15%; first-article carve-out | [IMA](https://www.imanet.org/); [AICPA-CIMA](https://www.aicpa-cima.com/) |

### IV.4 — Judgment Calls & Open Items (Part IV)

- ◑ **Threshold magnitudes (±5%, ±10%, etc.)** are management-accounting conventions (IMA/AICPA "materiality of variance" guidance) tuned by Advisacor for SMB manufacturers; they are *not* statutory and are founder-overridable per entity. Defaults documented here are the starting profile.
- ◑ **Process DM Price band widening** is deliberate: because process plants carry the largest commodity-input exposure, a flat ±5% alert would false-positive during normal PPI cycles; the panel reads V-01 against the BLS PPI movement for that 3-digit NAICS ([BLS PPI](https://www.bls.gov/ppi/)).
- ◑ **ETO first-article carve-out** suppresses the first unit of a new engineered build from DL-efficiency alerting (learning-curve expected); flagged for founder confirmation.
- ⚠ **No free federal "typical variance magnitude" dataset exists.** The ±% ranges are synthesized from IMA/AICPA cost-accounting pedagogy and academic cost-accounting texts; they should be validated against a sample of tenant data in MFG-K-E before the panel locks thresholds.

---

## Part V — Forecast Variance Benchmarks {#part-v}

Per the Q6 resolution, forecast variances are in scope at v1.0. This Part documents forecast-to-actual accuracy benchmarks for MFG-FV-01 through MFG-FV-08, which mirror the realized MFG-V-0n variances using forecast inputs in place of actuals (see MFG-K-A Forecast Variance Parallel Block). The governing accuracy benchmarks come from the ASCM/APICS S&OP and demand-planning bodies of knowledge embedded in the CPIM and CSCP curricula ([ASCM CPIM](https://www.ascm.org/learning-development/certifications-credentials/cpim/); [ASCM CSCP](https://www.ascm.org/learning-development/certifications-credentials/cscp/)).

### V.1 — Forecast Accuracy Benchmarks (S&OP / Demand Planning)

The table below frames aggregate and SKU-level forecast-accuracy benchmarks; MAPE under 15% is "good" and under 10% "world-class" for aggregate horizons per ASCM/APICS demand-planning standards, with SKU-level MAPE structurally higher.

| Metric | Median | Good | World-Class | D | P | H | J | E | Primary Source | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| **Aggregate MAPE** | 15–25% | <15% | <10% | ✓ | ✓ | ✓ | ◑ | ◑ | [ASCM/APICS](https://www.ascm.org/) | `MAPE = mean(|Actual − Forecast| ÷ Actual)`. Aggregate (plant/family) horizon. |
| **SKU-level MAPE** | 30–50% | <30% | <20% | ✓ | ✓ | ✓ | ◑ | — | [ASCM/APICS](https://www.ascm.org/) | Disaggregation inflates error; SKU MAPE always exceeds aggregate. |
| **Forecast Bias (MPE)** | ±5–10% | ≤±5% | ≤±2% | ✓ | ✓ | ✓ | ◑ | ◑ | [ASCM/APICS](https://www.ascm.org/) | `MPE = mean((Actual − Forecast) ÷ Actual)`; persistent sign indicates systemic over/under-forecasting. Tracking signal > ±4 MAD flags. |
| **S&OP Plan Attainment** | 80–90% | 90–95% | ≥95% | ✓ | ✓ | ✓ | ◑ | ◑ | [ASCM/APICS](https://www.ascm.org/) | Actual vs. consensus S&OP plan; the master accuracy gate feeding MFG-FV-07b volume forecast. |

### V.2 — Sub-Segment Forecast-Accuracy Patterns

The table below frames forecast predictability by sub-segment; process plants achieve higher accuracy from longer planning horizons and stable demand, while ETO is structurally low-predictability.

| Sub-Segment | Typical Aggregate MAPE | Predictability | Why | Source |
|---|---|---|---|---|
| **D — Discrete** | 15–25% | Moderate | Mixed make-to-stock / make-to-order; BOM explosion aids planning | [ASCM/APICS](https://www.ascm.org/) |
| **P — Process** | 8–15% | High | Long planning horizons, stable commodity demand, continuous run | [ASCM/APICS](https://www.ascm.org/) |
| **H — Hybrid** | 12–20% | Moderate-High | Process upstream stable; packaging mix adds variability | [ASCM/APICS](https://www.ascm.org/) |
| **J — Job Shop** | 25–40% | Low | High-mix custom demand; order-driven | [ASCM/APICS](https://www.ascm.org/) |
| **E — ETO** | 40%+ | Very Low | One-off projects; demand is pipeline/quote-driven, not statistical | [ASCM/APICS](https://www.ascm.org/) |

### V.3 — Forecast Variance ID Mapping

The table below restates the MFG-FV-0n forecast-variance IDs and the accuracy target that gates each, framed for the panel's forecast-variance section binding.

| Forecast Variance ID | Mirrors | Accuracy Target Applied | Source |
|---|---|---|---|
| **MFG-FV-01** Forecast DM Price | MFG-V-01 | DM price forecast within ±5% of actual (PPI-anchored) | [ASCM/APICS](https://www.ascm.org/); [BLS PPI](https://www.bls.gov/ppi/) |
| **MFG-FV-02** Forecast DM Usage | MFG-V-02 | Volume forecast MAPE target (V.1) | [ASCM/APICS](https://www.ascm.org/) |
| **MFG-FV-03** Forecast DL Rate | MFG-V-03 | Labor-rate forecast within ±4% | [ASCM/APICS](https://www.ascm.org/) |
| **MFG-FV-04** Forecast DL Efficiency | MFG-V-04 | Hours forecast tied to volume MAPE | [ASCM/APICS](https://www.ascm.org/) |
| **MFG-FV-05** Forecast VOH Spending | MFG-V-05 | VOH-rate forecast within ±6% | [ASCM/APICS](https://www.ascm.org/) |
| **MFG-FV-06** Forecast VOH Efficiency | MFG-V-06 | Tied to hours/volume MAPE | [ASCM/APICS](https://www.ascm.org/) |
| **MFG-FV-07a** Forecast FOH Spending | MFG-V-07a | Fixed-OH budget forecast within ±5% | [ASCM/APICS](https://www.ascm.org/) |
| **MFG-FV-07b** Forecast FOH Volume | MFG-V-07b | Volume/output forecast = S&OP plan attainment gate | [ASCM/APICS](https://www.ascm.org/) |
| **MFG-FV-08** Forecast Total Mfg Cost | MFG-V-08 | Σ of FV-01..FV-07b; inherits component targets | [ASCM/APICS](https://www.ascm.org/) |

### V.4 — Judgment Calls & Open Items (Part V)

- ◑ **MAPE <15% good / <10% world-class** are ASCM/APICS demand-planning conventions widely taught in the APICS CPIM/CSCP bodies of knowledge; they are presented as the standard reference, not a measured federal statistic.
- ◑ **ETO MAPE benchmarking is suppressed at SKU level** (— in V.1): one-off projects have no statistical demand history, so the panel applies pipeline-conversion accuracy instead of MAPE for ETO.
- ⚠ **ASCM benchmark microdata is subscription-gated.** The accuracy thresholds reflect published ASCM/APICS standards and definitions; exact percentile distributions flagged for MFG-K-E.

---

## Part VI — Sub-Segment Profile Cards {#part-vi}

One profile card per Advisacor sub-segment, each consolidating the representative NAICS codes, Census ASM scale bands, cost structure, key operational targets, working-capital and capex intensity, and the disclosure-linked accounting considerations cross-referenced to MFG-K-C.

### VI.1 — Profile Card: D — Discrete

- **Representative NAICS:** 333 Machinery, 334 Computer/Electronic, 335 Electrical Equipment, 336 Transportation Equipment, 337 Furniture ([Census NAICS](https://www.census.gov/naics/)).
- **Typical size bands (Census ASM):** Wide; spans small fabricators to large OEMs. Revenue and employee bands set per six-digit code from ASM value-of-shipments and employment ([Census ASM](https://www.census.gov/programs-surveys/asm.html)).
- **Cost structure:** DM 50–65% of COGS, DL 10–20%, OH 20–30% ([Census ASM](https://www.census.gov/programs-surveys/asm.html)).
- **Key operational targets:** OEE 85% world-class, FPY ≥99%, Inventory Turns 4–8x, OTD ≥95%, SMED <10 min ([ASCM/APICS](https://www.ascm.org/); [ASQ](https://asq.org/)).
- **Working-capital intensity:** Moderate (WC 15–25% of revenue); BOM-driven inventory ([NACM](https://www.nacm.org/)).
- **Capex intensity:** Moderate (capex/revenue typically 3–6%), tooling and assembly automation ([Census ASM](https://www.census.gov/programs-surveys/asm.html)).
- **Margin anchor:** Machinery gross 37.5%, EBITDA 19.6%, net 10.6%; Auto & Truck thinner (gross 10.4%) ([NYU Stern, Jan 2026](https://pages.stern.nyu.edu/~adamodar/New_Home_Page/datafile/margin.html)).
- **Accounting cross-ref (MFG-K-C):** Standard costing dominant; warranty reserves material for 336; see `Manufacturing_Disclosures_Sources.md`.

### VI.2 — Profile Card: P — Process

- **Representative NAICS:** 311 Food, 312 Beverage/Tobacco, 322 Paper, 324 Petroleum/Coal, 325 Chemical, 326 Plastics/Rubber ([Census NAICS](https://www.census.gov/naics/)).
- **Typical size bands (Census ASM):** Capital-heavy; fewer, larger establishments in 324/325; many smaller in 311 ([Census ASM](https://www.census.gov/programs-surveys/asm.html)).
- **Cost structure:** DM 60–80% of COGS (commodity-dominated), DL 5–12% (automated/continuous), OH 15–30% ([Census ASM](https://www.census.gov/programs-surveys/asm.html)).
- **Key operational targets:** OEE 85%, Availability ≥90% (continuous run), Inventory Turns 8–15x, DM Yield variance the core lever, Scrap <2% ([ASCM/APICS](https://www.ascm.org/); [ASQ](https://asq.org/)).
- **Working-capital intensity:** Lean turns but commodity inventory price exposure; WC 10–20% ([NACM](https://www.nacm.org/)).
- **Capex intensity:** High (capex/revenue 6–12%+ in refining/chemicals) ([Census ASM](https://www.census.gov/programs-surveys/asm.html)).
- **Margin anchor:** Wide spread — Specialty Chemical gross 35.1%/EBITDA 18.0%; Basic Chemical gross 9.3%/net −3.7%; Food Processing gross 23.2% ([NYU Stern, Jan 2026](https://pages.stern.nyu.edu/~adamodar/New_Home_Page/datafile/margin.html)).
- **Accounting cross-ref (MFG-K-C):** **LIFO common** in P (commodity inventories — LIFO reserve sizing); process costing; by-product/joint-cost allocation; see `Manufacturing_Disclosures_Sources.md`.

### VI.3 — Profile Card: H — Hybrid

- **Representative NAICS:** 311 + 325 (batch + packaging); 332 + 325 (metal + coating) ([Census NAICS](https://www.census.gov/naics/)).
- **Typical size bands (Census ASM):** Mid-size; activity-coded to dominant process or discrete primary activity ([Census ASM](https://www.census.gov/programs-surveys/asm.html)).
- **Cost structure:** Blended — DM 55–70%, DL 10–18%, OH 18–28% ([Census ASM](https://www.census.gov/programs-surveys/asm.html)).
- **Key operational targets:** Process targets upstream (yield, availability), discrete targets downstream (FPY, OEE, OTD ≥95%) ([ASCM/APICS](https://www.ascm.org/); [ASQ](https://asq.org/)).
- **Working-capital intensity:** Moderate, WC 12–22% ([NACM](https://www.nacm.org/)).
- **Capex intensity:** Moderate-high (4–8%) ([Census ASM](https://www.census.gov/programs-surveys/asm.html)).
- **Margin anchor:** Between P and D; Packaging gross 24.3%/EBITDA 14.4% as a representative blended anchor ([NYU Stern, Jan 2026](https://pages.stern.nyu.edu/~adamodar/New_Home_Page/datafile/margin.html)).
- **Accounting cross-ref (MFG-K-C):** Dual costing methods (process upstream, job/standard downstream); hybrid inventory valuation; see `Manufacturing_Disclosures_Sources.md`.

### VI.4 — Profile Card: J — Job Shop

- **Representative NAICS:** 332 Fabricated Metal, 333 (custom), 811 repair where in scope ([Census NAICS](https://www.census.gov/naics/)).
- **Typical size bands (Census ASM):** Predominantly small establishments; 332710 machine shops are numerous and small ([Census ASM](https://www.census.gov/programs-surveys/asm.html); [BLS Manufacturing IAG](https://www.bls.gov/iag/tgs/iag31-33.htm)).
- **Cost structure:** DL-heavy — DM 35–55%, DL 25–40%, OH 20–30% ([Census ASM](https://www.census.gov/programs-surveys/asm.html)).
- **Key operational targets:** Per-workcenter OEE, Schedule Adherence (widened bands), Quote OTD ≥95%, FPY noisy on first articles ([ASCM/APICS](https://www.ascm.org/); [ASQ](https://asq.org/)).
- **Working-capital intensity:** Moderate; WIP-heavy on custom jobs; WC 18–28% ([NACM](https://www.nacm.org/)).
- **Capex intensity:** Low-moderate (2–5%); general-purpose machine tools ([Census ASM](https://www.census.gov/programs-surveys/asm.html)).
- **Margin anchor:** Fabricated-metal proxy; thinner than OEM machinery; SMB job shops often net 3–6% ([NYU Stern, Jan 2026](https://pages.stern.nyu.edu/~adamodar/New_Home_Page/datafile/margin.html); [RMA](https://www.rmahq.org/)).
- **Accounting cross-ref (MFG-K-C):** **Job-order costing**; WIP valuation per job; largest Volume Variance (V-07b) exposure; see `Manufacturing_Disclosures_Sources.md`.

### VI.5 — Profile Card: E — ETO (Engineer-to-Order)

- **Representative NAICS:** 333 capital equipment, 336411 Aircraft, 333611 Turbines, 332313 Plate Work (metal-tank fabrication) ([Census NAICS](https://www.census.gov/naics/)).
- **Typical size bands (Census ASM):** Few, large-contract establishments; long-cycle builds ([Census ASM](https://www.census.gov/programs-surveys/asm.html)).
- **Cost structure:** Engineering-heavy — DM 40–55%, DL 25–40% (incl. engineering), OH 15–25% ([Census ASM](https://www.census.gov/programs-surveys/asm.html)).
- **Key operational targets:** Milestone OTD, DL Efficiency variance the dominant lever (learning curves), Inventory Turns 1–3x (long WIP), per-project Cpk only where run length allows ([ASCM/APICS](https://www.ascm.org/); [ASQ](https://asq.org/)).
- **Working-capital intensity:** Can be **negative** via customer advances / milestone billing; otherwise high WIP ([NACM](https://www.nacm.org/)).
- **Capex intensity:** Variable (3–8%); heavy fabrication assets ([Census ASM](https://www.census.gov/programs-surveys/asm.html)).
- **Margin anchor:** Project-margin driven; machinery/aerospace anchors apply (Machinery gross 37.5%) but contract-specific ([NYU Stern, Jan 2026](https://pages.stern.nyu.edu/~adamodar/New_Home_Page/datafile/margin.html)).
- **Accounting cross-ref (MFG-K-C):** **Percentage-of-completion / over-time revenue recognition** common in E; contract cost capitalization; see `Manufacturing_Disclosures_Sources.md` and the ASC 606 module (`Manufacturing_ASC606_Sources.md`).

### VI.6 — Judgment Calls & Open Items (Part VI)

- ◑ **Cost-structure splits per card** are industry-convention ranges anchored to ASM aggregates, not exact ASM line items; widened for SMB skew.
- ◑ **Capex/revenue bands** are directional; exact ratios per six-digit NAICS flagged for ASM capital-expenditure extraction in MFG-K-E ([Census ASM](https://www.census.gov/programs-surveys/asm.html)).
- ⚠ **Accounting-method prevalence** (LIFO in P, % completion in E) is documented convention; entity-specific method confirmed at onboarding and cross-checked against MFG-K-C disclosures.

---

## Part VII — Benchmark Data Routing for Advisacor {#part-vii}

This Part specifies how each benchmark feeds the Command Center, the Healthy/Warning/Critical color-band logic with cited thresholds, the founder onboarding flow, and the (non-executable) routing-key TypeScript interface.

### VII.1 — Benchmark → Dashboard Widget Mapping

The table below maps each benchmark family to its consuming dashboard widget, framed for the panel-binding contract.

| Benchmark Family | Source Part | Dashboard Widget | Source Authority |
|---|---|---|---|
| OEE + components | II.1 | OEE gauge cluster | [ASCM/APICS](https://www.ascm.org/); [ISO 22400](https://www.iso.org/standard/56847.html) |
| Quality (FPY, PPM, Cpk) | II.3 | Quality scorecard | [ASQ](https://asq.org/) |
| Inventory turns / DIO | II.4 | Working-capital tile | [ASCM/APICS](https://www.ascm.org/) |
| Capacity utilization | II.4 | Capacity gauge (vs. Fed G.17 line) | [Federal Reserve G.17](https://www.federalreserve.gov/releases/g17/current/default.htm) |
| Margins / cost structure | III.1–III.2 | Financial health panel | [NYU Stern](https://pages.stern.nyu.edu/~adamodar/New_Home_Page/datafile/margin.html); [Census ASM](https://www.census.gov/programs-surveys/asm.html) |
| Realized variances V-01..08 | IV.1 | **Manufacturing Variances panel** (binding) | [IMA](https://www.imanet.org/); [AICPA-CIMA](https://www.aicpa-cima.com/) |
| Mix/yield V-09/10 | IV.2 | Variance drill-down (process/hybrid) | [IMA](https://www.imanet.org/) |
| Forecast variances FV-01..08 | V.3 | Forecast-variance section | [ASCM/APICS](https://www.ascm.org/) |

### VII.2 — Healthy / Warning / Critical Band Logic

The table below frames the three-color band logic with cited thresholds; bands are direction-aware (higher-is-better vs. lower-is-better) and sub-segment-tuned per Parts II–V.

| Metric Class | Healthy (green) | Warning (amber) | Critical (red) | Cited Threshold Source |
|---|---|---|---|---|
| OEE | ≥85% | 65–85% | <65% | [ASCM/APICS](https://www.ascm.org/) |
| FPY | ≥99% | 95–99% | <95% | [ASQ](https://asq.org/) |
| Defect PPM | <50 | 50–1,000 | >1,000 | [ASQ](https://asq.org/) |
| Cpk | ≥1.67 | 1.33–1.67 | <1.33 | [ASQ](https://asq.org/) |
| Scrap Rate | <2% | 2–5% | >5% | [ASQ](https://asq.org/); [ASCM/APICS](https://www.ascm.org/) |
| Inventory Turns | ≥ top-quartile | median–top-quartile | < median | [ASCM/APICS](https://www.ascm.org/) |
| OTD | ≥98% | 95–98% | <95% | [ASCM/APICS](https://www.ascm.org/) |
| Capacity Utilization | 80–85% | 70–80% or >85% | <70% (idle) or sustained >90% (overstrain) | [Federal Reserve G.17](https://www.federalreserve.gov/releases/g17/current/default.htm) |
| Realized variance (each) | ≤ acceptable band (IV.1) | acceptable→alert | > alert threshold (IV.1) | [IMA](https://www.imanet.org/); [AICPA-CIMA](https://www.aicpa-cima.com/) |
| Forecast MAPE | <10% | 10–15% | >15% (aggregate) | [ASCM/APICS](https://www.ascm.org/) |

### VII.3 — Founder Onboarding Flow

The onboarding flow auto-loads a benchmark profile from the founder's NAICS selection, framed for the multi-entity wizard branch resolved in Q7.

1. **NAICS code selection** — founder selects 3-digit/6-digit code ([Census NAICS](https://www.census.gov/naics/)); system derives sub-segment (D/P/H/J/E) via the Part I.2 mapping.
2. **Sub-segment confirmation** — founder confirms or overrides the derived sub-segment (handles Hybrid/Job-Shop/ETO judgment cases from Part I.4).
3. **Profile auto-load** — the matching Part VI profile card loads default operational, financial, variance, and forecast-accuracy bands.
4. **Scale calibration** — Census ASM revenue/employee bands for the NAICS pre-fill size context ([Census ASM](https://www.census.gov/programs-surveys/asm.html)).
5. **Multi-entity wizard branch (Q7)** — for tenants with multiple plants/activities, the wizard loops steps 1–4 per entity and flags Hybrid where a single entity declares both process and discrete primary activities, blending bands per Part IV.3.
6. **Threshold override** — founder may tune variance thresholds (IV.1) per entity; defaults are documented and reversible.

### VII.4 — Routing Key TypeScript Stub (DRAFT / SPEC — NON-EXECUTABLE)

The following interface is a composition-only specification stub. **It is not executable, contains no spine code, and has passed no PC gates.**

```ts
// DRAFT / SPEC ONLY — NOT EXECUTABLE. Composition reference for MFG-K-D.
// No D0 proof, no PC gates. Do not import.
interface BenchmarkProfile {
  naicsCode: string;
  subSegment: 'D' | 'P' | 'H' | 'J' | 'E';
  operationalBenchmarks: Record<string, BenchmarkBand>;
  financialBenchmarks: Record<string, BenchmarkBand>;
  varianceThresholds: Record<string, VarianceThreshold>;
  forecastAccuracyTargets: Record<string, AccuracyBand>;
  source: 'CensusASM' | 'FedG17' | 'ASCM' | 'IMA' | 'BLS' | 'CompositeNACM';
  asOfDate: string;
}
```

### VII.5 — Judgment Calls & Open Items (Part VII)

- ◑ **Capacity-utilization band is two-sided:** both under-utilization (<70%, idle capacity) and sustained over-utilization (>90%, overstrain/maintenance risk) are amber/red, unlike one-directional metrics. Anchored to the Fed G.17 ~85% practical-ceiling convention ([Federal Reserve G.17](https://www.federalreserve.gov/releases/g17/current/default.htm)).
- ◑ **Sub-segment derivation from NAICS** is best-effort; Hybrid/Job-Shop/ETO require founder confirmation (Part I.4), so step 2 of the onboarding flow is mandatory, not skippable.
- ⚠ **`source` enum value `CompositeNACM`** denotes blended NACM + RMA working-capital bands; because both are partly paywalled, these fields carry a provenance flag for MFG-K-E review.

---

## Part VIII — Cross-Reference Map {#part-viii}

This Part maps benchmarks here to the consuming MFG-K-A KPI IDs, variance threshold tables, sub-segment financial profiles, and MFG-K-C disclosure links.

### VIII.1 — MFG-K-A KPI → Benchmark Cross-Reference

The table below frames which MFG-K-A KPI consumes which benchmark table in this document.

| MFG-K-A KPI ID | KPI | Benchmark Source (this doc) |
|---|---|---|
| MFG-OPS-01..04 | OEE + components | Part II.1 |
| MFG-OPS-06/07 | MTBF / MTTR | Part II.2 |
| MFG-OPS-08 | Capacity Utilization | Part II.4 (Fed G.17) |
| MFG-OPS-10/11 | Cycle / Takt Time | Part II.2 |
| MFG-SC-01/02 | Inventory Turns / DIO | Part II.4 |
| MFG-SC-08 | Supplier OTD | Part II.4 |
| MFG-Q-01 | First-Pass Yield | Part II.3 |
| MFG-Q-02/03/04 | Defect PPM / Scrap / Rework | Part II.3 |
| MFG-Q-08/09 | Cpk / Sigma Level | Part II.3 |
| MFG-FIN-02/03/04 | Gross / Operating / Net Margin | Part III.1 |
| MFG-FIN-05 | Mfg Cost % of Revenue | Part III.2 |
| MFG-FIN-06 | Cash Conversion Cycle | Part III.3 |
| MFG-FIN-01/07/08 | DSO / DIO / DPO | Part III.3 |
| MFG-FIN-09 | RONA / ROIC | Part III.3 |

### VIII.2 — Variance ID → Threshold Table Cross-Reference

The table below frames which variance IDs draw which threshold tables.

| Variance ID(s) | Threshold Table | Sub-Segment Tuning |
|---|---|---|
| MFG-V-01..08 | Part IV.1 | Part IV.3 |
| MFG-V-09/10 | Part IV.2 | Process/Hybrid only |
| MFG-FV-01..08 | Part V.3 (accuracy gates) | Part V.2 |

### VIII.3 — Sub-Segment → Financial Profile Inheritance

The table below frames which financial profile each sub-segment inherits.

| Sub-Segment | Inherits Financial Profile | Margin Anchor (NYU Stern) |
|---|---|---|
| D | Part VI.1 | Machinery / Electronics / Auto |
| P | Part VI.2 | Chemical (Basic/Specialty) / Food / Paper |
| H | Part VI.3 | Packaging (blended) |
| J | Part VI.4 | Fabricated Metal (SMB-adjusted) |
| E | Part VI.5 | Machinery / Aerospace (contract-specific) |

### VIII.4 — MFG-K-C Disclosure Cross-Links

The table below frames disclosure-linked benchmarks requiring MFG-K-C (Disclosures) coordination.

| Benchmark / Item | Disclosure Link (MFG-K-C) | Sub-Segment |
|---|---|---|
| LIFO reserve sizing | LIFO inventory disclosure (`Manufacturing_Disclosures_Sources.md`) | P (commodity inventories) |
| % completion / over-time revenue | Revenue recognition disclosure + `Manufacturing_ASC606_Sources.md` | E |
| Warranty reserves | Warranty/contingency disclosure | D (esp. 336) |
| Capacity / idle-cost disclosure | FOH volume variance (V-07b) tie | J, E (low utilization) |
| Joint/by-product cost allocation | Process-costing disclosure | P, H |

### VIII.5 — Judgment Calls & Open Items (Part VIII)

- ◑ **Sub-segment financial-profile inheritance** uses NYU Stern public-company anchors adjusted for SMB skew; entity actuals always override the inherited default.
- ⚠ **LIFO-reserve and % completion benchmark sizing** depend on MFG-K-C disclosure logic not yet locked; cross-links are forward references pending that module.

---

## Part IX — Implementation Checklist {#part-ix}

Items requiring founder review, judgment/verification flags, and the per-source annual refresh cadence.

### IX.1 — Founder Review Items

- [ ] Confirm derived sub-segment (D/P/H/J/E) for each entity (Part VII.3 step 2).
- [ ] Confirm or override default variance thresholds (Part IV.1).
- [ ] Confirm inventory-accounting method (LIFO/FIFO/weighted-avg) — drives P-segment LIFO reserve cross-ref (Part VIII.4).
- [ ] Confirm revenue-recognition method (point-in-time vs. over-time/% completion) — drives E-segment cross-ref.
- [ ] Confirm ETO first-article DL-efficiency carve-out (Part IV.4).
- [ ] Confirm capacity-utilization two-sided band tuning (Part VII.5).

### IX.2 — Judgment (◑) and Verification (⚠) Flag Register

The table below consolidates every flag raised in this document for MFG-K-E disposition.

| Flag | Location | Type | Disposition |
|---|---|---|---|
| Hybrid has no native NAICS code | Part I.4 | ◑ | Founder declaration at onboarding |
| Job Shop vs. ETO boundary operational | Part I.4 | ◑ | Founder confirmation |
| ASM 2022 exact dollar figures per 6-digit NAICS | Part I.4 | ⚠ | Extract in MFG-K-E |
| OEE 85% world-class composition | Part II.5 | ◑ | Documented convention (Nakajima/JIPM) |
| Inventory-turn sub-sector splits | Part II.5 | ⚠ | Cross-validate RMA + ASM |
| PPM/Cpk performance distribution | Part II.5 | ⚠ | Source ASQ survey summaries |
| 32% manufacturing-wide gross margin | Part III.5 | ◑ | Use sub-sector bands; 32% headline only |
| DM/DL/OH split percentages | Part III.5 | ⚠ | Derive from ASM in MFG-K-E |
| RMA/NACM exact ratio medians | Part III.5 | ⚠ | Paywalled — extract summaries |
| Variance threshold magnitudes | Part IV.4 | ◑ | IMA/AICPA convention; founder-overridable |
| No free federal variance-magnitude dataset | Part IV.4 | ⚠ | Validate vs. tenant sample |
| MAPE good/world-class thresholds | Part V.4 | ◑ | ASCM/APICS convention |
| ASCM benchmark microdata gated | Part V.4 | ⚠ | Subscription — summaries only |
| Cost-structure splits per card | Part VI.6 | ◑ | Industry-convention, SMB-widened |
| Capex/revenue bands | Part VI.6 | ⚠ | Extract ASM capex variable |
| Accounting-method prevalence | Part VI.6 | ⚠ | Confirm vs. MFG-K-C |
| CompositeNACM provenance | Part VII.5 | ⚠ | MFG-K-E review |
| LIFO/% completion benchmark sizing | Part VIII.5 | ⚠ | Pending MFG-K-C lock |

### IX.3 — Annual Refresh Cadence by Source

The table below frames how often each primary source updates, driving the benchmark-refresh schedule.

| Source | Refresh Cadence | Next Action | Source |
|---|---|---|---|
| Federal Reserve G.17 (capacity utilization) | **Monthly** (mid-month) | Re-pull each release | [Federal Reserve G.17](https://www.federalreserve.gov/releases/g17/current/default.htm) |
| BLS Producer Price Index | **Monthly** | Re-pull for DM price-variance baseline | [BLS PPI](https://www.bls.gov/ppi/) |
| BLS Industry Employment (31-33) | **Monthly** | Employment-band refresh | [BLS Manufacturing IAG](https://www.bls.gov/iag/tgs/iag31-33.htm) |
| NYU Stern sector margins | **Annual** (January) | Re-pull margin tables | [NYU Stern](https://pages.stern.nyu.edu/~adamodar/New_Home_Page/datafile/margin.html) |
| Census ASM / AIES | **Every ~1 year (AIES annual; ASM Benchmark every 5 yrs)** | Re-pull on new release | [Census ASM](https://www.census.gov/programs-surveys/asm.html) |
| Census NAICS | **Every 5 years** (next 2027) | Re-map on revision | [Census NAICS](https://www.census.gov/naics/) |
| ASCM/APICS benchmarks | **Annual** | Re-confirm OEE/forecast standards | [ASCM/APICS](https://www.ascm.org/) |
| ASQ quality standards | **As revised** | Re-confirm PPM/Cpk standards | [ASQ](https://asq.org/) |
| ISO 22400 | **On standard revision** | Re-confirm KPI definitions | [ISO 22400](https://www.iso.org/standard/56847.html) |
| IMA / AICPA-CIMA | **As revised** | Re-confirm variance methodology | [IMA](https://www.imanet.org/); [AICPA-CIMA](https://www.aicpa-cima.com/) |
| RMA Annual Statement Studies | **Annual** | Extract financial-ratio medians | [RMA](https://www.rmahq.org/) |
| NACM credit benchmarks | **Periodic (monthly CMI; annual studies)** | Refresh working-capital/credit bands | [NACM](https://www.nacm.org/) |

### IX.4 — Judgment Calls & Open Items (Part IX)

- ◑ The refresh cadence prioritizes Fed G.17 and BLS PPI (monthly) because they drive the two most time-sensitive panel inputs (capacity utilization and DM price variance).
- ⚠ All ⚠ rows in IX.2 are explicit hand-offs to **MFG-K-E** (verification + gap closure) and must be cleared before the benchmark profile locks (`locked: false` → `true`).

---

## Source Index

Primary sources (whitelist) used throughout this document, all publicly accessible as of mid-2026 except where noted as subscription-gated. Where a primary authority publishes multiple relevant pages, the specific sub-pages cited or available for verification are enumerated here so the MFG-K-E verification pass can re-pull each one directly.

**Federal Reserve — G.17 Industrial Production and Capacity Utilization (PRIMARY for capacity utilization; manufacturing 75.7%, total industry 76.2%, May 2026 release dated June 15, 2026; monthly):**
- [G.17 current release (default)](https://www.federalreserve.gov/releases/g17/current/default.htm)
- [G.17 current release (full PDF)](https://www.federalreserve.gov/releases/g17/Current/g17.pdf)
- [G.17 capacity utilization detail (caputl)](https://www.federalreserve.gov/releases/g17/caputl.htm)
- [G.17 About / methodology](https://www.federalreserve.gov/releases/g17/About.htm)

**Census Bureau — manufacturing scale and taxonomy (ASM 2022 Benchmark, most recent; transitioned to AIES March 2024):**
- [Annual Survey of Manufactures (ASM)](https://www.census.gov/programs-surveys/asm.html)
- [Annual Integrated Economic Survey (AIES) — ASM successor](https://www.census.gov/programs-surveys/aies.html)
- [Economic Census program](https://www.census.gov/programs-surveys/economic-census.html)
- [NAICS landing](https://www.census.gov/naics/)
- [2022 NAICS Manual (PDF)](https://www.census.gov/naics/reference_files_tools/2022_NAICS_Manual.pdf)

**BLS — price and employment series (monthly):**
- [Producer Price Index (PPI) program](https://www.bls.gov/ppi/)
- [PPI fact sheet](https://www.bls.gov/ppi/factsheets/producer-price-index-ppi.htm)
- [PPI fact sheets index](https://www.bls.gov/ppi/factsheets/)
- [PPI data tools](https://www.bls.gov/ppi/data.htm)
- [PPI news release](https://www.bls.gov/news.release/ppi.nr0.htm)
- [Industries at a Glance — Manufacturing (31-33)](https://www.bls.gov/iag/tgs/iag31-33.htm)
- [Manufacturing workforce (IAG 31-33 workforce)](https://www.bls.gov/iag/tgs/iag31-33.htm#workforce)
- [BLS Productivity program](https://www.bls.gov/productivity/)

**IMA — Institute of Management Accountants (variance methodology, SMA, sign convention):**
- [IMA landing](https://www.imanet.org/)
- [Management accounting competencies](https://www.imanet.org/career-resources/management-accounting-competencies)
- [Strategic cost management](https://www.imanet.org/insights-and-trends/strategic-cost-management)

**AICPA-CIMA — cost-accounting / standard-costing framework:**
- [AICPA-CIMA landing](https://www.aicpa-cima.com/)
- [Cost management resources](https://www.aicpa-cima.com/resources/landing/cost-management)
- [Cost accounting CPE](https://www.aicpa-cima.com/cpe-learning/course/cost-accounting)

**ASCM / APICS — OEE, forecast accuracy (MAPE), S&OP, inventory-turn, OTD benchmarks:**
- [ASCM landing](https://www.ascm.org/)
- [CPIM body of knowledge](https://www.ascm.org/learning-development/certifications-credentials/cpim/)
- [CSCP body of knowledge](https://www.ascm.org/learning-development/certifications-credentials/cscp/)

**ASQ — American Society for Quality (Cpk/Ppk, Six Sigma PPM = 3.4 DPMO, FPY, scrap/rework):**
- [ASQ landing](https://asq.org/)
- [Six Sigma](https://asq.org/quality-resources/six-sigma)
- [Process capability](https://asq.org/quality-resources/process-capability)
- [Control charts](https://asq.org/quality-resources/control-chart)
- [Pareto analysis](https://asq.org/quality-resources/pareto)
- [Cost of quality](https://asq.org/quality-resources/cost-of-quality)
- [Total quality management](https://asq.org/quality-resources/total-quality-management)

**ISO — manufacturing KPI standard:**
- [ISO 22400 standard page](https://www.iso.org/standard/56847.html)
- [ISO 22400-2 Online Browsing Platform](https://www.iso.org/obp/ui/en/#iso:std:iso:22400:-2:ed-1:v1:en)

**NACM / RMA — credit, working-capital, and financial-ratio benchmarks (subscription microdata):**
- [NACM — National Association of Credit Management](https://www.nacm.org/)
- [NACM home](https://nacm.org/)
- [RMA Annual Statement Studies](https://www.rmahq.org/annual-statement-studies/)

**NYU Stern (Damodaran) — US sector financial datasets (January 2026 update):**
- [Operating and net margins by sector](https://pages.stern.nyu.edu/~adamodar/New_Home_Page/datafile/margin.html)
- [Working-capital ratios](https://pages.stern.nyu.edu/~adamodar/New_Home_Page/datafile/wcdata.html)
- [Working-capital data (alt)](https://pages.stern.nyu.edu/~adamodar/New_Home_Page/datafile/wcdata.htm)
- [Capital expenditures by sector](https://pages.stern.nyu.edu/~adamodar/New_Home_Page/datafile/capex.html)
- [Return on equity / capital by sector](https://pages.stern.nyu.edu/~adamodar/New_Home_Page/datafile/roe.html)
- [EVA / return spreads by sector](https://pages.stern.nyu.edu/~adamodar/New_Home_Page/datafile/EVA.html)

Secondary cross-references (never sole citation per MFG-K-D discipline): IndustryWeek, Oracle NetSuite blog, Eagle Rock CFO, Aberdeen Group, McKinsey, Deloitte Insights manufacturing reports. None is used as a sole source for any benchmark figure in this document.

---

*Document prepared for Advisacor Manufacturing Vertical Knowledge Stack — Module MFG-K-D — Wiseman Financial Technologies LLC. DRAFT / SPEC ONLY — composition-only reference, not executable, no PC gates passed. All benchmarks drawn from publicly available primary sources except where flagged ⚠ (subscription-gated or pending MFG-K-E extraction). This is a living reference — benchmark ranges should be refreshed per the Part IX.3 cadence.*

*Generated: June 22, 2026 — v0.9 (DRAFT)*
