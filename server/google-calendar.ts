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
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=google-calendar',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  const accessToken = connectionSettings?.settings?.access_token || connectionSettings.settings?.oauth?.credentials?.access_token;

  if (!connectionSettings || !accessToken) {
    throw new Error('Google Calendar not connected');
  }
  return accessToken;
}

async function getUncachableGoogleCalendarClient() {
  const accessToken = await getAccessToken();
  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: accessToken });
  return google.calendar({ version: 'v3', auth: oauth2Client });
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  allDay: boolean;
  location?: string;
  status: string;
}

export interface CalendarBlock {
  events: CalendarEvent[];
  busyWindows: { start: string; end: string }[];
  freeWindows: { start: string; end: string }[];
}

export async function getCalendarEvents(timeMin?: string, timeMax?: string): Promise<CalendarBlock> {
  const calendar = await getUncachableGoogleCalendarClient();

  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);

  const min = timeMin || startOfDay.toISOString();
  const max = timeMax || endOfDay.toISOString();

  const eventsResponse = await calendar.events.list({
    calendarId: 'primary',
    timeMin: min,
    timeMax: max,
    singleEvents: true,
    orderBy: 'startTime',
    maxResults: 50,
  });

  const rawEvents = eventsResponse.data.items || [];

  const events: CalendarEvent[] = rawEvents.map((e: any) => ({
    id: e.id || '',
    title: e.summary || 'Untitled',
    start: e.start?.dateTime || e.start?.date || '',
    end: e.end?.dateTime || e.end?.date || '',
    allDay: !e.start?.dateTime,
    location: e.location || undefined,
    status: e.status || 'confirmed',
  }));

  const busyWindows = events
    .filter(e => !e.allDay && e.status === 'confirmed')
    .map(e => ({ start: e.start, end: e.end }));

  const freeWindows = computeFreeWindows(busyWindows, min, max);

  return { events, busyWindows, freeWindows };
}

function computeFreeWindows(
  busy: { start: string; end: string }[],
  dayStart: string,
  dayEnd: string
): { start: string; end: string }[] {
  if (busy.length === 0) {
    return [{ start: dayStart, end: dayEnd }];
  }

  const sorted = [...busy].sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
  const free: { start: string; end: string }[] = [];
  let cursor = new Date(dayStart);

  for (const block of sorted) {
    const blockStart = new Date(block.start);
    if (blockStart > cursor) {
      free.push({ start: cursor.toISOString(), end: blockStart.toISOString() });
    }
    const blockEnd = new Date(block.end);
    if (blockEnd > cursor) {
      cursor = blockEnd;
    }
  }

  const end = new Date(dayEnd);
  if (cursor < end) {
    free.push({ start: cursor.toISOString(), end: end.toISOString() });
  }

  return free;
}
