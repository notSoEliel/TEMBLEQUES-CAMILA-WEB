import { createClerkClient } from "@clerk/backend";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import {
  createRemoteJWKSet,
  importPKCS8,
  importSPKI,
  jwtVerify,
  SignJWT,
  type JWTPayload,
} from "jose";
import {
  MCP_GUEST_SCOPES,
  MCP_ROLE_SCOPES,
  MCP_SCOPES,
  normalizeRole,
  revokeMcpAccessTokenJti,
  type McpAuthConfig,
  type McpRole,
  type McpScope,
} from "./auth.js";

type OAuthClient = {
  clientId: string;
  clientName: string;
  redirectUris: ReadonlySet<string>;
  createdAt: number;
};

type AuthorizationTransaction = {
  transactionId: string;
  clientId: string;
  redirectUri: string;
  codeChallenge: string;
  requestedScopes: readonly McpScope[];
  resource?: string;
  state?: string;
  upstreamState: string;
  upstreamCodeVerifier: string;
  nonce: string;
  expiresAt: number;
};

type AuthorizationCode = {
  code: string;
  clientId: string;
  redirectUri: string;
  codeChallenge: string;
  userId: string;
  role: McpRole;
  scopes: readonly McpScope[];
  expiresAt: number;
};

type RefreshSession = {
  tokenHash: string;
  clientId: string;
  userId: string;
  role: McpRole;
  scopes: readonly McpScope[];
  expiresAt: number;
  revoked: boolean;
};

type ClerkTokenResponse = {
  accessToken: string;
  idToken: string;
};

type ClerkUserInfo = {
  sub: string;
};

type AccessTokenClaims = JWTPayload & {
  token_use?: unknown;
  client_id?: unknown;
  role?: unknown;
  scope?: unknown;
};

const TRANSACTION_TTL_MS = 10 * 60 * 1000;
const AUTHORIZATION_CODE_TTL_MS = 60 * 1000;
const MAX_CLIENTS = 1000;
const MAX_TRANSACTIONS = 1000;
const MAX_CODES = 1000;
const MAX_REFRESH_SESSIONS = 5000;
const DEFAULT_ACCESS_TOKEN_TTL_SECONDS = 600;
const DEFAULT_REFRESH_TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60;
const UPSTREAM_SCOPE = "openid profile email public_metadata";

export type McpOAuthDependencies = {
  resolveRole?: (userId: string) => Promise<McpRole>;
};

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function objectValue(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined;
}

function base64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function randomOpaqueToken(): string {
  return base64Url(randomBytes(32));
}

function hashOpaqueToken(token: string): string {
  return createHash("sha256").update(token).digest("base64url");
}

function equalStrings(left: string, right: string): boolean {
  const leftBytes = new TextEncoder().encode(left);
  const rightBytes = new TextEncoder().encode(right);
  if (leftBytes.byteLength !== rightBytes.byteLength) return false;
  return timingSafeEqual(leftBytes, rightBytes);
}

function isMcpScope(value: string): value is McpScope {
  return (MCP_SCOPES as readonly string[]).includes(value);
}

function parseScopes(value: string | null): McpScope[] {
  const values = (value ?? "")
    .split(/\s+/)
    .map((scope) => scope.trim())
    .filter(Boolean);

  const unique: McpScope[] = [];
  for (const scope of values) {
    if (!isMcpScope(scope)) throw new OAuthProtocolError("invalid_scope", "El scope solicitado no está disponible.");
    if (!unique.includes(scope)) unique.push(scope);
  }
  return unique;
}

function effectiveScopes(role: McpRole, requested: readonly McpScope[]): McpScope[] {
  const allowed = MCP_ROLE_SCOPES[role];
  if (requested.length === 0) return Array.from(MCP_GUEST_SCOPES);
  return requested.filter((scope) => allowed.has(scope));
}

function validRedirectUri(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 2048 || value.includes("#")) return false;
  try {
    const url = new URL(value);
    if (url.protocol === "https:") return true;
    return url.protocol === "http:" && (url.hostname === "localhost" || url.hostname === "127.0.0.1");
  } catch {
    return false;
  }
}

function responseJson(data: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      Pragma: "no-cache",
    },
  });
}

