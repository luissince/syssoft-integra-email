import { Attachment } from 'nodemailer/lib/mailer';

export class EmailAddress {
  address: string;
  name?: string;
}
export interface Seresible {
  type: string;
  data: [];
}

export type AttachmentDto<T = Seresible> = Attachment & {
  content: T;
};

export class BodyDto {
  from: EmailAddress;
  to: EmailAddress;
  subject: string;
  html: string;
  attachments: AttachmentDto[];
}
