import { google } from "googleapis";
import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";
import { Readable } from "stream";
import { getGoogleAuth } from "./lib/google-auth";
import { createClient } from "@supabase/supabase-js";
import { readPdfText } from "pdf-text-reader";

export async function processInvoices() {
  const auth = await getGoogleAuth();
  const gmail = google.gmail({ version: "v1", auth });
  const drive = google.drive({ version: "v3", auth });

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!
  );

  const openrouter = createOpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: process.env.OPENROUTER_API_KEY,
  });

  const ROOT_FOLDER_ID = process.env.GDRIVE_ROOT_FOLDER_ID;
  const TARGET_EMAIL = process.env.WATCH_EMAIL_ADDRESS;

  console.log(`🔍 Checking emails for ${TARGET_EMAIL}...`);

  const labelsRes = await gmail.users.labels.list({ userId: "me" });
  const processedLabel = labelsRes.data.labels?.find(l => l.name?.toLowerCase() === "processed");
  
  if (!processedLabel) {
    throw new Error("Label 'processed' not found in Gmail. Please create it first.");
  }

  const res = await gmail.users.messages.list({
    userId: "me",
    q: `to:${TARGET_EMAIL} has:attachment -label:${processedLabel.name}`,
  });

  if (!res.data.messages || res.data.messages.length === 0) {
    console.log("✅ No new invoices found.");
    return;
  }

  for (const msg of res.data.messages) {
    const message = await gmail.users.messages.get({ userId: "me", id: msg.id! });
    const parts = message.data.payload?.parts || [];

    for (const part of parts) {
      if (part.filename && part.body?.attachmentId) {
        const attachment = await gmail.users.messages.attachments.get({
          userId: "me",
          messageId: msg.id!,
          id: part.body.attachmentId,
        });

        const base64Data = attachment.data.data!.replace(/-/g, '+').replace(/_/g, '/');
        const buffer = Buffer.from(base64Data, "base64");
        let textContent = "";

        if (part.mimeType === "application/pdf") {
          try {
            textContent = await readPdfText({ data: new Uint8Array(buffer) });
          } catch (err) {
            console.error("❌ PDF Parsing error:", err);
            continue;
          }
        }

        if (!textContent) continue;

        const { text } = await generateText({
          model: openrouter(process.env.AI_MODEL || "google/gemini-2.0-flash-exp:free"),
          messages: [
            {
              role: "user",
              content: `You are an accountant. Extract data from this invoice text: vendor (name), nip (tax id), date (YYYY-MM-DD), amount (total gross - number), currency (3-letter code). Return ONLY JSON.\n\nINVOICE TEXT:\n${textContent}`
            }
          ],
        });

        try {
          const cleanJson = text.replace(/```json|```/g, "").trim();
          const data = JSON.parse(cleanJson);
          
          let targetFolderId = ROOT_FOLDER_ID;
          if (data.date && ROOT_FOLDER_ID) {
            const folderName = data.date.substring(0, 7);
            const searchRes = await drive.files.list({
              q: `name = '${folderName}' and '${ROOT_FOLDER_ID}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
            });

            if (searchRes.data.files?.length) {
              targetFolderId = searchRes.data.files[0].id!;
            } else {
              const folderRes = await drive.files.create({
                requestBody: { name: folderName, mimeType: 'application/vnd.google-apps.folder', parents: [ROOT_FOLDER_ID] },
                fields: 'id',
              });
              targetFolderId = folderRes.data.id!;
            }
          }

          const driveRes = await drive.files.create({
            requestBody: { name: `Invoice_${data.vendor || Date.now()}_${part.filename}`, parents: [targetFolderId!] },
            media: { mimeType: part.mimeType!, body: Readable.from(buffer) },
          });

          await supabase.from("invoices").insert([
            {
              vendor: data.vendor,
              nip: data.nip,
              invoice_date: data.date,
              amount: parseFloat(data.amount),
              currency: data.currency,
              drive_url: `https://drive.google.com/file/d/${driveRes.data.id}/view`,
              raw_ai_output: data
            }
          ]);

          console.log(`✅ Processed invoice from: ${data.vendor}`);
        } catch (e) {
          console.error("❌ Processing error:", e);
        }
      }
    }

    await gmail.users.messages.batchModify({
      userId: "me",
      ids: [msg.id!],
      addLabelIds: [processedLabel.id!],
      removeLabelIds: ["UNREAD"],
    });
  }
}
