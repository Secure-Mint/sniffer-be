import axios, { AxiosRequestConfig } from "axios";

export interface RequestData {
  url: string;
  method: "GET" | "POST" | "PUT" | "DELETE";
  headers?: Record<string, string>;
  payload?: any;
  query?: Record<string, string | number | boolean>;
}

export interface RequestResult<T = any> {
  data: T;
  status: number;
}

export class HttpError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "HttpError";
    this.status = status;
  }
}

export const makeRequest = async <T = any>(requestData: RequestData): Promise<RequestResult<T>> => {
  try {
    const options: AxiosRequestConfig = {
      url: requestData.query ? `${requestData.url}?${new URLSearchParams(requestData.query as any)}` : requestData.url,
      method: requestData.method,
      headers: {
        ...(!(requestData.payload instanceof FormData) && { "Content-Type": "application/json" }),
        ...(requestData.headers || {})
      },
      ...(requestData.method !== "GET" && requestData.payload && { data: requestData.payload })
    };

    const response = await axios(options);
    return {
      data: response.data,
      status: response.status
    };
  } catch (error: any) {
    const status = error?.response?.status ?? 500;
    let message = error.message;

    if (error?.response?.data) {
      const errData = error.response.data;
      message = errData?.message || errData?.error?.message || errData.error;
    }
    throw new HttpError(message, status);
  }
};
