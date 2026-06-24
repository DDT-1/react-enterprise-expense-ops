import { API_BASE } from "../constants";

interface ApiOptions {
  method?: string;
  body?: unknown;
}

// 统一接口请求函数：页面不直接写 fetch 细节，都通过这个函数和 PHP 后端通信。
export async function api<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    method: options.method ?? "GET",
    credentials: "include",
    headers: options.body ? { "Content-Type": "application/json" } : undefined,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || "接口请求失败");
  }

  return data as T;
}

export function getErrorMessage(error: unknown) {
  if (error instanceof TypeError) {
    return `连接不到后端接口：${API_BASE}。请确认 XAMPP 的 Apache 和 MySQL 已启动，并且 api 文件夹已放到 htdocs/enterprise-expense-ops/api。`;
  }

  return error instanceof Error ? error.message : "发生未知错误";
}
