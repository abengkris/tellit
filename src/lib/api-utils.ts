import { NextResponse } from "next/server";

/**
 * Standard API error response helper.
 * Ensures consistent error formatting and logging.
 */
export function apiError(
  message: string, 
  status: number = 500, 
  details?: unknown
) {
  console.error(`[API Error ${status}] ${message}`, details || "");
  
  return NextResponse.json(
    { 
      error: message,
      status,
      timestamp: new Date().toISOString()
    }, 
    { status }
  );
}

/**
 * Standard API success response helper.
 */
export function apiSuccess<T>(data: T, status: number = 200) {
  return NextResponse.json(data, { status });
}
