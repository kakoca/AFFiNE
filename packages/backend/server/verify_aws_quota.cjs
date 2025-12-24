
const fs = require('fs');
const path = require('path');
const https = require('https');
const crypto = require('crypto');

// 1. Load .env manually
const envPath = path.join(__dirname, '../../../.docker/dev/.env');
console.log(`Loading env from: ${envPath}`);

if (!fs.existsSync(envPath)) {
    console.error("ERROR: .env file not found!");
    process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
        const key = parts[0].trim();
        const val = parts.slice(1).join('=').trim().replace(/^["']|["']$/g, '');
        if (key && !key.startsWith('#')) {
            env[key] = val;
        }
    }
});

const ACCESS_KEY = env.AWS_ACCESS_KEY_ID;
const SECRET_KEY = env.AWS_SECRET_ACCESS_KEY;
const REGION = env.AWS_REGION_NAME || 'us-east-1';
const SERVICE = 'bedrock';
const HOST = `bedrock-runtime.${REGION}.amazonaws.com`;
const ENDPOINT = `https://${HOST}/`;

if (!ACCESS_KEY || !SECRET_KEY) {
    console.error("ERROR: AWS Credentials not found in .env");
    console.log("Found keys:", Object.keys(env));
    process.exit(1);
}

console.log(`Using Key ID: ${ACCESS_KEY ? ACCESS_KEY.substring(0, 5) + '...' : 'UNKNOWN'}`);
console.log(`Region: ${REGION}`);

// 2. Helper for SigV4
function sign(key, msg) {
    return crypto.createHmac('sha256', key).update(msg).digest();
}

function getSignatureKey(key, dateStamp, regionName, serviceName) {
    const kDate = sign('AWS4' + key, dateStamp);
    const kRegion = sign(kDate, regionName);
    const kService = sign(kRegion, serviceName);
    const kSigning = sign(kService, 'aws4_request');
    return kSigning;
}

// 3. Call Bedrock InvokeModel (Minimal test)
function callBedrock() {
    const modelId = 'anthropic.claude-3-haiku-20240307-v1:0';
    const method = 'POST';
    const canonicalUri = `/model/${modelId}/invoke`;
    const canonicalQuerystring = '';

    const body = JSON.stringify({
        anthropic_version: "bedrock-2023-05-31",
        max_tokens: 1,
        messages: [{ role: "user", content: "hi" }]
    });
    const payload = body;

    const now = new Date();
    const amzDate = now.toISOString().replace(/[:\-]|\.\d{3}/g, '');
    const dateStamp = amzDate.substring(0, 8);

    const canonicalHeaders = `host:${HOST}\nx-amz-date:${amzDate}\n`;
    const signedHeaders = 'host;x-amz-date';
    const payloadHash = crypto.createHash('sha256').update(payload).digest('hex');
    const canonicalRequest = `${method}\n${canonicalUri}\n${canonicalQuerystring}\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`;

    // Note: Signing service name usually matches the endpoint prefix, but for Bedrock Runtime it is strictly 'bedrock'?
    // Documentation says "The service name for signing requests is bedrock." even for runtime.
    // Let's stick with 'bedrock' as SERVICE constant above.

    const algorithm = 'AWS4-HMAC-SHA256';
    const credentialScope = `${dateStamp}/${REGION}/${SERVICE}/aws4_request`;
    const stringToSign = `${algorithm}\n${amzDate}\n${credentialScope}\n${crypto.createHash('sha256').update(canonicalRequest).digest('hex')}`;

    const signingKey = getSignatureKey(SECRET_KEY, dateStamp, REGION, SERVICE);
    const signature = crypto.createHmac('sha256', signingKey).update(stringToSign).digest('hex');
    const authorizationHeader = `${algorithm} Credential=${ACCESS_KEY}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

    const options = {
        hostname: HOST,
        path: canonicalUri,
        method: method,
        headers: {
            'Content-Type': 'application/json',
            'X-Amz-Date': amzDate,
            'Authorization': authorizationHeader
        }
    };

    const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
            console.log('\n--- Bedrock Runtime Response ---');
            console.log(`Status: ${res.statusCode}`);
            if (res.statusCode === 200) {
                console.log("Success! Model invoked.");
            } else {
                console.log("Error body:", data);
            }
        });
    });

    req.on('error', (e) => {
        console.error('Bedrock Request Error:', e);
    });

    req.write(payload);
    req.end();
}

callBedrock();
