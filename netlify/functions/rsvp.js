// Guard the require so a missing/failed dependency produces a clear diagnostic
// message instead of crashing the function before it can even respond.
let getStore = null;
let blobsLoadError = null;
try {
  ({ getStore } = require("@netlify/blobs"));
} catch (err) {
  blobsLoadError = err && err.message ? err.message : String(err);
}

// Same 200 codes as on the site. Keep this list in sync with the validCodes
// array in index.html if you ever regenerate codes.
const validCodes = ["2SCD4J", "3GP8BA", "45HCHU", "4C6PGZ", "4DCLV7", "4GG3AU", "4QUU4G", "559TEM", "55RW46", "5JF3AN", "5PUK9N", "5UZ75R", "62646F", "63PCYB", "6CTK2B", "6LJTP3", "6QRN58", "7EGU7X", "7WVLEL", "7YMYQZ", "7ZWSQY", "8JLBHZ", "9NECN5", "9WGQWR", "9XE595", "A326XW", "AAYBVL", "ATV6L6", "AUVU49", "AWGBRX", "B3PQR3", "BE7GMS", "BGKEHN", "BL9W83", "BMARG4", "BPAHAG", "BWSP3X", "BX33UX", "C6XALV", "CACWDD", "CBCJMF", "CBJG8F", "CDJ3AE", "CH6C7X", "CHX56M", "CNWFXB", "CUA7MU", "D5GFJ7", "D6K4MF", "DCWZWX", "DETPE8", "DGXG5Y", "DMKYTF", "DQHYH9", "DWZRCX", "E9GRLX", "EC4VLU", "ED26P6", "EE69VJ", "EEHXK3", "ES87ET", "EU37EQ", "EZVGD4", "F6N4NB", "FDKU7W", "FST3YV", "FWUWDG", "G79VXQ", "G9FUVV", "G9GJ5H", "GAPAUL", "GC495N", "GMTHQ3", "GP6B4J", "GXE5T5", "H3WKZ7", "H692C5", "H6FUHL", "HEQU6Z", "HFD2Y3", "HK246Y", "HKU8NR", "HLGHLW", "HRJAEM", "HVHLVF", "HZBGVA", "JARMBC", "JDE3QK", "JGV7V4", "JJDFU9", "JKDQZZ", "JKXPLY", "JPAFK3", "JQTQT4", "JRX3FS", "K342F8", "KANJZG", "KFEWB9", "KGBZ5H", "KKVM6B", "KMRUPZ", "KPXCV9", "KRMDFQ", "KRWZ2H", "KVR4ZE", "KZ6SBL", "L4RRYQ", "LEYX5P", "LHT7QH", "LJJ555", "LKWHGR", "LR8YAT", "LWK4NK", "M4XZ78", "MGSDY6", "MK2DUB", "MRXHSW", "MYS7FB", "N2DE5W", "N6272N", "N7Z3K6", "NCMY72", "NXRGVV", "NY5GU8", "P5L4WW", "P5N9JA", "P5UMXZ", "PC6V93", "PCK3Y5", "PELPES", "PPT353", "PWPHQ2", "PXJE9L", "Q5WR2U", "QLGHJP", "QVUJ8L", "QX8NW7", "R64FM9", "RCUUE8", "RE8BGZ", "RSBAM6", "RTFUH3", "RXL6TQ", "S5XYVL", "S82RB2", "SGYJ5Q", "SSB9BG", "TCFY55", "TCZ79V", "TEB2SF", "TJB966", "TVTDPD", "TVWATL", "U3J49S", "UB5ZAG", "UELCVC", "UK4QUR", "UKH2GR", "UPCJVS", "UQ62MC", "UZF6PD", "UZZZRS", "V3N2MP", "V58VFS", "VDB6DN", "VLJ5EE", "VXQWHG", "WABKFU", "WCEZPN", "WFSTEK", "WKXCN3", "WLY3KE", "WWCXWD", "WXFQR3", "X3W346", "X5XKPZ", "XBNV6E", "XC3LQJ", "XD5HGM", "XFFJZ5", "XKUXRF", "XLEJ2X", "XSS6D4", "XWV6D5", "XXWDP6", "Y2AYZK", "YCCTQN", "YFBK6U", "YLCWSL", "YPWSHW", "YSUATZ", "YX4Y67", "YYZDDR", "Z32GVL", "Z4254H", "Z4VKRN", "ZDQDTU", "ZEWC2H", "ZF2G3Y", "ZFBUUN"];

// Your Formspree endpoint (same one used elsewhere on the site).
const FORMSPREE_ENDPOINT = "https://formspree.io/f/xlgyvngg";

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "method_not_allowed" }) };
  }

  // Everything below is wrapped so ANY unexpected exception (Blobs, JSON, etc.)
  // comes back as a readable JSON message instead of Netlify's generic 502 page.
  try {
    if (blobsLoadError) {
      return {
        statusCode: 500,
        body: JSON.stringify({
          error: "blobs_load_failed",
          message: "Server misconfiguration: the storage module failed to load.",
          debug: blobsLoadError
        })
      };
    }

    let body;
    try {
      body = JSON.parse(event.body || "{}");
    } catch (err) {
      return { statusCode: 400, body: JSON.stringify({ error: "invalid_request", message: "Malformed request." }) };
    }

    const code = String(body.code || "").trim().toUpperCase();

    if (!code || !validCodes.includes(code)) {
      return {
        statusCode: 403,
        body: JSON.stringify({ error: "invalid_code", message: "This invite code isn't recognised." })
      };
    }

    const store = getStore("used-invite-codes");
    const existing = await store.get(code);

    if (existing) {
      return {
        statusCode: 409,
        body: JSON.stringify({ error: "already_used", message: "This invite link has already been used to RSVP." })
      };
    }

    // Mark the code used up front to close the window for two near-simultaneous submissions.
    await store.set(code, new Date().toISOString());

    const fields = body.fields && typeof body.fields === "object" ? body.fields : {};
    const formData = new URLSearchParams();
    Object.entries(fields).forEach(([key, value]) => formData.append(key, value));
    formData.append("Invite Code", code);
    formData.append("_subject", "New Wedding RSVP - Taiwo & Kehinde");

    try {
      const resp = await fetch(FORMSPREE_ENDPOINT, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/x-www-form-urlencoded",
          // Some Formspree spam protections check these to confirm the request
          // looks like it came from the site itself rather than an anonymous server.
          Referer: "https://twinflame2027.netlify.app/",
          Origin: "https://twinflame2027.netlify.app"
        },
        body: formData.toString()
      });

      if (!resp.ok) {
        // Formspree failed through no fault of the guest — free up the code again.
        await store.delete(code);
        let detail = "";
        try { detail = await resp.text(); } catch (e) {}
        return {
          statusCode: 502,
          body: JSON.stringify({
            error: "formspree_failed",
            message: `Could not submit right now (Formspree returned ${resp.status}). Please try again shortly.`,
            debug: detail.slice(0, 500)
          })
        };
      }
    } catch (err) {
      await store.delete(code);
      return {
        statusCode: 502,
        body: JSON.stringify({
          error: "network_error",
          message: "Could not reach Formspree. Please try again shortly.",
          debug: String(err && err.message)
        })
      };
    }

    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (err) {
    // Catch-all for anything unexpected (e.g. Blobs store not provisioned for this site).
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "unexpected_error",
        message: "Something failed on the server. Debug info attached.",
        debug: String(err && err.stack ? err.stack : err)
      })
    };
  }
};
