import { createApp } from "./app.js";
import { getConfig } from "./config.js";

const config = getConfig();
const app = createApp({ config });

app.listen(config.port, "0.0.0.0", () => {
  console.log(`${config.serviceName} listening on port ${config.port}`);
});
