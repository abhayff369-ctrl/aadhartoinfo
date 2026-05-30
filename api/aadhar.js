// Hardcoded multi-key system: abhay1, abhay2, abhay3, abhay4, abhay5
const VALID_KEYS = [
  'demo',
  'abhay2',
  'abhay3',
  'abhay4',
  'abhay5'
];

// Developer info
const DEVELOPER_INFO = {
  name: "@darkdeveloper02",
  telegram: "@darkdeveloper02",
  buy: "@darkdeveloper02"
};

export default async function handler(req, res) {
  // Set CORS and JSON headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Content-Type', 'application/json');
  
  // Handle preflight request
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { exploits, api_key } = req.query;

  // --- Multi-Key Authentication ---
  if (!api_key) {
    return res.status(401).json({ 
      success: false,
      error: 'Missing API key', 
      usage: '?api_key=abhay1&exploits=123456789012',
      valid_keys: VALID_KEYS,
      developer: DEVELOPER_INFO
    });
  }

  if (!VALID_KEYS.includes(api_key)) {
    return res.status(403).json({ 
      success: false,
      error: 'Invalid API key', 
      valid_keys: VALID_KEYS,
      developer: DEVELOPER_INFO
    });
  }

  // --- Validate Aadhaar (12 digits) ---
  if (!exploits) {
    return res.status(400).json({ 
      success: false,
      error: 'Missing Aadhaar number', 
      usage: '?api_key=KEY&exploits=123456789012',
      developer: DEVELOPER_INFO
    });
  }

  const aadhaarRegex = /^\d{12}$/;
  if (!aadhaarRegex.test(exploits)) {
    return res.status(400).json({ 
      success: false,
      error: 'Invalid Aadhaar number. Must be exactly 12 digits.',
      developer: DEVELOPER_INFO
    });
  }

  // --- Target API ---
  const targetUrl = `https://exploitsindia.site/api/aadhar.php?exploits=${exploits}`;

  try {
    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; VercelBot/1.0)',
        'Accept': 'text/html,application/xhtml+xml,application/xml'
      }
    });

    let rawText = await response.text();

    // Remove BUY/SUPPORT lines and extra separators
    const removeBuySupport = /(💳\s*BUY\s+API\s*:\s*@\S+\s*|🆘\s*SUPPORT\s*:\s*@\S+\s*|━━━━━━━━━━━━━━━━━━━━━━━━━━━)/gi;
    rawText = rawText.replace(removeBuySupport, '');

    // Parse into JSON
    const parsedResult = parseAadhaarResponse(rawText, exploits, api_key);

    console.log(`[KEY_USED] ${api_key} accessed Aadhaar: ${exploits}`);
    res.status(200).json(parsedResult);

  } catch (error) {
    console.error('Scraping error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch from target', 
      details: error.message,
      developer: DEVELOPER_INFO
    });
  }
}

// Parser function
function parseAadhaarResponse(text, requestedAadhaar, usedKey) {
  const result = {
    success: true,
    developer: DEVELOPER_INFO,
    used_key: usedKey,
    mobile_lookup: {
      mobile: null,
      name: null,
      father_name: null,
      address: null,
      circle: null
    },
    aadhaar_found: 0,
    aadhaars: []
  };

  // Split main and additional sections
  let mainSection = text;
  let additionalSection = '';

  if (text.includes('📌 Additional Result:')) {
    const parts = text.split('📌 Additional Result:');
    mainSection = parts[0];
    additionalSection = parts[1];
  }

  // Regex patterns
  const aadhaarPattern = /🪪\s*Aadhaar:\s*(\d{12})/;
  const namePattern = /👤\s*Name:\s*(.+?)(?:\n|$)/;
  const fatherPattern = /👨‍👦\s*Father Name:\s*(.+?)(?:\n|$)/;
  const mobilePattern = /📱\s*Mobile:\s*(\d{10})/;
  const addressPattern = /🏠\s*Address:\s*(.+?)(?:\n📡|$)/;
  const circlePattern = /📡\s*Circle:\s*(.+?)(?:\n|$)/;

  // Parse main section
  const aadhaarMatch = mainSection.match(aadhaarPattern);
  const nameMatch = mainSection.match(namePattern);
  const fatherMatch = mainSection.match(fatherPattern);
  const mobileMatch = mainSection.match(mobilePattern);
  const addressMatch = mainSection.match(addressPattern);
  const circleMatch = mainSection.match(circlePattern);

  if (aadhaarMatch) {
    result.aadhaar_found++;
    result.aadhaars.push(aadhaarMatch[1]);
    result.mobile_lookup.mobile = mobileMatch ? mobileMatch[1] : null;
    result.mobile_lookup.name = nameMatch ? nameMatch[1].trim() : null;
    result.mobile_lookup.father_name = fatherMatch ? fatherMatch[1].trim() : null;
    result.mobile_lookup.address = addressMatch ? addressMatch[1].trim() : null;
    result.mobile_lookup.circle = circleMatch ? circleMatch[1].trim() : null;
  }

  // Parse additional section
  if (additionalSection) {
    const additionalAadhaar = additionalSection.match(aadhaarPattern);
    const additionalMobile = additionalSection.match(mobilePattern);
    
    if (additionalAadhaar && !result.aadhaars.includes(additionalAadhaar[1])) {
      result.aadhaars.push(additionalAadhaar[1]);
      result.aadhaar_found++;
    }
    
    if (!result.mobile_lookup.mobile && additionalMobile) {
      result.mobile_lookup.mobile = additionalMobile[1];
    }
  }

  if (result.aadhaar_found === 0) {
    result.success = false;
    result.error = "No Aadhaar data found for the given number";
  }

  return result;
}