function redirectWithParams(
  redirectUri: string,
  params: Record<string, string | undefined>,
): Response {
  const url = new URL(redirectUri);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) url.searchParams.set(key, value);
  }
  return Response.redirect(url.toString(), 302);
}

class OAuthProtocolError extends Error {
  public readonly error: string;

  constructor(error: string, message: string) {
    super(message);
    this.name = "OAuthProtocolError";
    this.error = error;
  }
}

function getErrorResponse(error: unknown): Response {
  if (error instanceof OAuthProtocolError) {
    return responseJson({ error: error.error, error_description: error.message }, 400);
  }
  return responseJson({ error: "server_error", error_description: "No fue posible completar la autorización." }, 500);
}

function requiredConfigValue(value: string | undefined, name: string): string {
  if (!value) throw new Error(`Falta la configuración OAuth ${name}.`);
  return value;
}

function tokenEndpoint(config: McpAuthConfig): string {
  return new URL("/oauth/token", requiredConfigValue(config.clerkOAuthIssuer, "MCP_CLERK_OAUTH_ISSUER")).toString();
}

function userInfoEndpoint(config: McpAuthConfig): string {
  return new URL("/oauth/userinfo", requiredConfigValue(config.clerkOAuthIssuer, "MCP_CLERK_OAUTH_ISSUER")).toString();
}

async function readJson(response: Response): Promise<Record<string, unknown>> {
  const value: unknown = await response.json().catch(() => ({}));
  return objectValue(value) ?? {};
}

async function pkceChallenge(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  return base64Url(new Uint8Array(digest));
}

function isExpired(expiresAt: number): boolean {
  return expiresAt <= Date.now();
}

function encodedScope(scopes: readonly McpScope[]): string {
  return scopes.join(" ");
}

export class McpOAuthService {
  private readonly clients = new Map<string, OAuthClient>();
  private readonly transactions = new Map<string, AuthorizationTransaction>();
  private readonly authorizationCodes = new Map<string, AuthorizationCode>();
  private readonly refreshSessions = new Map<string, RefreshSession>();
  private signingKeyPromise: Promise<CryptoKey> | undefined;
  private clerkJwks: ReturnType<typeof createRemoteJWKSet> | undefined;
  private readonly issuer: string;
  private readonly audience: string;
  private readonly clerkIssuer: string;
  private readonly clerkClientId: string;
  private readonly clerkClientSecret: string;
  private readonly clerkRedirectUri: string;
  private readonly resolveRoleOverride?: (userId: string) => Promise<McpRole>;

  constructor(private readonly config: McpAuthConfig, dependencies: McpOAuthDependencies = {}) {
    this.issuer = requiredConfigValue(config.oauthIssuer, "MCP_OAUTH_ISSUER");
    this.audience = requiredConfigValue(config.oauthAudience, "MCP_OAUTH_AUDIENCE");
    this.clerkIssuer = requiredConfigValue(config.clerkOAuthIssuer, "MCP_CLERK_OAUTH_ISSUER");
    this.clerkClientId = requiredConfigValue(config.clerkOAuthClientId, "MCP_CLERK_OAUTH_CLIENT_ID");
    this.clerkClientSecret = requiredConfigValue(config.clerkOAuthClientSecret, "MCP_CLERK_OAUTH_CLIENT_SECRET");
    this.clerkRedirectUri = requiredConfigValue(config.clerkOAuthRedirectUri, "MCP_CLERK_OAUTH_REDIRECT_URI");
    this.resolveRoleOverride = dependencies.resolveRole;
  }

  private cleanup(): void {
    for (const [key, value] of this.transactions) {
      if (isExpired(value.expiresAt)) this.transactions.delete(key);
    }
    for (const [key, value] of this.authorizationCodes) {
      if (isExpired(value.expiresAt)) this.authorizationCodes.delete(key);
    }
    for (const [key, value] of this.refreshSessions) {
      if (value.revoked || isExpired(value.expiresAt)) this.refreshSessions.delete(key);
    }
    if (this.clients.size > MAX_CLIENTS) {
      const oldest = Array.from(this.clients.values()).sort((a, b) => a.createdAt - b.createdAt);
      for (const client of oldest.slice(0, this.clients.size - MAX_CLIENTS)) this.clients.delete(client.clientId);
    }
  }

