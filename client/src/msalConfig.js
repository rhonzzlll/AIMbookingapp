export const msalConfig = {
  auth: {
    clientId: "YOUR_CLIENT_ID", // Replace with your Azure AD App client ID
    authority: "https://login.microsoftonline.com/common",
    redirectUri: "http://localhost:3000", // Or your deployed URL
  },
};