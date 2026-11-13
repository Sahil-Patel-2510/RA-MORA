
interface Env {
  ramora_db: D1Database;
  ADMIN_PASSWORD: string;
  SESSION_SECRET: string;
}

interface EnquiryInput {
  name?: unknown;
  email?: unknown;
  phone?: unknown;
  service?: unknown;
  message?: unknown;
}

interface SessionPayload {
  admin: true;
  exp: number;
}

const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'https://sahil-patel-2510.github.io',
  'https://ra-mora.psahil25103.workers.dev',
];
const COOKIE_NAME = 'ramora_admin';
const SESSION_DURATION = 8 * 60 * 60;

function corsHeaders(origin: string | null) {
  return {
    'Access-Control-Allow-Origin': origin || 'http://localhost:5173',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Credentials': 'true',
    'Vary': 'Origin',
  };
}

function response(
  data: unknown,
  status = 200,
  extraHeaders: Record<string, string> = {},
  origin: string | null = null
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders(origin),
      'Content-Type': 'application/json; charset=utf-8',
      ...extraHeaders,
    },
  });
}

function base64urlEncode(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = '';

  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function base64urlDecode(value: string): string {
  const base64 = value
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const padded = base64.padEnd(
    Math.ceil(base64.length / 4) * 4,
    '='
  );

  const binary = atob(padded);

  const bytes = Uint8Array.from(binary, (char) =>
    char.charCodeAt(0)
  );

  return new TextDecoder().decode(bytes);
}

function base64urlToBytes(value: string): Uint8Array {
  const base64 = value
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const padded = base64.padEnd(
    Math.ceil(base64.length / 4) * 4,
    '='
  );

  const binary = atob(padded);

  return Uint8Array.from(binary, (char) =>
    char.charCodeAt(0)
  );
}

async function getSigningKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    {
      name: 'HMAC',
      hash: 'SHA-256',
    },
    false,
    ['sign', 'verify']
  );
}

async function createSession(secret: string): Promise<string> {
  const payload = base64urlEncode(
    JSON.stringify({
      admin: true,
      exp: Math.floor(Date.now() / 1000) + SESSION_DURATION,
    } satisfies SessionPayload)
  );

  const key = await getSigningKey(secret);

  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(payload)
  );

  const signatureBytes = new Uint8Array(signature);
  let binary = '';

  signatureBytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  const encodedSignature = btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  return `${payload}.${encodedSignature}`;
}

function getCookie(
  request: Request,
  name: string
): string | null {
  const cookies = request.headers.get('Cookie') || '';

  const item = cookies
    .split(';')
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith(`${name}=`));

  return item ? item.substring(name.length + 1) : null;
}

async function isAuthenticated(
  request: Request,
  secret: string
): Promise<boolean> {
  try {
    const token = getCookie(request, COOKIE_NAME);

    if (!token) return false;

    const parts = token.split('.');

    if (parts.length !== 2) return false;

    const [payload, signature] = parts;

    if (!payload || !signature) return false;

    const key = await getSigningKey(secret);

    const signatureBytes = base64urlToBytes(signature);

    const valid = await crypto.subtle.verify(
      'HMAC',
      key,
      signatureBytes,
      new TextEncoder().encode(payload)
    );

    if (!valid) return false;

    const data = JSON.parse(
      base64urlDecode(payload)
    ) as Partial<SessionPayload>;

    return (
      data.admin === true &&
      typeof data.exp === 'number' &&
      data.exp > Math.floor(Date.now() / 1000)
    );
  } catch {
    return false;
  }
}

function cookieHeader(
  request: Request,
  value: string
): string {
  const isSecure = new URL(request.url).protocol === 'https:';
  const secure = isSecure ? '; Secure' : '';
  const sameSite = isSecure ? 'None' : 'Strict';

  return (
    `${COOKIE_NAME}=${value}; HttpOnly; SameSite=${sameSite}; ` +
    `Path=/; Max-Age=${SESSION_DURATION}${secure}`
  );
}

function clearCookie(request: Request): string {
  const isSecure = new URL(request.url).protocol === 'https:';
  const secure = isSecure ? '; Secure' : '';
  const sameSite = isSecure ? 'None' : 'Strict';

  return (
    `${COOKIE_NAME}=; HttpOnly; SameSite=${sameSite}; ` +
    `Path=/; Max-Age=0${secure}`
  );
}

function validText(
  value: unknown,
  maxLength: number
): value is string {
  return (
    typeof value === 'string' &&
    value.trim().length > 0 &&
    value.length <= maxLength
  );
}

