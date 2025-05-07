import dotenv from "dotenv";
dotenv.config();

export const ENV = {
  PORT: process.env.PORT || 3000,
  APP_NAME: process.env.APP_NAME || "App",
};
