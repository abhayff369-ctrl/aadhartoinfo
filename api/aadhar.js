// Hardcoded multi-key system
const VALID_KEYS = [
  'abhay1',
  'abhay2',
  'abhay3',
  'abhay4',
  'abhay5'
];

// FOOTER removed as requested

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { exploits, api_key } = req.query;

  // Multi-Key Authentication
  if (!api_key) {
    return res.status(401).json({ 
      error: 'Missing API key', 
      usage: '?api_key=abhay1&exploits=123456789012',
      valid_keys: VALID_KEYS
    });
  }

  if (!VALID_KEYS.includes(api_key)) {
    return res.status(403).json({ 
      error: 'Invalid API key', 
      valid_keys: VALID_KEYS
    });
  }

  // Validate Aadhaar number (12 digits)
  if (!exploits) {
    return res.status(400).json({ 
      error: 'Missing Aadhaar number', 
      usage: '?api_key=KEY&exploits=123456789012' 
    });
  }

  const aadhaarRegex = /^\d{12}$/;
  if (!aadhaarRegex.test(exploits)) {
    return res.status(400).json({ 
      error: 'Invalid Aadhaar number. Must be exactly 12 digits.' 
    });
  }

  const targetUrl = `https://exploitsindia.site/api/number.php?exploits=${exploits}`;

  try {
    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; VercelBot/1.0)',
        'Accept': 'text/html,application/xhtml+xml,application/xml'
      }
    });

    let content = await response.text();

    // Remove any "developer by abhay singh" line (case-insensitive)
    const removePattern = /developer\s+by\s+abhay\s+singh/gi;
    content = content.replace(removePattern, '');

    // No footer appended

    console.log(`[KEY_USED] ${api_key} accessed Aadhaar: ${exploits}`);

    res.status(response.status).send(content);
  } catch (error) {
    console.error('Scraping error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch from target', 
      details: error.message 
    });
  }
}
