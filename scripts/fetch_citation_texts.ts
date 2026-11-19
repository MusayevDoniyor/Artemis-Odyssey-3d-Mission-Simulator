import fs from 'fs';
import path from 'path';

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
    
    // strip HTML tags to get visible text
    const text = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ')
      .trim();

    return { status, finalUrl, text: text.slice(0, 30000) };
  } catch (err: any) {
    return { status: 500, finalUrl: url, error: err.message, text: '' };
  }
}

async function main() {
  const urls = [
    { id: 'sls_msfc', url: 'https://www.nasa.gov/reference/space-launch-system/' },
    { id: 'sls_ntrs', url: 'https://ntrs.nasa.gov/citations/20170005608' },
    { id: 'viper_science', url: 'https://science.nasa.gov/mission/viper/' },
    { id: 'viper_nasa', url: 'https://www.nasa.gov/mission/viper/' },
    { id: 'tdrs_scan', url: 'https://www.nasa.gov/directorates/somd/space-communications-navigation-program/' },
    { id: 'tdrs_ntrs', url: 'https://ntrs.nasa.gov/citations/19840003001' },
    { id: 'jwst_facts', url: 'https://webb.nasa.gov/content/about/faqs/facts.html' },
    { id: 'jwst_esa', url: 'https://www.cosmos.esa.int/web/jwst' },
    { id: 'voyager_sp4225', url: 'https://history.nasa.gov/SP-4225/sp4225.htm' },
    { id: 'voyager_ntrs', url: 'https://ntrs.nasa.gov/citations/19780004351' },
    { id: 'lm_ops', url: 'https://history.nasa.gov/alsj/a11/LM05_Operations_Handbook.html' },
    { id: 'lm_sp4029', url: 'https://history.nasa.gov/SP-4029/Apollo_00a_Cover.htm' },
    { id: 'saturn_sa503', url: 'https://history.nasa.gov/afj/ap08fltdet/ap08-sa503flightmanual.pdf' },
    { id: 'falcon9_spacex', url: 'https://www.spacex.com/vehicles/falcon-9/' },
    { id: 'falcon9_lsp', url: 'https://www.nasa.gov/launch-services-program/' },
    { id: 'iss_ref', url: 'https://www.nasa.gov/reference/international-space-station/' },
    { id: 'iss_overview', url: 'https://www.nasa.gov/international-space-station/' },
  ];

  const dir = path.resolve('docs/data/citations');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  for (const item of urls) {
    console.log(`Fetching ${item.id}: ${item.url}...`);
    const res = await fetchPage(item.url);
    const content = `ID: ${item.id}
URL: ${item.url}
Final-URL: ${res.finalUrl}
HTTP-Status: ${res.status}
Fetch-Date: 2026-11-19
------------------------------------------------------------------------
${res.text.slice(0, 20480)}
`;
    fs.writeFileSync(path.join(dir, `${item.id}.txt`), content, 'utf8');
    console.log(`  -> Status: ${res.status}, Saved ${path.join(dir, `${item.id}.txt`)} (${content.length} chars)`);
  }
}

main().catch(console.error);
