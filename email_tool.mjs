import { google } from 'googleapis';



function getGmailClient(email) {
      console.log("email");
      console.log(email);
  const tokens = globalThis.tokenStore?.[email];
  if (!tokens) throw new Error("No tokens found for this user");


const oAuth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,       // Can be used for Gmail, Drive, Calendar
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);
  oAuth2Client.setCredentials(tokens);

  return google.gmail({ version: 'v1', auth: oAuth2Client });
}


async function listRecentEmails({ maxResults = 5 }) {
  try {
    const email = globalThis.currentEmail;
    const gmail = getGmailClient(email);
    const res = await gmail.users.messages.list({
      userId: 'me',
      maxResults,
    });

    const messages = res.data.messages || [];

    const results = await Promise.all(messages.map(async (msg) => {
      const fullMsg = await gmail.users.messages.get({
        userId: 'me',
        id: msg.id || "",
        format: 'metadata',
        metadataHeaders: ['Subject', 'From', 'Date'],
      });

      const headers = fullMsg.data.payload?.headers || [];
      const getHeader = (name) =>
        headers.find(h => h.name?.toLowerCase() === name.toLowerCase())?.value || "";

      return {
        id: msg.id,
        subject: getHeader('Subject'),
        from: getHeader('From'),
        date: getHeader('Date'),
      };
    }));

    return results;
  } catch (err) {
    console.error('Gmail API error:', err);
    return { error: "Failed to fetch emails." };
  }
}

realtimeClient.addTool(
    {
      name: "list_recent_emails",
      description: "List recent emails from the user's Gmail inbox.",
      parameters: {
        type: "object",
        properties: {
          maxResults: {
            type: "number",
            description: "The number of recent emails to fetch (default is 5).",
          },
        },
        required: [],
      },
    },
    async ({ maxResults = 5 }) => {
      return await listRecentEmails({ maxResults });
    }
  );


realtimeClient.addTool({
  name: "sendEmail",
  description: "Send an email via Gmail API",
  parameters: {
    type: "object",
    properties: {
      to: { type: "string", description: "Email address of the recipient" },
      subject: { type: "string", description: "Subject of the email" },
      message: { type: "string", description: "Plain text body of the email" }
    },
    required: ["to", "subject", "message"]
  }
}, async ({ to, subject, message }) => {
  const email = globalThis.currentEmail;
  const gmail = getGmailClient(email);
  const raw = createRawEmail({ to, subject, message });

	console.log("sendEmail");
  const res = await gmail.users.messages.send({
    userId: "me",
    requestBody: { raw },
  });

  return res.data;
});

realtimeClient.addTool({
  name: "forwardEmail",
  description: "Forward an existing email to another recipient via Gmail API",
  parameters: {
    type: "object",
    properties: {
      messageId: {
        type: "string",
        description: "The Gmail message ID of the email to forward"
      },
      forwardTo: {
        type: "string",
        description: "The email address to forward the message to"
      },
      note: {
        type: "string",
        description: "Optional message to include above the forwarded content",
        default: ""
      }
    },
    required: ["messageId", "forwardTo"]
  }
}, async ({ messageId, forwardTo, note }) => {
  const email = globalThis.currentEmail;
  const gmail = getGmailClient(email);

  const res = await gmail.users.messages.get({
    userId: 'me',
    id: messageId,
    format: 'full'
  });

  const headers = res.data.payload.headers;
  const subjectHeader = headers.find(h => h.name.toLowerCase() === 'subject');
  const fromHeader = headers.find(h => h.name.toLowerCase() === 'from');
  const dateHeader = headers.find(h => h.name.toLowerCase() === 'date');

  const subject = subjectHeader ? `Fwd: ${subjectHeader.value}` : "Fwd:";
  const originalFrom = fromHeader?.value || "Unknown sender";
  const originalDate = dateHeader?.value || "Unknown date";

  const originalBodyPart = res.data.payload.parts?.find(p => p.mimeType === "text/plain");
  const originalBody = originalBodyPart
    ? Buffer.from(originalBodyPart.body.data, 'base64').toString('utf8')
    : "(Could not extract body)";

  const fullBody = `${note ? note + "\n\n" : ""}---------- Forwarded message ---------\nFrom: ${originalFrom}\nDate: ${originalDate}\n\n${originalBody}`;

  const raw = createRawEmail({
    to: forwardTo,
    subject,
    message: fullBody
  });

  const sendRes = await gmail.users.messages.send({
    userId: 'me',
    requestBody: { raw }
  });

  return {
    messageId: sendRes.data.id,
    forwardedTo: forwardTo
  };
});


