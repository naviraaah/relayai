import { google } from 'googleapis';

let connectionSettings: any;

async function getAccessToken() {
  if (connectionSettings && connectionSettings.settings.expires_at && new Date(connectionSettings.settings.expires_at).getTime() > Date.now()) {
    return connectionSettings.settings.access_token;
  }

  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? 'repl ' + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
    ? 'depl ' + process.env.WEB_REPL_RENEWAL
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=google-mail',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  const accessToken = connectionSettings?.settings?.access_token || connectionSettings.settings?.oauth?.credentials?.access_token;

  if (!connectionSettings || !accessToken) {
    throw new Error('Gmail not connected');
  }
  return accessToken;
}

async function getUncachableGmailClient() {
  const accessToken = await getAccessToken();
  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: accessToken });
  return google.gmail({ version: 'v1', auth: oauth2Client });
}

export type EmailCategory = 'delivery' | 'event_invite' | 'reservation' | 'urgent' | 'newsletter' | 'general';

export interface EmailSignal {
  id: string;
  from: string;
  subject: string;
  date: string;
  snippet: string;
  category: EmailCategory;
  labels: string[];
}

function classifyEmail(from: string, subject: string, snippet: string, labels: string[]): EmailCategory {
  const lower = (subject + ' ' + snippet + ' ' + from).toLowerCase();

  if (lower.includes('shipped') || lower.includes('delivered') || lower.includes('tracking') ||
      lower.includes('out for delivery') || lower.includes('package') || lower.includes('order confirmed')) {
    return 'delivery';
  }

  if (lower.includes('invitation') || lower.includes('invite') || lower.includes('rsvp') ||
      lower.includes('you\'re invited') || lower.includes('calendar')) {
    return 'event_invite';
  }

  if (lower.includes('reservation') || lower.includes('booking') || lower.includes('confirmed reservation') ||
      lower.includes('check-in') || lower.includes('check in') || lower.includes('hotel') || lower.includes('flight')) {
    return 'reservation';
  }

  if (labels.includes('IMPORTANT') || lower.includes('urgent') || lower.includes('asap') ||
      lower.includes('action required') || lower.includes('immediately')) {
    return 'urgent';
  }

  if (lower.includes('unsubscribe') || lower.includes('newsletter') || lower.includes('weekly digest')) {
    return 'newsletter';
  }

  return 'general';
}

function extractSenderName(from: string): string {
  const match = from.match(/^"?([^"<]+)"?\s*<?/);
  if (match) return match[1].trim();
  return from.split('@')[0];
}

export async function getEmailSignals(maxResults: number = 15): Promise<EmailSignal[]> {
  const gmail = await getUncachableGmailClient();

  const listResponse = await gmail.users.messages.list({
    userId: 'me',
    maxResults,
    q: 'newer_than:2d',
  });

  const messageIds = listResponse.data.messages || [];

  const signals: EmailSignal[] = [];

  for (const msg of messageIds.slice(0, maxResults)) {
    try {
      const detail = await gmail.users.messages.get({
        userId: 'me',
        id: msg.id!,
        format: 'metadata',
        metadataHeaders: ['From', 'Subject', 'Date'],
      });

      const headers = detail.data.payload?.headers || [];
      const from = headers.find(h => h.name === 'From')?.value || '';
      const subject = headers.find(h => h.name === 'Subject')?.value || '(no subject)';
      const date = headers.find(h => h.name === 'Date')?.value || '';
      const snippet = detail.data.snippet || '';
      const labels = detail.data.labelIds || [];

      const category = classifyEmail(from, subject, snippet, labels);

      signals.push({
        id: msg.id!,
        from: extractSenderName(from),
        subject,
        date,
        snippet,
        category,
        labels,
      });
    } catch (err) {
      console.error(`[gmail] Failed to fetch message ${msg.id}:`, err);
    }
  }

  return signals;
}
