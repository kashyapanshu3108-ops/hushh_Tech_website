export function renderLabPage() {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Hushh Deep Intelligence Lab</title>
    <style>
      :root {
        color-scheme: light;
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        background: #f7f7f4;
        color: #191a1c;
      }

      * { box-sizing: border-box; }

      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        padding: 24px;
      }

      main {
        width: min(760px, 100%);
        display: grid;
        gap: 18px;
      }

      h1 {
        margin: 0;
        font-size: clamp(30px, 7vw, 56px);
        line-height: 0.98;
        font-weight: 760;
      }

      form, section {
        background: #ffffff;
        border: 1px solid #deded7;
        border-radius: 8px;
        padding: 18px;
        box-shadow: 0 12px 30px rgba(25, 26, 28, 0.08);
      }

      label {
        display: grid;
        gap: 8px;
        font-size: 14px;
        font-weight: 650;
      }

      input {
        width: 100%;
        min-height: 48px;
        border: 1px solid #b8bab2;
        border-radius: 6px;
        padding: 0 14px;
        font: inherit;
        font-size: 16px;
      }

      button {
        min-height: 48px;
        border: 0;
        border-radius: 6px;
        padding: 0 18px;
        font: inherit;
        font-weight: 720;
        color: #fff;
        background: #135d66;
        cursor: pointer;
      }

      button:disabled {
        cursor: wait;
        opacity: 0.68;
      }

      .row {
        display: grid;
        grid-template-columns: 1fr auto;
        gap: 12px;
        align-items: end;
      }

      .status {
        margin: 0;
        color: #4b4f50;
        min-height: 22px;
      }

      pre {
        white-space: pre-wrap;
        word-break: break-word;
        margin: 0;
        background: #101415;
        color: #eef5ef;
        border-radius: 8px;
        padding: 16px;
        max-height: 420px;
        overflow: auto;
      }

      @media (max-width: 620px) {
        .row { grid-template-columns: 1fr; }
        button { width: 100%; }
      }
    </style>
  </head>
  <body>
    <main>
      <h1>Deep Intelligence Lab</h1>
      <form id="lab-form">
        <div class="row">
          <label>
            Name
            <input id="name" name="name" autocomplete="name" placeholder="Enter your name" required />
          </label>
          <button id="submit" type="submit">Use Location & Run</button>
        </div>
      </form>
      <p id="status" class="status"></p>
      <section>
        <pre id="output">Result will appear here.</pre>
      </section>
    </main>

    <script>
      const form = document.querySelector("#lab-form");
      const nameInput = document.querySelector("#name");
      const submit = document.querySelector("#submit");
      const statusEl = document.querySelector("#status");
      const output = document.querySelector("#output");

      const setStatus = (text) => { statusEl.textContent = text; };
      const showJson = (value) => { output.textContent = JSON.stringify(value, null, 2); };

      async function getPermissionState() {
        try {
          if (!navigator.permissions?.query) return "prompt";
          const result = await navigator.permissions.query({ name: "geolocation" });
          return result.state || "prompt";
        } catch {
          return "prompt";
        }
      }

      function browserLocationFallback(reason) {
        return {
          browserLocation: null,
          warning: reason || "Browser location was unavailable, so the API will use approximate web location.",
        };
      }

      async function getBrowserLocation() {
        if (!navigator.geolocation) {
          return browserLocationFallback("This browser does not expose web geolocation; using approximate location.");
        }

        if (!window.isSecureContext) {
          return browserLocationFallback("Web geolocation needs HTTPS or localhost; using approximate location.");
        }

        const permissionState = await getPermissionState();
        if (permissionState === "denied") {
          return browserLocationFallback("Browser location is blocked in site settings; using approximate location.");
        }

        return new Promise((resolve) => {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              resolve({
                browserLocation: {
                  latitude: position.coords.latitude,
                  longitude: position.coords.longitude,
                },
                warning: "",
              });
            },
            (error) => {
              const reason =
                error?.code === 1
                  ? "Location permission was denied; using approximate location."
                  : "Browser location was unavailable; using approximate location.";
              resolve(browserLocationFallback(reason));
            },
            { enableHighAccuracy: true, timeout: 20000, maximumAge: 60000 },
          );
        });
      }

      async function poll(jobId) {
        while (true) {
          await new Promise((resolve) => setTimeout(resolve, 7000));
          const response = await fetch("/lab/intelligence/reports/" + encodeURIComponent(jobId));
          const body = await response.json();
          showJson(body);

          if (body.status === "completed" || body.status === "failed" || body.status === "cancelled") {
            setStatus(body.status === "completed" ? "Completed." : "Stopped: " + body.status);
            return;
          }

          setStatus("Research is still running. Polling every 7 seconds...");
        }
      }

      form.addEventListener("submit", async (event) => {
        event.preventDefault();
        submit.disabled = true;
        output.textContent = "Starting...";

        try {
          setStatus("Requesting web location permission...");
          const locationResult = await getBrowserLocation();
          setStatus(locationResult.warning || "Location received. Starting Deep Research job...");

          const response = await fetch("/lab/intelligence/reports", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: nameInput.value,
              browserLocation: locationResult.browserLocation,
              browserContext: {
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "",
                locale: navigator.language || "",
                locationWarning: locationResult.warning || "",
              },
            }),
          });
          const body = await response.json();
          showJson(body);

          if (!response.ok) {
            setStatus(body?.error?.message || "Could not start the report.");
            return;
          }

          setStatus("Job started. Deep Research can take a few minutes.");
          await poll(body.jobId);
        } catch (error) {
          setStatus(error.message || "Something went wrong.");
          output.textContent = String(error.message || error);
        } finally {
          submit.disabled = false;
        }
      });
    </script>
  </body>
</html>`;
}
