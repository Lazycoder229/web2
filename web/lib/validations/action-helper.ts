import { NextResponse, type NextRequest } from "next/server"
import { z } from "zod"

export type ActionResult<T> =
  | { success: true; data: T; message?: string }
  | { success: false; error: string; fieldErrors?: Record<string, string[]> }

/**
 * Creates a type-safe Server Action wrapped with Zod validation
 */
export function createSafeAction<TInput, TOutput>(
  schema: z.ZodType<TInput, any, any>,
  handler: (validatedData: TInput) => Promise<TOutput>
) {
  return async (input: unknown): Promise<ActionResult<TOutput>> => {
    const parseResult = schema.safeParse(input)

    if (!parseResult.success) {
      const fieldErrors: Record<string, string[]> = {}
      for (const issue of parseResult.error.issues) {
        const path = issue.path.join(".") || "form"
        if (!fieldErrors[path]) {
          fieldErrors[path] = []
        }
        fieldErrors[path].push(issue.message)
      }

      const issueDetails = parseResult.error.issues
        .map((issue) => `${issue.path.join(".") || "field"}: ${issue.message}`)
        .join("; ")

      console.warn("createSafeAction validation failed:", issueDetails)

      return {
        success: false,
        error: issueDetails ? `Validation failed (${issueDetails})` : "Validation failed. Please check your inputs.",
        fieldErrors,
      }
    }

    try {
      const data = await handler(parseResult.data)
      return {
        success: true,
        data,
      }
    } catch (err: any) {
      console.error("Action error:", err)
      return {
        success: false,
        error: err?.message || "An unexpected error occurred. Please try again.",
      }
    }
  }
}

/**
 * Validates request JSON body in a Next.js Route Handler using a Zod schema
 */
export async function validateApiRequest<T>(
  req: NextRequest,
  schema: z.ZodType<T, any, any>
): Promise<{ data: T } | { errorResponse: NextResponse }> {
  try {
    const body = await req.json()
    const parseResult = schema.safeParse(body)

    if (!parseResult.success) {
      const fieldErrors: Record<string, string[]> = {}
      for (const issue of parseResult.error.issues) {
        const path = issue.path.join(".") || "body"
        if (!fieldErrors[path]) {
          fieldErrors[path] = []
        }
        fieldErrors[path].push(issue.message)
      }

      return {
        errorResponse: NextResponse.json(
          {
            success: false,
            error: "Validation failed",
            fieldErrors,
          },
          { status: 400 }
        ),
      }
    }

    return { data: parseResult.data }
  } catch (error: any) {
    return {
      errorResponse: NextResponse.json(
        {
          success: false,
          error: "Invalid JSON request body",
        },
        { status: 400 }
      ),
    }
  }
}