  private async signingKey(): Promise<CryptoKey> {
    if (!this.config.oauthSigningPrivateKey) throw new Error("Falta la clave privada del bridge OAuth MCP.");
    this.signingKeyPromise ??= importPKCS8(this.config.oauthSigningPrivateKey.replace(/\\n/g, "\n"), "EdDSA");
    return this.signingKeyPromise;
  }

  private async clerkIdTokenKey(): Promise<ReturnType<typeof createRemoteJWKSet>> {
    this.clerkJwks ??= createRemoteJWKSet(new URL("/.well-known/jwks.json", this.clerkIssuer));
    return this.clerkJwks;
  }

  private async resolveRole(userId: string): Promise<McpRole> {
    if (this.resolveRoleOverride) return this.resolveRoleOverride(userId);
    if (!this.config.clerkSecretKey) throw new Error("Falta CLERK_SECRET_KEY para resolver el rol Clerk.");
    const clerk = createClerkClient({ secretKey: this.config.clerkSecretKey });
    const user = await clerk.users.getUser(userId);
    return normalizeRole(
      typeof user.publicMetadata.role === "string" ? user.publicMetadata.role : undefined,
    );
  }

  private getClient(clientId: string): OAuthClient {
    this.cleanup();
    const client = this.clients.get(clientId);
    if (!client) throw new OAuthProtocolError("invalid_client", "El cliente OAuth no está registrado.");
    return client;
  }

  private validateResource(resource: string | undefined): void {
    if (resource && resource !== this.audience) {
      throw new OAuthProtocolError("invalid_target", "El recurso solicitado no corresponde a este servidor MCP.");
    }
  }

  public metadata(): Record<string, unknown> {
    const issuer = this.issuer;
    return {
      issuer,
      authorization_endpoint: new URL("/oauth/authorize", issuer).toString(),
      token_endpoint: new URL("/oauth/token", issuer).toString(),
      registration_endpoint: new URL("/oauth/register", issuer).toString(),
      revocation_endpoint: new URL("/oauth/revoke", issuer).toString(),
      response_types_supported: ["code"],
      grant_types_supported: ["authorization_code", "refresh_token"],
      token_endpoint_auth_methods_supported: ["none"],
      code_challenge_methods_supported: ["S256"],
      scopes_supported: MCP_SCOPES,
      resource_indicators_supported: true,
    };
  }

  public async register(request: Request): Promise<Response> {
    try {
      const body = objectValue(await request.json()) ?? {};
      const redirects = body.redirect_uris;
      if (!Array.isArray(redirects) || redirects.length === 0 || redirects.length > 20 || !redirects.every(validRedirectUri)) {
        throw new OAuthProtocolError("invalid_redirect_uri", "Se requiere al menos una redirect_uri válida.");
      }

      const requestedScopes = body.scope === undefined
        ? []
        : parseScopes(typeof body.scope === "string" ? body.scope : null);
      const grantTypes = Array.isArray(body.grant_types)
        ? body.grant_types.filter((value): value is string => typeof value === "string")
        : ["authorization_code", "refresh_token"];
      if (!grantTypes.every((value) => value === "authorization_code" || value === "refresh_token")) {
        throw new OAuthProtocolError("invalid_client_metadata", "El cliente solo puede usar Authorization Code y refresh token.");
      }
      if (body.token_endpoint_auth_method !== undefined && body.token_endpoint_auth_method !== "none") {
        throw new OAuthProtocolError("invalid_client_metadata", "El cliente MCP debe usar PKCE sin secreto de cliente.");
      }
      if (body.response_types !== undefined
        && (!Array.isArray(body.response_types) || !body.response_types.every((value) => value === "code"))) {
        throw new OAuthProtocolError("invalid_client_metadata", "El cliente solo puede usar response_type=code.");
      }

      const clientId = `mcp_${randomOpaqueToken()}`;
      this.clients.set(clientId, {
        clientId,
        clientName: stringValue(body.client_name) ?? "Cliente MCP",
        redirectUris: new Set(redirects),
        createdAt: Date.now(),
      });

      return responseJson({
        client_id: clientId,
        client_id_issued_at: Math.floor(Date.now() / 1000),
        client_name: stringValue(body.client_name) ?? "Cliente MCP",
        redirect_uris: redirects,
        grant_types: grantTypes,
        response_types: ["code"],
        token_endpoint_auth_method: "none",
        scope: encodedScope(requestedScopes),
      }, 201);
    } catch (error) {
      return getErrorResponse(error);
    }
  }

