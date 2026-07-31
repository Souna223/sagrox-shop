import { z } from "zod";

export const announcementFieldsSchema = z.object({
  message: z.string().trim().min(1, "Informe a mensagem do anúncio.").max(300, "Mensagem muito longa (máx. 300 caracteres)."),
  link: z.string().trim().url("Link inválido.").max(500, "Link muito longo.").optional().nullable(),
  startsAt: z.string().datetime("Data de início inválida.").optional(),
  endsAt: z.string().datetime("Data de término inválida.").optional(),
  active: z.boolean().default(true),
});

export const announcementSchema = announcementFieldsSchema.superRefine((data, ctx) => {
  if (data.startsAt && data.endsAt && data.endsAt <= data.startsAt) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "A data de término deve ser posterior à de início.",
      path: ["endsAt"],
    });
  }
});

export function validateAnnouncementDates(data: { startsAt?: string; endsAt?: string }): string | null {
  if (data.startsAt && data.endsAt && data.endsAt <= data.startsAt) {
    return "A data de término deve ser posterior à de início.";
  }
  return null;
}

export const faqSchema = z.object({
  question: z.string().trim().min(1, "Informe a pergunta.").max(200, "Pergunta muito longa (máx. 200 caracteres)."),
  answer: z.string().trim().min(1, "Informe a resposta."),
  sortOrder: z.coerce.number().int().min(0).default(0),
  active: z.boolean().default(true),
});

export type AnnouncementInput = z.infer<typeof announcementSchema>;
export type FaqInput = z.infer<typeof faqSchema>;

export type SerializedAnnouncement = {
  id: string;
  message: string;
  link: string | null;
  startsAt: string | null;
  endsAt: string | null;
  active: boolean;
  createdAt: string;
};

export function serializeAnnouncement(a: {
  id: string;
  message: string;
  link: string | null;
  startsAt: Date | null;
  endsAt: Date | null;
  active: boolean;
  createdAt: Date;
}): SerializedAnnouncement {
  return {
    id: a.id,
    message: a.message,
    link: a.link,
    startsAt: a.startsAt ? a.startsAt.toISOString() : null,
    endsAt: a.endsAt ? a.endsAt.toISOString() : null,
    active: a.active,
    createdAt: a.createdAt.toISOString(),
  };
}

export type SerializedFaq = {
  id: string;
  question: string;
  answer: string;
  sortOrder: number;
  active: boolean;
  createdAt: string;
};

export function serializeFaq(f: {
  id: string;
  question: string;
  answer: string;
  sortOrder: number;
  active: boolean;
  createdAt: Date;
}): SerializedFaq {
  return {
    id: f.id,
    question: f.question,
    answer: f.answer,
    sortOrder: f.sortOrder,
    active: f.active,
    createdAt: f.createdAt.toISOString(),
  };
}
