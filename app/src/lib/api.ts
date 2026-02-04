export class ApiError extends Error {
    status: number;
    body: unknown;

    constructor(status: number, body: unknown) {
        super(`API Error ${status}`);
        this.status = status;
        this.body = body;
    }
}

export async function apiGet<T>(path: string): Promise<T> {
    const res = await fetch(path, { headers: { Accept: "application/json" } });
    const body = await res.json().catch(() => null);

    if (!res.ok) {
        throw new ApiError(res.status, body);
    }

    return body as T;
}