  public async authorize(request: Request): Promise<Response> {
    try {
      this.cleanup();
      const params = new URL(request.url).searchParams;
      if (params.get("response_type") !== "code") {
        throw new OAuthProtocolError("unsupported_response_type", "Solo se admite response_type=code.");
      }
      const clientId = params.get("client_id");
      const redirectUri = params.get("redirect_uri");
      const codeChallenge = params.get("code_challenge");
      if (!clientId || !redirectUri || !codeChallenge || params.get("code_challenge_method") !== "S256") {
        throw new OAuthProtocolError("invalid_request", "Authorization Code + PKCE requiere client_id, redirect_uri y S256.");
      }
      const client = this.getClient(clientId);
      if (!client.redirectUris.has(redirectUri)) {
        throw new OAuthProtocolError("invalid_request", "La redirect_uri no coincide con el cliente registrado.");
      }
      const requestedScopes = parseScopes(params.get("scope"));
      const resource = params.get("resource") ?? undefined;
      this.validateResource(resource);

      const upstreamState = randomOpaqueToken();
      const upstreamCodeVerifier = randomOpaqueToken();
      const nonce = randomOpaqueToken();
      const transaction: AuthorizationTransaction = {
        transactionId: randomOpaqueToken(),
        clientId,
        redirectUri,
        codeChallenge,
        requestedScopes,
        resource,
        state: params.get("state") ?? undefined,
        upstreamState,
        upstreamCodeVerifier,
        nonce,
        expiresAt: Date.now() + TRANSACTION_TTL_MS,
      };
      if (this.transactions.size >= MAX_TRANSACTIONS) this.cleanup();
      this.transactions.set(upstreamState, transaction);

      const upstreamChallenge = await pkceChallenge(upstreamCodeVerifier);
      const upstreamUrl = new URL("/oauth/authorize", this.clerkIssuer);
      upstreamUrl.searchParams.set("client_id", this.clerkClientId);
      upstreamUrl.searchParams.set("redirect_uri", this.clerkRedirectUri);
      upstreamUrl.searchParams.set("response_type", "code");
      upstreamUrl.searchParams.set("scope", UPSTREAM_SCOPE);
      upstreamUrl.searchParams.set("prompt", "select_account");
      upstreamUrl.searchParams.set("state", upstreamState);
      upstreamUrl.searchParams.set("nonce", nonce);
      upstreamUrl.searchParams.set("code_challenge", upstreamChallenge);
      upstreamUrl.searchParams.set("code_challenge_method", "S256");
      return Response.redirect(upstreamUrl.toString(), 302);
    } catch (error) {
      return getErrorResponse(error);
    }
  }

