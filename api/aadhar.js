// Hardcoded multi-key system with expiry status
const KEYS_STATUS = {
  'abhay1': { valid: true, expired: false },
  'abhay2': { valid: true, expired: false },
  'abhay3': { valid: true, expired: false },
  'abhay4': { valid: true, expired: true },
  'abhay5': { valid: true, expired: false }
};

// Developer info
const DEVELOPER_INFO = {
  name: "@darkdeveloper02",
  telegram: "@darkdeveloper02",
  buy: "@darkdeveloper02"
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Content-Type', 'application/json');
  
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { exploits, api_key } = req.query;

  // Missing API key
  if (!api_key) {
    return res.status(401).json({ 
      success: false,
      error: 'Missing API key', 
      key_status: 'missing',
      usage: '?api_key=KEY&exploits=123456789012',
      developer: DEVELOPER_INFO
    });
  }

  // Invalid API key (not in system)
  if (!KEYS_STATUS[api_key]) {
    return res.status(403).json({ 
      success: false,
      error: 'Invalid API key', 
      key_status: 'invalid',
      developer: DEVELOPER_INFO
    });
  }

  // Expired API key
  if (KEYS_STATUS[api_key].expired === true) {
    return res.status(403).json({ 
      success: false,
      error: 'API key expired', 
      key_status: 'expired',
      developer: DEVELOPER_INFO
    });
  }

  // Invalid valid flag
  if (!KEYS_STATUS[api_key].valid) {
    return res.status(403).json({ 
      success: false,
      error: 'Invalid API key', 
      key_status: 'invalid',
      developer: DEVELOPER_INFO
    });
  }

  // Validate Aadhaar (12 digits)
  if (!exploits) {
    return res.status(400).json({ 
      success: false,
      error: 'Missing Aadhaar number', 
      key_status: 'valid',
      usage: '?api_key=KEY&exploits=123456789012',
      developer: DEVELOPER_INFO
    });
  }

  const aadhaarRegex = /^\d{12}$/;
  if (!aadhaarRegex.test(exploits)) {
    return res.status(400).json({ 
      success: false,
      error: 'Invalid Aadhaar number. Must be exactly 12 digits.',
      key_status: 'valid',
      developer: DEVELOPER_INFO
    });
  }

  const targetUrl = `https://exploitsindia.site/api/aadhar.php?exploits=${exploits}`;

  try {
    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; VercelBot/1.0)',
        'Accept': 'text/html,application/xhtml+xml,application/xml'
      }
    });

    let rawText = await response.text();

    const removeBuySupport = /(💳\s*BUY\s+API\s*:\s*@\S+\s*|🆘\s*SUPPORT\s*:\s*@\S+\s*|━━━━━━━━━━━━━━━━━━━━━━━━━━━)/gi;
    rawText = rawText.replace(removeBuySupport, '');

    const parsedResult = parseAadhaarResponse(rawText, exploits, api_key);
    parsedResult.key_status = 'valid';

    console.log(`[KEY_USED] ${api_key} accessed Aadhaar: ${exploits}`);
    res.status(200).json(parsedResult);

  } catch (error) {
    console.error('Scraping error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch from target', 
      key_status: 'valid',
      details: error.message,
      developer: DEVELOPER_INFO
    });
  }
}

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

  let mainSection = text;
  let additionalSection = '';

  if (text.includes('📌 Additional Result:')) {
    const parts = text.split('📌 Additional Result:');
    mainSection = parts[0];
    additionalSection = parts[1];
  }

  const aadhaarPattern = /🪪\s*Aadhaar:\s*(\d{12})/;
  const namePattern = /👤\s*Name:\s*(.+?)(?:\n|$)/;
  const fatherPattern = /👨‍👦\s*Father Name:\s*(.+?)(?:\n|$)/;
  const mobilePattern = /📱\s*Mobile:\s*(\d{10})/;
  const addressPattern = /🏠\s*Address:\s*(.+?)(?:\n📡|$)/;
  const circlePattern = /📡\s*Circle:\s*(.+?)(?:\n|$)/;

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
