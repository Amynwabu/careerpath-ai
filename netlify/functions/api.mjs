import { Buffer } from "node:buffer";
import { ServerResponse } from "node:http";
import { Readable, Writable } from "node:stream";
import app from "../../artifacts/api-server/src/app";

function eventBody(event) {
  if (!event.body) return null;
  return Buffer.from(event.body, event.isBase64Encoded ? "base64" : "utf8");
}

function eventHeaders(event, body) {
  const headers = {};

  for (const [key, value] of Object.entries(event.headers ?? {})) {
    if (value != null) headers[key.toLowerCase()] = String(value);
  }

  for (const [key, values] of Object.entries(event.multiValueHeaders ?? {})) {
    const filtered = values?.filter((value) => value != null) ?? [];
    if (filtered.length > 0) headers[key.toLowerCase()] = filtered.join(",");
  }

  if (body && !headers["content-length"]) {
    headers["content-length"] = String(body.length);
  }

  return headers;
}

function eventUrl(event) {
  const raw = event.rawUrl ? new URL(event.rawUrl) : null;
  let pathname = raw?.pathname ?? event.path ?? "/";

  if (pathname.startsWith("/.netlify/functions/api")) {
    pathname = `/api${pathname.slice("/.netlify/functions/api".length)}`;
  } else if (!pathname.startsWith("/api")) {
    pathname = `/api${pathname.startsWith("/") ? pathname : `/${pathname}`}`;
  }

  const query = raw?.search ?? (event.rawQuery ? `?${event.rawQuery}` : "");
  return `${pathname}${query}`;
}

function createRequest(event) {
  const body = eventBody(event);
  const req = new Readable({
    read() {
      if (body) this.push(body);
      this.push(null);
    },
  });

  req.method = event.httpMethod ?? event.requestContext?.http?.method ?? "GET";
  req.url = eventUrl(event);
  req.headers = eventHeaders(event, body);

  const remoteAddress =
    event.requestContext?.identity?.sourceIp ??
    event.headers?.["x-forwarded-for"]?.split(",")[0]?.trim() ??
    "";

  const socket = { remoteAddress, encrypted: req.headers["x-forwarded-proto"] === "https" };
  Object.defineProperty(req, "socket", { value: socket });
  Object.defineProperty(req, "connection", { value: socket });

  return req;
}

function createResponse(req, resolve, reject) {
  const chunks = [];
  const socket = new Writable({
    write(chunk, encoding, callback) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, encoding));
      callback();
    },
  });

  socket.on("error", reject);
  socket.cork = () => {};
  socket.uncork = () => {};
  socket.setTimeout = () => {};
  socket.setNoDelay = () => {};

  const res = new ServerResponse(req);
  res.assignSocket(socket);
  res.on("error", reject);
  res.on("finish", () => {
    const parsed = parseServerResponse(Buffer.concat(chunks));

    resolve({
      statusCode: parsed.statusCode ?? res.statusCode,
      headers: parsed.headers,
      multiValueHeaders: parsed.multiValueHeaders,
      body: parsed.body.toString("utf8"),
      isBase64Encoded: false,
    });
  });

  return res;
}

function parseServerResponse(buffer) {
  const raw = buffer.toString("latin1");
  const separatorIndex = raw.indexOf("\r\n\r\n");

  if (!raw.startsWith("HTTP/") || separatorIndex === -1) {
    return {
      statusCode: null,
      headers: {},
      multiValueHeaders: {},
      body: buffer,
    };
  }

  const headerBlock = raw.slice(0, separatorIndex);
  const body = buffer.subarray(Buffer.byteLength(raw.slice(0, separatorIndex + 4), "latin1"));
  const lines = headerBlock.split("\r\n");
  const statusCode = Number(lines[0]?.split(" ")[1]);
  const headers = {};
  const multiValueHeaders = {};

  for (const line of lines.slice(1)) {
    const index = line.indexOf(":");
    if (index === -1) continue;

    const key = line.slice(0, index).trim().toLowerCase();
    const value = line.slice(index + 1).trim();

    if (key === "set-cookie") {
      multiValueHeaders[key] ??= [];
      multiValueHeaders[key].push(value);
      continue;
    }

    headers[key] = headers[key] ? `${headers[key]}, ${value}` : value;
  }

  return {
    statusCode: Number.isFinite(statusCode) ? statusCode : null,
    headers,
    multiValueHeaders,
    body,
  };
}

export async function handler(event) {
  return new Promise((resolve, reject) => {
    const req = createRequest(event);
    const res = createResponse(req, resolve, reject);
    app.handle(req, res);
  });
}
