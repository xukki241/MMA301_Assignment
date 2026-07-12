import { useAppStore } from '../store/useAppStore';

const BASE_URL = 'http://192.168.1.102/api';

interface RequestOptions extends RequestInit {
  body?: any;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { accessToken } = useAppStore.getState();
  
  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');
  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  const url = `${BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
  
  const response = await fetch(url, {
    ...options,
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    let errorMessage = `HTTP error! status: ${response.status}`;
    try {
      const errBody = await response.json();
      errorMessage = errBody.message || errorMessage;
    } catch (_) {}
    throw new Error(errorMessage);
  }

  if (response.status === 204) {
    return {} as T;
  }

  return response.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// Class helpers – API returns Mongoose docs with `_id` / `name` but the
// mobile UI expects `classId` / `className`.
// ---------------------------------------------------------------------------

interface RawClassDoc {
  _id: string;
  name: string;
  description?: string;
  classCode: string;
  teacherId: string;
  status?: string;
  [key: string]: any;
}

export interface MappedClass {
  classId: string;
  className: string;
  description?: string;
  classCode: string;
  teacherId: string;
  status?: string;
}

function mapClass(raw: RawClassDoc): MappedClass {
  return {
    classId: raw._id,
    className: raw.name,
    description: raw.description,
    classCode: raw.classCode,
    teacherId: raw.teacherId,
    status: raw.status,
  };
}

export async function fetchClasses(): Promise<{ teaching: MappedClass[]; enrolled: MappedClass[] }> {
  const res = await apiRequest<{ teaching: RawClassDoc[]; enrolled: RawClassDoc[] }>('/classes');
  return {
    teaching: (res.teaching ?? []).map(mapClass),
    enrolled: (res.enrolled ?? []).map(mapClass),
  };
}
