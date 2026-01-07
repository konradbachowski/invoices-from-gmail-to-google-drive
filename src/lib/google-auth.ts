import { google } from "googleapis";
import fs from "fs/promises";
import path from "path";

const TOKEN_PATH = path.join(process.cwd(), "tokens", "google_token.json");

export async function getGoogleAuth() {
  const client_id = process.env.GOOGLE_CLIENT_ID;
  const client_secret = process.env.GOOGLE_CLIENT_SECRET;
  
  // Use "urn:ietf:wg:oauth:2.0:oob" for CLI scripts or "http://localhost" for local dev
  const oauth2Client = new google.auth.OAuth2(client_id, client_secret, "http://localhost");

  try {
    const token = await fs.readFile(TOKEN_PATH, "utf8");
    oauth2Client.setCredentials(JSON.parse(token));
    return oauth2Client;
  } catch (e) {
    throw new Error("Google Auth Token Missing. Please generate it using the setup script.");
  }
}
