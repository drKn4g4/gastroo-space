import { z } from 'zod';

export const WorkspaceConnectSchema = z.object({
  code: z.string().min(1, 'OAuth code is required'),
  orgId: z.string().optional(),
});

export const WorkspaceCreateSheetSchema = z.object({
  title: z.string().min(1, 'Sheet title is required'),
  orgId: z.string().optional(),
  sheetNames: z.array(z.string()).optional(),
});

export const WorkspaceSyncToSheetSchema = z.object({
  spreadsheetId: z.string().min(1, 'spreadsheetId is required'),
  range: z.string().min(1, 'range is required'),
  values: z.array(z.array(z.any())),
});

export const WorkspaceReadSheetSchema = z.object({
  spreadsheetId: z.string().min(1, 'spreadsheetId is required'),
  range: z.string().min(1, 'range is required'),
});

export const WorkspaceGetTodosSchema = z.object({
  tasksListId: z.string().optional(),
});

export const WorkspaceTodoSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  completed: z.boolean(),
  notes: z.string().optional(),
  dueDate: z.string().nullish(),
});

export const WorkspaceSyncTodosSchema = z.object({
  todos: z.array(WorkspaceTodoSchema).min(1, 'At least one todo is required'),
  tasksListId: z.string().optional(),
});

export const WorkspaceCreateDocSchema = z.object({
  title: z.string().min(1, 'Document title is required'),
  content: z.string().optional(),
  orgId: z.string().optional(),
});
