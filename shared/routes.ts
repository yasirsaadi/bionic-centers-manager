import { z } from 'zod';
import { insertPatientSchema, insertPaymentSchema, insertDocumentSchema, insertVisitSchema, insertBranchSchema, patients, payments, documents, visits, branches } from './schema';

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

export const api = {
  branches: {
    list: {
      method: 'GET' as const,
      path: '/api/branches',
      responses: {
        200: z.array(z.custom<typeof branches.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/branches',
      input: insertBranchSchema,
      responses: {
        201: z.custom<typeof branches.$inferSelect>(),
        400: errorSchemas.validation,
      },
    }
  },
  patients: {
    list: {
      method: 'GET' as const,
      path: '/api/patients',
      responses: {
        200: z.array(z.custom<typeof patients.$inferSelect>()),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/patients/:id',
      responses: {
        200: z.custom<typeof patients.$inferSelect & { payments: typeof payments.$inferSelect[], documents: typeof documents.$inferSelect[], visits: typeof visits.$inferSelect[] }>(),
        404: errorSchemas.notFound,
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/patients',
      input: insertPatientSchema,
      responses: {
        201: z.custom<typeof patients.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/patients/:id',
      input: insertPatientSchema.partial(),
      responses: {
        200: z.custom<typeof patients.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/patients/:id',
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },
    transfer: {
      method: 'POST' as const,
      path: '/api/patients/:id/transfer',
      input: z.object({ branchId: z.number() }),
      responses: {
        200: z.custom<typeof patients.$inferSelect>(),
        404: errorSchemas.notFound,
      }
    }
  },
  visits: {
    create: {
      method: 'POST' as const,
      path: '/api/visits',
      input: insertVisitSchema,
      responses: {
        201: z.custom<typeof visits.$inferSelect>(),
        400: errorSchemas.validation,
      }
    }
  },
  payments: {
    create: {
      method: 'POST' as const,
      path: '/api/payments',
      input: insertPaymentSchema,
      responses: {
        201: z.custom<typeof payments.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/payments/:id',
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      }
    }
  },
  documents: {
    create: {
      method: 'POST' as const,
      path: '/api/documents',
      responses: {
        201: z.custom<typeof documents.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/documents/:id',
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      }
    }
  },
  reports: {
    daily: {
      method: 'GET' as const,
      path: '/api/reports/daily/:branchId',
      responses: {
        200: z.object({
          revenue: z.number(),
          sold: z.number(),
          paid: z.number(),
          remaining: z.number()
        })
      }
    }
  }
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
