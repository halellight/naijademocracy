import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import * as d3 from "d3";

/* ─── Hooks ────────────────────────────────────────────────────────── */
function useIsMobile(bp = 768) {
  const [v, setV] = useState(() => typeof window !== "undefined" ? window.innerWidth <= bp : false);
  useEffect(() => {
    const h = () => setV(window.innerWidth <= bp);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, [bp]);
  return v;
}

/* ─── CSS ───────────────────────────────────────────────────────────── */
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --g:#008751; --dg:#005738; --lg:#e6f4ed; --vg:#c8ecd8;
    --ink:#0e0e0e; --sub:#444; --muted:#888; --border:#e2e2e2;
    --bg:#fafaf8; --white:#fff; --gold:#c8941a; --red:#b22222;
  }
  html{scroll-behavior:smooth;}
  body{font-family:'Outfit',sans-serif;background:var(--bg);color:var(--ink);overflow-x:hidden;-webkit-font-smoothing:antialiased;}
  button{font-family:'Outfit',sans-serif;cursor:pointer;border:none;}
  ::-webkit-scrollbar{width:5px;}
  ::-webkit-scrollbar-thumb{background:var(--g);border-radius:3px;}
  .map-bg{background-image:radial-gradient(var(--border) 1px,transparent 1px);background-size:24px 24px;}
  .m-link{font-size:clamp(2rem,8vw,3rem);font-weight:900;color:var(--ink);cursor:pointer;letter-spacing:-2px;display:block;text-align:center;transition:color .3s;padding:0.25rem 0;}
  .m-link:hover,.m-link.active{color:var(--g);}
  .scroll-x{overflow-x:auto;scrollbar-width:none;-ms-overflow-style:none;}
  .scroll-x::-webkit-scrollbar{display:none;}
  @keyframes spin{to{transform:rotate(360deg)}}
  .spinner{width:32px;height:32px;border:3px solid var(--border);border-top-color:var(--g);border-radius:50%;animation:spin 1s linear infinite;}
