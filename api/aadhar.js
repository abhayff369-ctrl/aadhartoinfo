// ============================================================
// COMPLETE AADHAAR LOOKUP API
// Endpoint: /api/aadhar?aadhar=123456789012&api_key=abhay1
// Multi-key: abhay1, abhay2, abhay3, abhay4, abhay5
// Output: JSON with success, total_results, results, developer
// ============================================================

const VALID_KEYS = ['abhay1', 'abhay2', 'abhay3', 'abhay4', 'abhay5'];

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ 
      success: false,
      error: 'Method not allowed', 
      message: 'Use GET request' 
    });
  }

  const { aadhar, api_key } = req.query;

  // ========== STEP 1: API KEY AUTHENTICATION ==========
  if (!api_key) {
    return res.status(401).json({ 
      success: false,
      error: 'Missing API key', 
      message: 'Please provide an API key',
      usage: '?api_key=abhay1&aadhar=123456789012',
      valid_keys: VALID_KEYS
    });
  }

  if (!VALID_KEYS.includes(api_key)) {
    return res.status(403).json({ 
      success: false,
      error: 'Invalid API key', 
      message: 'The API key you provided is not valid',
      valid_keys: VALID_KEYS
    });
  }

  // ========== STEP 2: VALIDATE AADHAAR NUMBER ==========
  if (!aadhar) {
    return res.status(400).json({ 
      success: false,
      error: 'Missing Aadhaar number', 
      message: 'Please provide an Aadhaar number',
      usage: '?api_key=KEY&aadhar=123456789012' 
    });
  }

  // Remove any spaces or special characters
  const cleanAadhar = aadhar.toString().replace(/\D/g, '');
  
  // Validate 12 digits
  const aadhaarRegex = /^\d{12}$/;
  if (!aadhaarRegex.test(cleanAadhar)) {
    return res.status(400).json({ 
      success: false,
      error: 'Invalid Aadhaar number', 
      message: 'Aadhaar number must be exactly 12 digits',
      provided: aadhar,
      expected_format: '123456789012'
    });
  }

  // ========== STEP 3: CALL TARGET API ==========
  // Target API expects 'exploits' parameter (keeping original endpoint requirement)
  const targetUrl = `https://exploitsindia.site/api/number.php?exploits=${cleanAadhar}`;
  
  console.log(`[${new Date().toISOString()}] Key: ${api_key} | Aadhaar: ${cleanAadhar} | Calling target`);

  try {
    // Fetch with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9'
      },
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    let rawText = await response.text();

    // ========== STEP 4: REMOVE BUY/SUPPORT FOOTER ==========
    const lines = rawText.split(/\r?\n/);
    const filteredLines = [];
    
    for (const line of lines) {
      const lowerLine = line.toLowerCase();
      const isFooterLine = lowerLine.includes('buy api') || 
                          lowerLine.includes('@cyb3rs0ldier') || 
                          (lowerLine.includes('support') && lowerLine.includes('@')) ||
                          (lowerLine.includes('💳') && lowerLine.includes('@')) ||
                          (lowerLine.includes('━━━━') && (lowerLine.includes('buy') || lowerLine.includes('support')));
      
      if (!isFooterLine) {
        filteredLines.push(line);
      }
    }
    
    let cleanedText = filteredLines.join('\n');
    cleanedText = cleanedText.replace(/[\r\n]{3,}/g, '\n\n');
    cleanedText = cleanedText.trim();

    // ========== STEP 5: PARSE TO JSON ==========
    const results = parseAadharResults(cleanedText, cleanAadhar);

    // ========== STEP 6: RETURN JSON RESPONSE ==========
    const jsonResponse = {
      success: true,
      total_results: results.length,
      timestamp: new Date().toISOString(),
      aadhar_number: cleanAadhar,
      results: results,
      developer: "abhay singh"
    };

    console.log(`[${new Date().toISOString()}] Success | Key: ${api_key} | Aadhaar: ${cleanAadhar} | Results: ${results.length}`);
    
    return res.status(200).json(jsonResponse);

  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error:`, error.message);
    
    if (error.name === 'AbortError') {
      return res.status(504).json({ 
        success: false,
        error: 'Gateway Timeout', 
        message: 'Target server did not respond in time. Please try again.'
      });
    }
    
    return res.status(500).json({ 
      success: false,
      error: 'Internal Server Error', 
      message: 'Failed to fetch data from lookup service',
      details: error.message
    });
  }
}

// ============================================================
// PARSER: Converts human-readable text to JSON array
// ============================================================
function parseAadharResults(text, searchedAadhar) {
  const results = [];

  if (!text || text.length < 10) {
    return results;
  }

  // Split into sections
  let sections = [];
  if (text.includes('📌 Additional Result:')) {
    const parts = text.split(/📌\s*Additional\s*Result:/i);
    sections.push(parts[0]);
    for (let i = 1; i < parts.length; i++) {
      sections.push(parts[i]);
    }
  } else {
    sections = [text];
  }

  for (let section of sections) {
    if (!section.trim() || section.trim().length < 15) continue;

    // Extract fields
    const nameMatch = section.match(/👤\s*Name:\s*([^\n\r]+)/i);
    const fatherMatch = section.match(/👨‍👦\s*Father\s*Name:\s*([^\n\r]+)/i);
    const mobileMatch = section.match(/📱\s*Mobile:\s*([^\n\r]+)/i);
    const addressMatch = section.match(/🏠\s*Address:\s*([^\n\r]+(?:\n\s*[^📱👨‍👦👤📡📞🪪]+)*)/i);
    const alternateMatch = section.match(/📞\s*Alternate:\s*([^\n\r]+)/i);
    const aadhaarMatch = section.match(/🪪\s*Aadhaar:\s*([^\n\r]+)/i);
    
    // Fallback without emojis
    const nameMatchFallback = section.match(/Name:\s*([^\n\r]+)/i);
    const fatherMatchFallback = section.match(/Father\s*Name:\s*([^\n\r]+)/i);
    const mobileMatchFallback = section.match(/Mobile:\s*([^\n\r]+)/i);

    const name = nameMatch ? nameMatch[1].trim() : (nameMatchFallback ? nameMatchFallback[1].trim() : null);
    const fname = fatherMatch ? fatherMatch[1].trim() : (fatherMatchFallback ? fatherMatchFallback[1].trim() : null);
    const mobile = mobileMatch ? mobileMatch[1].trim() : (mobileMatchFallback ? mobileMatchFallback[1].trim() : null);
    
    let address = null;
    if (addressMatch) {
      address = addressMatch[1].trim().replace(/\s+/g, ' ');
    }

    let id = null;
    if (aadhaarMatch) {
      id = aadhaarMatch[1].trim();
    } else if (alternateMatch) {
      id = alternateMatch[1].trim();
    }

    if (name || mobile) {
      results.push({
        address: address || null,
        email: null,
        fname: fname || null,
        id: id || null,
        mobile: mobile || null,
        name: name || null
      });
    }
  }

  // Remove duplicates by mobile number
  const seenMobiles = new Set();
  const uniqueResults = [];
  
  for (const result of results) {
    if (result.mobile) {
      if (!seenMobiles.has(result.mobile)) {
        seenMobiles.add(result.mobile);
        uniqueResults.push(result);
      }
    } else {
      uniqueResults.push(result);
    }
  }

  return uniqueResults;
}
