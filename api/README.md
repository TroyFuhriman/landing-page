# Contact form API (MailerSend)

This Azure Function runs on your Static Web App and sends contact form submissions via [MailerSend](https://www.mailersend.com/).

## Free tier

- **Azure Static Web Apps (free):** Managed APIs are included. You get a Consumption-plan function app; the free tier has a monthly execution quota (see [Azure pricing](https://azure.microsoft.com/pricing/details/static-web-apps/)).
- **MailerSend:** Free tier includes a limited number of emails per month (e.g. 3,000). No Azure upgrade required.

## Setup

### 1. MailerSend

1. Sign up at [mailersend.com](https://www.mailersend.com/).
2. Add and verify your sending domain (e.g. `troykfuhriman.com` or a subdomain).
3. Create an API token: **Domains** → **API Tokens** → create a token with **Email** → **Send** permission.
4. Note the **from** address you’ll use (e.g. `contact@troykfuhriman.com`). It must be on a verified domain.

### 2. Azure app settings

In the [Azure portal](https://portal.azure.com) → your Static Web App → **Configuration** → **Application settings**, add:

| Name | Value |
|------|--------|
| `MAILERSEND_API_KEY` | Your MailerSend API token |
| `MAILERSEND_FROM_EMAIL` | Sender email (e.g. `contact@troykfuhriman.com`) |
| `MAILERSEND_FROM_NAME` | Sender name (e.g. `Troy Fuhriman`) |
| `MAILERSEND_TO_EMAIL` | Where to receive messages (e.g. `tkfuhriman@gmail.com`) |

Save and restart the app if needed.

### 3. Local development

1. Copy `local.settings.json.example` to `local.settings.json`.
2. Fill in the MailerSend values (do not commit `local.settings.json`).
3. Run the full site with the [Static Web Apps CLI](https://learn.microsoft.com/en-us/azure/static-web-apps/local-development):  
   `swa start src --api-location api`

## Endpoint

- **POST** `/api/sendContact`
- **Body (JSON):** `{ "from_name": "...", "reply_to": "...", "message": "..." }`
- **Response:** `200` + `{ "success": true }` or `4xx/5xx` + `{ "error": "..." }`
