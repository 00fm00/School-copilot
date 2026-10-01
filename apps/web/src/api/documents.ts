import { apiClient } from './client';
import { DocumentDto, SchoolClassDto, UpdateDocumentInput } from '@school-copilot/shared';

export interface PaginatedDocumentsResponse {
  items: DocumentDto[];
  total: number;
  page: number;
  limit: number;
}

export async function fetchDocuments(
  page: number = 1,
  limit: number = 20,
): Promise<PaginatedDocumentsResponse> {
  const { data } = await apiClient.get<PaginatedDocumentsResponse>('/documents', {
    params: { page, limit },
  });
  return data;
}

export async function fetchDocument(id: string): Promise<DocumentDto> {
  const { data } = await apiClient.get<DocumentDto>(`/documents/${id}`);
  return data;
}

export async function uploadDocument(formData: FormData): Promise<DocumentDto> {
  const { data } = await apiClient.post<DocumentDto>('/documents', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

export async function updateDocument(id: string, input: UpdateDocumentInput): Promise<DocumentDto> {
  const { data } = await apiClient.patch<DocumentDto>(`/documents/${id}`, input);
  return data;
}

export async function replaceDocumentFile(id: string, formData: FormData): Promise<DocumentDto> {
  const { data } = await apiClient.put<DocumentDto>(`/documents/${id}/file`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

export async function reindexDocument(id: string): Promise<DocumentDto> {
  const { data } = await apiClient.post<DocumentDto>(`/documents/${id}/reindex`);
  return data;
}

export async function deleteDocument(id: string): Promise<{ message: string }> {
  const { data } = await apiClient.delete<{ message: string }>(`/documents/${id}`);
  return data;
}

export async function fetchClasses(): Promise<SchoolClassDto[]> {
  const { data } = await apiClient.get<SchoolClassDto[]>('/classes');
  return data;
}
