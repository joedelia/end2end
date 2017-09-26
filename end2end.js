export function isAvailable() {
  return typeof window.crypto !== 'undefined' && (typeof window.crypto.subtle !== 'undefined' || typeof window.crypto.webkitSubtle !== 'undefined');
}

export async function generateKeys() {
  const {publicKey, privateKey} = await window.crypto.subtle.generateKey(
    {
      name: 'RSA-OAEP',
      modulusLength: 2048,
      publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
      hash: {name: 'SHA-256'}
    },
    true,
    ['encrypt', 'decrypt']
  );

  return {publicKey, privateKey};
}

export async function encodePublicKey(publicKey) {
  const encodedPublicKey = await window.crypto.subtle.exportKey(
    'jwk',
    publicKey
  );
  return JSON.stringify(encodedPublicKey);
}

export async function decodeKey(encodedPublicKey) {
  return await window.crypto.subtle.importKey(
    'jwk',
    JSON.parse(encodedPublicKey),
    {
      name: 'RSA-OAEP',
      hash: {name: 'SHA-256'}
    },
    false,
    ['encrypt']
  );
}

export async function encrypt(object, publicKey) {
  const uint8Array = await window.crypto.subtle.encrypt(
    {
      name: 'RSA-OAEP'
    },
      publicKey,
      new TextEncoder('utf-8').encode(JSON.stringify(object))
  );
  return arrayBufferToBase64(uint8Array);
}

export async function decrypt(encrypted, privateKey) {
  const uint8Array = await window.crypto.subtle.decrypt(
    {
      name: 'RSA-OAEP'
    },
    privateKey,
    base64ToArrayBuffer(encrypted)
  );
  return JSON.parse(new TextDecoder('utf-8').decode(uint8Array));
}

function arrayBufferToBase64(arrayBuffer) {
  var base64 = '';
  var encodings = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

  var bytes = new Uint8Array(arrayBuffer);
  var byteLength = bytes.byteLength;
  var byteRemainder = byteLength % 3;
  var mainLength = byteLength - byteRemainder;

  var a, b, c, d,
    chunk;

  // Main loop deals with bytes in chunks of 3
  for (var i = 0; i < mainLength; i += 3) {
    // Combine the three bytes into a single integer
    chunk = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2];

    // Use bitmasks to extract 6-bit segments from the triplet
    a = (chunk & 16515072) >> 18; // 16515072 = (2^6 - 1) << 18
    b = (chunk & 258048) >> 12; // 258048   = (2^6 - 1) << 12
    c = (chunk & 4032) >> 6; // 4032     = (2^6 - 1) << 6
    d = chunk & 63;               // 63       = 2^6 - 1

    // Convert the raw binary segments to the appropriate ASCII encoding
    base64 += encodings[a] + encodings[b] + encodings[c] + encodings[d];
  }

  // Deal with the remaining bytes and padding
  if (byteRemainder === 1) {
    chunk = bytes[mainLength];

    a = (chunk & 252) >> 2; // 252 = (2^6 - 1) << 2

    // Set the 4 least significant bits to zero
    b = (chunk & 3) << 4; // 3   = 2^2 - 1

    base64 += encodings[a] + encodings[b] + '==';
  } else if (byteRemainder === 2) {
    chunk = (bytes[mainLength] << 8) | bytes[mainLength + 1];

    a = (chunk & 64512) >> 10; // 64512 = (2^6 - 1) << 10
    b = (chunk & 1008) >> 4; // 1008  = (2^6 - 1) << 4

    // Set the 2 least significant bits to zero
    c = (chunk & 15) << 2; // 15    = 2^4 - 1

    base64 += encodings[a] + encodings[b] + encodings[c] + '=';
  }

  return base64;
}

const _keyStr = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';

function base64ToArrayBuffer(input) {
  input = removePaddingChars(input);
  input = removePaddingChars(input);

  var bytes = parseInt((input.length / 4) * 3, 10);

  var uarray,
    chr1, chr2, chr3,
    enc1, enc2, enc3, enc4;
  var i = 0;
  var j = 0;

  uarray = new Uint8Array(bytes);

  input = input.replace(/[^A-Za-z0-9+/=]/g, '');

  for (i = 0; i < bytes; i += 3) {
    // get the 3 octects in 4 ascii chars
    enc1 = _keyStr.indexOf(input.charAt(j++));
    enc2 = _keyStr.indexOf(input.charAt(j++));
    enc3 = _keyStr.indexOf(input.charAt(j++));
    enc4 = _keyStr.indexOf(input.charAt(j++));

    chr1 = (enc1 << 2) | (enc2 >> 4);
    chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
    chr3 = ((enc3 & 3) << 6) | enc4;

    uarray[i] = chr1;
    if (enc3 !== 64) uarray[i + 1] = chr2;
    if (enc4 !== 64) uarray[i + 2] = chr3;
  }

  return uarray;
}

function removePaddingChars(input) {
  var lkey = _keyStr.indexOf(input.charAt(input.length - 1));
  if (lkey === 64)
    return input.substring(0, input.length - 1);

  return input;
}
