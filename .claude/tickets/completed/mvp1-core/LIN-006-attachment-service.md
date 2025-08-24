# LIN-006: Implement AttachmentService

**Status**: `todo`  
**Priority**: `low`  
**Estimate**: M (3 points)  
**Labels**: `feature`, `service`, `files`  
**Team**: Engineering  

## Description

Implement AttachmentService for managing file uploads, URL attachments, and external resource linking in Linear issues.

## Implementation Details

### File: `src/features/attachment/service.ts`

```typescript
export class AttachmentService {
  // CRUD operations
  async create(data: AttachmentCreate): Promise<Attachment>
  async update(id: string, data: AttachmentUpdate): Promise<Attachment>
  async delete(id: string): Promise<boolean>
  async get(id: string): Promise<Attachment | null>
  
  // File operations
  async uploadFile(file: FileUpload): Promise<AttachmentUploadPayload>
  async createFromUpload(issueId: string, uploadPayload: AttachmentUploadPayload): Promise<Attachment>
  
  // URL attachments
  async createFromUrl(data: AttachmentUrlCreate): Promise<Attachment>
  async getByUrl(url: string): Promise<AttachmentConnection>
  
  // Issue operations
  async listByIssue(issueId: string, pagination?: Pagination): Promise<AttachmentConnection>
  async linkToIssue(attachmentId: string, issueId: string): Promise<Attachment>
  
  // Metadata operations
  async updateMetadata(id: string, metadata: Record<string, any>): Promise<Attachment>
}
```

### Schemas

```typescript
export const FileUploadSchema = z.object({
  fileName: z.string(),
  contentType: z.string(),
  fileSize: z.number().positive(),
  content: z.instanceof(Buffer).optional(), // For server-side uploads
});

export const AttachmentCreateSchema = z.object({
  issueId: z.string(),
  title: z.string(),
  subtitle: z.string().optional(),
  url: z.string().url(),
  iconUrl: z.string().url().optional(),
  metadata: z.record(z.any()).optional(),
});

export const AttachmentUrlCreateSchema = z.object({
  issueId: z.string(),
  title: z.string(),
  subtitle: z.string().optional(),
  url: z.string().url(),
  iconUrl: z.string().url().optional(),
  metadata: z.object({
    // Rich metadata for enhanced rendering
    title: z.string().optional(),
    messages: z.array(z.object({
      subject: z.string().optional(),
      body: z.string().max(10000).optional(),
      timestamp: z.string().optional(),
    })).optional(),
    attributes: z.array(z.object({
      name: z.string(),
      value: z.string(),
    })).optional(),
  }).optional(),
});
```

## Acceptance Criteria

- [ ] Create attachments from URLs with metadata
- [ ] File upload with pre-signed URLs
- [ ] Update attachment metadata and properties
- [ ] Query attachments by URL
- [ ] List attachments per issue
- [ ] Support rich metadata for external integrations
- [ ] Handle file size limits and validation
- [ ] Unit tests with file upload mocking

## Dependencies

- Linear SDK Attachment model
- Linear fileUpload mutation
- IssueService (for validation)
- Node.js file handling (for uploads)

## Notes

- URLs act as idempotent keys (same URL updates existing)
- File uploads require server-side implementation
- Metadata supports dynamic date formatting
- Maximum file size limits apply
- Attachments can link to external tools (Sentry, GitHub, etc.)