const API_BASE_URL = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

export interface LoginResponse {
  token: string;
  user: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    role: string;
    companyId: string;
  };
}

export interface Question {
  id: string;
  step: number;
  order: number;
  type: string;
  label: string;
  required: boolean;
  options: {
    choices?: Array<{ value: string; label: string }>;
  } | null;
  conditional: {
    showIf?: {
      questionId: string;
      value: any;
      op?: '==' | '!=' | 'in' | '>' | '<';
    };
    all?: Array<{
      questionId: string;
      value: any;
      op?: '==' | '!=' | 'in' | '>' | '<';
    }>;
    any?: Array<{
      questionId: string;
      value: any;
      op?: '==' | '!=' | 'in' | '>' | '<';
    }>;
  } | null;
  companyId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Product {
  id: string;
  name: string;
  description: string | null;
  metadata: any;
  companyId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Answer {
  questionId: string;
  value: any;
}

export interface ProductDetail {
  id: string;
  name: string;
  description: string | null;
  metadata: any;
  companyId: string;
  createdAt: string;
  updatedAt: string;
  responses: Array<{
    id: string;
    status: string;
    answers: Array<{
      id: string;
      questionId: string;
      value: any;
      question?: {
        id: string;
        label: string;
        type: string;
      };
    }>;
  }>;
}

export interface Report {
  id: string;
  name: string;
  type: string;
  data?: any;
  url?: string;
  progress?: number;
  status?: string;
  createdAt: string;
  updatedAt: string;
}

function getAuthToken(): string | null {
  return localStorage.getItem('token');
}

function getAuthHeaders(): HeadersInit {
  const token = getAuthToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export async function login(email: string, password: string): Promise<LoginResponse> {
  const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Login failed');
  }

  const data = await response.json();
  localStorage.setItem('token', data.token);
  return data;
}

export async function getQuestions(): Promise<Question[]> {
  const response = await fetch(`${API_BASE_URL}/api/questions`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    if (response.status === 401) {
      localStorage.removeItem('token');
      throw new Error('Unauthorized');
    }
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch questions');
  }

  const data = await response.json();
  return data.questions;
}

export async function createProduct(name: string, description?: string): Promise<Product> {
  const response = await fetch(`${API_BASE_URL}/api/products`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ name, description }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create product');
  }

  return await response.json();
}

export async function submitResponse(productId: string, answers: Answer[]): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/products/${productId}/responses`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ answers }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to submit response');
  }
}

export function logout(): void {
  localStorage.removeItem('token');
}

export function isAuthenticated(): boolean {
  return !!getAuthToken();
}

export async function getProductDetail(productId: string): Promise<ProductDetail> {
  const response = await fetch(`${API_BASE_URL}/api/products/${productId}`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    if (response.status === 401) {
      localStorage.removeItem('token');
      throw new Error('Unauthorized');
    }
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch product details');
  }

  return await response.json();
}

export async function createReport(productId: string): Promise<Report | Blob> {
  const response = await fetch(`${API_BASE_URL}/api/products/${productId}/reports`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    if (response.status === 401) {
      localStorage.removeItem('token');
      throw new Error('Unauthorized');
    }
    const error = await response.json();
    throw new Error(error.error || 'Failed to create report');
  }

  const contentType = response.headers.get('content-type');
  
  // If response is PDF (binary), return as Blob
  if (contentType?.includes('application/pdf')) {
    return await response.blob();
  }

  // Otherwise, return as JSON (report object with id)
  return await response.json();
}

export async function getReport(reportId: string): Promise<Report> {
  const response = await fetch(`${API_BASE_URL}/api/reports/${reportId}`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    if (response.status === 401) {
      localStorage.removeItem('token');
      throw new Error('Unauthorized');
    }
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch report');
  }

  return await response.json();
}