  private async exchangeClerkCode(code: string, verifier: string): Promise<ClerkTokenResponse> {
    const credentials = `${this.clerkClientId}:${this.clerkClientSecret}`;
    const response = await fetch(tokenEndpoint(this.config), {
      method: "POST",
      headers: {
        Authorization: `Basic ${btoa(credentials)}`,
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: this.clerkRedirectUri,
        client_id: this.clerkClientId,
        code_verifier: verifier,
      }),
    });
    const payload = await readJson(response);
    if (!response.ok) throw new Error("Clerk rechazó el intercambio OAuth.");
    const accessToken = stringValue(payload.access_token);
    const idToken = stringValue(payload.id_token);
    if (!accessToken || !idToken) throw new Error("Clerk no devolvió los tokens OIDC requeridos.");
    return { accessToken, idToken };
  }

  private async resolveUpstreamUser(idToken: string, accessToken: string, transaction: AuthorizationTransaction): Promise<string> {
    const idTokenResult = await jwtVerify<AccessTokenClaims>(idToken, await this.clerkIdTokenKey(), {
      issuer: this.clerkIssuer,
      audience: this.clerkClientId,
      algorithms: ["RS256", "ES256"],
    });
    if (idTokenResult.payload.nonce !== transaction.nonce || typeof idTokenResult.payload.sub !== "string") {
      throw new Error("La identidad OIDC no coincide con la transacción OAuth.");
    }

    const response = await fetch(userInfoEndpoint(this.config), {
      headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
    });
    const payload = objectValue(await response.json().catch(() => ({})));
    const userInfo: ClerkUserInfo = { sub: stringValue(payload?.sub) ?? "" };
    if (!response.ok || !userInfo.sub || userInfo.sub !== idTokenResult.payload.sub) {
      throw new Error("Clerk no confirmó la identidad OAuth.");
    }
    return userInfo.sub;
  }

  public async clerkCallback(request: Request): Promise<Response> {
    const params = new URL(request.url).searchParams;
    const upstreamState = params.get("state");
    const transaction = upstreamState ? this.transactions.get(upstreamState) : undefined;
    if (!transaction || isExpired(transaction.expiresAt)) {
      return responseJson({ error: "invalid_request", error_description: "La transacción OAuth expiró." }, 400);
    }
    this.transactions.delete(upstreamState as string);
    if (params.get("error")) {
      return redirectWithParams(transaction.redirectUri, {
        error: "access_denied",
        error_description: "El usuario no completó la autenticación.",
        state: transaction.state,
      });
    }

    const code = params.get("code");
    if (!code) return redirectWithParams(transaction.redirectUri, { error: "invalid_request", state: transaction.state });

    try {
      const tokens = await this.exchangeClerkCode(code, transaction.upstreamCodeVerifier);
      const userId = await this.resolveUpstreamUser(tokens.idToken, tokens.accessToken, transaction);
      const role = await this.resolveRole(userId);
      const scopes = effectiveScopes(role, transaction.requestedScopes);
      const bridgeCode = randomOpaqueToken();
      if (this.authorizationCodes.size >= MAX_CODES) this.cleanup();
      this.authorizationCodes.set(bridgeCode, {
        code: bridgeCode,
        clientId: transaction.clientId,
        redirectUri: transaction.redirectUri,
        codeChallenge: transaction.codeChallenge,
        userId,
        role,
        scopes,
        expiresAt: Date.now() + AUTHORIZATION_CODE_TTL_MS,
      });
      return redirectWithParams(transaction.redirectUri, { code: bridgeCode, state: transaction.state });
    } catch {
      return redirectWithParams(transaction.redirectUri, {
        error: "server_error",
        error_description: "No fue posible completar la autenticación con Clerk.",
        state: transaction.state,
      });
    }
  }

  private async createAccessToken(
    clientId: string,
    userId: string,
    role: McpRole,
    scopes: readonly McpScope[],
  ): Promise<{ token: string; expiresIn: number }> {
    const expiresIn = this.config.oauthAccessTokenTtlSeconds || DEFAULT_ACCESS_TOKEN_TTL_SECONDS;
    const token = await new SignJWT({
      token_use: "mcp_access",
      client_id: clientId,
      role,
      scope: encodedScope(scopes),
    })
      .setProtectedHeader({ alg: "EdDSA", typ: "at+jwt" })
      .setIssuer(this.issuer)
      .setAudience(this.audience)
      .setSubject(userId)
      .setIssuedAt()
      .setExpirationTime(`${expiresIn}s`)
      .setJti(randomOpaqueToken())
      .sign(await this.signingKey());
    return { token, expiresIn };
  }

  private issueRefreshSession(
    clientId: string,
    userId: string,
    role: McpRole,
    scopes: readonly McpScope[],
  ): string {
    const refreshToken = randomOpaqueToken();
    if (this.refreshSessions.size >= MAX_REFRESH_SESSIONS) this.cleanup();
    this.refreshSessions.set(hashOpaqueToken(refreshToken), {
      tokenHash: hashOpaqueToken(refreshToken),
      clientId,
      userId,
      role,
      scopes,
      expiresAt: Date.now() + (this.config.oauthRefreshTokenTtlSeconds || DEFAULT_REFRESH_TOKEN_TTL_SECONDS) * 1000,
      revoked: false,
    });
    return refreshToken;
  }

  private async tokenResponse(
    clientId: string,
    userId: string,
    role: McpRole,
    scopes: readonly McpScope[],
  ): Promise<Response> {
    const access = await this.createAccessToken(clientId, userId, role, scopes);
    const refreshToken = this.issueRefreshSession(clientId, userId, role, scopes);
    return responseJson({
      access_token: access.token,
      token_type: "Bearer",
      expires_in: access.expiresIn,
      refresh_token: refreshToken,
      scope: encodedScope(scopes),
    });
  }

  public async token(request: Request): Promise<Response> {
    try {
      this.cleanup();
      const params = new URLSearchParams(await request.text());
      const grantType = params.get("grant_type");
      const clientId = params.get("client_id");
      if (!clientId) throw new OAuthProtocolError("invalid_client", "Falta client_id.");
      this.getClient(clientId);

      if (grantType === "authorization_code") {
        const codeValue = params.get("code");
        const redirectUri = params.get("redirect_uri");
        const verifier = params.get("code_verifier");
        if (!codeValue || !redirectUri || !verifier) throw new OAuthProtocolError("invalid_request", "Faltan parámetros PKCE.");
        const code = this.authorizationCodes.get(codeValue);
        if (!code || isExpired(code.expiresAt) || code.clientId !== clientId || code.redirectUri !== redirectUri) {
          throw new OAuthProtocolError("invalid_grant", "El código de autorización no es válido.");
        }
        this.authorizationCodes.delete(codeValue);
        if (!equalStrings(await pkceChallenge(verifier), code.codeChallenge)) {
          throw new OAuthProtocolError("invalid_grant", "La verificación PKCE falló.");
        }
        return this.tokenResponse(code.clientId, code.userId, code.role, code.scopes);
      }

      if (grantType === "refresh_token") {
        const refreshToken = params.get("refresh_token");
        if (!refreshToken) throw new OAuthProtocolError("invalid_request", "Falta refresh_token.");
        const hash = hashOpaqueToken(refreshToken);
        const session = this.refreshSessions.get(hash);
        if (!session || session.revoked || isExpired(session.expiresAt)) {
          throw new OAuthProtocolError("invalid_grant", "El refresh token no es válido.");
        }
        session.revoked = true;
        const role = await this.resolveRole(session.userId);
        const scopes = effectiveScopes(role, session.scopes);
        return this.tokenResponse(session.clientId, session.userId, role, scopes);
      }

      throw new OAuthProtocolError("unsupported_grant_type", "Solo se admiten authorization_code y refresh_token.");
    } catch (error) {
      return getErrorResponse(error);
    }
  }

  public async revoke(request: Request): Promise<Response> {
    const params = new URLSearchParams(await request.text());
    const token = params.get("token");
    if (!token) return new Response(null, { status: 200 });

    const hash = hashOpaqueToken(token);
    const session = this.refreshSessions.get(hash);
    if (session) session.revoked = true;

    try {
      const publicKey = this.config.oauthSigningPublicKey;
      if (publicKey) {
        const result = await jwtVerify<AccessTokenClaims>(token, await importPublicKey(publicKey), {
          issuer: this.issuer,
          audience: this.audience,
          algorithms: ["EdDSA"],
        });
        if (typeof result.payload.jti === "string" && typeof result.payload.exp === "number") {
          revokeMcpAccessTokenJti(result.payload.jti, result.payload.exp * 1000);
        }
      }
    } catch {
      // RFC 7009 permite responder 200 aunque el token ya no sea válido.
    }
    return new Response(null, { status: 200, headers: { "Cache-Control": "no-store" } });
  }
}

let publicKeyCache: { value: string; promise: Promise<CryptoKey> } | undefined;

async function importPublicKey(value: string): Promise<CryptoKey> {
  const normalized = value.replace(/\\n/g, "\n");
  if (!publicKeyCache || publicKeyCache.value !== normalized) {
    publicKeyCache = { value: normalized, promise: importSPKI(normalized, "EdDSA") };
  }
  return publicKeyCache.promise;
}

const serviceCache = new WeakMap<McpAuthConfig, McpOAuthService>();

export function getMcpOAuthService(config: McpAuthConfig): McpOAuthService {
  const cached = serviceCache.get(config);
  if (cached) return cached;
  const service = new McpOAuthService(config);
  serviceCache.set(config, service);
  return service;
}