export default {
  async fetch(
    request: Request,
    env: Env
  ): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // CORS origin verification
    const origin = request.headers.get('Origin');

    if (origin && !ALLOWED_ORIGINS.includes(origin)) {
      return response(
        {
          success: false,
          message: 'Origin not allowed.',
        },
        403
      );
    }

    const respond = (
      data: unknown,
      status = 200,
      extraHeaders: Record<string, string> = {}
    ) => response(data, status, extraHeaders, origin);

    // Handle browser preflight requests
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(origin),
      });
    }

    // Public API health check
    if (
      path === '/api/health' &&
      request.method === 'GET'
    ) {
      return respond({
        success: true,
        message: 'RA-MORA API is running!',
      });
    }

    // Public customer enquiry submission
    if (
      path === '/api/enquiries' &&
      request.method === 'POST'
    ) {
      try {
        const body =
          await request.json() as EnquiryInput;

        const { name, email, phone, service, message } = body;

        if (
          !validText(name, 100) ||
          !validText(email, 254) ||
          !validText(phone, 25) ||
          !validText(service, 100) ||
          !validText(message, 3000)
        ) {
          return respond(
            {
              success: false,
              message: 'Please enter all fields correctly.',
            },
            400
          );
        }

        const cleanEmail = email.trim();

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
          return respond(
            {
              success: false,
              message: 'Please enter a valid email address.',
            },
            400
          );
        }

        await env.ramora_db
          .prepare(
            `INSERT INTO enquiries
             (name, email, phone, service, message)
             VALUES (?, ?, ?, ?, ?)`
          )
          .bind(
            name.trim(),
            cleanEmail,
            phone.trim(),
            service.trim(),
            message.trim()
          )
          .run();

        return respond(
          {
            success: true,
            message: 'Your enquiry has been submitted successfully!',
          },
          201
        );
      } catch {
        return respond(
          {
            success: false,
            message: 'Unable to process enquiry.',
          },
          500
        );
      }
    }

    // Admin login and session operations require secrets
    const isAdminRoute = path.startsWith('/api/admin/');

    if (isAdminRoute) {
      if (
        !env.ADMIN_PASSWORD ||
        !env.SESSION_SECRET ||
        env.SESSION_SECRET.length < 32
      ) {
        return respond(
          {
            success: false,
            message: 'Server configuration error.',
          },
          500
        );
      }
    }

    // Admin login
    if (
      path === '/api/admin/login' &&
      request.method === 'POST'
    ) {
      try {
        const body =
          await request.json() as { password?: unknown };

        if (
          typeof body.password !== 'string' ||
          body.password !== env.ADMIN_PASSWORD
        ) {
          return respond(
            {
              success: false,
              message: 'Invalid password.',
            },
            401
          );
        }

        const token = await createSession(
          env.SESSION_SECRET
        );

        return respond(
          {
            success: true,
            message: 'Admin login successful.',
          },
          200,
          {
            'Set-Cookie': cookieHeader(request, token),
          }
        );
      } catch {
        return respond(
          {
            success: false,
            message: 'Login failed.',
          },
          400
        );
      }
    }

    // Admin logout
    if (
      path === '/api/admin/logout' &&
      request.method === 'POST'
    ) {
      return respond(
        {
          success: true,
          message: 'Logged out successfully.',
        },
        200,
        {
          'Set-Cookie': clearCookie(request),
        }
      );
    }

    // Check admin session
    if (
      path === '/api/admin/me' &&
      request.method === 'GET'
    ) {
      const authenticated = await isAuthenticated(
        request,
        env.SESSION_SECRET
      );

      return authenticated
        ? respond({
            success: true,
            authenticated: true,
          })
        : respond(
            {
              success: false,
              authenticated: false,
            },
            401
          );
    }

    // All remaining admin routes require authentication
    if (isAdminRoute) {
      const authenticated = await isAuthenticated(
        request,
        env.SESSION_SECRET
      );

      if (!authenticated) {
        return respond(
          {
            success: false,
            message: 'Admin login required.',
          },
          401
        );
      }

      // Fetch all recent enquiries
      if (
        path === '/api/admin/enquiries' &&
        request.method === 'GET'
      ) {
        try {
          const result = await env.ramora_db
            .prepare(
              `SELECT
                id,
                name,
                email,
                phone,
                service,
                message,
                created_at
              FROM enquiries
              ORDER BY id DESC
              LIMIT 200`
            )
            .all();

          return respond({
            success: true,
            enquiries: result.results,
          });
        } catch {
          return respond(
            {
              success: false,
              message: 'Unable to fetch enquiries.',
            },
            500
          );
        }
      }

      // Delete one enquiry
      const match = path.match(
        /^\/api\/admin\/enquiries\/(\d+)$/
      );

      if (
        match &&
        request.method === 'DELETE'
      ) {
        try {
          const id = Number(match[1]);

          const result = await env.ramora_db
            .prepare(
              'DELETE FROM enquiries WHERE id = ?'
            )
            .bind(id)
            .run();

          if ((result.meta.changes ?? 0) === 0) {
            return respond(
              {
                success: false,
                message: 'Enquiry not found.',
              },
              404
            );
          }

          return respond({
            success: true,
            message: 'Enquiry deleted successfully.',
          });
        } catch {
          return respond(
            {
              success: false,
              message: 'Unable to delete enquiry.',
            },
            500
          );
        }
      }
    }

    return respond(
      {
        success: false,
        message: 'Route not found.',
      },
      404
    );
  },
};