`;

/* ─── Helpers ───────────────────────────────────────────────────────── */
const PC = p => ({ APC: "#008751", PDP: "#c8941a", LP: "#b22222", NNPP: "#3949ab", APGA: "#8b0000", CPC: "#5c3d8f", ACN: "#e65c00" }[p] || "#888");
const TC = { milestone: "#3949ab", military: "#b22222", crisis: "#c8941a", democracy: "#008751" };
const ZONE_FULL = { NW: "North-West", NE: "North-East", NC: "North-Central", SW: "South-West", SE: "South-East", SS: "South-South" };
const ZONE_COLOR = { NW: "#3949ab", NE: "#b22222", NC: "#c8941a", SW: "#008751", SE: "#e65c00", SS: "#5c3d8f" };

const GEO_MAP = {
  "abia": "abia", "adamawa": "adamawa", "akwa ibom": "akwa-ibom", "anambra": "anambra",
  "bauchi": "bauchi", "bayelsa": "bayelsa", "benue": "benue", "borno": "borno",
  "cross river": "cross-river", "delta": "delta", "ebonyi": "ebonyi", "edo": "edo",
  "ekiti": "ekiti", "enugu": "enugu", "federal capital territory": "federal-capital-territory",
  "fct": "federal-capital-territory", "abuja": "federal-capital-territory",
  "gombe": "gombe", "imo": "imo", "jigawa": "jigawa", "kaduna": "kaduna", "kano": "kano",
  "katsina": "katsina", "kebbi": "kebbi", "kogi": "kogi", "kwara": "kwara", "lagos": "lagos",
  "nasarawa": "nassarawa", "nassarawa": "nassarawa", "niger": "niger", "ogun": "ogun",
  "ondo": "ondo", "osun": "osun", "oyo": "oyo", "plateau": "plateau", "rivers": "rivers",
  "sokoto": "sokoto", "taraba": "taraba", "yobe": "yobe", "zamfara": "zamfara",
};
function resolveId(f) {
  const raw = (f.properties?.NAME_1 || f.properties?.name || "").toLowerCase().replace(/\s+state$/i, "").trim();
  return GEO_MAP[raw] || null;
}

/* ─── Data ──────────────────────────────────────────────────────────── */
const PAGES = [
  { id: "home", label: "Home" },
  { id: "history", label: "History" },
  { id: "june12", label: "June 12" },
  { id: "biafra", label: "Biafran War" },
  { id: "timeline", label: "Timeline" },
  { id: "elections", label: "Elections" },
  { id: "presidents", label: "Presidents" },
  { id: "parties", label: "Parties" },
  { id: "governors", label: "Governors" },
  { id: "constitutions", label: "Constitutions" },
  { id: "trends", label: "Trends" },
  { id: "tracker2027", label: "2027 Tracker 🗳️" },
  { id: "quiz", label: "Quiz 🎯" },
];

const STATE_DATA = {
  abia: { name: "Abia", zone: "SE", pop: "3.7M", gdp: "$1,450", poverty: "39%", security: "High", sec_note: "IPOB/ESN sit-at-home orders disrupt commerce and schooling weekly.", pol_note: "Alex Otti's 2023 LP win was historic — first non-PDP/APC governor. The state anchors the 'Ariaria International Market', one of West Africa's largest." },
  adamawa: { name: "Adamawa", zone: "NE", pop: "4.2M", gdp: "$720", poverty: "57%", security: "High", sec_note: "Boko Haram/ISWAP spillover from Borno. Displacement camps house over 300,000.", pol_note: "Fintiri (PDP) secured a second term in 2023. His administration made headlines for demolishing government officials' illegal structures." },
  "akwa-ibom": { name: "Akwa Ibom", zone: "SS", pop: "5.5M", gdp: "$2,100", poverty: "28%", security: "Medium", sec_note: "Cult clashes and kidnapping remain concerns, especially in riverine communities.", pol_note: "Nigeria's highest oil revenue recipient per capita for years. PDP has never lost the governorship since 1999." },
  anambra: { name: "Anambra", zone: "SE", pop: "5.5M", gdp: "$1,900", poverty: "25%", security: "High", sec_note: "IPOB sit-at-home enforcement and ESN (Eastern Security Network) operations.", pol_note: "APGA's stronghold since 2006. Soludo's government is noted for cleaning up Onitsha and attracting investment. Peter Obi was governor here." },
  bauchi: { name: "Bauchi", zone: "NE", pop: "6.5M", gdp: "$580", poverty: "65%", security: "Medium", sec_note: "Periodic Boko Haram incursions from Borno. Communal farmer-herder clashes.", pol_note: "Bala Mohammed (PDP) is one of the North's most vocal opposition voices and a key figure in the anti-APC coalition building for 2027." },
  bayelsa: { name: "Bayelsa", zone: "SS", pop: "2.3M", gdp: "$3,800", poverty: "23%", security: "Medium", sec_note: "Pipeline vandalism and militant activity in creeks; improved since 2009 amnesty.", pol_note: "Nigeria's second-smallest state by population. PDP stronghold. President Jonathan is from Otuoke in this state." },
  benue: { name: "Benue", zone: "NC", pop: "5.8M", gdp: "$680", poverty: "52%", security: "Critical", sec_note: "Severe farmer-herder crisis; attacks by Fulani herdsmen have killed thousands since 2016.", pol_note: "Governor Alia (APC) inherited one of Nigeria's worst humanitarian crises. Benue was once called 'the food basket of the nation'." },
  borno: { name: "Borno", zone: "NE", pop: "5.6M", gdp: "$450", poverty: "72%", security: "Critical", sec_note: "Epicentre of the Boko Haram insurgency since 2009. Over 2M displaced. Lake Chad basin at risk.", pol_note: "Governor Zulum (APC) earned global recognition for personally leading aid convoys and rebuilding destroyed towns — unusual for a Nigerian governor." },
  "cross-river": { name: "Cross River", zone: "SS", pop: "3.7M", gdp: "$1,100", poverty: "40%", security: "Medium", sec_note: "Cross-border banditry from Cameroon. Some cult activity in Calabar.", pol_note: "Tourism capital with Obudu Plateau and Tinapa Resort. Senator Donald Duke (PDP) made it the first state to develop a tourism master plan in 2003." },
  delta: { name: "Delta", zone: "SS", pop: "5.7M", gdp: "$3,100", poverty: "22%", security: "Medium", sec_note: "Oil bunkering and pipeline vandalism. Youth restiveness in Niger Delta communities.", pol_note: "One of Nigeria's wealthiest states by oil revenue. PDP's Oborevwori won in 2023 continuing 24 years of PDP governance." },
  ebonyi: { name: "Ebonyi", zone: "SE", pop: "3.1M", gdp: "$680", poverty: "46%", security: "High", sec_note: "Inter-community conflicts; IPOB agitation; some areas under curfew.", pol_note: "One of Nigeria's poorest SE states. Former governor Umahi defected from PDP to APC in 2020, signalling SE political realignment." },
  edo: { name: "Edo", zone: "SS", pop: "3.9M", gdp: "$1,600", poverty: "34%", security: "Medium", sec_note: "Cult clashes and irregular migration (Benin City is a major trafficking origin point).", pol_note: "Politically volatile — Obaseki defeated his own party (APC) in 2020 by defecting to PDP. Okpebholo (APC) recaptured it in 2024." },
  ekiti: { name: "Ekiti", zone: "SW", pop: "3.3M", gdp: "$950", poverty: "41%", security: "Low", sec_note: "Relatively stable. Some kidnapping on highways.", pol_note: "Known as the 'land of honour'. One of the most educated populations in Nigeria per capita. Oyebanji (APC) governs." },
  enugu: { name: "Enugu", zone: "SE", pop: "4.0M", gdp: "$1,550", poverty: "31%", security: "High", sec_note: "IPOB enforcement of sit-at-home; some ESN clashes with security forces.", pol_note: "Nigeria's 'Coal City'. PDP stronghold. Governor Mbah (PDP) won in 2023 with strong business community support." },
  "federal-capital-territory": { name: "FCT/Abuja", zone: "NC", pop: "3.6M", gdp: "$5,200", poverty: "14%", security: "Medium", sec_note: "Occasional terrorist attacks. Kuje Prison break (2022). Security has improved.", pol_note: "Nigeria's capital since 1991 (moved from Lagos). FCT Minister Nyesom Wike is one of Nigeria's most controversial political figures." },
  gombe: { name: "Gombe", zone: "NE", pop: "3.3M", gdp: "$630", poverty: "61%", security: "Medium", sec_note: "Spill-over effects from NE insurgency. Communal clashes along Gombe-Adamawa border.", pol_note: "Inuwa Yahaya (APC) re-elected in 2023. The state is strategically important as a commercial hub for the North-East." },
  imo: { name: "Imo", zone: "SE", pop: "4.5M", gdp: "$1,350", poverty: "38%", security: "High", sec_note: "Heavy IPOB/ESN activity. Security forces deployed across the state. Monday sit-at-homes enforced.", pol_note: "Governor Uzodimma (APC) survived multiple court challenges. Imo has become a flashpoint for SE insecurity and political controversy." },
  jigawa: { name: "Jigawa", zone: "NW", pop: "5.8M", gdp: "$340", poverty: "74%", security: "Medium", sec_note: "Some banditry and kidnapping along Jigawa-Kano corridor.", pol_note: "One of Nigeria's most rural states. Namadi (APC) governs. The state produces large quantities of rice, groundnut, and cowpea." },
  kaduna: { name: "Kaduna", zone: "NW", pop: "8.9M", gdp: "$1,050", poverty: "54%", security: "High", sec_note: "Banditry is rampant. Mass kidnappings including the 2024 Kuriga school abduction of 287 children.", pol_note: "Nigeria's most politically complex state — melting pot of North/South religion and ethnicity. Governor Uba Sani (APC) faces enormous security challenges." },
  kano: { name: "Kano", zone: "NW", pop: "14.7M", gdp: "$1,450", poverty: "49%", security: "Medium", sec_note: "Periodic communal clashes. Kano is a hub with significant internal security challenges.", pol_note: "Nigeria's second-largest city. NNPP's Kwankwaso-aligned governor Abba Yusuf won 2023 in a major upset. Kano is the NW's biggest political prize." },
  katsina: { name: "Katsina", zone: "NW", pop: "8.8M", gdp: "$440", poverty: "67%", security: "Critical", sec_note: "Severe banditry crisis — among the worst-affected states. Thousands killed, hundreds of thousands displaced.", pol_note: "President Buhari's home state. Despite federal connections, insecurity worsened during his tenure. Radda (APC) governs." },
  kebbi: { name: "Kebbi", zone: "NW", pop: "4.4M", gdp: "$460", poverty: "67%", security: "High", sec_note: "Banditry and kidnapping from Zamfara spillover.", pol_note: "Major rice-producing state. The Anchor Borrowers Programme boosted Kebbi as Nigeria's rice bowl under Buhari." },
  kogi: { name: "Kogi", zone: "NC", pop: "4.5M", gdp: "$730", poverty: "55%", security: "High", sec_note: "Political violence; Kogi is notorious for electoral violence and intimidation.", pol_note: "Located at the confluence of Nigeria's two largest rivers. Former governor Bello was accused of the state's worst governance failures. Ododo (APC) replaced him in 2023." },
  kwara: { name: "Kwara", zone: "NC", pop: "3.3M", gdp: "$850", poverty: "47%", security: "Low", sec_note: "Relatively stable. Some kidnapping on highways.", pol_note: "'O To Ge!' (Enough is Enough) movement ousted the Saraki political dynasty in 2019. Abdulrazaq (APC) is the beneficiary." },
  lagos: { name: "Lagos", zone: "SW", pop: "15M+", gdp: "$4,300", poverty: "5%", security: "Medium", sec_note: "Urban crime, area-boy culture, EndSARS aftermath. Traffic-related crime.", pol_note: "Nigeria's commercial capital generates ~30% of non-oil GDP. Sanwo-Olu (APC) governs. Tinubu built his political empire here as governor (1999–2007)." },
  nassarawa: { name: "Nasarawa", zone: "NC", pop: "2.5M", gdp: "$890", poverty: "56%", security: "High", sec_note: "Farmer-herder conflicts; proximity to Abuja makes it a kidnapping corridor.", pol_note: "Nigeria's 'Solid Minerals State' — rich in mineral deposits largely unexploited. Abdullahi Sule (APC) governs." },
  niger: { name: "Niger", zone: "NC", pop: "5.6M", gdp: "$770", poverty: "54%", security: "High", sec_note: "Kidnapping on Abuja-Kaduna expressway. Banditry infiltration from NW.", pol_note: "Nigeria's largest state by area. Mohammed Bago (APC) governs. The Kainji Dam, powering much of Nigeria, is here." },
  ogun: { name: "Ogun", zone: "SW", pop: "5.2M", gdp: "$2,100", poverty: "21%", security: "Low", sec_note: "Relatively stable. Highway kidnapping a concern on Lagos-Ibadan expressway.", pol_note: "Nigeria's industrial hub — most manufacturing companies per capita. Dapo Abiodun (APC) governs. Home to the Olusegun Obasanjo Presidential Library." },
  ondo: { name: "Ondo", zone: "SW", pop: "4.7M", gdp: "$1,750", poverty: "27%", security: "Medium", sec_note: "Kidnapping in Akure axis; Yoruba Nation agitation in some areas.", pol_note: "Cocoa state. Lucky Aiyedatiwa (APC) took over after Akeredolu died in office in 2024." },
  osun: { name: "Osun", zone: "SW", pop: "4.7M", gdp: "$1,050", poverty: "33%", security: "Low", sec_note: "Mostly stable. Some cult activity in Osogbo.", pol_note: "Adeleke (PDP) — 'The Dancing Governor' — won in a historic 2022 Supreme Court battle. The state is known for Ife, cradle of Yoruba civilization." },
  oyo: { name: "Oyo", zone: "SW", pop: "7.8M", gdp: "$1,450", poverty: "33%", security: "Medium", sec_note: "Yoruba/Fulani herdsmen clashes in Ibarapa zone; Ibadan cult violence.", pol_note: "Seyi Makinde (PDP) is one of Nigeria's most effective governors by development metrics and the strongest PDP voice in the SW." },
  plateau: { name: "Plateau", zone: "NC", pop: "4.2M", gdp: "$830", poverty: "51%", security: "Critical", sec_note: "Chronic farmer-herder conflicts in the Plateau crisis — thousands killed since 2001. Attacks escalated in 2023-24.", pol_note: "The 'Home of Peace and Tourism' has paradoxically been Nigeria's most persistently violent state. Mutfwang (PDP) governs amid recurring massacres." },
  rivers: { name: "Rivers", zone: "SS", pop: "7.3M", gdp: "$3,500", poverty: "19%", security: "Medium", sec_note: "Political violence; cult clashes between government factions. Creeks piracy.", pol_note: "Nigeria's oil heart. The Wike-Fubara political war dominated 2023-24 — a dramatic factional battle within PDP. Port Harcourt is Nigeria's oil capital." },
  sokoto: { name: "Sokoto", zone: "NW", pop: "4.9M", gdp: "$390", poverty: "70%", security: "Critical", sec_note: "Severe banditry. The sultanate of Sokoto retains significant traditional and religious authority but cannot contain the crisis.", pol_note: "Seat of the Sokoto Caliphate — Islam's most prestigious institution in Nigeria. Ahmad Aliyu (APC) governs the historically significant, economically poor state." },
  taraba: { name: "Taraba", zone: "NE", pop: "3.1M", gdp: "$560", poverty: "59%", security: "High", sec_note: "Communal conflicts between over 80 ethnic groups. Farmers-herders crisis. Some Boko Haram incursion.", pol_note: "'Nature's Gift to the Nation' — stunning landscape with minimal development. Agbu Kefas (PDP) governs." },
  yobe: { name: "Yobe", zone: "NE", pop: "3.4M", gdp: "$390", poverty: "72%", security: "Critical", sec_note: "Persistent Boko Haram/ISWAP attacks. Damaturu bombings. Chibok-style school abductions.", pol_note: "Among Nigeria's poorest and most conflict-affected states. Governor Buni (APC) was APC national chairman during the 2023 elections." },
  zamfara: { name: "Zamfara", zone: "NW", pop: "4.5M", gdp: "$310", poverty: "76%", security: "Critical", sec_note: "Ground zero for Nigeria's banditry crisis. 1,000+ killed per year. Mass population displacement.", pol_note: "Nigeria's most insecure state per capita. Dauda Lawal (PDP) defied APC dominance. Zamfara has the highest poverty rate and one of the lowest human development indices." },
};

const ZONE_MEMBERSHIP = {
  NW: ["kano", "katsina", "kaduna", "sokoto", "kebbi", "zamfara", "jigawa"],
  NE: ["borno", "yobe", "adamawa", "gombe", "bauchi", "taraba"],
  NC: ["niger", "kogi", "kwara", "plateau", "nassarawa", "benue", "federal-capital-territory"],
  SW: ["lagos", "ogun", "oyo", "osun", "ondo", "ekiti"],
  SE: ["anambra", "imo", "abia", "enugu", "ebonyi"],
  SS: ["rivers", "delta", "bayelsa", "cross-river", "akwa-ibom", "edo"],
};

const ZONE_RESULTS = {
  "2011": { NW: { w: "CPC", d: [{ p: "PDP", v: 23, c: "#c8941a" }, { p: "CPC", v: 74, c: "#5c3d8f" }] }, NE: { w: "CPC", d: [{ p: "PDP", v: 41, c: "#c8941a" }, { p: "CPC", v: 53, c: "#5c3d8f" }] }, NC: { w: "PDP", d: [{ p: "PDP", v: 58, c: "#c8941a" }, { p: "CPC", v: 38, c: "#5c3d8f" }] }, SW: { w: "PDP", d: [{ p: "PDP", v: 58, c: "#c8941a" }, { p: "ACN", v: 32, c: "#e65c00" }] }, SE: { w: "PDP", d: [{ p: "PDP", v: 98, c: "#c8941a" }, { p: "CPC", v: 2, c: "#5c3d8f" }] }, SS: { w: "PDP", d: [{ p: "PDP", v: 87, c: "#c8941a" }, { p: "CPC", v: 10, c: "#5c3d8f" }] } },
  "2015": { NW: { w: "APC", d: [{ p: "APC", v: 68, c: "#008751" }, { p: "PDP", v: 29, c: "#c8941a" }] }, NE: { w: "APC", d: [{ p: "APC", v: 67, c: "#008751" }, { p: "PDP", v: 31, c: "#c8941a" }] }, NC: { w: "APC", d: [{ p: "APC", v: 53, c: "#008751" }, { p: "PDP", v: 43, c: "#c8941a" }] }, SW: { w: "APC", d: [{ p: "APC", v: 66, c: "#008751" }, { p: "PDP", v: 30, c: "#c8941a" }] }, SE: { w: "PDP", d: [{ p: "APC", v: 8, c: "#008751" }, { p: "PDP", v: 91, c: "#c8941a" }] }, SS: { w: "PDP", d: [{ p: "APC", v: 18, c: "#008751" }, { p: "PDP", v: 79, c: "#c8941a" }] } },
  "2019": { NW: { w: "APC", d: [{ p: "APC", v: 71, c: "#008751" }, { p: "PDP", v: 26, c: "#c8941a" }] }, NE: { w: "APC", d: [{ p: "APC", v: 62, c: "#008751" }, { p: "PDP", v: 35, c: "#c8941a" }] }, NC: { w: "APC", d: [{ p: "APC", v: 55, c: "#008751" }, { p: "PDP", v: 40, c: "#c8941a" }] }, SW: { w: "APC", d: [{ p: "APC", v: 64, c: "#008751" }, { p: "PDP", v: 29, c: "#c8941a" }] }, SE: { w: "PDP", d: [{ p: "APC", v: 10, c: "#008751" }, { p: "PDP", v: 85, c: "#c8941a" }] }, SS: { w: "PDP", d: [{ p: "APC", v: 22, c: "#008751" }, { p: "PDP", v: 73, c: "#c8941a" }] } },
  "2023": { NW: { w: "PDP", d: [{ p: "APC", v: 25, c: "#008751" }, { p: "PDP", v: 44, c: "#c8941a" }, { p: "LP", v: 7, c: "#b22222" }, { p: "NNPP", v: 24, c: "#3949ab" }] }, NE: { w: "PDP", d: [{ p: "APC", v: 38, c: "#008751" }, { p: "PDP", v: 42, c: "#c8941a" }, { p: "LP", v: 5, c: "#b22222" }] }, NC: { w: "APC", d: [{ p: "APC", v: 42, c: "#008751" }, { p: "PDP", v: 30, c: "#c8941a" }, { p: "LP", v: 22, c: "#b22222" }] }, SW: { w: "APC", d: [{ p: "APC", v: 66, c: "#008751" }, { p: "PDP", v: 10, c: "#c8941a" }, { p: "LP", v: 21, c: "#b22222" }] }, SE: { w: "LP", d: [{ p: "APC", v: 3, c: "#008751" }, { p: "PDP", v: 5, c: "#c8941a" }, { p: "LP", v: 88, c: "#b22222" }] }, SS: { w: "Split", d: [{ p: "APC", v: 27, c: "#008751" }, { p: "PDP", v: 34, c: "#c8941a" }, { p: "LP", v: 34, c: "#b22222" }] } },
};

const ZONE_CONTEXT = {
  "2011": "Jonathan (PDP) won comfortably, but regional patterns were stark — the North backed Buhari's CPC while the South overwhelmingly backed Jonathan. Post-election violence in the North killed 800+.",
  "2015": "Buhari's cross-regional coalition shocked Nigeria. Winning the South-West (previously a PDP region) while sweeping the North gave APC a historic mandate. Jonathan's graceful concession made history.",
  "2019": "Buhari consolidated his hold on all six zones except the South-East and South-South. Atiku's failure to dent the South-West sealed his defeat. Turnout dropped sharply to 35%.",
  "2023": "The most fractured result ever. Three parties won different zones. Labour's Peter Obi swept the South-East with 88%, revealing a generation-defining shift. The APC-PDP duopoly cracked.",
};

const JUNE12_EVENTS = [
  { date: "Nov 1992", title: "Campaign Season Opens", body: "Chief MKO Abiola (SDP) and Bashir Tofa (NRC) emerge as the two candidates under Babangida's two-party transition program. Two parties — Social Democratic Party and National Republican Convention — were the only parties permitted to exist.", type: "setup" },
  { date: "June 12, 1993", title: "Election Day", body: "Nigerians voted in what international observers called the freest, most credible election in the country's history. The atmosphere was peaceful. Abiola, a wealthy Yoruba Muslim businessman with a running mate from the North, built a genuinely national coalition.", type: "milestone" },
  { date: "June 14, 1993", title: "Partial Results Released", body: "Abiola was ahead in the results that had trickled out — winning states in the North, South-West, and parts of the South. The results pointed to a landslide. Then silence.", type: "tension" },
  { date: "June 23, 1993", title: "Babangida Annuls the Election", body: "General Ibrahim Babangida annulled the results 'in the interest of the nation'. No winner was declared. The decision shocked Nigeria and the world. Mass protests erupted immediately in Lagos and other cities. Pro-democracy activists were arrested.", type: "crisis" },
  { date: "Aug–Nov 1993", title: "Transition Games & Interim Government", body: "Babangida installed Ernest Shonekan as head of an 'Interim National Government' — widely seen as a delay tactic. Sani Abacha, Defence Minister, effectively controlled power behind the scenes.", type: "crisis" },
  { date: "June 1994", title: "Abiola Declares Himself President", body: "Abiola, under massive pressure from pro-democracy groups, declares himself 'President of Nigeria' at a rally in Lagos. He is arrested days later and charged with treason. He is held without trial.", type: "crisis" },
  { date: "Nov 1995", title: "Ken Saro-Wiwa Executed", body: "Under Abacha's orders, writer-activist Ken Saro-Wiwa and eight other Ogoni activists are hanged after a trial condemned as a sham. Nigeria is suspended from the Commonwealth. The international community intensifies pressure.", type: "crisis" },
  { date: "June 8, 1998", title: "Abacha Dies Suddenly", body: "Sani Abacha dies — officially of a heart attack — under circumstances widely considered suspicious. His sudden death opens the door to a transition. Abdulsalami Abubakar becomes head of state.", type: "turning_point" },
  { date: "July 7, 1998", title: "Abiola Dies in Custody", body: "Just weeks after Abacha's death, MKO Abiola — still in prison — dies during a meeting with US officials. The official cause was 'cardiac arrest'. Nigerians erupted in rage. His death remains one of the most disputed in Nigerian history.", type: "tragedy" },
  { date: "May 29, 1999", title: "Fourth Republic Begins", body: "Nigeria transitions to civilian rule under Olusegun Obasanjo. The shadow of June 12 hangs over the new democracy. Many felt the presidency had been handed to a Yoruba man to compensate for Abiola's denial.", type: "resolution" },
  { date: "June 6, 2018", title: "June 12 Becomes Democracy Day", body: "President Buhari re-designates June 12 as Nigeria's Democracy Day, replacing May 29. Abiola is posthumously awarded Nigeria's highest national honour, the Grand Commander of the Federal Republic (GCFR).", type: "legacy" },
];

const CONSTITUTIONS = [
  {
    year: 1960, name: "Independence Constitution", type: "Westminster/Parliamentary", color: "#3949ab",
    features: ["Parliamentary system modelled on Britain", "Queen Elizabeth II as head of state via Governor-General", "Federal structure with 3 regions: North, West, East", "PM Abubakar Tafawa Balewa as head of government", "Independent judiciary with Federal Supreme Court"],
    context: "Negotiated with departing British colonial authorities. Preserved many colonial structures. Designed for a British-style parliamentary democracy that Nigeria's realities would quickly outgrow.",
    legacy: "Lasted 3 years before being replaced when Nigeria declared itself a republic."
  },
  {
    year: 1963, name: "Republican Constitution", type: "Presidential-Parliamentary Hybrid", color: "#008751",
    features: ["President replaced the Queen as head of state", "Nnamdi Azikiwe became first President", "Retained parliamentary cabinet system (PM still held executive power)", "Four regions: added Mid-West in 1963", "Reinforced federal structure with regional governments"],
    context: "Nigeria's first truly indigenous constitution. It maintained most of the 1960 framework but severed formal ties with the British Crown. The regions gained significant autonomy.",
    legacy: "The January 1966 military coup ended this constitution."
  },
  {
    year: 1979, name: "Second Republic Constitution", type: "Presidential", color: "#c8941a",
    features: ["Adopted American-style presidential system", "Directly elected executive President with real powers", "Senate + House of Representatives (bicameral legislature", "36 states replacing regions", "Federal Character Principle (ethnic balance in appointments)", "Two-thirds of states requirement for presidential winner"],
    context: "Drafted after 13 years of military rule. The Constituent Assembly deliberated 1977-78. It consciously tried to fix the First Republic's failings by diffusing power across more states and balancing ethnic representation.",
    legacy: "Ended by Buhari's coup December 31, 1983. Its presidential model became the template for all future attempts."
  },
  {
    year: 1989, name: "Third Republic Constitution (Never Used)", type: "Presidential", color: "#b22222",
    features: ["Drafted for Babangida's transition program", "Two-party system (SDP and NRC only)", "Maintained presidential system from 1979", "Zoning principles for presidency to rotate among regions", "Designed specifically for the transition — not a permanent document"],
    context: "Babangida commissioned this constitution but never allowed it to be fully implemented. The annulment of the June 12, 1993 election also buried this constitution. Nigeria never used it for a single day of civilian governance.",
    legacy: "A constitutional ghost — it represents the failure of military-managed democratisation."
  },
  {
    year: 1999, name: "Fourth Republic Constitution", type: "Presidential (Current)", color: "#008751",
    features: ["Based heavily on the 1979 constitution", "36 states + FCT Abuja as capital", "Four-year presidential terms, maximum two terms", "Independent National Electoral Commission (INEC)", "Fundamental Human Rights provisions (Chapter IV)", "Resource Control: Federal Government retains oil revenues", "Amended 8+ times since 1999 (including June 12 as Democracy Day)"],
    context: "Drafted largely in secret by military officers in 1999 with minimal public input. Many Nigerians call it a 'military constitution in civilian clothing'. Calls for a new constitution or restructuring have grown every election cycle.",
    legacy: "Now 26+ years old — Nigeria's longest-running constitutional order. Its flaws (resource control, true federalism, security structure) are central to 2027 election debates."
  },
];

const QUIZ_QUESTIONS = [
  { q: "On what date did Nigeria gain independence from Britain?", opts: ["January 1, 1960", "October 1, 1960", "June 12, 1960", "May 29, 1960"], ans: 1, exp: "Nigeria gained independence on October 1, 1960 under Prime Minister Abubakar Tafawa Balewa. The country declared itself a republic on October 1, 1963." },
  { q: "Who won the annulled June 12, 1993 presidential election?", opts: ["Olusegun Obasanjo", "Moshood Abiola", "Babangida", "Bashir Tofa"], ans: 1, exp: "Chief MKO Abiola (SDP) won what observers called Nigeria's freest election ever. General Babangida annulled the results 11 days later on June 23, 1993." },
  { q: "Which general annulled the June 12, 1993 election results?", opts: ["Sani Abacha", "Muhammadu Buhari", "Ibrahim Babangida", "Olusegun Obasanjo"], ans: 2, exp: "General Ibrahim Babangida (IBB) annulled the election. He was known as 'The Maradona' for his political dribbling. Abacha came to power after the Shonekan interim period." },
  { q: "When did Nigeria's Fourth Republic (current democracy) begin?", opts: ["June 12, 1999", "January 1, 2000", "May 29, 1999", "October 1, 1999"], ans: 2, exp: "May 29, 1999 — Olusegun Obasanjo was inaugurated as president, ending 16 years of military rule. May 29 was known as 'Democracy Day' until Buhari changed it to June 12 in 2018." },
  { q: "Which election was the first in Nigerian history where an incumbent president lost?", opts: ["2007", "2011", "2015", "2019"], ans: 2, exp: "In 2015, Muhammadu Buhari (APC) defeated President Goodluck Jonathan (PDP) — the first time a sitting president lost a Nigerian election. Jonathan's graceful concession was celebrated across Africa." },
  { q: "How many constitutions has Nigeria had since independence?", opts: ["3", "4", "5", "6"], ans: 2, exp: "Nigeria has had 5 constitutions: 1960 (Independence), 1963 (Republican), 1979 (Second Republic), 1989 (never used), and 1999 (current). The 1989 constitution was drafted for Babangida's transition but never implemented." },
  { q: "What party was formed in 2013 by merging four opposition parties to challenge PDP?", opts: ["Labour Party", "All Progressives Congress (APC)", "APGA", "NNPP"], ans: 1, exp: "The All Progressives Congress (APC) was formed in 2013 by merging the ACN, CPC, ANPP, and a faction of APGA. It defeated the PDP in 2015, ending 16 years of PDP dominance." },
  { q: "In which geopolitical zone did Peter Obi (LP) win approximately 88% of votes in 2023?", opts: ["South-South", "North-Central", "South-East", "South-West"], ans: 2, exp: "Peter Obi swept the South-East with ~88% of votes, his Igbo homeland. The result was historic for a third-party candidate and showed the deep regional character of Nigerian presidential voting." },
  { q: "Which state has continuously been governed by APGA since 2006?", opts: ["Enugu", "Imo", "Anambra", "Abia"], ans: 2, exp: "Anambra State has been an APGA stronghold since 2006. Peter Obi (now of LP) was governor here. Current governor Charles Soludo is also APGA and a former CBN governor." },
  { q: "What year was activist and writer Ken Saro-Wiwa executed?", opts: ["1993", "1994", "1995", "1996"], ans: 2, exp: "Ken Saro-Wiwa and eight other Ogoni activists were hanged on November 10, 1995 under Abacha's orders. His execution led to Nigeria's suspension from the Commonwealth." },
  { q: "What is the 'Federal Character Principle' introduced in the 1979 Constitution?", opts: ["All states must have equal senators", "Presidential candidate must win 2/3 of states", "Government appointments must reflect Nigeria's diversity and not favour any group", "The president must be from a different region than the VP"], ans: 2, exp: "The Federal Character Principle (Section 14 of 1999 Constitution) requires that federal appointments reflect Nigeria's ethnic and state diversity. It was introduced to prevent any single region from dominating the federal government." },
  { q: "Which Nigerian civil war lasted from 1967–1970?", opts: ["Biafran War", "Ife-Modakeke War", "Middle Belt Crisis", "Tiv-Jukun Conflict"], ans: 0, exp: "The Nigerian Civil War (Biafran War) began when the Eastern Region, led by Colonel Ojukwu, declared the Republic of Biafra. The 3-year war killed 1–3 million people, many by famine. It ended with Gowon's 'No victor, no vanquished' declaration." },
];

const REPUBLICS = [
  {
    id: "first", label: "1st Republic", years: "1960–1966", color: "#008751", title: "Independence & The First Republic",
    desc: "Nigeria gained independence on October 1, 1960 under PM Abubakar Tafawa Balewa, transitioning to a republic in 1963 with Nnamdi Azikiwe as president. The parliamentary system was beset by ethnic rivalry between the Hausa-Fulani North, Yoruba Southwest, and Igbo Southeast. Disputed elections in 1964 paralyzed governance.",
    events: ["Oct 1, 1960 — Independence from Britain", "1963 — Republic declared; Azikiwe first president", "1964 — Disputed federal elections trigger crisis", "Jan 1966 — Military coup ends the republic"],
    stats: [{ l: "Years", v: "6", s: "1960–1966" }, { l: "First President", v: "Azikiwe", s: "Nnamdi Azikiwe, 1963" }, { l: "Population", v: "45M", s: "Estimated, 1960" }]
  },
  {
    id: "mil1", label: "Military I", years: "1966–1979", color: "#b22222", title: "Coups, Civil War & Military Rule",
    desc: "Two coups in 1966 plunged Nigeria into violent chaos. The July counter-coup triggered massacres of Igbo people in the North, sparking the Biafran War (1967–70) — one of Africa's deadliest conflicts with 1-3 million dead. After victory, Gowon promoted reconciliation. Murtala Muhammed was assassinated; Obasanjo oversaw the handover to civilians.",
    events: ["Jan 1966 — Nzeogwu-led coup kills PM Balewa", "Jul 1966 — Counter-coup installs Gowon", "1967–70 — Biafran War; 1M–3M dead", "Feb 1976 — Murtala assassinated; Obasanjo takes over", "1979 — Transition to civilian rule"],
    stats: [{ l: "Civil War Deaths", v: "1M–3M", s: "Estimates vary widely" }, { l: "Military Rulers", v: "4", s: "Over 13 years" }, { l: "States Created", v: "19", s: "From original 4 regions" }]
  },
  {
    id: "second", label: "2nd Republic", years: "1979–1983", color: "#c8941a", title: "Oil Boom & the Second Republic",
    desc: "Nigeria adopted a U.S.-style presidential system. Alhaji Shehu Shagari became the first executive president under the NPN. The republic floated on oil revenues but sank under corruption. Disputed 1983 elections led to Shagari's controversial re-election — and 3 months later, a coup.",
    events: ["1979 — Shagari elected first executive president", "1980 — Maitatsine uprising in Kano kills 4,000+", "1983 — Disputed elections; Shagari re-elected", "Dec 31, 1983 — Buhari-led coup ends the republic"],
    stats: [{ l: "Duration", v: "4 yrs", s: "Nigeria's shortest republic" }, { l: "1st Exec. President", v: "Shagari", s: "NPN, 1979" }, { l: "Oil Revenue Peak", v: "$26B", s: "Annual earnings" }]
  },
  {
    id: "mil2", label: "Military II", years: "1983–1999", color: "#8b0000", title: "Buhari, Babangida & Abacha",
    desc: "Nigeria's darkest chapter. Babangida annulled the June 12, 1993 election — Nigeria's freest ever. Abacha's brutal dictatorship followed: Ken Saro-Wiwa executed, billions looted, opposition jailed. Abacha's death in 1998 allowed Abdulsalami Abubakar to quickly restore civilian rule.",
    events: ["1985 — Babangida ousts Buhari", "Jun 12, 1993 — Abiola wins presidential election", "Jun 23, 1993 — Babangida annuls the result", "Nov 1995 — Ken Saro-Wiwa executed", "Jun 1998 — Abacha dies; transition begins"],
    stats: [{ l: "Years of Mil. Rule", v: "16", s: "1983–1999" }, { l: "Defining Crisis", v: "Jun 12", s: "Election annulment, 1993" }, { l: "Looted by Abacha", v: "$4B+", s: "Estimated funds stolen" }]
  },
  {
    id: "fourth", label: "4th Republic", years: "1999–Now", color: "#008751", title: "The Fourth Republic",
    desc: "May 29, 1999 began Nigeria's longest uninterrupted democracy. Eight general elections, two peaceful party transfers, and growing civic activism define this era. The 2015 election — where Jonathan conceded to Buhari — was a watershed. The 2023 cycle brought the Labour Party surge.",
    events: ["May 29, 1999 — Obasanjo inaugurated", "2015 — Historic first: Buhari defeats Jonathan", "2019 — Buhari re-elected over Atiku", "2023 — Tinubu wins; Labour Party surges"],
    stats: [{ l: "Years Running", v: "26+", s: "Since May 29, 1999" }, { l: "General Elections", v: "8", s: "1999–2023" }, { l: "Party Transfers", v: "2", s: "PDP → APC" }]
  },
];

const TIMELINE = [
  { year: "1960", tag: "milestone", title: "Independence", body: "Nigeria gains independence on October 1st under PM Abubakar Tafawa Balewa. Nnamdi Azikiwe becomes Governor-General and later first President in 1963.", sources: ["The Guardian (Nigeria), Oct 1960", "Richard Sklar — Nigerian Political Parties (1963)"] },
  { year: "1966", tag: "military", title: "First Military Coup", body: "Major Kaduna Nzeogwu leads a coup killing PM Balewa. A counter-coup in July installs Gowon. Ethnic massacres of Igbos in the North follow, setting the stage for civil war.", disputed: true, disputed_note: "The motives behind the January 1966 coup remain contested — whether it was an 'Igbo coup' or a nationalist effort against corruption is debated by historians.", sources: ["Siyan Oyeweso — Perspectives on the Nigerian Civil War (2002)"] },
  { year: "1967", tag: "crisis", title: "Biafran War", body: "Col. Ojukwu declares the Republic of Biafra. Three years of war kill over one million Nigerians, many by famine. The war ends January 1970 with Gowon's 'No victor, no vanquished' declaration.", disputed: true, disputed_note: "Death toll estimates range from 500,000 to 3,000,000. The extent to which deliberate starvation was used as a weapon of war remains a deeply contested historical question.", sources: ["Ben Gbulie — Nigeria's Five Majors (1981)", "Chinua Achebe — There Was a Country (2012)"] },
  { year: "1979", tag: "democracy", title: "Return to Democracy", body: "Shehu Shagari wins under a new U.S.-style presidential constitution. The Second Republic rides the oil boom but corruption runs rampant. It lasts just four years.", sources: ["Richard Joseph — Democracy and Prebendal Politics in Nigeria (1987)"] },
  { year: "1983", tag: "military", title: "Buhari Coup", body: "Gen. Buhari overthrows Shagari following disputed elections. Babangida later overthrows Buhari in a palace coup in 1985, beginning a more consequential military era.", sources: ["Max Siollun — Oil, Politics and Violence (2009)"] },
  { year: "1993", tag: "crisis", title: "June 12 Annulment", body: "MKO Abiola wins Nigeria's fairest election. Babangida shocks the nation by annulling the results. Mass protests erupt. Abiola is later jailed and dies in custody in 1998. June 12 is now Democracy Day.", sources: ["Adele Jinadu — Federalism, the Consociational State (1985)", "Human Rights Watch Report, 1993"] },
  { year: "1995", tag: "crisis", title: "Saro-Wiwa Executed", body: "Writer-activist Ken Saro-Wiwa and eight other Ogoni activists are hanged by Abacha's regime despite international outcry. Nigeria is suspended from the Commonwealth.", sources: ["Ken Saro-Wiwa — A Month and A Day: A Detention Diary (1995)", "Amnesty International Report, 1995"] },
  { year: "1999", tag: "democracy", title: "Fourth Republic Begins", body: "May 29, 1999: Olusegun Obasanjo inaugurated, ending 16 years of military rule. Nigeria's longest democratic stretch begins — now over 26 years.", sources: ["INEC Official Records, 1999", "Rotimi Suberu — Federalism and Ethnic Conflict in Nigeria (2001)"] },
  { year: "2015", tag: "milestone", title: "Historic Party Transfer", body: "Buhari defeats sitting President Jonathan — the first time an opposition candidate wins in Nigerian history. Jonathan's early concession is celebrated across Africa as a democratic milestone.", sources: ["INEC Final Results, 2015 Presidential Election", "Carter Center Election Observer Report, 2015"] },
  { year: "2023", tag: "milestone", title: "Tinubu & the Labour Surge", body: "Bola Tinubu wins a three-way race with just 36.6% of the vote. Labour's Peter Obi, backed by the youth 'Obidient' movement, reshapes Nigerian politics for a new generation.", disputed: true, disputed_note: "The 2023 results were challenged in court on grounds of BVAS manipulation, results uploading failures on INEC's IReV portal, and allegations of vote-buying. The Supreme Court ultimately upheld Tinubu's victory.", sources: ["INEC Presidential Election Results, 2023", "Supreme Court of Nigeria Judgement, October 26, 2023"] },
];

const ELECTIONS = [
  { year: "1999", winner: "Olusegun Obasanjo", party: "PDP", pct: 62.8, runnerUp: "Olu Falae (AD/APP)", notable: "First election of the Fourth Republic. Obasanjo, a former military ruler turned democrat, wins in a landslide." },
  { year: "2003", winner: "Olusegun Obasanjo", party: "PDP", pct: 61.9, runnerUp: "Muhammadu Buhari (ANPP)", notable: "Obasanjo re-elected amid widespread rigging allegations. International observers criticised the conduct. Buhari's first of four presidential bids." },
  { year: "2007", winner: "Umaru Yar'Adua", party: "PDP", pct: 70.0, runnerUp: "Muhammadu Buhari (ANPP)", notable: "Most disputed election of the Fourth Republic. Yar'Adua himself publicly acknowledged the election was flawed.", disputed: true },
  { year: "2011", winner: "Goodluck Jonathan", party: "PDP", pct: 58.9, runnerUp: "Muhammadu Buhari (CPC)", notable: "Considered the fairest election to date. Post-election violence in the North killed 800+. Buhari's 3rd attempt." },
  { year: "2015", winner: "Muhammadu Buhari", party: "APC", pct: 54.0, runnerUp: "Goodluck Jonathan (PDP)", notable: "Historic first. Incumbent loses. Jonathan concedes before final results — unprecedented in West Africa. APC formed just 2 years earlier." },
  { year: "2019", winner: "Muhammadu Buhari", party: "APC", pct: 56.0, runnerUp: "Atiku Abubakar (PDP)", notable: "Buhari re-elected. Election delayed one week by INEC citing logistics and security concerns." },
  { year: "2023", winner: "Bola Tinubu", party: "APC", pct: 36.6, runnerUp: "Atiku Abubakar, PDP (29%)", notable: "Three-way race. Tinubu wins with record-low 36.6% share. Labour's Peter Obi gets 25%, seismic for a third party.", disputed: true },
];

const PRESIDENTS = [
  { img: "/azikiwe.webp", init: "NA", name: "Nnamdi Azikiwe", party: "NCNC", years: "1963–1966", type: "civilian", title: "President", legacy: "Nigeria's first president (ceremonial under PM Balewa). Intellectual, nationalist, Pan-Africanist. Known as 'Zik of Africa'. Removed from office by the January 1966 military coup." },
  { img: "/ironsi.jpg", init: "AI", name: "Aguiyi-Ironsi", party: "Military", years: "Jan–Jul 1966", type: "military", title: "Head of State", legacy: "Became Nigeria's first military head of state after the January 1966 coup — not as a plotter, but as the most senior surviving officer who stepped into the vacuum. His Decree No. 34 abolishing the federal structure inflamed Northern fears and triggered his overthrow and murder after just 194 days in power." },
  { img: "/gowon.webp", init: "YG", name: "Yakubu Gowon", party: "Military", years: "1966–1975", type: "military", title: "Head of State", legacy: "Led Nigeria through the civil war. His 'No victor, no vanquished' post-war policy prevented further bloodshed. A Middle Belt Christian chosen as a unifying compromise. Overthrown while attending an OAU summit in Uganda." },
  { img: "/muhammed.jpg", init: "MM", name: "Murtala Muhammed", party: "Military", years: "1975–1976", type: "military", title: "Head of State", legacy: "Energetic reformer who planned moving the capital to Abuja. Known for bold anti-corruption purges. Assassinated in a failed coup just 6 months into office — remains one of Nigeria's most beloved leaders." },
  { img: "/obasanjo.jpg", init: "OO", name: "Olusegun Obasanjo", party: "Mil/PDP", years: "1976–79, 1999–2007", type: "both", title: "Head of State / President", legacy: "The only Nigerian leader to rule both as military head of state and as an elected president. Voluntarily handed power to civilians in 1979 — rare for African military rulers. His civilian tenure saw debt relief but also democratic backsliding." },
  { img: "/shagari.webp", init: "SS", name: "Shehu Shagari", party: "NPN", years: "1979–1983", type: "civilian", title: "President", legacy: "First executive president under the Second Republic. The oil boom era masked deep corruption. Won a controversial re-election in 1983, then was overthrown by Buhari's coup on the last day of the year." },
  { img: "/buhari.jpg", init: "MB", name: "Muhammadu Buhari", party: "Mil/APC", years: "1984–85, 2015–2023", type: "both", title: "Head of State / President", legacy: "Overthrew Shagari in 1983; returned to power 30 years later via the ballot. Anti-corruption was his core brand, but his tenures were marked by press repression (military era) and worsening insecurity and a deep recession (civilian era)." },
  { img: "/babangida.webp", init: "IB", name: "Ibrahim Babangida", party: "Military", years: "1985–1993", type: "military", title: "Head of State", legacy: "Nigeria's self-declared 'President' and the most consequential military ruler. Known as 'The Maradona' for political cunning. Annulled the June 12, 1993 election — arguably the single most consequential political act in Nigerian history." },
  { img: "/shonekan.webp", init: "ES", name: "Ernest Shonekan", party: "ING", years: "Aug–Nov 1993", type: "civilian", title: "Interim Head of Government", legacy: "Handed power by Babangida as a transitional face. A respected Yoruba businessman with no real authority — the military retained control. Removed by Abacha in a 'palace coup' just 82 days later." },
  { img: "/abacha.webp", init: "SA", name: "Sani Abacha", party: "Military", years: "1993–1998", type: "military", title: "Head of State", legacy: "Nigeria's most brutal and kleptocratic ruler. Executed Ken Saro-Wiwa, jailed Obasanjo, held Abiola until his death. Looted an estimated $3–5 billion. Died suddenly in 1998 — widely believed to be poisoning — which opened the door to democracy." },
  { img: "/abubakar.webp", init: "AA", name: "Abdulsalami Abubakar", party: "Military", years: "1998–1999", type: "military", title: "Head of State", legacy: "Succeeded Abacha and surprised Nigeria by genuinely transitioning to democracy within a year. His 10-month tenure produced a new constitution, elections, and Nigeria's Fourth Republic. Widely respected for keeping his word." },
  { img: "/yaradua.jpg", init: "UY", name: "Umaru Yar'Adua", party: "PDP", years: "2007–2010", type: "civilian", title: "President", legacy: "First president to publicly declare his assets. Launched the Niger Delta Amnesty program, transforming regional violence. Died mid-term from kidney disease after governing largely from a Saudi hospital — a constitutional crisis Nigeria was slow to resolve." },
  { img: "/jonathan.jpg", init: "GJ", name: "Goodluck Jonathan", party: "PDP", years: "2010–2015", type: "civilian", title: "President", legacy: "Rose from Vice-President after Yar'Adua's death. The first southerner to lose a presidential election to a northerner. His graceful 2015 concession before final results were announced is considered his greatest gift to Nigerian democracy." },
  { img: "/tinubu.png", init: "BT", name: "Bola Tinubu", party: "APC", years: "2023–present", type: "civilian", title: "President", legacy: "Former Lagos governor who built Nigeria's most powerful political machine over two decades. Won 2023 with 36.6% in a three-way race. His 'Renewed Hope' agenda faces severe economic headwinds from fuel subsidy removal and naira devaluation." },
];

const PARTIES = [
  { abbr: "PDP", name: "People's Democratic Party", founded: 1998, color: "#c8941a", ideology: "Big-tent centrist", period: "1999–2015 dominance", desc: "Dominated Nigerian politics for 16 years straight, winning every presidential election from 1999 to 2011. Formed by a coalition of former military officers, businessmen, and politicians. Lost power in 2015 and remains the main opposition." },
  { abbr: "APC", name: "All Progressives Congress", founded: 2013, color: "#008751", ideology: "Progressive centrist", period: "2015–present", desc: "Formed by merging ACN, CPC, ANPP, and an APGA faction to unseat PDP. Won in 2015, 2019, and 2023. Internal factionalism — including Obasanjo, Kwankwaso, and Wike defections — continuously tests its cohesion." },
  { abbr: "LP", name: "Labour Party", founded: 2002, color: "#b22222", ideology: "Social democratic", period: "2023 surge", desc: "A fringe party until Peter Obi's 2023 candidacy triggered the 'Obidient' youth movement. Finished 3rd nationally but won the South-East and youth demographics everywhere — a generational shift in Nigerian politics." },
  { abbr: "NNPP", name: "New Nigeria Peoples Party", founded: 2020, color: "#3949ab", ideology: "People-first populist", period: "2023 Kano", desc: "Became a force in 2023 with Rabiu Kwankwaso winning Kano governorship and finishing 4th in the presidential race. Kwankwaso is an ADC/coalition key figure for the 2027 opposition alliance." },
  { abbr: "APGA", name: "All Progressives Grand Alliance", founded: 2003, color: "#8b0000", ideology: "Pan-Igbo/Progressive", period: "Southeast force", desc: "Dominant in Anambra since 2006. Known for relatively effective governance. Charles Soludo (former CBN governor) currently governs Anambra under this banner." },
  { abbr: "NPN", name: "National Party of Nigeria", founded: 1978, color: "#888", ideology: "Conservative/Northern", period: "1979–1983", desc: "The party of the Second Republic under Shehu Shagari. The oil boom masked its failures. Dissolved after the 1983 military coup." },
  { abbr: "ADC", name: "African Democratic Congress", founded: 2005, color: "#00838f", ideology: "Centrist / Coalition vehicle", period: "2023–present", desc: "A mid-tier party that became politically significant ahead of 2027 as a potential coalition vehicle for opposition unity. Several APC and PDP defectors have used it as a platform, and it has been discussed as a possible alliance partner for Kwankwaso's NNPP in building an anti-incumbency coalition against Tinubu's APC." },
];

const GOVERNORS = [
  { id: "abia", name: "Abia", governor: "Alex Otti", party: "LP" },
  { id: "adamawa", name: "Adamawa", governor: "Ahmadu Fintiri", party: "PDP" },
  { id: "akwa-ibom", name: "Akwa Ibom", governor: "Umo Eno", party: "APC" },
  { id: "anambra", name: "Anambra", governor: "Charles Soludo", party: "APGA" },
  { id: "bauchi", name: "Bauchi", governor: "Bala Mohammed", party: "PDP" },
  { id: "bayelsa", name: "Bayelsa", governor: "Douye Diri", party: "APC" },
  { id: "benue", name: "Benue", governor: "Hyacinth Alia", party: "APC" },
  { id: "borno", name: "Borno", governor: "Babagana Zulum", party: "APC" },
  { id: "cross-river", name: "Cross River", governor: "Bassey Otu", party: "APC" },
  { id: "delta", name: "Delta", governor: "Sheriff Oborevwori", party: "APC" },
  { id: "ebonyi", name: "Ebonyi", governor: "Francis Nwifuru", party: "APC" },
  { id: "edo", name: "Edo", governor: "Monday Okpebholo", party: "APC" },
  { id: "ekiti", name: "Ekiti", governor: "Biodun Oyebanji", party: "APC" },
  { id: "enugu", name: "Enugu", governor: "Peter Mbah", party: "APC" },
  { id: "federal-capital-territory", name: "FCT", governor: "Nyesom Wike (Min.)", party: "PDP" },
  { id: "gombe", name: "Gombe", governor: "Inuwa Yahaya", party: "APC" },
  { id: "imo", name: "Imo", governor: "Hope Uzodimma", party: "APC" },
  { id: "jigawa", name: "Jigawa", governor: "Umar Namadi", party: "APC" },
  { id: "kaduna", name: "Kaduna", governor: "Uba Sani", party: "APC" },
  { id: "kano", name: "Kano", governor: "Abba Kabir Yusuf", party: "APC" },
  { id: "katsina", name: "Katsina", governor: "Dikko Radda", party: "APC" },
  { id: "kebbi", name: "Kebbi", governor: "Nasir Idris", party: "APC" },
  { id: "kogi", name: "Kogi", governor: "Usman Ododo", party: "APC" },
  { id: "kwara", name: "Kwara", governor: "Abdulrahman Abdulrazaq", party: "APC" },
  { id: "lagos", name: "Lagos", governor: "Babajide Sanwo-Olu", party: "APC" },
  { id: "nassarawa", name: "Nasarawa", governor: "Abdullahi Sule", party: "APC" },
  { id: "niger", name: "Niger", governor: "Mohammed Bago", party: "APC" },
  { id: "ogun", name: "Ogun", governor: "Dapo Abiodun", party: "APC" },
  { id: "ondo", name: "Ondo", governor: "Lucky Aiyedatiwa", party: "APC" },
  { id: "osun", name: "Osun", governor: "Ademola Adeleke", party: "AP" },
  { id: "oyo", name: "Oyo", governor: "Seyi Makinde", party: "PDP" },
  { id: "plateau", name: "Plateau", governor: "Caleb Mutfwang", party: "APC" },
  { id: "rivers", name: "Rivers", governor: "Siminalayi Fubara", party: "APC" },
  { id: "sokoto", name: "Sokoto", governor: "Ahmad Aliyu", party: "APC" },
  { id: "taraba", name: "Taraba", governor: "Agbu Kefas", party: "PDP" },
  { id: "yobe", name: "Yobe", governor: "Mai Mala Buni", party: "APC" },
  { id: "zamfara", name: "Zamfara", governor: "Dauda Lawal", party: "PDP" },
];

const TRENDS = [
  { icon: "📱", tag: "Technology", title: "BVAS & Digital Elections", desc: "The Bimodal Voter Accreditation System (BVAS) and IReV portal allow real-time result uploads from polling units, significantly reducing manipulation at collation centers. INEC's 2023 implementation was imperfect but marks an irreversible shift." },
  { icon: "🔥", tag: "Youth Activism", title: "The Obidient Movement", desc: "Peter Obi's 2023 run catalyzed an unprecedented youth-led movement. Twitter, TikTok, and WhatsApp became political battlegrounds, proving digital organizing can reshape Nigerian politics even without party infrastructure." },
  { icon: "⚖️", tag: "Judiciary", title: "Courts as Final Arbiter", desc: "Election tribunals increasingly decide outcomes. The Supreme Court's October 2023 dismissal of petitions raised sharp questions about judicial independence, case management, and whether courts can credibly audit complex electoral data." },
  { icon: "📉", tag: "Participation", title: "Declining Voter Turnout", desc: "Turnout fell from ~69% in 1999 to under 27% in 2023 — the lowest in the Fourth Republic. Disillusionment, logistics failures, and security concerns keep millions away from polls each cycle." },
  { icon: "👩‍⚖️", tag: "Gender", title: "Women in Politics Gap", desc: "Fewer than 5% of National Assembly seats are held by women — among the lowest globally. A 35% affirmative action bill has repeatedly failed to pass. No woman has come close to the presidency." },
  { icon: "💰", tag: "Economy", title: "Cost-of-Living Crisis", desc: "Fuel subsidy removal and naira devaluation under Tinubu triggered 30%+ inflation in 2024. The economic fallout is testing democratic legitimacy — Nigerians connected their suffering directly to political choices." },
  { icon: "🛡️", tag: "Security", title: "Multi-Front Insecurity", desc: "Boko Haram/ISWAP in the Northeast, banditry in the Northwest, IPOB agitation in the Southeast, and Niger Delta militancy collectively threaten civic participation. Over 2 million Nigerians are internally displaced." },
  { icon: "🌍", tag: "Federalism", title: "2027 & Restructuring", desc: "The ADC-anchored opposition coalition of Atiku, Obi, and Kwankwaso is building for 2027. Simultaneously, calls for restructuring Nigeria's fiscal federalism — giving states more resource control — are growing across party lines." },
];

/* ─── Shared Components ─────────────────────────────────────────────── */
function Tag({ label, color }) {
  const c = color || TC[label?.toLowerCase()] || "#888";
  return <span style={{ display: "inline-block", padding: "2px 10px", borderRadius: 99, fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", background: c + "15", color: c, border: `1px solid ${c}35` }}>{label}</span>;
}
function Pill({ label, color = "#008751" }) {
  return <span style={{ background: color + "15", color, border: `1px solid ${color}30`, padding: "2px 10px", borderRadius: 99, fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase" }}>{label}</span>;
}
function StatBlock({ value, label }) {
  const [count, setCount] = useState(0);
  const [isInView, setIsInView] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!ref.current) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setIsInView(true);
        obs.disconnect();
      }
    }, { threshold: 0.1 });
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  const target = parseFloat(value) || 0;
  const suffix = value.toString().replace(/[0-9.]/g, "");

  useEffect(() => {
    if (!isInView) return;
    const duration = 1500;
    const startTime = performance.now();

    const animate = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const ease = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      setCount(Math.floor(ease * target));
      if (progress < 1) requestAnimationFrame(animate);
    };

    requestAnimationFrame(animate);
  }, [isInView, target]);

  return (
    <div ref={ref} style={{ textAlign: "center", minWidth: 100 }}>
      <div style={{ fontSize: "2.2rem", fontWeight: 800, color: "var(--ink)", lineHeight: 1 }}>
        {count}{suffix}
      </div>
      <div style={{ fontSize: "0.7rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginTop: 4 }}>{label}</div>
    </div>
  );
}
function PH({ eyebrow, title, sub }) {
  return (
    <motion.div initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55 }} style={{ marginBottom: "2.5rem" }}>
      {eyebrow && <div style={{ fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--g)", fontWeight: 700, marginBottom: "0.6rem" }}>{eyebrow}</div>}
      <h1 style={{ fontSize: "clamp(2rem,4vw,3.2rem)", fontWeight: 900, letterSpacing: "-2px", marginBottom: "0.75rem" }}>{title}</h1>
      {sub && <p style={{ color: "var(--sub)", fontSize: "1rem", lineHeight: 1.8, maxWidth: 600 }}>{sub}</p>}
    </motion.div>
  );
}

/* ─── Search Modal ──────────────────────────────────────────────────── */
const SEARCH_INDEX = [
  ...TIMELINE.map(e => ({ type: "Timeline", title: `${e.year}: ${e.title}`, body: e.body.slice(0, 80) + "…", page: "timeline" })),
  ...ELECTIONS.map(e => ({ type: "Elections", title: `${e.year} — ${e.winner}`, body: e.notable.slice(0, 80) + "…", page: "elections" })),
  ...PRESIDENTS.map(p => ({ type: "Presidents", title: p.name, body: p.legacy.slice(0, 80) + "…", page: "presidents" })),
  ...PARTIES.map(p => ({ type: "Parties", title: `${p.abbr} — ${p.name}`, body: p.desc.slice(0, 80) + "…", page: "parties" })),
  ...GOVERNORS.map(g => ({ type: "Governors", title: `${g.name} — Gov. ${g.governor}`, body: `Party: ${g.party}`, page: "governors" })),
  ...CONSTITUTIONS.map(c => ({ type: "Constitutions", title: `${c.year} Constitution`, body: c.context.slice(0, 80) + "…", page: "constitutions" })),
  { type: "June 12", title: "June 12, 1993 — The Annulled Election", body: "Nigeria's most consequential democratic moment.", page: "june12" },
];

function SearchModal({ open, onClose, navigate }) {
  const [q, setQ] = useState("");
  const ref = useRef(null);
  useEffect(() => { if (open) { setQ(""); setTimeout(() => ref.current?.focus(), 80); } }, [open]);
  useEffect(() => {
    const h = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);
  const results = useMemo(() => {
    if (q.trim().length < 2) return [];
    const lq = q.toLowerCase();
    return SEARCH_INDEX.filter(x => x.title.toLowerCase().includes(lq) || x.body.toLowerCase().includes(lq)).slice(0, 8);
  }, [q]);
  if (!open) return null;
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: "fixed", inset: 0, background: "rgba(14,14,14,0.6)", backdropFilter: "blur(8px)", zIndex: 9000, display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: "12vh" }}
      onClick={onClose}>
      <motion.div initial={{ opacity: 0, y: -24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -24 }} transition={{ duration: 0.25 }}
        onClick={e => e.stopPropagation()}
        style={{ background: "var(--white)", borderRadius: 18, width: "min(640px,92vw)", boxShadow: "0 40px 80px rgba(0,0,0,0.25)", overflow: "hidden" }}>
        <div style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: "1.1rem", flexShrink: 0 }}>🔍</span>
          <input ref={ref} value={q} onChange={e => setQ(e.target.value)}
            placeholder="Search events, elections, leaders, states…"
            style={{ flex: 1, border: "none", outline: "none", fontSize: "1rem", fontFamily: "'Outfit',sans-serif", background: "transparent", color: "var(--ink)" }} />
          <kbd style={{ fontSize: "0.72rem", color: "var(--muted)", background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 5, padding: "2px 7px", flexShrink: 0 }}>ESC</kbd>
        </div>
        {results.length > 0 ? (
          <div style={{ maxHeight: "55vh", overflowY: "auto" }}>
            {results.map((r, i) => (
              <div key={i} onClick={() => { navigate(r.page); onClose(); }}
                style={{ padding: "0.9rem 1.5rem", cursor: "pointer", borderBottom: "1px solid var(--border)", transition: "background 0.15s" }}
                onMouseEnter={e => e.currentTarget.style.background = "#f5f5f3"}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--g)" }}>{r.type}</span>
                </div>
                <div style={{ fontWeight: 700, fontSize: "0.9rem", marginBottom: 2 }}>{r.title}</div>
                <div style={{ fontSize: "0.78rem", color: "var(--muted)" }}>{r.body}</div>
              </div>
            ))}
          </div>
        ) : q.length >= 2 ? (
          <div style={{ padding: "2rem", textAlign: "center", color: "var(--muted)", fontSize: "0.9rem" }}>No results for "<strong>{q}</strong>"</div>
        ) : (
          <div style={{ padding: "1.5rem 1.5rem 2rem" }}>
            <div style={{ fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--muted)", fontWeight: 700, marginBottom: "0.75rem" }}>Try searching for</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
              {["June 12", "Biafran War", "2015 election", "Zamfara", "Obasanjo", "APC", "Constitution"].map(s => (
                <button key={s} onClick={() => setQ(s)}
                  style={{ background: "var(--lg)", border: "none", borderRadius: 20, padding: "5px 14px", fontSize: "0.82rem", fontWeight: 600, color: "var(--dg)", cursor: "pointer" }}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

/* ─── Pages ──────────────────────────────────────────────────────────── */
function HomePage({ navigate }) {
  return (
    <div>
      <section style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "clamp(80px,15vh,120px) 6vw 80px", textAlign: "center", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 90% 60% at 50% 30%, #e6f4ed 0%, transparent 70%)", zIndex: 0 }} />
        <div style={{ position: "relative", zIndex: 1 }}>
          <motion.h1 initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.65, delay: 0.2 }}
            style={{ fontSize: "clamp(3rem,7.5vw,6.5rem)", fontWeight: 900, lineHeight: 1.02, letterSpacing: "-3px", maxWidth: 960, margin: "0 auto" }}>
            A Nation's <span style={{ color: "var(--g)" }}>Unfinished</span> Journey to Democracy
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.35 }}
            style={{ maxWidth: 560, margin: "1.5rem auto 0", color: "var(--sub)", fontSize: "1.05rem", lineHeight: 1.8 }}>
            From independence in 1960 through coups, annulments, civil war, and comeback — explore Nigeria's rich and turbulent democratic history.
          </motion.p>
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, delay: 0.5 }}
            style={{ display: "flex", gap: 12, marginTop: "2.5rem", justifyContent: "center", flexWrap: "wrap" }}>
            <motion.button whileHover={{ scale: 1.04, background: "var(--dg)" }} whileTap={{ scale: 0.97 }} onClick={() => navigate("june12")}
              style={{ background: "var(--g)", color: "#fff", padding: "14px 28px", borderRadius: 8, fontSize: "0.9rem", fontWeight: 600 }}>
              The June 12 Story →
            </motion.button>
            <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }} onClick={() => navigate("quiz")}
              style={{ background: "transparent", color: "var(--ink)", border: "1.5px solid var(--border)", padding: "14px 28px", borderRadius: 8, fontSize: "0.9rem", fontWeight: 600 }}>
              Test Your Knowledge 🎯
            </motion.button>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, delay: 0.65 }}
            style={{ display: "flex", gap: "3rem", marginTop: "4.5rem", justifyContent: "center", flexWrap: "wrap", alignItems: "center" }}>
            <StatBlock value="65" label="Years Independent" />
            <div style={{ width: 1, height: 48, background: "var(--border)" }} />
            <StatBlock value="26+" label="4th Republic" />
            <div style={{ width: 1, height: 48, background: "var(--border)" }} />
            <StatBlock value="220M" label="Citizens" />
            <div style={{ width: 1, height: 48, background: "var(--border)" }} />
            <StatBlock value="5" label="Constitutions" />
          </motion.div>
        </div>
      </section>
      <section style={{ padding: "80px 6vw", background: "var(--white)", borderTop: "1px solid var(--border)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--g)", fontWeight: 700, marginBottom: "0.6rem" }}>All Sections</div>
          <h2 style={{ fontSize: "clamp(1.8rem,3.5vw,2.8rem)", fontWeight: 900, letterSpacing: "-1px", marginBottom: "2.5rem" }}>Explore the Full Archive</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(240px,1fr))", gap: "1rem" }}>
            {[
              { icon: "🏛️", page: "history", title: "Republics & Eras", desc: "Five political eras from independence to today." },
              { icon: "🗓️", page: "june12", title: "June 12, 1993", desc: "Nigeria's most consequential democratic moment — and why it was really annulled." },
              { icon: "🔴", page: "biafra", title: "The Biafran War", desc: "The 1966 coup, the pogroms, the war, and correcting the historical record." },
              { icon: "📅", page: "timeline", title: "Timeline", desc: "Every coup, election, and turning point with sources." },
              { icon: "🗳️", page: "elections", title: "Elections + Regional Map", desc: "Results by zone — how Nigeria votes geographically." },
              { icon: "👤", page: "presidents", title: "Presidents", desc: "Every head of state, civilian and military." },
              { icon: "📍", page: "governors", title: "Governors + State Data", desc: "Interactive tile map with GDP, poverty, and security per state." },
              { icon: "🏴", page: "parties", title: "Political Parties", desc: "PDP, APC, Labour and the parties that shaped democracy." },
              { icon: "📜", page: "constitutions", title: "Constitutions", desc: "All 5 constitutions and what they changed." },
              { icon: "📈", page: "trends", title: "Current Trends", desc: "What's shaping Nigerian democracy in 2025." },
              { icon: "🗳️", page: "tracker2027", title: "2027 Election Tracker", desc: "Countdown, candidates, key states, and issues shaping the next election." },
              { icon: "🎯", page: "quiz", title: "Quiz", desc: "Test your knowledge of Nigerian democratic history." },
            ].map((c, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.45, delay: i * 0.05 }}
                whileHover={{ y: -4, borderColor: "var(--g)" }} onClick={() => navigate(c.page)}
                style={{ border: "1px solid var(--border)", borderRadius: 12, padding: "1.5rem", cursor: "pointer", background: "var(--bg)", transition: "border-color 0.2s" }}>
                <div style={{ fontSize: "1.5rem", marginBottom: "0.6rem" }}>{c.icon}</div>
                <div style={{ fontWeight: 700, fontSize: "0.9rem", marginBottom: "0.3rem" }}>{c.title}</div>
                <p style={{ color: "var(--muted)", fontSize: "0.8rem", lineHeight: 1.6 }}>{c.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function HistoryPage() {
  const [active, setActive] = useState("fourth");
  const rep = REPUBLICS.find(r => r.id === active);
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ padding: "100px 6vw 80px", maxWidth: 1200, margin: "0 auto" }}>
      <PH eyebrow="Five Eras" title="Nigeria's Political Republics" sub="From the First Republic to today's Fourth Republic — independence, military dictatorships, and a fragile growing democracy." />
      <div className="scroll-x" style={{ display: "flex", borderBottom: "2px solid var(--border)", marginBottom: "3rem" }}>
        {REPUBLICS.map(r => (
          <button key={r.id} onClick={() => setActive(r.id)}
            style={{ background: "none", borderBottom: active === r.id ? `3px solid ${r.color}` : "3px solid transparent", padding: "12px 22px", fontSize: "0.85rem", fontWeight: 600, whiteSpace: "nowrap", color: active === r.id ? r.color : "var(--muted)", marginBottom: "-2px" }}>
            {r.label}
          </button>
        ))}
      </div>
      <AnimatePresence mode="wait">
        <motion.div key={active} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.35 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))", gap: "2.5rem", alignItems: "start" }}>
            <div>
              <div style={{ fontSize: "4.5rem", fontWeight: 900, color: rep.color + "20", lineHeight: 1, marginBottom: "0.5rem", letterSpacing: "-3px" }}>{rep.years}</div>
              <h2 style={{ fontSize: "1.35rem", fontWeight: 800, marginBottom: "1rem" }}>{rep.title}</h2>
              <p style={{ color: "var(--sub)", lineHeight: 1.85, fontSize: "0.95rem" }}>{rep.desc}</p>
              <div style={{ marginTop: "2rem" }}>
                <div style={{ fontSize: "0.68rem", textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--muted)", fontWeight: 700, marginBottom: "1rem" }}>Key Events</div>
                {rep.events.map((ev, i) => (
                  <motion.div key={i} initial={{ opacity: 0, x: -14 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }}
                    style={{ display: "flex", gap: 12, alignItems: "flex-start", fontSize: "0.9rem", marginBottom: "0.65rem" }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: rep.color, marginTop: 6, flexShrink: 0 }} />
                    <span>{ev}</span>
                  </motion.div>
                ))}
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "1.2rem" }}>
              {rep.stats.map((s, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                  style={{ border: "1px solid var(--border)", borderRadius: 14, padding: "1.75rem", background: "var(--white)" }}>
                  <div style={{ fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted)", marginBottom: "0.5rem" }}>{s.l}</div>
                  <div style={{ fontSize: "2rem", fontWeight: 900 }}>{s.v}</div>
                  <div style={{ fontSize: "0.8rem", color: "var(--muted)", marginTop: "0.2rem" }}>{s.s}</div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}

function June12Page() {
  const [open, setOpen] = useState(null);
  const typeColor = { setup: "#3949ab", milestone: "#008751", tension: "#c8941a", crisis: "#b22222", turning_point: "#5c3d8f", tragedy: "#8b0000", resolution: "#008751", legacy: "#c8941a" };
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      {/* Hero */}
      <div style={{ background: "#0e0e0e", color: "#fff", padding: "120px 6vw 80px", textAlign: "center", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 80% 60% at 50% 0%, #1a3325 0%, transparent 70%)" }} />
        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{ fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.2em", color: "#a8d8bc", fontWeight: 700, marginBottom: "1.5rem" }}>Nigeria's Defining Moment</div>
          <motion.div initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.8, delay: 0.2 }}
            style={{ fontSize: "clamp(4rem,14vw,10rem)", fontWeight: 900, lineHeight: 0.9, letterSpacing: "-4px", color: "#fff", marginBottom: "1rem" }}>
            June 12
          </motion.div>
          <div style={{ fontSize: "clamp(1.2rem,3vw,2rem)", fontWeight: 700, color: "rgba(255,255,255,0.5)", letterSpacing: "-1px", marginBottom: "2.5rem" }}>1993</div>
          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
            style={{ maxWidth: 620, margin: "0 auto", color: "rgba(255,255,255,0.7)", fontSize: "1.05rem", lineHeight: 1.85 }}>
            Nigeria voted. The world watched. The result was the freest election in the country's history.
            Eleven days later, it was taken away.
          </motion.p>
          <motion.blockquote initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}
            style={{ maxWidth: 560, margin: "3rem auto 0", borderLeft: "3px solid #008751", paddingLeft: "1.5rem", textAlign: "left" }}>
            <p style={{ fontSize: "1.15rem", fontStyle: "italic", color: "rgba(255,255,255,0.85)", lineHeight: 1.7, fontWeight: 500 }}>
              "I want to be the President of Nigeria, not the President of the Yoruba people or the President of the Muslims."
            </p>
            <cite style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.45)", marginTop: "0.75rem", display: "block" }}>— Chief MKO Abiola, Campaign Trail 1993</cite>
          </motion.blockquote>
        </div>
      </div>
      {/* Key figures */}
      <div style={{ background: "var(--white)", padding: "60px 6vw", borderBottom: "1px solid var(--border)" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--g)", fontWeight: 700, marginBottom: "1.5rem" }}>Key Figures</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: "1rem" }}>
            {[
              { init: "MKO", name: "MKO Abiola", role: "SDP Candidate — Won, Denied, Died in Custody", color: "#008751" },
              { init: "IBB", name: "Ibrahim Babangida", role: "Military Ruler — Annulled the Election", color: "#b22222" },
              { init: "KA", name: "Kudirat Abiola", role: "Pro-Democracy Activist — Assassinated 1996", color: "#c8941a" },
              { init: "BT", name: "Bashir Tofa", role: "NRC Candidate — Conceded Even Before Annulment", color: "#3949ab" },
            ].map((p, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }}
                style={{ border: "1px solid var(--border)", borderRadius: 12, padding: "1.25rem", background: "var(--bg)" }}>
                <div style={{ width: 52, height: 52, borderRadius: "50%", background: p.color + "15", border: `2px solid ${p.color}30`, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: "0.9rem", color: p.color, marginBottom: "0.75rem" }}>{p.init}</div>
                <div style={{ fontWeight: 700, fontSize: "0.9rem", marginBottom: "0.25rem" }}>{p.name}</div>
                <div style={{ fontSize: "0.75rem", color: "var(--muted)", lineHeight: 1.5 }}>{p.role}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
      {/* Deep dive: Why? */}
      <div style={{ padding: "80px 6vw", background: "var(--white)", borderBottom: "1px solid var(--border)" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <div style={{ fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.12em", color: "#b22222", fontWeight: 700, marginBottom: "0.6rem" }}>The Hard Question</div>
          <h2 style={{ fontSize: "clamp(1.8rem,4vw,2.8rem)", fontWeight: 900, letterSpacing: "-1.5px", marginBottom: "3rem" }}>Why Did Babangida Really Annul It?</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: "1.5rem", marginBottom: "3rem" }}>
            {[
              { icon: "💰", title: "Economic Threat", body: "Abiola had promised radical redistribution — debt cancellation, reform of Shell's oil contracts, and breaking the grip of Northern military-business networks on petroleum revenues. The military-commercial elite that had grown fat on oil had every reason to fear him." },
              { icon: "🗺️", title: "The North-South Power Equation", body: "Since independence, no Yoruba man had led Nigeria as a freely elected president. Some Northern military hawks believed an Abiola presidency would permanently shift the power balance — regardless of his strong Northern coalition. Babangida, himself from the Middle Belt, was susceptible to these pressures." },
              { icon: "⚖️", title: "The ABN Court Order", body: "The Association for Better Nigeria (ABN), widely believed to be a front for Babangida loyalists, obtained a court injunction asking for the election to be suspended hours before voting started. The injunction was ignored on June 12, but Babangida later used it as thin legal cover for annulment." },
              { icon: "🎭", title: "Personal Ambition", body: "Babangida had held power since 1985 and was reluctant to leave. His elaborate 'transition program' — which cost an estimated ₦100 billion and was extended multiple times — suggests he expected to manage the outcome. Abiola's landslide was not the outcome he expected." },
              { icon: "🧩", title: "'The Package' Controversy", body: "A persistent claim, never fully disproved, is that Babangida and Abiola had a private agreement — a 'package' — where Abiola would be kept from power in exchange for financial compensation. Abiola's refusal to accept this (his 'I am not for sale' stance) may have sealed his fate." },
              { icon: "🌍", title: "International Pressure Ignored", body: "The US, UK, and EU all condemned the annulment and called for Abiola's recognition. Nigeria was briefly cut off from Commonwealth activities. None of this moved Babangida, who understood that Nigeria's oil made it strategically too important to isolate." },
            ].map((r, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.07 }}
                style={{ border: "1px solid var(--border)", borderRadius: 14, padding: "1.75rem", background: "var(--bg)" }}>
                <div style={{ fontSize: "1.8rem", marginBottom: "0.75rem" }}>{r.icon}</div>
                <div style={{ fontWeight: 700, fontSize: "0.95rem", marginBottom: "0.5rem" }}>{r.title}</div>
                <p style={{ color: "var(--sub)", fontSize: "0.85rem", lineHeight: 1.8 }}>{r.body}</p>
              </motion.div>
            ))}
          </div>
          <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            style={{ background: "#0e0e0e", color: "#fff", borderRadius: 16, padding: "2rem" }}>
            <div style={{ fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.15em", color: "#a8d8bc", fontWeight: 700, marginBottom: "0.75rem" }}>What Made It Historic</div>
            <p style={{ color: "rgba(255,255,255,0.75)", lineHeight: 1.85, fontSize: "0.92rem", maxWidth: 820 }}>
              Abiola won approximately 58% of the vote across both North and South — a feat no Nigerian candidate has replicated since. He won Kano (Hausa/Fulani heartland), Lagos (Yoruba), and large chunks of the Middle Belt simultaneously. His running mate was from the North. This was not a tribal vote. It was the first time Nigerians voted across ethnic lines on a massive scale. What Babangida annulled wasn't just an election result — he annulled the most convincing proof Nigeria had ever produced that it could transcend its divisions.
            </p>
          </motion.div>
        </div>
      </div>
      {/* Timeline */}
      <div style={{ padding: "80px 6vw", maxWidth: 900, margin: "0 auto" }}>
        <div style={{ fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--g)", fontWeight: 700, marginBottom: "0.6rem" }}>The Full Story</div>
        <h2 style={{ fontSize: "clamp(1.8rem,4vw,2.8rem)", fontWeight: 900, letterSpacing: "-1.5px", marginBottom: "3rem" }}>From Election to Holiday</h2>
        <div style={{ position: "relative", paddingLeft: "2.5rem" }}>
          <div style={{ position: "absolute", left: "0.5rem", top: 0, bottom: 0, width: 2, background: "linear-gradient(to bottom, #0e0e0e, var(--g))" }} />
          {JUNE12_EVENTS.map((ev, i) => {
            const c = typeColor[ev.type] || "#008751";
            return (
              <motion.div key={i} initial={{ opacity: 0, x: -18 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }}
                onClick={() => setOpen(open === i ? null : i)} style={{ position: "relative", paddingBottom: "2.5rem", cursor: "pointer" }}>
                <div style={{ position: "absolute", left: "-2.1rem", top: 4, width: 14, height: 14, borderRadius: "50%", background: open === i ? c : "var(--white)", border: `2.5px solid ${c}`, zIndex: 1, transition: "background 0.2s" }} />
                <div style={{ fontSize: "0.7rem", fontWeight: 700, color: c, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "0.3rem" }}>{ev.date}</div>
                <div style={{ fontWeight: 700, fontSize: "1.1rem", letterSpacing: "-0.2px" }}>{ev.title}</div>
                <AnimatePresence>
                  {open === i && (
                    <motion.p initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }} style={{ overflow: "hidden", color: "var(--sub)", fontSize: "0.9rem", lineHeight: 1.8, paddingTop: "0.6rem" }}>
                      {ev.body}
                    </motion.p>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </div>
      {/* Legacy */}
      <div style={{ background: "#0e0e0e", color: "#fff", padding: "80px 6vw", textAlign: "center" }}>
        <div style={{ maxWidth: 700, margin: "0 auto" }}>
          <div style={{ fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.2em", color: "#a8d8bc", fontWeight: 700, marginBottom: "1rem" }}>Legacy</div>
          <h2 style={{ fontSize: "clamp(1.8rem,4vw,2.8rem)", fontWeight: 900, letterSpacing: "-1.5px", marginBottom: "1.5rem" }}>Why June 12 Still Matters</h2>
          <p style={{ color: "rgba(255,255,255,0.65)", lineHeight: 1.85, fontSize: "0.95rem" }}>
            June 12 is not just a date — it is a mirror Nigeria holds up to itself. It asks: What is democracy worth if it can be annulled? It raises the question of whether ethnicity trumps competence in Nigerian politics. And in Abiola's victory — a Yoruba Muslim winning across the North — it offers a brief, tantalising glimpse of what a truly national Nigerian politics could look like. That is why Buhari changed Democracy Day from May 29 to June 12 in 2018. And that is why every conversation about credible elections in Nigeria eventually comes back to 1993.
          </p>
        </div>
      </div>
    </motion.div>
  );
}

function TimelinePage() {
  const [open, setOpen] = useState(null);
  const [showSources, setShowSources] = useState(null);
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ padding: "100px 6vw 80px", maxWidth: 860, margin: "0 auto" }}>
      <PH eyebrow="Chronology" title="Key Democratic Milestones" sub="Click any event to read the full story. Disputed events are marked — history is rarely settled." />
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.6rem", marginBottom: "3rem" }}>
        {Object.entries(TC).map(([t, c]) => <Tag key={t} label={t} color={c} />)}
        <Tag label="Disputed" color="#e67e22" />
      </div>
      <div style={{ position: "relative", paddingLeft: "2.5rem" }}>
        <motion.div initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} transition={{ duration: 1.4, ease: "easeOut" }}
          style={{ position: "absolute", left: "0.5rem", top: 0, bottom: 0, width: 2, background: "linear-gradient(to bottom, var(--g), var(--lg))", transformOrigin: "top" }} />
        {TIMELINE.map((ev, i) => {
          const c = TC[ev.tag] || "#008751";
          return (
            <motion.div key={i} initial={{ opacity: 0, x: -18 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.04 }}
              style={{ position: "relative", paddingBottom: "2.5rem" }}>
              <div style={{ position: "absolute", left: "-2.1rem", top: 4, width: 14, height: 14, borderRadius: "50%", background: open === i ? c : "var(--white)", border: `2.5px solid ${c}`, zIndex: 1, cursor: "pointer", transition: "background 0.2s" }}
                onClick={() => setOpen(open === i ? null : i)} />
              <div style={{ fontSize: "0.68rem", textTransform: "uppercase", letterSpacing: "0.1em", color: c, fontWeight: 700, marginBottom: "0.3rem" }}>{ev.year}</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: "0.4rem" }}>
                <Tag label={ev.tag} color={c} />
                {ev.disputed && <Tag label="Disputed" color="#e67e22" />}
              </div>
              <div style={{ fontWeight: 700, fontSize: "1.1rem", cursor: "pointer" }} onClick={() => setOpen(open === i ? null : i)}>{ev.title}</div>
              <AnimatePresence>
                {open === i && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }} style={{ overflow: "hidden" }}>
                    <p style={{ color: "var(--sub)", fontSize: "0.9rem", lineHeight: 1.8, paddingTop: "0.6rem" }}>{ev.body}</p>
                    {ev.disputed && ev.disputed_note && (
                      <div style={{ background: "#fff8e1", border: "1px solid #f0c03a", borderRadius: 8, padding: "0.75rem 1rem", marginTop: "0.75rem", fontSize: "0.82rem", color: "#7a5500" }}>
                        <strong>⚠️ Disputed: </strong>{ev.disputed_note}
                      </div>
                    )}
                    {ev.sources && (
                      <div style={{ marginTop: "0.75rem" }}>
                        <button onClick={() => setShowSources(showSources === i ? null : i)}
                          style={{ background: "none", fontSize: "0.75rem", color: "var(--g)", fontWeight: 600, padding: 0 }}>
                          {showSources === i ? "Hide" : "Show"} sources ({ev.sources.length})
                        </button>
                        {showSources === i && (
                          <ul style={{ marginTop: "0.4rem", paddingLeft: "1.2rem" }}>
                            {ev.sources.map((s, j) => <li key={j} style={{ fontSize: "0.75rem", color: "var(--muted)", marginBottom: "0.2rem" }}>{s}</li>)}
                          </ul>
                        )}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}

function ElectionsPage() {
  const [sel, setSel] = useState(null);
  const [tab, setTab] = useState("results");
  const [zYear, setZYear] = useState("2023");
  const [cmpA, setCmpA] = useState("2015");
  const [cmpB, setCmpB] = useState("2023");
  const years = Object.keys(ZONE_RESULTS);
  const zoneData = ZONE_RESULTS[zYear];
  const elA = ELECTIONS.find(e => e.year === cmpA);
  const elB = ELECTIONS.find(e => e.year === cmpB);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ padding: "100px 6vw 80px", maxWidth: 1200, margin: "0 auto" }}>
      <PH eyebrow="Fourth Republic" title="Presidential Elections" sub="Results, regional breakdowns, and side-by-side comparisons." />
      <div style={{ display: "flex", borderBottom: "2px solid var(--border)", marginBottom: "3rem", gap: 0 }}>
        {[{ id: "results", label: "Election Results" }, { id: "regional", label: "Regional Breakdown" }, { id: "compare", label: "Compare Elections" }].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ background: "none", borderBottom: tab === t.id ? "3px solid var(--g)" : "3px solid transparent", padding: "12px 22px", fontSize: "0.85rem", fontWeight: 600, color: tab === t.id ? "var(--g)" : "var(--muted)", marginBottom: "-2px" }}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "results" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))", gap: "1.5rem" }}>
          {ELECTIONS.map((el, i) => {
            const pc = PC(el.party);
            return (
              <motion.div key={i} initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.06 }}
                whileHover={{ y: -4 }} onClick={() => setSel(sel === i ? null : i)}
                style={{ border: `1.5px solid ${sel === i ? pc : "var(--border)"}`, borderRadius: 14, padding: "1.75rem", cursor: "pointer", background: "var(--white)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>
                  <div style={{ fontSize: "2.5rem", fontWeight: 900, color: pc, letterSpacing: "-2px" }}>{el.year}</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-end" }}>
                    <Pill label={el.party} color={pc} />
                    {el.disputed && <Tag label="Disputed" color="#e67e22" />}
                  </div>
                </div>
                <div style={{ fontWeight: 700, fontSize: "1.05rem", marginBottom: "0.25rem" }}>{el.winner}</div>
                <div style={{ height: 6, borderRadius: 3, background: "var(--border)", margin: "1rem 0 0.4rem", overflow: "hidden" }}>
                  <motion.div initial={{ width: 0 }} whileInView={{ width: `${el.pct}%` }} viewport={{ once: true }} transition={{ duration: 1.2, ease: "easeOut", delay: 0.2 }}
                    style={{ height: "100%", background: pc, borderRadius: 3 }} />
                </div>
                <div style={{ fontSize: "0.78rem", color: "var(--muted)" }}>{el.pct}% of votes</div>
                <AnimatePresence>
                  {sel === i && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }} style={{ overflow: "hidden" }}>
                      <div style={{ marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid var(--border)" }}>
                        <div style={{ fontSize: "0.75rem", color: "var(--muted)", marginBottom: "0.4rem" }}>Runner-up: <strong style={{ color: "var(--ink)" }}>{el.runnerUp}</strong></div>
                        <p style={{ fontSize: "0.85rem", color: "var(--sub)", lineHeight: 1.7 }}>{el.notable}</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      )}

      {tab === "regional" && (
        <div>
          <div style={{ display: "flex", gap: "0.75rem", marginBottom: "2.5rem", flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ fontSize: "0.82rem", color: "var(--muted)", fontWeight: 600 }}>Election year:</span>
            {years.map(y => (
              <button key={y} onClick={() => setZYear(y)}
                style={{ background: zYear === y ? "var(--ink)" : "var(--white)", color: zYear === y ? "#fff" : "var(--sub)", border: "1px solid var(--border)", borderRadius: 8, padding: "6px 18px", fontWeight: 600, fontSize: "0.85rem" }}>
                {y}
              </button>
            ))}
          </div>
          <div style={{ background: "var(--white)", border: "1px solid var(--border)", borderRadius: 16, padding: "1.5rem", marginBottom: "2rem" }}>
            <p style={{ fontSize: "0.9rem", color: "var(--sub)", lineHeight: 1.75 }}><strong style={{ color: "var(--ink)" }}>Pattern: </strong>{ZONE_CONTEXT[zYear]}</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))", gap: "1.25rem" }}>
            {Object.entries(zoneData).map(([zone, data]) => {
              const winColor = PC(data.w === "Split" ? "PDP" : data.w === "CPC" ? "CPC" : data.w);
              return (
                <motion.div key={zone} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4 }}
                  style={{ border: "1px solid var(--border)", borderRadius: 14, padding: "1.5rem", background: "var(--white)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: "1rem" }}>{ZONE_FULL[zone]}</div>
                      <div style={{ fontSize: "0.72rem", color: "var(--muted)", marginTop: 2 }}>{zone}</div>
                    </div>
                    <Pill label={data.w === "Split" ? "Split" : `${data.w} wins`} color={winColor} />
                  </div>
                  {data.d.map((entry, j) => (
                    <div key={j} style={{ marginBottom: "0.6rem" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.78rem", fontWeight: 600, marginBottom: "0.2rem" }}>
                        <span style={{ color: entry.c }}>{entry.p}</span>
                        <span>{entry.v}%</span>
                      </div>
                      <div style={{ height: 6, borderRadius: 3, background: "var(--border)", overflow: "hidden" }}>
                        <motion.div initial={{ width: 0 }} whileInView={{ width: `${entry.v}%` }} viewport={{ once: true }} transition={{ duration: 1, ease: "easeOut", delay: j * 0.1 }}
                          style={{ height: "100%", background: entry.c, borderRadius: 3 }} />
                      </div>
                    </div>
                  ))}
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {tab === "compare" && (
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem", marginBottom: "3rem" }}>
            {[[cmpA, setCmpA], [cmpB, setCmpB]].map(([val, setter], idx) => (
              <div key={idx}>
                <div style={{ fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--muted)", fontWeight: 700, marginBottom: "0.75rem" }}>Election {idx + 1}</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                  {ELECTIONS.map(e => (
                    <button key={e.year} onClick={() => setter(e.year)}
                      style={{ background: val === e.year ? PC(e.party) : "var(--white)", color: val === e.year ? "#fff" : "var(--sub)", border: `1px solid ${val === e.year ? PC(e.party) : "var(--border)"}`, borderRadius: 8, padding: "6px 14px", fontWeight: 600, fontSize: "0.82rem" }}>
                      {e.year}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          {elA && elB && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem" }}>
              {[elA, elB].map((el, i) => {
                const pc = PC(el.party);
                const zd = ZONE_RESULTS[el.year];
                return (
                  <motion.div key={i} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                    style={{ border: `2px solid ${pc}`, borderRadius: 16, padding: "2rem", background: "var(--white)" }}>
                    <div style={{ fontSize: "3rem", fontWeight: 900, color: pc, letterSpacing: "-2px", marginBottom: "0.25rem" }}>{el.year}</div>
                    <div style={{ fontWeight: 700, fontSize: "1.1rem", marginBottom: "0.25rem" }}>{el.winner}</div>
                    <Pill label={el.party} color={pc} />
                    <div style={{ height: 6, borderRadius: 3, background: "var(--border)", margin: "1.25rem 0 0.4rem", overflow: "hidden" }}>
                      <div style={{ height: "100%", background: pc, borderRadius: 3, width: `${el.pct}%` }} />
                    </div>
                    <div style={{ fontSize: "0.85rem", color: "var(--muted)", marginBottom: "1.25rem" }}>{el.pct}% of votes</div>
                    <p style={{ fontSize: "0.85rem", color: "var(--sub)", lineHeight: 1.7, marginBottom: "1.5rem" }}>{el.notable}</p>
                    {zd && (
                      <div>
                        <div style={{ fontSize: "0.68rem", textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--muted)", fontWeight: 700, marginBottom: "0.75rem" }}>Zone winners</div>
                        {Object.entries(zd).map(([z, d]) => (
                          <div key={z} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", padding: "4px 0", borderBottom: "1px solid var(--border)" }}>
                            <span style={{ color: "var(--sub)" }}>{z}</span>
                            <Pill label={d.w} color={PC(d.w === "CPC" ? "CPC" : d.w === "Split" ? "PDP" : d.w)} />
                          </div>
                        ))}
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}

function PresidentsPage() {
  const [sel, setSel] = useState(null);
  const typeColor = t => t === "military" ? "#b22222" : t === "civilian" ? "#3949ab" : "#008751";

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ padding: "100px 6vw 80px", maxWidth: 1200, margin: "0 auto" }}>
      <PH eyebrow="Heads of State & Presidents" title="Nigerian Leaders" sub="Every head of state and president from independence to today. Click any card to read their legacy." />
      <div style={{ display: "flex", gap: "0.6rem", marginBottom: "3rem", flexWrap: "wrap" }}>
        <Pill label="Civilian" color="#3949ab" /><Pill label="Military" color="#b22222" /><Pill label="Civilian + Military" color="#008751" />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(240px,1fr))", gap: "1.25rem" }}>
        {PRESIDENTS.map((p, i) => {
          const tc = typeColor(p.type);
          const isOpen = sel === i;
          return (
            <motion.div key={i} initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.04 }}
              onClick={() => setSel(isOpen ? null : i)}
              whileHover={{ y: -4, borderColor: tc }}
              style={{ border: `1.5px solid ${isOpen ? tc : "var(--border)"}`, borderRadius: 16, padding: "1.75rem 1.5rem", background: "var(--white)", cursor: "pointer" }}>
              {/* Avatar */}
              <div style={{ width: 88, height: 88, borderRadius: "50%", border: `3px solid ${tc}30`, margin: "0 auto 1rem", overflow: "hidden", background: tc + "15", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <img
                  src={p.img} alt={p.name}
                  onError={e => { e.target.style.display = "none"; e.target.nextSibling.style.display = "flex"; }}
                  style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }}
                />
                <div style={{ display: "none", width: "100%", height: "100%", alignItems: "center", justifyContent: "center", fontSize: "1.3rem", fontWeight: 800, color: tc }}>{p.init}</div>
              </div>
              {/* Header */}
              <div style={{ textAlign: "center" }}>
                <div style={{ fontWeight: 700, fontSize: "0.95rem", marginBottom: 2 }}>{p.name}</div>
                <div style={{ fontSize: "0.65rem", color: tc, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>{p.title}</div>
                <div style={{ fontSize: "0.75rem", color: "var(--g)", fontWeight: 600, marginBottom: "0.5rem" }}>{p.years}</div>
                <Pill label={p.party} color={tc} />
              </div>
              {/* Expandable legacy */}
              <AnimatePresence>
                {isOpen && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }} style={{ overflow: "hidden" }}>
                    <div style={{ marginTop: "1.25rem", paddingTop: "1.25rem", borderTop: `1px solid ${tc}25` }}>
                      <p style={{ fontSize: "0.82rem", color: "var(--sub)", lineHeight: 1.75 }}>{p.legacy}</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}

function PartiesPage() {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ padding: "100px 6vw 80px", maxWidth: 1100, margin: "0 auto" }}>
      <PH eyebrow="Political Landscape" title="Political Parties" sub="The parties, their ideologies, and their impact on Nigeria's democratic journey." />
      <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        {PARTIES.map((p, i) => (
          <motion.div key={i} initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.07 }}
            whileHover={{ borderColor: p.color }}
            style={{ border: "1px solid var(--border)", borderRadius: 16, padding: "2rem", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: "1.5rem", background: "var(--white)" }}>
            <div>
              <div style={{ fontSize: "2.2rem", fontWeight: 900, color: p.color, letterSpacing: "-1.5px", marginBottom: "0.3rem" }}>{p.abbr}</div>
              <div style={{ fontWeight: 600, fontSize: "0.88rem", marginBottom: "0.5rem" }}>{p.name}</div>
              <div style={{ fontSize: "0.72rem", color: "var(--muted)", marginBottom: "0.75rem" }}>Founded {p.founded}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                <Tag label={p.ideology} color={p.color} />
                <Pill label={p.period} color={p.color} />
              </div>
            </div>
            <p style={{ color: "var(--sub)", fontSize: "0.93rem", lineHeight: 1.85 }}>{p.desc}</p>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

function GovernorsPage() {
  const [sel, setSel] = useState(null);
  const [mapMode, setMapMode] = useState("party");
  const TILE_SIZE = 52;
  const COLS = 8, ROWS = 7;

  const TILE_POS = {
    sokoto: [0, 0], kebbi: [1, 0], zamfara: [2, 0], katsina: [3, 0], kano: [4, 0], jigawa: [5, 0], borno: [7, 0],
    kaduna: [2, 1], bauchi: [5, 1], yobe: [6, 1], adamawa: [7, 1],
    niger: [0, 2], plateau: [3, 2], nassarawa: [4, 2], gombe: [5, 2], taraba: [6, 2],
    kwara: [0, 3], kogi: [2, 3], "federal-capital-territory": [3, 3], benue: [4, 3],
    ogun: [0, 4], oyo: [1, 4], osun: [2, 4], ekiti: [3, 4], ondo: [4, 4], enugu: [5, 4], ebonyi: [6, 4],
    lagos: [0, 5], delta: [1, 5], edo: [2, 5], anambra: [4, 5], imo: [5, 5], abia: [6, 5], "cross-river": [7, 5],
    bayelsa: [2, 6], rivers: [4, 6], "akwa-ibom": [6, 6],
  };
  const TILE_ABBR = {
    sokoto: "SOK", kebbi: "KEB", zamfara: "ZAM", katsina: "KAT", kano: "KAN", jigawa: "JIG", borno: "BOR",
    kaduna: "KAD", bauchi: "BAU", yobe: "YOB", adamawa: "ADA",
    niger: "NGR", plateau: "PLT", nassarawa: "NAS", gombe: "GOM", taraba: "TAR",
    kwara: "KWA", kogi: "KOG", "federal-capital-territory": "FCT", benue: "BEN",
    ogun: "OGU", oyo: "OYO", osun: "OSU", ekiti: "EKI", ondo: "OND", enugu: "ENU", ebonyi: "EBO",
    lagos: "LAG", delta: "DEL", edo: "EDO", anambra: "ANA", imo: "IMO", abia: "ABI", "cross-river": "CRS",
    bayelsa: "BAY", rivers: "RIV", "akwa-ibom": "AKW",
  };

  const getStateZone = id => Object.entries(ZONE_MEMBERSHIP).find(([, arr]) => arr.includes(id))?.[0];
  const getFillColor = id => {
    const g = GOVERNORS.find(x => x.id === id);
    if (!g) return "#ddd";
    if (mapMode === "party") return PC(g.party);
    const zone = getStateZone(id);
    return zone ? ZONE_COLOR[zone] : "#ddd";
  };

  const selectedGov = sel ? GOVERNORS.find(g => g.id === sel) : null;
  const stateDetails = sel ? STATE_DATA[sel] : null;
  const secColors = { Low: "#008751", Medium: "#c8941a", High: "#b22222", Critical: "#8b0000" };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ padding: "100px 6vw 80px", maxWidth: 1200, margin: "0 auto" }}>
      <PH eyebrow="Executive Power" title="Governors' Map" sub="Click any state tile to explore its governor, party, GDP, poverty rate, and security situation." />
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "2rem" }}>
        <button onClick={() => setMapMode("party")} style={{ background: mapMode === "party" ? "var(--ink)" : "var(--white)", color: mapMode === "party" ? "#fff" : "var(--sub)", border: "1px solid var(--border)", borderRadius: 8, padding: "6px 16px", fontWeight: 600, fontSize: "0.82rem" }}>By Party</button>
        <button onClick={() => setMapMode("zone")} style={{ background: mapMode === "zone" ? "var(--ink)" : "var(--white)", color: mapMode === "zone" ? "#fff" : "var(--sub)", border: "1px solid var(--border)", borderRadius: 8, padding: "6px 16px", fontWeight: 600, fontSize: "0.82rem" }}>By Zone</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(340px,1fr))", gap: "3rem", alignItems: "start" }}>
        {/* Tile map */}
        <div className="map-bg" style={{ borderRadius: 20, border: "1px solid var(--border)", padding: "18px 14px 14px", overflowX: "auto" }}>
          <div style={{ position: "relative", width: COLS * TILE_SIZE, height: ROWS * TILE_SIZE, margin: "0 auto", minWidth: COLS * TILE_SIZE }}>
            {Object.entries(TILE_POS).map(([id, [col, row]]) => {
              const color = getFillColor(id);
              const isSelected = sel === id;
              const govName = GOVERNORS.find(g => g.id === id)?.name || id;
              return (
                <motion.button key={id}
                  whileHover={{ scale: 1.1, zIndex: 10 }}
                  whileTap={{ scale: 0.96 }}
                  title={govName}
                  onClick={() => setSel(id === sel ? null : id)}
                  style={{
                    position: "absolute",
                    left: col * TILE_SIZE + 2, top: row * TILE_SIZE + 2,
                    width: TILE_SIZE - 4, height: TILE_SIZE - 4,
                    borderRadius: 8,
                    background: isSelected ? color : color + "bb",
                    border: isSelected ? `2.5px solid ${color}` : `1.5px solid ${color}70`,
                    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                    cursor: "pointer", outline: "none",
                    boxShadow: isSelected ? `0 0 0 3px ${color}40, 0 4px 16px ${color}40` : "0 1px 3px rgba(0,0,0,0.08)",
                    transition: "background 0.15s, border 0.15s, box-shadow 0.15s",
                  }}>
                  <span style={{ fontSize: "0.55rem", fontWeight: 900, color: isSelected ? "#fff" : "rgba(0,0,0,0.75)", letterSpacing: "0.03em", lineHeight: 1.2, textAlign: "center" }}>
                    {TILE_ABBR[id]}
                  </span>
                </motion.button>
              );
            })}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", marginTop: "1.25rem", justifyContent: "center" }}>
            {mapMode === "zone"
              ? Object.entries(ZONE_COLOR).map(([z, c]) => (
                <div key={z} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: "0.65rem", color: "var(--muted)", fontWeight: 600 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 2, background: c }} />{ZONE_FULL[z]}
                </div>
              ))
              : [["APC", "#008751"], ["PDP", "#c8941a"], ["LP", "#b22222"], ["NNPP", "#3949ab"], ["APGA", "#8b0000"]].map(([p, c]) => (
                <div key={p} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: "0.65rem", color: "var(--muted)", fontWeight: 600 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 2, background: c }} />{p}
                </div>
              ))
            }
          </div>
          <p style={{ textAlign: "center", fontSize: "0.68rem", color: "var(--muted)", marginTop: "0.75rem" }}>N=North · S=South · E=East · W=West · Hover tile for full state name</p>
        </div>

        <div>
          <AnimatePresence mode="wait">
            {selectedGov && stateDetails ? (
              <motion.div key={sel} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}
                style={{ background: "var(--white)", borderRadius: 20, border: "1px solid var(--border)", overflow: "hidden" }}>
                <div style={{ background: PC(selectedGov.party) + "10", padding: "1.75rem 2rem", borderBottom: "1px solid var(--border)" }}>
                  <Tag label={selectedGov.party} color={PC(selectedGov.party)} />
                  <h2 style={{ fontSize: "1.8rem", fontWeight: 800, marginTop: "0.75rem", letterSpacing: "-0.8px" }}>{selectedGov.name}</h2>
                  <p style={{ fontSize: "0.85rem", color: "var(--sub)", marginTop: 4 }}>Gov. <strong>{selectedGov.governor}</strong> · Zone: <strong>{stateDetails.zone}</strong></p>
                </div>
                <div style={{ padding: "1.5rem 2rem", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                  {[
                    { label: "Population", value: stateDetails.pop },
                    { label: "GDP per Capita", value: stateDetails.gdp },
                    { label: "Poverty Rate", value: stateDetails.poverty },
                    { label: "Security Level", value: stateDetails.security, color: secColors[stateDetails.security] },
                  ].map((m, i) => (
                    <div key={i} style={{ background: "var(--bg)", borderRadius: 10, padding: "0.9rem" }}>
                      <div style={{ fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--muted)", fontWeight: 700 }}>{m.label}</div>
                      <div style={{ fontSize: "1.2rem", fontWeight: 800, color: m.color || "var(--ink)", marginTop: 2 }}>{m.value}</div>
                    </div>
                  ))}
                </div>
                <div style={{ padding: "0 2rem 1.5rem" }}>
                  <div style={{ background: "#fff3cd", border: "1px solid #ffc107", borderRadius: 10, padding: "0.9rem 1rem", marginBottom: "0.75rem" }}>
                    <div style={{ fontSize: "0.68rem", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 700, color: "#7a5500", marginBottom: 4 }}>Security Situation</div>
                    <p style={{ fontSize: "0.82rem", color: "#7a5500", lineHeight: 1.6 }}>{stateDetails.sec_note}</p>
                  </div>
                  <div style={{ background: "var(--lg)", border: "1px solid var(--vg)", borderRadius: 10, padding: "0.9rem 1rem" }}>
                    <div style={{ fontSize: "0.68rem", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 700, color: "var(--dg)", marginBottom: 4 }}>Political Context</div>
                    <p style={{ fontSize: "0.82rem", color: "var(--dg)", lineHeight: 1.6 }}>{stateDetails.pol_note}</p>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                style={{ border: "1.5px dashed var(--border)", borderRadius: 20, padding: "3rem", textAlign: "center", color: "var(--muted)" }}>
                <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🗺️</div>
                <p style={{ fontSize: "0.9rem", lineHeight: 1.7 }}>Click a state on the map<br />to see detailed information</p>
              </motion.div>
            )}
          </AnimatePresence>
          <div style={{ marginTop: "1.5rem", display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
            {(mapMode === "party" ? ["APC", "PDP", "LP", "NNPP", "APGA"] : Object.keys(ZONE_COLOR)).map(k => (
              <div key={k} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 10, height: 10, borderRadius: 2, background: mapMode === "party" ? PC(k) : ZONE_COLOR[k] }} />
                <span style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--sub)" }}>{mapMode === "party" ? k : ZONE_FULL[k]}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* All states grid */}
      {/* <div style={{ marginTop: "4rem" }}>
        <h3 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "1.25rem", color: "var(--sub)" }}>All States — Quick Select</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))", gap: "0.6rem" }}>
          {GOVERNORS.map(g => (
            <motion.div key={g.id} whileHover={{ y: -2 }} onClick={() => setSel(g.id === sel ? null : g.id)}
              style={{ border: `1.5px solid ${sel === g.id ? PC(g.party) : "var(--border)"}`, borderRadius: 10, padding: "0.65rem 0.9rem", cursor: "pointer", background: sel === g.id ? PC(g.party) + "08" : "var(--white)" }}>
              <div style={{ fontSize: "0.82rem", fontWeight: 700 }}>{g.name}</div>
              <div style={{ fontSize: "0.68rem", color: PC(g.party), fontWeight: 600 }}>{g.party}</div>
            </motion.div>
          ))}
        </div>
      </div> */}
    </motion.div>
  );
}

function ConstitutionsPage() {
  const [sel, setSel] = useState(null);
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ padding: "100px 6vw 80px", maxWidth: 1100, margin: "0 auto" }}>
      <PH eyebrow="Foundational Documents" title="Nigeria's Five Constitutions" sub="Every constitution tells the story of the regime that wrote it — and the crisis that made the previous one fail." />
      <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        {CONSTITUTIONS.map((c, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }}
            style={{ border: `1px solid ${sel === i ? c.color : "var(--border)"}`, borderRadius: 16, background: "var(--white)", overflow: "hidden", transition: "border-color 0.2s" }}>
            <div onClick={() => setSel(sel === i ? null : i)} style={{ padding: "1.75rem 2rem", cursor: "pointer", display: "grid", gridTemplateColumns: "auto 1fr auto", gap: "1.5rem", alignItems: "center" }}>
              <div style={{ fontSize: "2.5rem", fontWeight: 900, color: c.color, letterSpacing: "-2px", minWidth: 80 }}>{c.year}</div>
              <div>
                <div style={{ fontWeight: 800, fontSize: "1.05rem", marginBottom: "0.25rem" }}>{c.name}</div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <Tag label={c.type} color={c.color} />
                  {c.year === 1999 && <Pill label="Current" color="#008751" />}
                  {c.year === 1989 && <Pill label="Never Used" color="#b22222" />}
                </div>
              </div>
              <motion.div animate={{ rotate: sel === i ? 180 : 0 }} style={{ fontSize: "1rem", color: "var(--muted)", flexShrink: 0 }}>▼</motion.div>
            </div>
            <AnimatePresence>
              {sel === i && (
                <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} style={{ overflow: "hidden" }}>
                  <div style={{ padding: "0 2rem 2rem", borderTop: "1px solid var(--border)" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: "2rem", paddingTop: "1.5rem" }}>
                      <div>
                        <div style={{ fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--muted)", fontWeight: 700, marginBottom: "0.75rem" }}>Key Features</div>
                        {c.features.map((f, j) => (
                          <div key={j} style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: "0.87rem", marginBottom: "0.55rem" }}>
                            <span style={{ width: 6, height: 6, borderRadius: "50%", background: c.color, marginTop: 6, flexShrink: 0 }} />
                            <span style={{ color: "var(--sub)" }}>{f}</span>
                          </div>
                        ))}
                      </div>
                      <div>
                        <div style={{ fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--muted)", fontWeight: 700, marginBottom: "0.75rem" }}>Historical Context</div>
                        <p style={{ fontSize: "0.88rem", color: "var(--sub)", lineHeight: 1.8, marginBottom: "1.25rem" }}>{c.context}</p>
                        <div style={{ background: c.color + "10", border: `1px solid ${c.color}30`, borderRadius: 10, padding: "0.9rem 1rem" }}>
                          <div style={{ fontSize: "0.68rem", textTransform: "uppercase", letterSpacing: "0.1em", color: c.color, fontWeight: 700, marginBottom: 4 }}>Legacy</div>
                          <p style={{ fontSize: "0.85rem", color: "var(--sub)", lineHeight: 1.65 }}>{c.legacy}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </div>
      <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
        style={{ marginTop: "4rem", background: "#0e0e0e", borderRadius: 20, padding: "2.5rem", color: "#fff", textAlign: "center" }}>
        <div style={{ fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.15em", color: "#a8d8bc", fontWeight: 700, marginBottom: "0.75rem" }}>The Recurring Question</div>
        <h3 style={{ fontSize: "1.5rem", fontWeight: 800, letterSpacing: "-0.5px", marginBottom: "1rem" }}>Does Nigeria need a new constitution?</h3>
        <p style={{ color: "rgba(255,255,255,0.6)", maxWidth: 600, margin: "0 auto", lineHeight: 1.8, fontSize: "0.9rem" }}>
          The 1999 Constitution was drafted by military officers with minimal public input. Critics call it "a military constitution in civilian clothing." It centralises power and oil revenues in Abuja in ways that fuel conflict. Calls for a new constitutional conference — or a sovereign national conference — appear in every election cycle but have never succeeded.
        </p>
      </motion.div>
    </motion.div>
  );
}

function TrendsPage() {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ padding: "100px 6vw 80px", maxWidth: 1200, margin: "0 auto" }}>
      <PH eyebrow="Today's Nigeria" title="Current Democratic Trends" sub="What's shaping Nigerian democracy in 2025 and the forces driving change." />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(320px,1fr))", gap: "1.5rem" }}>
        {TRENDS.map((t, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.06 }}
            whileHover={{ y: -4, borderColor: "var(--g)" }}
            style={{ border: "1px solid var(--border)", borderRadius: 16, padding: "2rem", background: "var(--white)", transition: "all 0.25s" }}>
            <div style={{ fontSize: "2rem", marginBottom: "1rem" }}>{t.icon}</div>
            <div style={{ marginBottom: "0.6rem" }}><Tag label={t.tag} /></div>
            <div style={{ fontWeight: 700, fontSize: "1rem", marginBottom: "0.5rem" }}>{t.title}</div>
            <p style={{ color: "var(--sub)", fontSize: "0.875rem", lineHeight: 1.8 }}>{t.desc}</p>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

/* ─── Biafran War Page ───────────────────────────────────────────────── */
function BiafraPage() {
  const [section, setSection] = useState("coup");

  const SECTIONS = [
    { id: "coup", label: "The 1966 Coup" },
    { id: "countercoup", label: "Counter-Coup & Pogroms" },
    { id: "war", label: "The Biafran War" },
    { id: "aftermath", label: "Aftermath & Legacy" },
  ];

  const COUP_FACTS = [
    { q: "Who led the coup?", a: "The coup was planned and executed primarily by Major Kaduna Nzeogwu (born in Kaduna of Igbo parentage), Major Emmanuel Ifeajuna, Captain Ben Gbulie, and a small group of junior officers. The majority of the core plotters were of Igbo origin — this is historical fact. However, the coup's stated ideology was pan-Nigerian: anti-corruption, anti-tribalism, and pro-meritocracy. Nzeogwu's radio broadcast spoke of freeing Nigeria from 'ten percenters, politicians, contractors and liars.'" },
    { q: "Who was killed — and who wasn't?", a: "Prime Minister Abubakar Tafawa Balewa (Northern, Hausa) was killed. Northern Premier Ahmadu Bello was killed. Western Premier Samuel Akintola was killed. Finance Minister Festus Okotie-Eboh (a Urhobo man from the South-South) was killed. Crucially, Eastern Region Premier Michael Okpara (Igbo) was NOT targeted. This selective killing pattern — Northern and Western leaders killed, Eastern leader untouched — is what gave birth to the 'Igbo coup' narrative in Northern public memory." },
    { q: "Was it really an 'Igbo coup'?", a: "This is the most contested question in modern Nigerian history. The selective killing pattern made it look ethnic. But the planners claimed a socialist, reform agenda. General Aguiyi-Ironsi — the Igbo army commander who came to power — was NOT part of the coup and actually imprisoned Nzeogwu and the plotters. Ironsi's rise was accidental: as the most senior surviving officer, he stepped into the vacuum. His subsequent Decree No. 34 (abolishing federalism) was driven by administrative logic, not ethnic agenda — but it was read as an Igbo power grab by the North." },
    { q: "What was Decree 34?", a: "In May 1966, Ironsi issued Decree No. 34, which abolished the federal structure and unified Nigeria into a single unitary state. For Northern elites who had benefited from regional autonomy (and whose region was dominant in population), this looked like an attempt to use Igbo administrative talent to dominate a unified Nigeria. The North erupted in protests. In reality, Ironsi simply wanted to end the corruption of the regional system — but the timing, after a coup that killed Northern leaders, made it impossible to sell." },
  ];

  const WAR_TIMELINE = [
    { date: "July 1966", title: "Counter-Coup", body: "Northern military officers led by Lt. Col. Murtala Mohammed (later Head of State) staged a revenge coup. Aguiyi-Ironsi was abducted, tortured, and killed. Lt. Col. Yakubu Gowon — a Christian Northerner from the Middle Belt, chosen partly as a unifying compromise — became Head of State. The counter-coup was explicitly ethnic: Igbo officers were targeted and killed across barracks.", type: "crisis" },
    { date: "Sept–Oct 1966", title: "Northern Pogroms", body: "In the worst violence in Nigeria's history to that point, an estimated 30,000 Igbo civilians were massacred in Northern cities and towns. Igbo homes, businesses, and churches were burned. Over one million Igbo refugees fled south to the Eastern Region. The pogroms were not spontaneous — evidence points to organisation by local officials in several cities. This mass trauma is central to understanding why Biafra happened.", type: "tragedy" },
    { date: "Jan 1967", title: "Aburi Accord", body: "Ojukwu (Eastern Region military governor) and Gowon met in Aburi, Ghana, and signed an agreement for a loose confederation — each region would have significant autonomy. The agreement was welcomed across Nigeria. Then Gowon returned to Lagos, was pressured by his advisors and civil servants, and reneged on the accord. Ojukwu's famous response: 'On Aburi we stand.'", type: "turning_point" },
    { date: "May 30, 1967", title: "Biafra Declared", body: "After Gowon announced a 12-state structure (which divided the Eastern Region and cut the Igbo-majority areas off from the oil-bearing Niger Delta), Ojukwu declared the Republic of Biafra. The Eastern Region seceded from Nigeria. International recognition was minimal — only Tanzania, Zambia, Ivory Coast, Haiti, and France extended recognition (France had oil interests).", type: "milestone" },
    { date: "July 6, 1967", title: "War Begins", body: "Federal forces crossed into Biafra. What Gowon predicted would be a 'quick police action' lasting months became a brutal two-and-a-half-year war. Biafra pushed into the Mid-West in a surprise offensive and briefly captured Benin City. Federal forces regrouped under General Murtala Mohammed and pushed back.", type: "crisis" },
    { date: "1968–1969", title: "The Blockade & Starvation", body: "Federal Nigeria imposed a complete blockade. Biafran supply lines were cut. Images of kwashiorkor-stricken children — protruding bellies, reddish hair, hollow eyes — circulated globally. Between 1 and 3 million people, mostly Biafran civilians, died during the war. The majority died of starvation, not combat. The word 'Biafra' became internationally synonymous with famine.", type: "tragedy" },
    { date: "Jan 15, 1970", title: "War Ends", body: "Biafran forces surrendered. General Phillip Effiong (who had replaced a fleeing Ojukwu) surrendered to Gowon. The war ended exactly four years after the January 1966 coup. Ojukwu fled to Ivory Coast, where he lived in exile until 1982. The date of surrender — January 15 — is noted to be the same date as the original 1966 coup.", type: "resolution" },
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      {/* Hero */}
      <div style={{ background: "#0e0e0e", color: "#fff", padding: "120px 6vw 80px", textAlign: "center", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 80% 60% at 50% 0%, #2a0a0a 0%, transparent 70%)" }} />
        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{ fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.2em", color: "#f5c6c6", fontWeight: 700, marginBottom: "1.5rem" }}>1966 – 1970</div>
          <motion.h1 initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.7 }}
            style={{ fontSize: "clamp(3rem,8vw,7rem)", fontWeight: 900, lineHeight: 0.95, letterSpacing: "-4px", marginBottom: "1.5rem" }}>
            The Biafran<br />War
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
            style={{ maxWidth: 660, margin: "0 auto", color: "rgba(255,255,255,0.65)", fontSize: "1.05rem", lineHeight: 1.85 }}>
            Nigeria's most traumatic chapter. A civil war born from a coup, fuelled by pogroms, and killing between one and three million people — most of them civilians who starved. And the misinformation about how it started persists to this day.
          </motion.p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "2rem", justifyContent: "center", marginTop: "3.5rem" }}>
            {[["1–3M", "Estimated Deaths"], ["2.5 years", "Duration of War"], ["1M+", "Igbo Refugees Fled North"], ["30,000", "Killed in 1966 Pogroms"]].map(([v, l]) => (
              <div key={l} style={{ textAlign: "center" }}>
                <div style={{ fontSize: "clamp(2rem,5vw,3.5rem)", fontWeight: 900, color: "#f5c6c6", letterSpacing: "-2px", lineHeight: 1 }}>{v}</div>
                <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.4)", marginTop: 4, letterSpacing: "0.05em" }}>{l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="scroll-x" style={{ background: "var(--white)", borderBottom: "2px solid var(--border)" }}>
        <div style={{ display: "flex", maxWidth: 1100, margin: "0 auto", padding: "0 6vw" }}>
          {SECTIONS.map(s => (
            <button key={s.id} onClick={() => setSection(s.id)}
              style={{ background: "none", borderBottom: section === s.id ? "3px solid #b22222" : "3px solid transparent", padding: "14px 22px", fontSize: "0.85rem", fontWeight: 600, whiteSpace: "nowrap", color: section === s.id ? "#b22222" : "var(--muted)", marginBottom: "-2px" }}>
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: "80px 6vw", maxWidth: 1100, margin: "0 auto" }}>
        <AnimatePresence mode="wait">
          {section === "coup" && (
            <motion.div key="coup" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.3 }}>
              <div style={{ background: "#fff8e1", border: "1px solid #f0c03a", borderRadius: 14, padding: "1.5rem 2rem", marginBottom: "3rem" }}>
                <div style={{ fontWeight: 700, fontSize: "0.9rem", color: "#7a5500", marginBottom: "0.5rem" }}>⚠️ Setting the Record Straight</div>
                <p style={{ fontSize: "0.88rem", color: "#7a5500", lineHeight: 1.8 }}>
                  The 1966 coup is one of the most misunderstood events in Nigerian history. It is frequently described simply as "the Igbo coup" — implying it was a calculated ethnic move to seize power for the Igbo people. This is historically inaccurate and dangerously simplistic. The reality is more complicated, more tragic, and more important to understand correctly.
                </p>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                {COUP_FACTS.map((f, i) => (
                  <motion.div key={i} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }}
                    style={{ border: "1px solid var(--border)", borderRadius: 16, overflow: "hidden" }}>
                    <div style={{ background: "#0e0e0e", color: "#fff", padding: "1rem 1.5rem", fontWeight: 700, fontSize: "0.95rem" }}>
                      Q: {f.q}
                    </div>
                    <div style={{ padding: "1.5rem", background: "var(--white)" }}>
                      <p style={{ color: "var(--sub)", fontSize: "0.9rem", lineHeight: 1.85 }}>{f.a}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
              <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                style={{ background: "var(--lg)", border: "1px solid var(--vg)", borderRadius: 16, padding: "2rem", marginTop: "2.5rem" }}>
                <div style={{ fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--dg)", fontWeight: 700, marginBottom: "0.75rem" }}>The Historical Consensus</div>
                <p style={{ color: "var(--dg)", fontSize: "0.9rem", lineHeight: 1.85 }}>
                  Most credible historians of the period — including John de St. Jorre, John Paden, and Wole Soyinka — agree: the January 15 coup had an Igbo-dominated planning group, but it was NOT an Igbo ethnic conspiracy. The plotters were pan-Nigerian idealists who naively believed they could reform Nigeria by force. Their failure to kill Eastern leaders was a catastrophic tactical error — or perhaps ideological: they may have genuinely expected Igbo leaders to share power rather than inherit it. The ethnic framing was constructed after the fact, largely to justify the counter-coup and the pogroms that followed.
                </p>
              </motion.div>
            </motion.div>
          )}

          {section === "countercoup" && (
            <motion.div key="countercoup" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.3 }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: "2rem", marginBottom: "3rem" }}>
                <div>
                  <div style={{ fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.1em", color: "#b22222", fontWeight: 700, marginBottom: "0.6rem" }}>July 29, 1966</div>
                  <h3 style={{ fontSize: "1.5rem", fontWeight: 800, letterSpacing: "-0.8px", marginBottom: "1rem" }}>The Counter-Coup</h3>
                  <p style={{ color: "var(--sub)", lineHeight: 1.85, fontSize: "0.9rem" }}>
                    Six months after the January coup, Northern officers led by Lt. Col. Murtala Mohammed (future Head of State) staged a coordinated revenge coup. Unlike the January coup, this was explicitly ethnic in character: Igbo officers across Nigeria's barracks were identified and killed. General Aguiyi-Ironsi was arrested at a dinner party in Ibadan, tortured through the night, and his body dumped in a shallow grave. He had ruled for 194 days.
                  </p>
                  <p style={{ color: "var(--sub)", lineHeight: 1.85, fontSize: "0.9rem", marginTop: "1rem" }}>
                    Yakubu Gowon — a Northern Christian from Angas in Plateau State — was selected as a compromise figure. He was not the most senior officer but was acceptable to both Northern Muslims and the Christian South. He was 31 years old.
                  </p>
                </div>
                <div>
                  <div style={{ fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.1em", color: "#b22222", fontWeight: 700, marginBottom: "0.6rem" }}>Sept–Oct 1966</div>
                  <h3 style={{ fontSize: "1.5rem", fontWeight: 800, letterSpacing: "-0.8px", marginBottom: "1rem" }}>The Pogroms</h3>
                  <p style={{ color: "var(--sub)", lineHeight: 1.85, fontSize: "0.9rem" }}>
                    Beginning in September 1966, massive violence against Igbo people erupted across Northern cities — Kano, Kaduna, Zaria, Jos, Makurdi. Estimates of the dead range from 10,000 to 30,000 people. Over one million Igbo civilians abandoned their homes, businesses, and properties built over generations in the North, and fled to the Eastern Region. The trauma of these events is still unprocessed in Nigerian public discourse.
                  </p>
                  <p style={{ color: "var(--sub)", lineHeight: 1.85, fontSize: "0.9rem", marginTop: "1rem" }}>
                    The pogroms are documented in survivor testimonies, international press coverage, and the Nigerian government's own post-war records. They remain a largely unacknowledged wound — one reason calls for a formal national reckoning with the civil war's causes persist among Igbo communities today.
                  </p>
                </div>
              </div>
              <div style={{ background: "#0e0e0e", borderRadius: 16, padding: "2rem", color: "#fff" }}>
                <div style={{ fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.12em", color: "#f5c6c6", fontWeight: 700, marginBottom: "0.75rem" }}>Why This Matters Today</div>
                <p style={{ color: "rgba(255,255,255,0.7)", lineHeight: 1.85, fontSize: "0.9rem" }}>
                  IPOB (Indigenous People of Biafra) and Igbo separatist movements today draw their emotional energy directly from the unresolved trauma of 1966–1970. When Igbo leaders demand equity and fair treatment, they are speaking from the memory of a million people forced to flee, 30,000 murdered in pogroms, and two and a half years of siege and starvation. Understanding this doesn't mean endorsing separatism — but it is impossible to understand the grievances driving it without this history.
                </p>
              </div>
            </motion.div>
          )}

          {section === "war" && (
            <motion.div key="war" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.3 }}>
              <div style={{ position: "relative", paddingLeft: "2.5rem" }}>
                <div style={{ position: "absolute", left: "0.5rem", top: 0, bottom: 0, width: 2, background: "linear-gradient(to bottom, #b22222, #c8941a)" }} />
                {WAR_TIMELINE.map((ev, i) => {
                  const c = { crisis: "#b22222", tragedy: "#8b0000", turning_point: "#5c3d8f", milestone: "#3949ab", resolution: "#008751" }[ev.type] || "#888";
                  return (
                    <motion.div key={i} initial={{ opacity: 0, x: -16 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.06 }}
                      style={{ position: "relative", paddingBottom: "2.5rem" }}>
                      <div style={{ position: "absolute", left: "-2.1rem", top: 5, width: 14, height: 14, borderRadius: "50%", background: c, border: "2.5px solid #fff", zIndex: 1 }} />
                      <div style={{ fontSize: "0.68rem", textTransform: "uppercase", letterSpacing: "0.1em", color: c, fontWeight: 700, marginBottom: "0.25rem" }}>{ev.date}</div>
                      <div style={{ fontWeight: 700, fontSize: "1.1rem", marginBottom: "0.5rem" }}>{ev.title}</div>
                      <p style={{ color: "var(--sub)", fontSize: "0.9rem", lineHeight: 1.8 }}>{ev.body}</p>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {section === "aftermath" && (
            <motion.div key="aftermath" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.3 }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: "1.5rem", marginBottom: "3rem" }}>
                {[
                  { icon: "🕊️", title: "'No Victor, No Vanquished'", body: "Gowon's reconciliation speech on January 15, 1970 was one of Africa's most magnanimous post-war statements. There were no war crimes tribunals, no mass purges. Biafran soldiers were reintegrated. The aim was genuine national healing — and by the standards of Africa's civil wars, Nigeria's reintegration was remarkable." },
                  { icon: "🏠", title: "Abandoned Properties", body: "Igbo who had owned property in other regions before the war returned to find their homes and businesses seized as 'abandoned property' — particularly in Rivers State (then under Federal military administration). Decades of legal battles followed. The Port Harcourt property dispute is unresolved to this day." },
                  { icon: "💵", title: "The £20 Policy", body: "Every Biafran, regardless of how much money they had saved in a Nigerian bank before the war, received exactly £20. Bank accounts were not restored proportionally. This wiped out the Igbo middle class's savings and is cited as a deliberate policy of economic marginalisation — though the government called it a logistical necessity." },
                  { icon: "🛢️", title: "Oil & Marginalisation", body: "Oil was discovered in the Niger Delta — areas Biafra had counted on for revenue. After the war, the Federal government tightened control over oil revenues, reducing the derivation formula from 50% to 3% by 1975. Communities that sat on oil wealth saw almost none of it. This fuelled Niger Delta militancy for decades." },
                  { icon: "🔴", title: "IPOB & Neo-Biafra", body: "In 2012, Nnamdi Kanu founded IPOB (Indigenous People of Biafra), demanding a referendum on Igbo self-determination. By 2021, IPOB's Eastern Security Network had a physical armed presence in the South-East. The organisation is banned as a terrorist group by Nigeria. Weekly sit-at-home orders cripple the SE economy every Monday." },
                  { icon: "📖", title: "The Unfinished Conversation", body: "Nigeria has never had a national truth and reconciliation process for the civil war. No official death toll. No formal memorial. No national day of remembrance. Chinua Achebe's 'There Was a Country' (2012) reignited a painful public debate about Awolowo's alleged food blockade strategy. The war is unfinished as history." },
                ].map((r, i) => (
                  <motion.div key={i} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.07 }}
                    style={{ border: "1px solid var(--border)", borderRadius: 14, padding: "1.75rem", background: "var(--white)" }}>
                    <div style={{ fontSize: "1.8rem", marginBottom: "0.75rem" }}>{r.icon}</div>
                    <div style={{ fontWeight: 700, fontSize: "0.95rem", marginBottom: "0.5rem" }}>{r.title}</div>
                    <p style={{ color: "var(--sub)", fontSize: "0.85rem", lineHeight: 1.8 }}>{r.body}</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

/* ─── 2027 Election Tracker ──────────────────────────────────────────── */
function Tracker2027Page() {
  const [activeTab, setActiveTab] = useState("candidates");

  const CANDIDATES = [
    {
      name: "Bola Ahmed Tinubu",
      party: "APC",
      status: "Incumbent",
      zone: "SW",
      color: "#008751",
      profile:
        "President since May 2023. His administration's fuel subsidy removal and naira float were defended as structural reforms, but they also triggered severe cost-of-living pressure and intensified public dissatisfaction. Heading toward 2027, he remains the central figure the opposition coalition is organizing against.",
      strengths:
        "Incumbency advantage, APC's federal patronage machine, strong South-West base, powerful political networks, and the institutional advantage of the ruling party.",
      weaknesses:
        "Economic hardship under his watch, persistent insecurity, public frustration over living costs, and a more coordinated opposition front under the ADC coalition.",
    },
    {
      name: "Atiku Abubakar",
      party: "ADC",
      status: "Coalition Heavyweight",
      zone: "NE",
      color: "#e67e22",
      profile:
        "Former Vice-President Atiku Abubakar is now one of the leading figures in the ADC-backed opposition coalition unveiled ahead of 2027. Rather than approaching the race strictly through the old PDP platform, he is now part of a broader anti-APC realignment alongside Peter Obi, Rotimi Amaechi, David Mark, and other opposition heavyweights.",
      strengths:
        "National name recognition, deep northern political networks, coalition-building experience, elite reach across party lines, and relevance within the new ADC opposition bloc.",
      weaknesses:
        "Age factor, repeated presidential losses, questions about whether he can unify all coalition tendencies behind him, and the risk of internal ADC ticket rivalry.",
    },
    {
      name: "Peter Obi",
      party: "ADC",
      status: "Coalition Reform Candidate",
      zone: "SE",
      color: "#b22222",
      profile:
        "Peter Obi remains one of the most potent opposition figures from the 2023 cycle, but he is now operating within the broader ADC coalition rather than being framed only as the Labour Party standard-bearer. His youth-driven reform appeal, urban support base, and cross-regional visibility make him one of the coalition's most valuable assets heading into 2027.",
      strengths:
        "Youth appeal, anti-establishment energy, strong South-East base, strong urban support, reformist brand, and credibility as a major coalition mobilizer.",
      weaknesses:
        "Uncertainty over whether he secures the coalition ticket, the challenge of converting movement energy into nationwide party machinery, and possible friction with other ADC power centres.",
    },
    {
      name: "Rotimi Amaechi",
      party: "ADC",
      status: "Coalition Power Broker",
      zone: "SS",
      color: "#7a3db8",
      profile:
        "Former Rivers governor and ex-Minister of Transportation, Rotimi Amaechi has emerged as one of the major figures in the ADC coalition. His entry adds elite weight, South-South reach, and high-level strategic experience to the opposition bloc, making him both a possible contender and a major internal power broker.",
      strengths:
        "Strong political experience, South-South relevance, executive background, national visibility, and influence within elite opposition negotiations.",
      weaknesses:
        "May struggle to build broad populist momentum nationally, could be overshadowed by stronger 2023 presidential brands, and faces the challenge of positioning himself clearly inside a crowded coalition.",
    },
    {
      name: "Rabiu Kwankwaso",
      party: "NNPP",
      status: "Kano Kingmaker",
      zone: "NW",
      color: "#3949ab",
      profile:
        "Former Governor of Kano and leader of the Kwankwasiyya movement. His NNPP structure remains strongest in Kano and parts of the North-West. In a race now complicated by the ADC coalition, his strategic value lies in whether he stays independent, negotiates, or becomes a regional dealmaker.",
      strengths:
        "North-West political machine, Kano's huge voter base, loyal grassroots following, and bargaining power in any anti-APC alignment.",
      weaknesses:
        "Ceiling beyond the North-West, uncertain national path without a wider alliance, and diminished leverage if the ADC successfully consolidates opposition forces elsewhere.",
    },
  ];

  const KEY_ISSUES = [
    { icon: "💸", title: "Cost of Living Crisis", urgency: "Critical", desc: "Fuel subsidy removal in 2023 tripled pump prices overnight. Food inflation peaked at 40%+. The naira lost over 70% of its value in one year. Poverty rates have worsened significantly. This is the defining political issue — whoever credibly promises relief wins votes." },
    { icon: "🔒", title: "Insecurity", urgency: "Critical", desc: "Banditry in the NW (Katsina, Zamfara, Kaduna), IPOB/ESN in the SE, Boko Haram remnants in the NE, and rising street crime in cities. Nigeria's military is overstretched across six geopolitical zones. Any government that can't show credible security progress will be punished at the ballot box." },
    { icon: "⚡", title: "Electricity", urgency: "High", desc: "Nigeria generates less electricity than Cape Town (a city) for its 220 million people. The grid collapses multiple times daily. Businesses run on generators, adding to costs. NNPC subsidised petrol kept generator costs low — removing the subsidy made electricity more expensive in practice, infuriating businesses." },
    { icon: "🎓", title: "Education & Youth Unemployment", urgency: "High", desc: "Nigeria has the world's largest population of out-of-school children (over 20 million). University graduates face 40%+ youth unemployment. ASUU (university lecturers' union) has gone on strike for cumulative years during the Fourth Republic. The youth vote — energised by Peter Obi in 2023 — will be watching." },
    { icon: "🗳️", title: "Electoral Reforms", urgency: "Medium", desc: "The 2023 election saw IINEC's Bimodal Voter Accreditation System (BVAS) and IReV portal work — but the collation process was disputed. Opposition parties are pushing for full electronic transmission of results. The credibility of the 2027 process depends heavily on INEC reforms." },
    { icon: "🛢️", title: "Oil Revenue & Diversification", urgency: "High", desc: "Nigeria's economy remains dangerously oil-dependent. Non-oil tax revenue is among the lowest in Africa as a % of GDP. Tinubu's fiscal reforms aim to raise tax revenues — but implementation has been painful. The 2027 winner must present a credible post-oil economic vision." },
  ];

  const KEY_STATES = [
    { state: "Lagos", why: "Nigeria's commercial capital and Tinubu's home base. APC won with 57% in 2023 but LP came second with 21% — closer than expected. If LP or PDP can crack Lagos, it signals Tinubu's national weakness.", watch: "Can Peter Obi and Labour build on the 2023 Obidient surge in urban Lagos?" },
    { state: "Kano", why: "Nigeria's second largest state by population (~14.7M voters). NNPP's Abba Yusuf is governor — Kwankwaso territory. A Tinubu-Kwankwaso rivalry or a Kwankwaso-Atiku alliance could decide who wins the NW.", watch: "Which of APC, PDP, or NNPP consolidates the NW bloc? The winner of Kano often wins the presidency." },
    { state: "Rivers", why: "The Wike-Fubara battle has fractured PDP in the South-South. Governor Fubara (originally Wike's protégé) is now in open war with Wike (now FCT Minister under Tinubu). Rivers' 3M+ votes are up for grabs.", watch: "Does Wike deliver Rivers to APC in 2027 as part of his deal with Tinubu, or does Fubara assert independence?" },
    { state: "Kaduna", why: "NW flashpoint. The banditry crisis defines everything. 8.9M+ voters, enormous poverty, security failures. APC governs under Uba Sani. PDP and LP both targeting it. The state that 'breaks' the NW goes to whoever credibly addresses insecurity.", watch: "Can any candidate present a credible security plan that resonates in Kaduna?" },
    { state: "Benue (SE heartland states)", why: "LP swept Benue and the South-East in 2023 with over 88% in some zones. The question is whether that base holds, grows, or disperses in 2027, and whether an LP-NNPP alliance can translate it nationally.", watch: "Does Peter Obi maintain the Obidient movement's momentum through 2027?" },
  ];

  const EVENTS_2027 = [
    { date: "Apr 1, 2026", event: "Pre-election Activities Begin", note: "INEC's revised timetable officially kicks off preparatory activities from this date under the Electoral Act 2026." },
    { date: "Apr 23 – May 30, 2026", event: "Party Primaries", note: "All political parties must conduct their presidential, governorship, and NASS primaries within this window. Dispute resolution also falls here." },
    { date: "Aug 15, 2026", event: "Osun State Governorship Election", note: "Rescheduled from Aug 8. An early test of party strength ahead of the general election." },
    { date: "Aug 19, 2026", event: "Presidential & NASS Campaigns Begin", note: "Campaigns for the presidential and National Assembly elections officially open. Must end 24 hours before election day." },
    { date: "Sep 9, 2026", event: "Governorship & State Assembly Campaigns Begin", note: "Campaigns for governorship and state Houses of Assembly elections commence." },
    { date: "Jan 15, 2027", event: "Campaign Blackout (Presidential)", note: "All presidential and NASS campaigns must cease 24 hours before election day. INEC will enforce compliance." },
    { date: "Jan 16, 2027", event: "Presidential & National Assembly Elections", note: "🗳️ The main event. All 36 states + FCT vote for President, Senate, and House of Representatives." },
    { date: "Feb 5, 2027", event: "Campaign Blackout (Governorship)", note: "Campaigns for governorship and state assembly elections cease 24 hours before polling." },
    { date: "Feb 6, 2027", event: "Governorship & State Assembly Elections", note: "All 36 states vote for governors and state houses of assembly. A second wave of political realignment expected." },
  ];

  const ELECTION_DATE = new Date("2027-01-16T08:00:00");
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  useEffect(() => {
    const tick = () => {
      const diff = ELECTION_DATE - new Date();
      if (diff <= 0) { setCountdown({ days: 0, hours: 0, minutes: 0, seconds: 0 }); return; }
      setCountdown({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((diff % (1000 * 60)) / 1000),
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      {/* Hero */}
      <div style={{ background: "linear-gradient(135deg,#0e2217 0%,#0e0e0e 100%)", color: "#fff", padding: "120px 6vw 80px", textAlign: "center" }}>
        <div style={{ fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.2em", color: "#a8d8bc", fontWeight: 700, marginBottom: "1.5rem" }}>Live Tracker</div>
        <motion.h1 initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}
          style={{ fontSize: "clamp(3rem,8vw,7rem)", fontWeight: 900, lineHeight: 0.95, letterSpacing: "-4px", marginBottom: "1.5rem" }}>
          2027 Elections
        </motion.h1>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
          style={{ color: "rgba(255,255,255,0.6)", maxWidth: 560, margin: "0 auto 3rem", lineHeight: 1.8, fontSize: "1rem" }}>
          Nigeria's next presidential election is scheduled for <strong style={{ color: "#a8d8bc" }}>January 16, 2027</strong>, per INEC's revised timetable under the Electoral Act 2026. The political landscape is already shifting — alliances forming, candidates positioning, and the economy setting the stage.
        </motion.p>
        <div style={{ marginBottom: "1rem" }}>
          <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
            {[
              { val: countdown.days, label: "DAYS" },
              { val: countdown.hours, label: "HOURS" },
              { val: countdown.minutes, label: "MINUTES" },
              { val: countdown.seconds, label: "SECONDS" },
            ].map(({ val, label }) => (
              <div key={label} style={{ background: "rgba(168,216,188,0.1)", border: "1px solid rgba(168,216,188,0.25)", borderRadius: 16, padding: "1.5rem 1.75rem", minWidth: 110, textAlign: "center" }}>
                <div style={{ fontSize: "clamp(2.2rem,6vw,3.5rem)", fontWeight: 900, letterSpacing: "-2px", lineHeight: 1, color: "#a8d8bc" }}>
                  {String(val).padStart(2, "0")}
                </div>
                <div style={{ fontSize: "0.62rem", color: "rgba(255,255,255,0.45)", fontWeight: 700, letterSpacing: "0.15em", marginTop: 8 }}>{label}</div>
              </div>
            ))}
          </div>
          <div style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.35)", marginTop: "1.25rem" }}>
            until Presidential Election · Jan 16, 2027 · per INEC revised timetable
          </div>
        </div>
        <p style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.3)", marginTop: "0.5rem" }}>Dates per INEC Electoral Act 2026 revised timetable (Feb 26, 2026). All candidate info reflects pre-campaign period.</p>
      </div>

      {/* Tabs */}
      <div className="scroll-x" style={{ background: "var(--white)", borderBottom: "2px solid var(--border)" }}>
        <div style={{ display: "flex", maxWidth: 1100, margin: "0 auto", padding: "0 6vw" }}>
          {[{ id: "candidates", label: "Candidates" }, { id: "issues", label: "Key Issues" }, { id: "states", label: "States to Watch" }, { id: "calendar", label: "Calendar" }].map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              style={{ background: "none", borderBottom: activeTab === t.id ? "3px solid var(--g)" : "3px solid transparent", padding: "14px 22px", fontSize: "0.85rem", fontWeight: 600, whiteSpace: "nowrap", color: activeTab === t.id ? "var(--g)" : "var(--muted)", marginBottom: "-2px" }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: "80px 6vw", maxWidth: 1100, margin: "0 auto" }}>
        <AnimatePresence mode="wait">
          {activeTab === "candidates" && (
            <motion.div key="cands" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
              <div style={{ background: "#fff8e1", border: "1px solid #f0c03a", borderRadius: 12, padding: "1rem 1.5rem", marginBottom: "2.5rem", fontSize: "0.85rem", color: "#7a5500", lineHeight: 1.7 }}>
                ⚠️ <strong>Disclaimer:</strong> This tracker reflects the political landscape as of mid-2025. No formal candidacy declarations have been made. Analyses are based on political reporting and historical voting patterns — not polls or predictions.
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                {CANDIDATES.map((c, i) => (
                  <motion.div key={i} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.07 }}
                    style={{ border: `1.5px solid ${c.color}25`, borderRadius: 18, overflow: "hidden", background: "var(--white)" }}>
                    <div style={{ background: c.color + "12", padding: "1.5rem 2rem", borderBottom: `1px solid ${c.color}20`, display: "flex", flexWrap: "wrap", gap: "1rem", alignItems: "flex-start", justifyContent: "space-between" }}>
                      <div>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: "0.5rem" }}>
                          <Pill label={c.party} color={c.color} />
                          <Tag label={c.status} color={c.color} />
                          <Tag label={c.zone} color="#888" />
                        </div>
                        <h3 style={{ fontSize: "1.4rem", fontWeight: 800, letterSpacing: "-0.5px" }}>{c.name}</h3>
                      </div>
                    </div>
                    <div style={{ padding: "1.5rem 2rem", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(250px,1fr))", gap: "1.5rem" }}>
                      <div>
                        <div style={{ fontSize: "0.68rem", textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--muted)", fontWeight: 700, marginBottom: "0.5rem" }}>Profile</div>
                        <p style={{ fontSize: "0.87rem", color: "var(--sub)", lineHeight: 1.8 }}>{c.profile}</p>
                      </div>
                      <div>
                        <div style={{ background: "#f0faf5", borderRadius: 10, padding: "1rem", marginBottom: "0.75rem" }}>
                          <div style={{ fontSize: "0.68rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--dg)", fontWeight: 700, marginBottom: "0.4rem" }}>✅ Strengths</div>
                          <p style={{ fontSize: "0.82rem", color: "var(--dg)", lineHeight: 1.7 }}>{c.strengths}</p>
                        </div>
                        <div style={{ background: "#fff5f5", borderRadius: 10, padding: "1rem" }}>
                          <div style={{ fontSize: "0.68rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "#b22222", fontWeight: 700, marginBottom: "0.4rem" }}>⚠️ Challenges</div>
                          <p style={{ fontSize: "0.82rem", color: "#7a1010", lineHeight: 1.7 }}>{c.weaknesses}</p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === "issues" && (
            <motion.div key="issues" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))", gap: "1.25rem" }}>
                {KEY_ISSUES.map((iss, i) => {
                  const urgencyColor = iss.urgency === "Critical" ? "#b22222" : iss.urgency === "High" ? "#c8941a" : "#3949ab";
                  return (
                    <motion.div key={i} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.07 }}
                      style={{ border: "1px solid var(--border)", borderRadius: 14, padding: "1.75rem", background: "var(--white)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.75rem" }}>
                        <div style={{ fontSize: "1.8rem" }}>{iss.icon}</div>
                        <Pill label={iss.urgency} color={urgencyColor} />
                      </div>
                      <div style={{ fontWeight: 700, fontSize: "0.95rem", marginBottom: "0.5rem" }}>{iss.title}</div>
                      <p style={{ color: "var(--sub)", fontSize: "0.85rem", lineHeight: 1.8 }}>{iss.desc}</p>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {activeTab === "states" && (
            <motion.div key="states" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
              <p style={{ color: "var(--muted)", fontSize: "0.9rem", marginBottom: "2.5rem", lineHeight: 1.7 }}>Presidential elections in Nigeria are won and lost in a handful of swing states and regional strongholds. These are the states every strategist will be watching in 2027.</p>
              <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                {KEY_STATES.map((s, i) => (
                  <motion.div key={i} initial={{ opacity: 0, x: -16 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.07 }}
                    style={{ border: "1px solid var(--border)", borderRadius: 14, padding: "1.5rem 2rem", background: "var(--white)", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: "1.5rem" }}>
                    <div>
                      <div style={{ fontSize: "1.3rem", fontWeight: 900, letterSpacing: "-0.5px", color: "var(--ink)", marginBottom: "0.5rem" }}>{s.state}</div>
                      <p style={{ fontSize: "0.87rem", color: "var(--sub)", lineHeight: 1.8 }}>{s.why}</p>
                    </div>
                    <div style={{ background: "var(--lg)", borderRadius: 10, padding: "1rem" }}>
                      <div style={{ fontSize: "0.68rem", textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--dg)", fontWeight: 700, marginBottom: "0.4rem" }}>👀 Watch For</div>
                      <p style={{ fontSize: "0.85rem", color: "var(--dg)", lineHeight: 1.7 }}>{s.watch}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === "calendar" && (
            <motion.div key="cal" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                {EVENTS_2027.map((ev, i) => {
                  const tc = ev.type === "election" ? "#b22222" : ev.type === "political" ? "#3949ab" : "#c8941a";
                  return (
                    <motion.div key={i} initial={{ opacity: 0, x: -16 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.07 }}
                      style={{ display: "flex", gap: "1.5rem", alignItems: "flex-start", border: "1px solid var(--border)", borderRadius: 14, padding: "1.5rem", background: "var(--white)" }}>
                      <div style={{ background: tc + "15", border: `1px solid ${tc}30`, borderRadius: 10, padding: "0.75rem 1rem", textAlign: "center", minWidth: 90, flexShrink: 0 }}>
                        <div style={{ fontSize: "0.7rem", fontWeight: 700, color: tc, textTransform: "uppercase", letterSpacing: "0.05em" }}>{ev.date}</div>
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: "1rem", marginBottom: "0.3rem" }}>{ev.event}</div>
                        <p style={{ fontSize: "0.85rem", color: "var(--muted)", lineHeight: 1.6 }}>{ev.note}</p>
                      </div>
                      <Tag label={ev.type} color={tc} />
                    </motion.div>
                  );
                })}
              </div>
              <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                style={{ marginTop: "3rem", background: "#0e0e0e", borderRadius: 16, padding: "2rem", color: "#fff", textAlign: "center" }}>
                <div style={{ fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.15em", color: "#a8d8bc", fontWeight: 700, marginBottom: "0.75rem" }}>The Bottom Line</div>
                <p style={{ color: "rgba(255,255,255,0.65)", maxWidth: 700, margin: "0 auto", lineHeight: 1.85, fontSize: "0.9rem" }}>
                  The 2027 election will be fought primarily on the economy. If Tinubu's fiscal reforms stabilise the naira and reduce food prices before campaign season, he is hard to beat. If the cost-of-living crisis continues to bite in 2026, the opposition — whoever unites it — has a genuine shot. The wild card is youth turnout: the generation that powered the Obidient movement in 2023 is now one election older, angrier, and more organised.
                </p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

function QuizPage() {
  const [qi, setQi] = useState(0);
  const [selected, setSelected] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [done, setDone] = useState(false);
  const [showExp, setShowExp] = useState(false);
  const q = QUIZ_QUESTIONS[qi];
  const score = answers.filter(Boolean).length;

  const handleSelect = (idx) => {
    if (selected !== null) return;
    setSelected(idx);
    setShowExp(true);
  };
  const next = () => {
    setAnswers(prev => [...prev, selected === q.ans]);
    if (qi + 1 >= QUIZ_QUESTIONS.length) { setDone(true); }
    else { setQi(qi + 1); setSelected(null); setShowExp(false); }
  };
  const restart = () => { setQi(0); setSelected(null); setAnswers([]); setDone(false); setShowExp(false); setCopied(false); };
  const pct = Math.round((score / QUIZ_QUESTIONS.length) * 100);
  const [copied, setCopied] = useState(false);

  const shareText = () => {
    const medal = pct >= 80 ? "🏆" : pct >= 60 ? "📚" : pct >= 40 ? "🤔" : "📖";
    const grade = pct >= 80 ? "Expert" : pct >= 60 ? "Solid Knowledge" : pct >= 40 ? "Good Start" : "Keep Learning";
    return `${medal} I scored ${score}/${QUIZ_QUESTIONS.length} (${pct}%) on the Nigerian Democracy Quiz!\n\nGrade: ${grade}\n\nTest your own knowledge of Nigeria's democratic history 🇳🇬\n#NaijaDemocracy #Nigeria`;
  };

  const shareLinks = [
    {
      id: "x", label: "Post on X",
      icon: <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.259 5.63L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>,
      bg: "#000", color: "#fff",
      action: () => window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText())}`, "_blank"),
    },
    {
      id: "wa", label: "Share on WhatsApp",
      icon: <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>,
      bg: "#25D366", color: "#fff",
      action: () => window.open(`https://wa.me/?text=${encodeURIComponent(shareText())}`, "_blank"),
    },
    {
      id: "ig", label: "Copy for Instagram",
      icon: <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" /></svg>,
      bg: "linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)", color: "#fff",
      action: () => { navigator.clipboard?.writeText(shareText()); setCopied("ig"); setTimeout(() => setCopied(false), 3000); },
    },
    {
      id: "sc", label: "Copy for Snapchat",
      icon: <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M12.206.793c.99 0 4.347.276 5.93 3.821.529 1.193.403 3.219.299 4.847l.003.06c-.012.18-.028.37-.04.55l.06.05c.271.215.938.163 1.353.033.143-.046.31-.08.55-.08.5 0 1.063.195 1.063.588 0 .59-.899 1.003-1.548 1.002-.225 0-.477-.04-.665-.118-.023.03-.103.103-.218.207-.413.365-1.24 1.098-1.24 2.188 0 .147.055.283.103.36.277.468.867.713 1.426.713.182 0 .355-.026.508-.076.15-.048.286-.078.412-.078.34 0 .764.208.764.537 0 .416-.468.573-.714.605l-.117.013c-.226.03-.461.065-.63.175-.11.067-.188.19-.263.311-.065.107-.132.217-.23.312a1.52 1.52 0 01-1.027.368c-.123 0-.247-.015-.374-.05-.12-.034-.24-.057-.345-.057-.232 0-.36.077-.532.175-.242.138-.531.313-.94.313-.108 0-.218-.016-.337-.05-.09-.027-.174-.048-.26-.048-.133 0-.276.034-.44.094-.39.138-.8.29-1.285.29-.408 0-.8-.118-1.163-.302-.363-.183-.704-.315-1.046-.315-.226 0-.461.055-.69.155-.23.1-.47.157-.71.157-.526 0-.9-.17-1.165-.323-.17-.1-.31-.18-.54-.18-.09 0-.178.022-.268.05-.12.034-.24.05-.363.05-.39 0-.77-.127-1.046-.368-.1-.094-.165-.204-.23-.311-.074-.12-.153-.244-.262-.31-.168-.11-.404-.145-.63-.176l-.116-.012c-.247-.032-.715-.188-.715-.605 0-.33.424-.537.763-.537.126 0 .263.03.412.078.154.05.327.076.51.076.558 0 1.148-.245 1.425-.713.048-.077.103-.213.103-.36 0-1.09-.827-1.822-1.24-2.188-.115-.104-.195-.177-.218-.207-.19.078-.44.118-.666.118-.647 0-1.547-.412-1.547-1.002 0-.393.562-.589 1.062-.589.24 0 .407.033.55.08.416.13 1.082.182 1.354-.033l.06-.05c-.012-.179-.028-.37-.04-.55l.003-.06c-.104-1.628-.23-3.654.299-4.847C7.859 1.069 11.216.793 12.206.793z" /></svg>,
      bg: "#FFFC00", color: "#000",
      action: () => { navigator.clipboard?.writeText(shareText()); setCopied("sc"); setTimeout(() => setCopied(false), 3000); },
    },
  ];

  if (done) {
    const grade = pct >= 80 ? "🏆 Expert" : pct >= 60 ? "📚 Solid Knowledge" : pct >= 40 ? "🤔 Good Start" : "📖 Keep Learning";
    const gradeBg = pct >= 80 ? "linear-gradient(135deg,#005738,#008751)" : pct >= 60 ? "linear-gradient(135deg,#8b6500,#c8941a)" : pct >= 40 ? "linear-gradient(135deg,#1a237e,#3949ab)" : "linear-gradient(135deg,#4a1010,#b22222)";
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ padding: "100px 6vw 80px", maxWidth: 700, margin: "0 auto", textAlign: "center" }}>

        {/* Score hero */}
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", duration: 0.6 }}
          style={{ background: gradeBg, borderRadius: 24, padding: "3rem 2rem", marginBottom: "2.5rem", color: "#fff" }}>
          <div style={{ fontSize: "4rem", marginBottom: "0.5rem" }}>{pct >= 80 ? "🏆" : pct >= 60 ? "📚" : pct >= 40 ? "🤔" : "📖"}</div>
          <div style={{ fontSize: "clamp(3rem,12vw,7rem)", fontWeight: 900, letterSpacing: "-4px", lineHeight: 0.9, marginBottom: "0.5rem" }}>{score}/{QUIZ_QUESTIONS.length}</div>
          <div style={{ fontSize: "1.1rem", fontWeight: 700, opacity: 0.85, marginBottom: "0.25rem" }}>{pct}% correct</div>
          <div style={{ fontSize: "1rem", opacity: 0.65 }}>{grade.replace(/^[^ ]+ /, "")}</div>
        </motion.div>

        {/* Share section */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          style={{ background: "var(--white)", border: "1px solid var(--border)", borderRadius: 20, padding: "2rem", marginBottom: "2.5rem" }}>
          <div style={{ fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.15em", color: "var(--g)", fontWeight: 700, marginBottom: "0.5rem" }}>Share Your Score</div>
          <p style={{ fontSize: "0.88rem", color: "var(--muted)", marginBottom: "1.5rem", lineHeight: 1.6 }}>
            Challenge your friends — how well do they know Nigerian democratic history?
          </p>

          {/* Preview card */}
          <div style={{ background: "#f5f5f3", border: "1px solid var(--border)", borderRadius: 12, padding: "1.25rem", marginBottom: "1.5rem", textAlign: "left", fontFamily: "monospace", fontSize: "0.82rem", color: "var(--sub)", lineHeight: 1.75, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
            {shareText()}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(160px,1fr))", gap: "0.75rem" }}>
            {shareLinks.map(s => {
              const isCopied = copied === s.id;
              return (
                <motion.button key={s.id} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }} onClick={s.action}
                  style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "11px 16px", borderRadius: 10, background: isCopied ? "var(--g)" : s.bg, color: isCopied ? "#fff" : s.color, fontWeight: 700, fontSize: "0.82rem", border: "none", cursor: "pointer", transition: "background 0.2s" }}>
                  {isCopied ? <>✓ Copied!</> : <>{s.icon}{s.label}</>}
                </motion.button>
              );
            })}
          </div>

          {(copied === "ig" || copied === "sc") && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ fontSize: "0.78rem", color: "var(--muted)", marginTop: "0.75rem" }}>
              ✅ Copied to clipboard — open {copied === "ig" ? "Instagram" : "Snapchat"} and paste into your caption or story!
            </motion.p>
          )}
        </motion.div>

        {/* Answer breakdown */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "2.5rem", textAlign: "left" }}>
          {QUIZ_QUESTIONS.map((q, i) => (
            <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 12, background: answers[i] ? "#f0faf5" : "#fff5f5", border: `1px solid ${answers[i] ? "#a8d8bc" : "#f5c6c6"}`, borderRadius: 10, padding: "0.9rem 1rem" }}>
              <span style={{ flexShrink: 0, fontWeight: 700, color: answers[i] ? "var(--g)" : "#b22222" }}>{answers[i] ? "✓" : "✗"}</span>
              <div>
                <div style={{ fontSize: "0.85rem", fontWeight: 600, marginBottom: 2 }}>{q.q}</div>
                <div style={{ fontSize: "0.78rem", color: "var(--muted)" }}>Correct: {q.opts[q.ans]}</div>
              </div>
            </div>
          ))}
        </div>

        <motion.button whileHover={{ scale: 1.04 }} onClick={restart}
          style={{ background: "var(--g)", color: "#fff", padding: "14px 36px", borderRadius: 10, fontSize: "1rem", fontWeight: 700 }}>
          Try Again
        </motion.button>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ padding: "100px 6vw 80px", maxWidth: 720, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "3rem" }}>
        <PH eyebrow="Test Your Knowledge" title="Nigerian Democracy Quiz" />
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div style={{ fontSize: "2rem", fontWeight: 900, color: "var(--g)", letterSpacing: "-1px" }}>{qi + 1}<span style={{ fontSize: "1rem", color: "var(--muted)", fontWeight: 600 }}>/{QUIZ_QUESTIONS.length}</span></div>
        </div>
      </div>
      <div style={{ height: 6, borderRadius: 3, background: "var(--border)", marginBottom: "3rem", overflow: "hidden" }}>
        <motion.div animate={{ width: `${((qi) / QUIZ_QUESTIONS.length) * 100}%` }} transition={{ duration: 0.5 }}
          style={{ height: "100%", background: "var(--g)", borderRadius: 3 }} />
      </div>
      <AnimatePresence mode="wait">
        <motion.div key={qi} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.3 }}>
          <h2 style={{ fontSize: "clamp(1.1rem,2.5vw,1.4rem)", fontWeight: 700, lineHeight: 1.5, marginBottom: "2rem", letterSpacing: "-0.3px" }}>{q.q}</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {q.opts.map((opt, idx) => {
              let bg = "var(--white)", border = "var(--border)", color = "var(--ink)";
              if (selected !== null) {
                if (idx === q.ans) { bg = "#f0faf5"; border = "#008751"; color = "#005738"; }
                else if (idx === selected && selected !== q.ans) { bg = "#fff5f5"; border = "#b22222"; color = "#7a1010"; }
              }
              return (
                <motion.button key={idx} whileHover={selected === null ? { scale: 1.01 } : {}} onClick={() => handleSelect(idx)}
                  style={{ border: `2px solid ${border}`, borderRadius: 12, padding: "1rem 1.25rem", textAlign: "left", background: bg, color, fontWeight: 600, fontSize: "0.95rem", transition: "all 0.2s", cursor: selected === null ? "pointer" : "default" }}>
                  <span style={{ marginRight: 12, color: "var(--muted)", fontSize: "0.85rem" }}>{String.fromCharCode(65 + idx)}.</span>
                  {opt}
                  {selected !== null && idx === q.ans && <span style={{ float: "right" }}>✓</span>}
                  {selected !== null && idx === selected && selected !== q.ans && <span style={{ float: "right" }}>✗</span>}
                </motion.button>
              );
            })}
          </div>
          <AnimatePresence>
            {showExp && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: "hidden" }}>
                <div style={{ background: "var(--lg)", border: "1px solid var(--vg)", borderRadius: 12, padding: "1.25rem", marginTop: "1.25rem" }}>
                  <div style={{ fontSize: "0.68rem", textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--dg)", fontWeight: 700, marginBottom: "0.4rem" }}>Explanation</div>
                  <p style={{ fontSize: "0.88rem", color: "var(--dg)", lineHeight: 1.75 }}>{q.exp}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          {selected !== null && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ marginTop: "1.5rem" }}>
              <motion.button whileHover={{ scale: 1.04 }} onClick={next}
                style={{ background: "var(--g)", color: "#fff", padding: "13px 32px", borderRadius: 10, fontWeight: 700, fontSize: "0.95rem" }}>
                {qi + 1 >= QUIZ_QUESTIONS.length ? "See Results" : "Next Question →"}
              </motion.button>
            </motion.div>
          )}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}

