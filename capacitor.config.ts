import { buildCapacitorConfig } from "./src/lib/native/capacitor-config";

// CAPACITOR_SERVER_URL is the deployed site the native shell loads. See README.
export default buildCapacitorConfig(process.env.CAPACITOR_SERVER_URL);
