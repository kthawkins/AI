# Agentic AI with Node.js

This code is a series of API tool definitions for interacting with Gmail through the Gmail API. Here's a breakdown of what each part does:

### 1. `getGmailClient` function

* This function retrieves the Gmail client for a given email by fetching OAuth tokens from `globalThis.tokenStore`. If the tokens are not found, it throws an error.
* It creates an OAuth2 client using `google.auth.OAuth2` with credentials from environment variables.
* The function then returns a Gmail API client using the created OAuth2 client, allowing interaction with Gmail through various operations.

### 2. `realtimeClient.addTool` Definitions

Each of the following sections defines an operation that can be invoked by the real-time client. These operations interact with the Gmail API and perform tasks like sending emails, listing recent emails, forwarding emails, etc.

#### 2.1 **List Recent Emails** (`list_recent_emails`)

* Lists recent emails from the user's Gmail inbox.
* Takes an optional `maxResults` parameter to limit the number of emails fetched (defaults to 5).

#### 2.2 **Send Email** (`sendEmail`)

* Sends an email to a specified recipient with a subject and message body.
* Uses `createRawEmail` to construct the raw email in base64 encoding and sends it using the `gmail.users.messages.send` method.

#### 2.3 **Forward Email** (`forwardEmail`)

* Forwards an existing email to another recipient.
* Fetches the original email, extracts key components like subject, sender, date, and body, and sends the email with a "Fwd" prefix to the subject.
* Supports an optional `note` that can be included above the forwarded message.

#### 2.4 **Read Email** (`readEmail`)

* Reads the full content of an email by its `id`.

#### 2.5 **Modify Labels** (`modifyLabels`)

* Adds or removes labels from an email in Gmail.
* Takes `id` of the email and lists of `addLabelIds` and `removeLabelIds`.

#### 2.6 **Create Draft** (`createDraft`)

* Creates a Gmail draft message from a raw email string, allowing the user to save a draft before sending.

#### 2.7 **Send Draft** (`sendDraft`)

* Sends a previously created Gmail draft by its `draftId`.

#### 2.8 **Reply to Email** (`replyToEmail`)

* Replies to an email while maintaining the thread.
* Includes the original message's `messageId` and `threadId` to ensure the reply is part of the correct conversation.
* Constructs the reply email in raw format and sends it.

### 3. **Supporting Functions**

* **`createRawEmail`**: A helper function that creates a raw email in base64 encoding. It formats the email with headers like "To", "Subject", and "Content-Type", then encodes it in base64 URL format for Gmail API.

Each `realtimeClient.addTool` section registers a tool that can be used in a real-time interaction, allowing actions like sending, forwarding, reading, and replying to emails, as well as managing drafts and labels.

