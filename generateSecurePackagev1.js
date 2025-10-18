// Convert buffer to hex
async function bufToHex(buf) {
    return Array.from(new Uint8Array(buf))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
}

// Canonical JSON (sorted keys)
function canonicalJSON(obj) {
    if (obj === null) return "null";
    if (Array.isArray(obj)) return `[${obj.map(canonicalJSON).join(",")}]`;
    if (typeof obj === "object") {
        return `{${Object.keys(obj)
            .sort()
            .map((k) => JSON.stringify(k) + ":" + canonicalJSON(obj[k]))
            .join(",")}}`;
    }
    return JSON.stringify(obj);
}

// Concatenate multiple byte arrays
function concatBytes(...arrays) {
    const total = arrays.reduce((sum, arr) => sum + arr.length, 0);
    const out = new Uint8Array(total);
    let offset = 0;
    for (const arr of arrays) {
        out.set(arr, offset);
        offset += arr.length;
    }
    return out;
}

// Audit log hook
function auditLog(label, value) {
    console.debug(`[AUDIT] ${label}:`, value);
}

// Derive AES key using HKDF
async function deriveAESKeyHKDF(secret, salt, info) {
    const enc = new TextEncoder();
    const baseKey = await crypto.subtle.importKey(
        "raw",
        enc.encode(secret),
        "HKDF",
        false,
        ["deriveKey"]
    );
    return await crypto.subtle.deriveKey(
        {
            name: "HKDF",
            hash: "SHA-256",
            salt: enc.encode(salt),
            info: enc.encode(info),
        },
        baseKey,
        { name: "AES-GCM", length: 256 },
        false,
        ["encrypt"]
    );
}

// Encrypt payload using AES-GCM with additional authenticated data
async function encryptPayloadAESGCM(payload, aesKey, aad) {
    const enc = new TextEncoder();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ciphertext = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv, additionalData: aad },
        aesKey,
        enc.encode(JSON.stringify(payload))
    );
    return {
        ivHex: await bufToHex(iv),
        ciphertextHex: await bufToHex(ciphertext),
    };
}

// Generate secure package and return final hash
async function generateSecurePackageV1({
    payload,
    accessKeySecret,
    accessKeyId,
    identifierName,
}) {
    const enc = new TextEncoder();
    const version = "v1";

    if (!accessKeySecret || accessKeySecret.trim() === "") {
        throw new Error("Missing accessKeySecret: cannot generate HMAC key");
    }

    const canonicalPayload = canonicalJSON(payload);

    // Inner hash of canonical payload
    const innerHashBuf = await crypto.subtle.digest(
        "SHA-256",
        enc.encode(canonicalPayload)
    );
    const innerHashHex = await bufToHex(innerHashBuf);
    auditLog("Inner Hash", innerHashHex);

    // Nonce and timestamp
    const nonce = crypto.randomUUID();
    const timestamp = String(Date.now());
    auditLog("Nonce", nonce);
    auditLog("Timestamp", timestamp);

    // Derive AES key
    const aesKey = await deriveAESKeyHKDF(
        accessKeySecret,
        nonce,
        "aes-gcm-encryption"
    );

    // Encrypt payload with AAD
    const aad = enc.encode(`${identifierName}|${timestamp}|${nonce}`);
    const encryption = await encryptPayloadAESGCM(payload, aesKey, aad);
    auditLog("IV", encryption.ivHex);
    auditLog("Ciphertext", encryption.ciphertextHex);

    // HMAC signing
    const hmacKey = await crypto.subtle.importKey(
        "raw",
        enc.encode(accessKeySecret),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"]
    );

    const signData = concatBytes(
        enc.encode(version),
        enc.encode("|"),
        enc.encode(identifierName),
        enc.encode("|"),
        enc.encode(timestamp),
        enc.encode("|"),
        enc.encode(nonce),
        enc.encode("|"),
        enc.encode(innerHashHex),
        enc.encode("|"),
        enc.encode(accessKeyId)
    );

    const sigBuf = await crypto.subtle.sign("HMAC", hmacKey, signData);
    const signatureHex = await bufToHex(sigBuf);
    auditLog("Signature", signatureHex);

    // Build package object
    const packageObject = {
        version,
        identifier: identifierName,
        access_key_id: accessKeyId,
        hash: innerHashHex,
        nonce,
        timestamp,
        signature: signatureHex,
        encryption,
    };

    // Final hash of full package + canonical string
    const canonicalPackage = canonicalJSON(packageObject);
    const fullBundle = {
        package: packageObject,
        canonical: canonicalPackage,
    };

    const bundleString = canonicalJSON(fullBundle);
    const finalHashBuf = await crypto.subtle.digest(
        "SHA-256",
        enc.encode(bundleString)
    );
    const finalFingerprintHex = await bufToHex(finalHashBuf);
    auditLog("Final Combined Hash", finalFingerprintHex);

    return {
        secure_hash: finalFingerprintHex,
    };
}

//Call This
// const securePackage = await generateSecurePackageV1({
//         payload: data,
//         accessKeySecret: secretKey,
//         accessKeyId: payment_token_id,
//         identifierName,
//     });
