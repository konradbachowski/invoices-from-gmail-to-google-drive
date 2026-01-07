# Invoices from Gmail to Google Drive & Supabase

An automated pipeline that watches a specific Gmail address for invoices, extracts data using AI (LLM), saves files to organized monthly folders on Google Drive, and stores structured data in Supabase.

## 🚀 Features

- **Gmail Watcher:** Automatically detects new emails with attachments.
- **AI-Powered Extraction:** Uses LLMs (via OpenRouter) to extract vendor names, tax IDs, dates, and amounts.
- **Auto-Organization:** Creates monthly folders (e.g., `2024-01`) on Google Drive automatically based on the invoice date.
- **Database Storage:** Saves structured financial data to Supabase for easy dashboard integration.
- **Duplicate Prevention:** Uses Gmail labels (`processed`) to ensure each invoice is handled only once.

## 🛠 Tech Stack

- **Runtime:** [Bun](https://bun.sh)
- **Framework:** [Hono](https://hono.dev)
- **AI:** [AI SDK](https://sdk.vercel.ai) & [OpenRouter](https://openrouter.ai)
- **External APIs:** Google Gmail API, Google Drive API
- **Database:** [Supabase](https://supabase.com)

## 📋 Setup

### 1. Google Cloud Console
1. Create a project in [Google Cloud Console](https://console.cloud.google.com/).
2. Enable **Gmail API** and **Google Drive API**.
3. Configure the OAuth Consent Screen (External/Internal).
4. Create **OAuth 2.0 Client ID** (Type: Web Application or Desktop).
5. Add `http://localhost` to Authorized redirect URIs.

### 2. Supabase
Create a table named `invoices` with the following schema:
```sql
create table invoices (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  vendor text,
  nip text,
  invoice_date date,
  amount numeric,
  currency text,
  drive_url text,
  raw_ai_output jsonb
);
```

### 3. Environment Variables
Copy `.env.example` to `.env` and fill in your credentials.

### 4. Installation
```bash
bun install
```

### 5. Authentication
You need to generate a `google_token.json` file. You can use a simple script to exchange your OAuth code for a refresh token and save it in the `tokens/` directory.

## 🚢 Deployment

This project includes a `Dockerfile` and is ready to be deployed on platforms like **Coolify**, **Railway**, or any VPS.

```bash
docker build -t invoice-automation .
docker run -p 3000:3000 --env-file .env invoice-automation
```

## 📄 License
MIT