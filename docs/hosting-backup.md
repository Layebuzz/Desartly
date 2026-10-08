# Vercel primary, Cloudflare standby

Normal traffic must continue directly to Vercel. Do not put a Cloudflare proxy in front of normal production traffic, and do not add a project subdomain for testing.

Both providers build the same GitHub `main` commit independently. Completion times differ; check both provider statuses before switching. `npm run build` creates the public shell, Studio bundle, and pruned assets. Legacy and CMS media remain in ParsPack. Cloudflare renders public HTML directly from its ASSETS binding and published D1 data; it does not request pages from Vercel. `X-Desartly-Host: cloudflare` identifies rendered fallback pages. Authentication and writes retain the existing handlers and are never replayed by fallback logic.

## Current state (2026-10-09)

- Authoritative DNS: ns1.vercel-dns.com, ns2.vercel-dns.com.
- www CNAME: 8ec074e6fa0fe981.vercel-dns-017.com (TTL observed: 60 seconds).
- Cloudflare account rejects adding desartly.info: “You are not allowed to create new zones at this time.” No zone or production DNS changes were made.
- Standby service: https://desartly.layebuzz.workers.dev (an existing provider URL, not a new project subdomain).
- This is a prepared standalone service, not an activated same-domain failover configuration.

## Complete domain setup after the account restriction is resolved

1. Add the existing domain to Cloudflare on an appropriate plan. Export the complete current Vercel DNS zone first. Copy all A/AAAA/CNAME/MX/TXT/CAA/SRV records, including mail, verification, booking and Studio. An automatic scan alone is not a complete inventory.
2. Keep Vercel web records **DNS only**. Preserve mail records as DNS only. Verify the complete record set before replacing registrar nameservers. Do not disable DNSSEC blindly; coordinate any DS/zone signing migration to avoid validation failures.
3. Obtain Cloudflare's assigned nameservers, update them at the registrar, and verify delegation and all services. This changes DNS management, not the normal Vercel hosting path.
4. Create exact Worker routes for the existing web hosts that should be eligible for fallback (root, www, Studio, booking), assigned to desartly. These routes activate only when the corresponding DNS record is proxied. Keep records DNS only during normal operation.
5. Confirm an active certificate covering every hostname before switching. Test the Worker with the actual production Host using a controlled origin override, including entry pages, asset paths, authenticated redirects and booking reads. Do not create real bookings or resend forms as a test.

## Manual incident switch (only after all setup steps)

- Confirm that Vercel is the failed dependency and that the Cloudflare build is healthy/current.
- Enable proxying for the prepared exact web records. The configured Worker routes serve local assets and D1 content instead of fetching the Vercel origin. DNS resolver caches mean the switch is not instantaneous.
- Check the public pages, `X-Desartly-Host`, static/CMS media, private login redirects and booking availability. Preserve POST semantics; do not retry a user's write automatically.
- On Vercel recovery, verify production then return these records to DNS only. Keep record targets pointing to the verified Vercel values throughout.

Do not switch nameservers during an outage as the normal failover method. Do not point an arbitrary DNS CNAME at workers.dev and assume custom-host TLS/routing is configured. No automatic traffic monitor or automatic failover has been enabled.
