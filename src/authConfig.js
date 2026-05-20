export const msalConfig = {
  auth: {
    clientId: "dab70198-85e1-428d-97de-e6bfa0e5d8e1",
    authority: "https://login.microsoftonline.com/c3e32f53-cb7f-4809-968d-1cc4ccc785fe",
    redirectUri: "http://localhost:3000/auth",
  },
  cache: {
    cacheLocation: "sessionStorage",
    storeAuthStateInCookie: false,
  },
};

export const loginRequest = {
  scopes: ["User.Read"],
};