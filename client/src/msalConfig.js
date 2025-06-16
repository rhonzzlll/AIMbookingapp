import { PublicClientApplication } from "@azure/msal-browser";

export const msalConfig = {
  auth: {
    clientId: "c1f688aa-ec46-42be-937a-3a020e6a6524",
    authority: "https://login.microsoftonline.com/22ca3d67-8165-476e-b918-4b2e31e047ba",
    redirectUri: "http://localhost:5173",
  },
};

export const msalInstance = new PublicClientApplication(msalConfig);