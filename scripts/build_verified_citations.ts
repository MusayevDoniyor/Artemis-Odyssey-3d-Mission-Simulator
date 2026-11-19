import fs from 'fs';
import path from 'path';

interface CitationSpec {
  id: string;
  craftId: string;
  sourceTitle: string;
  url: string;
  quote: string;
}

const CITATIONS: CitationSpec[] = [
  {
    id: 'sls_msfc',
    craftId: 'rocket',
    sourceTitle: 'NASA Space Launch System Reference Guide',
    url: 'https://www.nasa.gov/reference/space-launch-system/',
    quote: "NASA’s SLS (Space Launch System) is a super heavy-lift rocket that provides the foundation for human exploration beyond Earth orbit."
  },
  {
    id: 'sls_ntrs',
    craftId: 'rocket',
    sourceTitle: 'NASA NTRS SLS Core Stage Technical Overview',
    url: 'https://ntrs.nasa.gov/citations/20170005608',
    quote: "The Core Stage serves as the structural backbone of the SLS rocket"
  },
  {
    id: 'tdrs_scan',
    craftId: 'satellite',
    sourceTitle: 'NASA Space Communications and Navigation (SCaN) Program Overview',
    url: 'https://www.nasa.gov/directorates/somd/space-communications-navigation-program/',
    quote: "SCaN serves as the program office for all of NASA’s space communications"
  },
  {
    id: 'tdrs_ntrs',
    craftId: 'satellite',
    sourceTitle: 'NASA Tracking and Data Relay Satellite System (TDRSS) Users Guide (NTRS)',
    url: 'https://ntrs.nasa.gov/citations/19840003001',
    quote: "Tracking and Data Relay Satellite System (TDRSS) Users' Guide"
  },
  {
    id: 'jwst_facts',
    craftId: 'jwst',
    sourceTitle: 'NASA Webb Space Telescope Facts and FAQ',
    url: 'https://webb.nasa.gov/content/about/faqs/facts.html',
    quote: "The James Webb Space Telescope is the world's premier space science observatory"
  },
  {
    id: 'jwst_esa',
    craftId: 'jwst',
    sourceTitle: 'ESA Webb Mission Operations Overview',
    url: 'https://www.cosmos.esa.int/web/jwst',
    quote: "Webb is an international partnership between NASA, ESA and CSA"
  },
  {
    id: 'voyager_sp4225',
    craftId: 'voyager',
    sourceTitle: 'NASA SP-4225: To The Outer Planets',
    url: 'https://history.nasa.gov/SP-4225/sp4225.htm',
    quote: "Voyager 1 and 2 were designed to explore the outer solar system"
  },
  {
    id: 'voyager_ntrs',
    craftId: 'voyager',
    sourceTitle: 'NASA Voyager Spacecraft Technical Summary (NTRS)',
    url: 'https://ntrs.nasa.gov/citations/19780004351',
    quote: "Voyager Mission Description and Spacecraft Design"
  },
  {
    id: 'lm_sp4029',
    craftId: 'lander',
    sourceTitle: 'NASA SP-4029: Apollo by the Numbers',
    url: 'https://history.nasa.gov/SP-4029/Apollo_00a_Cover.htm',
    quote: "Apollo by the Numbers: A Statistical Reference"
  },
  {
    id: 'lm_nasm',
    craftId: 'lander',
    sourceTitle: 'Smithsonian National Air and Space Museum Lunar Module LM-2 Spec Sheet',
    url: 'https://airandspace.si.edu/collection-objects/lunar-module-2/nasm_A19711598000',
    quote: "Lunar Module 2"
  },
  {
    id: 'viper_science',
    craftId: 'rover',
    sourceTitle: 'NASA Science VIPER Lunar Rover Mission Overview',
    url: 'https://science.nasa.gov/mission/viper/',
    quote: "NASA's Artemis lunar rover, the Volatiles Investigating Polar Exploration Rover, or VIPER, was designed to explore the relatively nearby but extreme environment of the Moon in search of ice and other potential resources."
  },
  {
    id: 'viper_instruments',
    craftId: 'rover',
    sourceTitle: 'NASA Science VIPER Rover and Instruments',
    url: 'https://science.nasa.gov/mission/viper/rover-and-instruments/',
    quote: "VIPER will roam the Moon using its three instruments and a 1-meter drill to detect and analyze various lunar soil environments"
  },
  {
    id: 'saturn_sa503',
    craftId: 'saturn-v',
    sourceTitle: 'NASA Saturn V Flight Manual SA-503',
    url: 'https://history.nasa.gov/afj/ap08fltdet/ap08-sa503flightmanual.pdf',
    quote: "Saturn V Launch Vehicle Flight Manual SA 503"
  },
  {
    id: 'saturn_sp4029',
    craftId: 'saturn-v',
    sourceTitle: 'NASA SP-4029: Apollo by the Numbers',
    url: 'https://history.nasa.gov/SP-4029/Apollo_00a_Cover.htm',
    quote: "Apollo by the Numbers: A Statistical Reference"
  },
  {
    id: 'falcon9_lsp',
    craftId: 'falcon-9',
    sourceTitle: 'NASA Launch Services Program (LSP) Falcon 9 Advisory',
    url: 'https://www.nasa.gov/launch-services-program/',
    quote: "Falcon 9 is a reusable, two-stage rocket designed and manufactured by SpaceX for the reliable and safe transport of people and payloads into Earth orbit and beyond."
  },
  {
    id: 'iss_ref',
    craftId: 'iss',
    sourceTitle: 'NASA International Space Station Reference Guide',
    url: 'https://www.nasa.gov/reference/international-space-station/',
    quote: "The International Space Station is a microgravity research laboratory"
  },
  {
    id: 'iss_overview',
    craftId: 'iss',
    sourceTitle: 'NASA International Space Station Program Overview',
    url: 'https://www.nasa.gov/international-space-station/',
    quote: "International Space Station"
  }
];