/* ─── App Shell ─────────────────────────────────────────────────────── */
export default function App() {
  const [page, setPage] = useState("home");
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const isMobile = useIsMobile(900);

  const navigate = useCallback((p) => { setPage(p); setMenuOpen(false); setSearchOpen(false); window.scrollTo(0, 0); }, []);

  useEffect(() => { document.body.style.overflow = menuOpen || searchOpen ? "hidden" : "auto"; }, [menuOpen, searchOpen]);
  useEffect(() => { const h = () => setScrolled(window.scrollY > 30); window.addEventListener("scroll", h, { passive: true }); return () => window.removeEventListener("scroll", h); }, []);
  useEffect(() => {
    const h = (e) => { if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); setSearchOpen(v => !v); } };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  const PAGE_MAP = {
    home: <HomePage navigate={navigate} />, history: <HistoryPage />, june12: <June12Page />,
    biafra: <BiafraPage />, timeline: <TimelinePage />, elections: <ElectionsPage />,
    presidents: <PresidentsPage />, parties: <PartiesPage />, governors: <GovernorsPage />,
    constitutions: <ConstitutionsPage />, trends: <TrendsPage />,
    tracker2027: <Tracker2027Page />, quiz: <QuizPage />,
  };

  return (
    <>
      <style>{CSS}</style>

      {/* Search modal */}
      <AnimatePresence>
        {searchOpen && <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} navigate={navigate} />}
      </AnimatePresence>

      {/* Nav */}
      <motion.nav initial={{ y: -100 }} animate={{ y: 0 }}
        style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 1100, background: scrolled ? "rgba(255,255,255,0.9)" : "transparent", backdropFilter: scrolled ? "blur(20px)" : "none", borderBottom: scrolled ? "1px solid var(--border)" : "none", padding: scrolled ? "10px 4vw" : "18px 4vw", display: "flex", justifyContent: "space-between", alignItems: "center", transition: "all 0.4s" }}>
        <div onClick={() => navigate("home")} style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", flexShrink: 0 }}>
          <div style={{ width: 36, height: 22, borderRadius: 3, overflow: "hidden", border: "1px solid rgba(0,0,0,0.08)", display: "flex" }}>
            <div style={{ flex: 1, background: "#008751" }} /><div style={{ flex: 1, background: "#fff" }} /><div style={{ flex: 1, background: "#008751" }} />
          </div>
          <span style={{ fontSize: "1rem", fontWeight: 900, letterSpacing: "-0.8px" }}>NaijaDemocracy</span>
        </div>

        {!isMobile && (
          <div style={{ display: "flex", gap: "0.1rem", alignItems: "center" }}>
            {PAGES.filter(p => p.id !== "home").map(p => (
              <button key={p.id} onClick={() => navigate(p.id)}
                style={{ background: "none", fontSize: "0.78rem", fontWeight: 600, color: page === p.id ? "var(--g)" : "var(--sub)", padding: "6px 10px", borderRadius: 6, transition: "all 0.2s", position: "relative" }}>
                {p.label}
                {page === p.id && <motion.div layoutId="nav" style={{ position: "absolute", bottom: 2, left: "50%", transform: "translateX(-50%)", width: 20, height: 2, background: "var(--g)", borderRadius: 1 }} />}
              </button>
            ))}
          </div>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button onClick={() => setSearchOpen(true)}
            style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 8, padding: "6px 12px", display: "flex", alignItems: "center", gap: 6, fontSize: "0.78rem", color: "var(--muted)", fontWeight: 500 }}>
            🔍 <span style={{ display: isMobile ? "none" : "inline" }}>Search</span>
            {!isMobile && <kbd style={{ fontSize: "0.65rem", background: "var(--border)", borderRadius: 4, padding: "1px 5px", color: "var(--muted)" }}>⌘K</kbd>}
          </button>
          {isMobile && (
            <button onClick={() => setMenuOpen(v => !v)} style={{ background: "none", border: "none", padding: "8px", display: "flex", flexDirection: "column", gap: "5px", zIndex: 2000 }}>
              {[0, 1, 2].map(i => (
                <motion.div key={i} animate={menuOpen ? i === 0 ? { rotate: 45, y: 7 } : i === 1 ? { opacity: 0 } : { rotate: -45, y: -7 } : { rotate: 0, y: 0, opacity: 1 }} transition={{ duration: 0.3 }}
                  style={{ width: 24, height: 2, background: "var(--ink)", borderRadius: 2 }} />
              ))}
            </button>
          )}
        </div>
      </motion.nav>

      {/* Mobile overlay */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: "fixed", inset: 0, background: "rgba(255,255,255,0.97)", backdropFilter: "blur(20px)", zIndex: 1050, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", overflowY: "auto", padding: "2rem 0" }}>
            {PAGES.map((p, i) => (
              <motion.div key={p.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                onClick={() => navigate(p.id)} className={`m-link${page === p.id ? " active" : ""}`}>
                {p.label}
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <main>
        <AnimatePresence mode="wait">
          <motion.div key={page} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.3 }}>
            {PAGE_MAP[page] || <HomePage navigate={navigate} />}
          </motion.div>
        </AnimatePresence>
      </main>

      <footer style={{ background: "#0e0e0e", color: "rgba(255,255,255,0.4)", padding: "4rem 6vw 2rem" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "2rem", marginBottom: "3rem" }}>
          <div>
            <div style={{ width: 36, height: 22, borderRadius: 3, overflow: "hidden", border: "1px solid rgba(0,0,0,0.08)", display: "flex" }}>
              <div style={{ flex: 1, background: "#008751" }} /><div style={{ flex: 1, background: "#fff" }} /><div style={{ flex: 1, background: "#008751" }} />
            </div>
            <span style={{ fontSize: "1rem", fontWeight: 900, color: "#fff" }}>NaijaDemocracy</span>
            <p style={{ fontSize: "0.85rem", maxWidth: 320, lineHeight: 1.7 }}>An interactive educational archive of Nigeria's democratic journey — from 1960 to today. All historical data is sourced from public records.</p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(140px,1fr))", gap: "0.5rem" }}>
            {PAGES.map(p => (
              <button key={p.id} onClick={() => navigate(p.id)}
                style={{ background: "none", fontSize: "0.82rem", color: "rgba(255,255,255,0.4)", textAlign: "left", padding: "3px 0" }}
                onMouseEnter={e => e.target.style.color = "#fff"} onMouseLeave={e => e.target.style.color = "rgba(255,255,255,0.4)"}>
                {p.label}
              </button>
            ))}
          </div>
        </div>
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: "1.5rem", fontSize: "0.75rem", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
          <span>© 2026 NaijaDemocracy — For educational purposes</span>
          <span>Data sourced from INEC, NBS, and public historical records</span>
        </div>
      </footer>
    </>
  );
}