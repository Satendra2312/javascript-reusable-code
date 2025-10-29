//Convert buffer to hex
const bufToHex = (buf) =>
    Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");

// Canonical JSON (sorted keys)
const canonicalJSON = (obj) => {
    if (obj === null) return "null";
    if (Array.isArray(obj)) return `[${obj.map(canonicalJSON).join(",")}]`;
    if (typeof obj === "object") {
        return `{${Object.keys(obj)
            .sort()
            .map((k) => JSON.stringify(k) + ":" + canonicalJSON(obj[k]))
            .join(",")}}`;
    }
    return JSON.stringify(obj);
};

//Concatenate byte arrays
const concatBytes = (...arrays) => {
    const total = arrays.reduce((sum, arr) => sum + arr.length, 0);
    const out = new Uint8Array(total);
    let offset = 0;
    for (const arr of arrays) {
        out.set(arr, offset);
        offset += arr.length;
    }
    return out;
};

// Audit log toggle
const DEBUG = true;
const auditLog = (label, value) => {
    if (DEBUG) console.debug(`[AUDIT] ${label}:`, value);
};

// Derive AES key using HKDF
const deriveAESKeyHKDF = async (secret, salt, info) => {
    const enc = new TextEncoder();
    const baseKey = await crypto.subtle.importKey("raw", enc.encode(secret), "HKDF", false, ["deriveKey"]);
    return crypto.subtle.deriveKey(
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
};

// Encrypt payload using AES-GCM
const encryptPayloadAESGCM = async (canonicalPayload, aesKey, aad) => {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ciphertext = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv, additionalData: aad },
        aesKey,
        new TextEncoder().encode(canonicalPayload)
    );
    return {
        ivHex: bufToHex(iv),
        ciphertextHex: bufToHex(ciphertext),
    };
};

// Generate Secure Package
const generateSecurePackageV1 = async ({
    payload,
    accessKeySecret,
    accessKeyId,
    identifierName,
}) => {
    const enc = new TextEncoder();
    const version = "v1";

    if (!accessKeySecret?.trim()) {
        throw new Error("Missing accessKeySecret: cannot generate HMAC key");
    }

    const canonicalPayload = canonicalJSON(payload);
    const nonce = crypto.randomUUID();
    const timestamp = String(Date.now());
    const aad = enc.encode(`${identifierName}|${timestamp}|${nonce}`);

    // Parallelize inner hash, AES key derivation, and HMAC key import
    const [innerHashBuf, aesKey, hmacKey] = await Promise.all([
        crypto.subtle.digest("SHA-256", enc.encode(canonicalPayload)),
        deriveAESKeyHKDF(accessKeySecret, nonce, "aes-gcm-encryption"),
        crypto.subtle.importKey("raw", enc.encode(accessKeySecret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]),
    ]);

    const innerHashHex = bufToHex(innerHashBuf);
    auditLog("Inner Hash", innerHashHex);
    auditLog("Nonce", nonce);
    auditLog("Timestamp", timestamp);

    const encryption = await encryptPayloadAESGCM(canonicalPayload, aesKey, aad);
    auditLog("IV", encryption.ivHex);
    auditLog("Ciphertext", encryption.ciphertextHex);

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
    const signatureHex = bufToHex(sigBuf);
    auditLog("Signature", signatureHex);

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

    const canonicalPackage = canonicalJSON(packageObject);
    const finalHashBuf = await crypto.subtle.digest("SHA-256", enc.encode(canonicalPackage));
    const finalFingerprintHex = bufToHex(finalHashBuf);
    auditLog("Final Combined Hash", finalFingerprintHex);

    return {
        secure_hash: finalFingerprintHex,
    };
};