function createRawEmail({ to, subject, message }) {
  const emailLines = [
    `To: ${to}`,
    'Content-Type: text/plain; charset="UTF-8"',
    'MIME-Version: 1.0',
    `Subject: ${subject}`,
    '',
    message,
  ];

  const email = emailLines.join('\n');

  const encodedMessage = Buffer.from(email)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  return encodedMessage;
}


realtimeClient.addTool({
  name: "readEmail",
  description: "Read the full content of an email",
  parameters: {
    type: "object",
    properties: {
      id: { type: "string" }
    },
    required: ["id"]
  }
}, async ({ id }) => {
  const email = globalThis.currentEmail;
  const gmail = getGmailClient(email);
  const res = await gmail.users.messages.get({
    userId: 'me',
    id
  });
  return res.data;
});


realtimeClient.addTool({
  name: "modifyLabels",
  description: "Add or remove labels from a Gmail message",
  parameters: {
    type: "object",
    properties: {
      id: { type: "string" },
      addLabelIds: {
        type: "array",
        items: { type: "string" }
      },
      removeLabelIds: {
        type: "array",
        items: { type: "string" }
      }
    },
    required: ["id"]
  }
}, async ({ id, addLabelIds = [], removeLabelIds = [] }) => {
  const email = globalThis.currentEmail;
  const gmail = getGmailClient(email);
  const res = await gmail.users.messages.modify({
    userId: 'me',
    id,
    requestBody: {
      addLabelIds,
      removeLabelIds
    }
  });
  return res.data;
});

  realtimeClient.addTool({
  name: "createDraft",
  description: "Create a Gmail draft message",
  parameters: {
    type: "object",
    properties: {
      message: {
        type: "object",
        properties: {
          raw: { type: "string" }
        },
        required: ["raw"]
      }
    },
    required: ["message"]
  }
}, async ({ message }) => {
  const email = globalThis.currentEmail;
  const gmail = getGmailClient(email);
  const res = await gmail.users.drafts.create({
    userId: 'me',
    requestBody: { message }
  });
  return res.data;
});

realtimeClient.addTool({
  name: "sendDraft",
  description: "Send a previously created Gmail draft",
  parameters: {
    type: "object",
    properties: {
      draftId: { type: "string" }
    },
    required: ["draftId"]
  }
}, async ({ draftId }) => {
  const email = globalThis.currentEmail;
  const gmail = getGmailClient(email);
  const res = await gmail.users.drafts.send({
    userId: 'me',
    requestBody: { id: draftId }
  });
  return res.data;
});


realtimeClient.addTool({
  name: "replyToEmail",
  description: "Reply to a specific email with a new message, maintaining the thread.",
  parameters: {
    type: "object",
    properties: {
      to: { type: "string", description: "The recipient email address." },
      subject: { type: "string", description: "The subject line of the reply." },
      body: { type: "string", description: "The plain text body of the reply message." },
      messageId: { type: "string", description: "The message ID of the email you're replying to." },
      threadId: { type: "string", description: "The thread ID of the email conversation." }
    },
    required: ["to", "subject", "body", "messageId", "threadId"]
  }
}, async ({ to, subject, body, messageId, threadId }) => {
  try {
    const email = globalThis.currentEmail;
    const gmail = getGmailClient(email); // assumes user is logged in and tokens are in globalThis

    const emailLines = [
      `To: ${to}`,
      `Subject: ${subject}`,
      `In-Reply-To: ${messageId}`,
      `References: ${messageId}`,
      `Content-Type: text/plain; charset="UTF-8"`,
      "",
      body
    ];

    const rawMessage = Buffer.from(emailLines.join("\n"))
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    const response = await gmail.users.messages.send({
      userId: "me",
      requestBody: {
        raw: rawMessage,
        threadId: threadId
      }
    });

    return { success: true, id: response.data.id };
  } catch (err) {
    console.error("Error replying to email:", err);
    return { error: "Failed to send the reply." };
  }
});