async function fetchPage(url: string) {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      },
      redirect: 'follow'
    });
    const status = res.status;
    const finalUrl = res.url;
    const html = await res.text();
    
    const text = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&#8217;/g, "'")
      .replace(/&#8216;/g, "'")
      .replace(/&#8220;/g, '"')
      .replace(/&#8221;/g, '"')
      .replace(/\s+/g, ' ')
      .trim();

    return { status, finalUrl, text: text.slice(0, 30000) };
  } catch (err: any) {
    return { status: 500, finalUrl: url, error: err.message, text: '' };
  }
}

function normalize(s: string) {
  return s
    .toLowerCase()
    .replace(/['’‘]/g, "'")
    .replace(/["“”]/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

async function main() {
  const dir = path.resolve('docs/data/citations');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const summary: any[] = [];

  for (const c of CITATIONS) {
    console.log(`Processing ${c.id}: ${c.url}...`);
    const page = await fetchPage(c.url);
    const filePath = path.join(dir, `${c.id}.txt`);
    
    const content = `ID: ${c.id}
Craft-ID: ${c.craftId}
Title: ${c.sourceTitle}
URL: ${c.url}
Final-URL: ${page.finalUrl}
HTTP-Status: ${page.status}
Fetch-Date: 2026-11-19
------------------------------------------------------------------------
${page.text.slice(0, 20480)}
`;
    fs.writeFileSync(filePath, content, 'utf8');

    const normText = normalize(page.text);
    const normQuote = normalize(c.quote);
    const found = normText.includes(normQuote);

    console.log(`  -> Status: ${page.status}, Quote Match: ${found ? 'PASS' : 'FAIL'}`);
    if (!found) {
      console.warn(`     Expected quote: "${c.quote}"`);
    }

    summary.push({
      id: c.id,
      craftId: c.craftId,
      title: c.sourceTitle,
      url: page.finalUrl,
      status: page.status,
      quote: c.quote,
      match: found
    });
  }

  fs.writeFileSync('docs/data/citations/citations_manifest.json', JSON.stringify(summary, null, 2), 'utf8');
  console.log('Manifest written to docs/data/citations/citations_manifest.json');
}

main().catch(console.error);
