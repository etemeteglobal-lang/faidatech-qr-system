import { ZodError } from "zod";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function apiErrorResponse(error: unknown): Response {
  if (error instanceof ApiError) {
    return Response.json(
      { error: { code: error.code, message: error.message } },
      { status: error.status, headers: { "Cache-Control": "no-store" } },
    );
  }

  if (error instanceof ZodError) {
    return Response.json(
      {
        error: {
          code: "validation_error",
          message: "The request did not match the expected input.",
          issues: error.issues.map((issue) => ({
            path: issue.path.join("."),
            message: issue.message,
          })),
        },
      },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  if (error instanceof Error && error.message === "POSTGRES_URL is not configured") {
    return Response.json(
      {
        error: {
          code: "database_not_configured",
          message: "Configure the external PostgreSQL connection before using QR services.",
        },
      },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  if (error instanceof Error && error.name.startsWith("PrismaClient")) {
    console.error("FaidATech database request failed", error);
    return Response.json(
      { error: { code: "database_unavailable", message: "The database is temporarily unavailable." } },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  console.error("FaidATech API request failed", error);
  return Response.json(
    { error: { code: "internal_error", message: "The request could not be completed." } },
    { status: 500, headers: { "Cache-Control": "no-store" } },
  );
}

export async function readJsonBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new ApiError(400, "invalid_json", "Request body must be valid JSON.");
  }
}
