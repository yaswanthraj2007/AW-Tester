import dns from 'dns/promises';
import net from 'net';
import { config } from '../config/index.js';

const blocked = new net.BlockList();

const V4 = [
  ['0.0.0.0', 8], ['10.0.0.0', 8], ['100.64.0.0', 10], ['127.0.0.0', 8],
  ['169.254.0.0', 16], ['172.16.0.0', 12], ['192.0.0.0', 24], ['192.0.2.0', 24],
  ['192.168.0.0', 16], ['198.18.0.0', 15], ['198.51.100.0', 24], ['203.0.113.0', 24],
  ['224.0.0.0', 4], ['240.0.0.0', 4],
];
const V6 = [
  ['::', 128], ['::1', 128], ['fc00::', 7], ['fe80::', 10], ['ff00::', 8],
  ['64:ff9b::', 96], ['2001:db8::', 32], ['2002::', 16], ['::ffff:0:0', 96],
];
for (const [addr, prefix] of V4) blocked.addSubnet(addr, prefix, 'ipv4');
for (const [addr, prefix] of V6) blocked.addSubnet(addr, prefix, 'ipv6');

// localhost, *.local, *.internal (covers metadata.google.internal), etc.
const BLOCKED_HOSTNAME = /(^|\.)(localhost|local|internal|localdomain|home\.arpa)$/;
const DNS_TIMEOUT_MS = 5000;

export const privateAddressMessage = (host) =>
  `"${host}" points to a private or internal network address, which is not allowed.`;

const isBlockedAddress = (address) => {
  const clean = String(address).split('%')[0]; // drop IPv6 zone id
  const family = net.isIP(clean);
  if (family === 4) return blocked.check(clean, 'ipv4');
  if (family === 6) return blocked.check(clean, 'ipv6');
  return true; // anything unparseable is blocked
};

const lookupWithTimeout = (host) =>
  Promise.race([
    dns.lookup(host, { all: true, verbatim: true }),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('DNS timeout')), DNS_TIMEOUT_MS).unref()
    ),
  ]);

const checkHost = async (host) => {
  // Local development only (ALLOW_PRIVATE_URLS=true). Never enable on a deployed server.
  if (config.allowPrivateUrls) return { ok: true };

  if (BLOCKED_HOSTNAME.test(host)) {
    return { ok: false, code: 'PRIVATE', reason: privateAddressMessage(host) };
  }

  if (net.isIP(host)) {
    return isBlockedAddress(host)
      ? { ok: false, code: 'PRIVATE', reason: privateAddressMessage(host) }
      : { ok: true };
  }

  let records;
  try {
    records = await lookupWithTimeout(host);
  } catch {
    return { ok: false, code: 'DNS', reason: `Could not resolve "${host}"` };
  }

  if (!records.length || records.some((r) => isBlockedAddress(r.address))) {
    return { ok: false, code: 'PRIVATE', reason: privateAddressMessage(host) };
  }
  return { ok: true };
};

const parseHttpUrl = (value) => {
  let url;
  try {
    url = new URL(value);
  } catch {
    return { error: { ok: false, code: 'INVALID', reason: 'Invalid URL' } };
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return { error: { ok: false, code: 'PROTOCOL', reason: 'Only http and https URLs are allowed' } };
  }
  if (url.username || url.password) {
    return { error: { ok: false, code: 'CREDENTIALS', reason: 'URLs with credentials are not allowed' } };
  }
  const host = url.hostname.replace(/^\[|\]$/g, '').replace(/\.$/, '').toLowerCase();
  return { host };
};

// One-off check (used when saving workflows and starting quick tests)
export const checkUrl = async (value) => {
  const { host, error } = parseHttpUrl(value);
  if (error) return error;
  return { ...(await checkHost(host)), host };
};

// Per-run guard. Caches the verdict per hostname so a run makes consistent
// decisions and does not repeat DNS lookups for every subresource.
export const createUrlGuard = () => {
  const cache = new Map();
  return {
    check: async (value) => {
      const { host, error } = parseHttpUrl(value);
      if (error) return error;
      if (!cache.has(host)) cache.set(host, checkHost(host));
      return { ...(await cache.get(host)), host };
    },
  };
};