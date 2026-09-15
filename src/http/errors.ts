export interface ErrorEnvelope {
  error: {
    code: string;
    message: string;
    requestId: string;
  };
}

export function errorEnvelope(code: string, message: string, requestId: string): ErrorEnvelope {
  return { error: { code, message, requestId } };
}
