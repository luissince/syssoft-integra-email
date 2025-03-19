import { Address } from '@nestjs-modules/mailer/dist/interfaces/send-mail-options.interface';
import { Attachment } from 'nodemailer/lib/mailer';

export interface Seresible {
  type: string;
  data: [];
}

export type AttachmentDto<T = Seresible> = Attachment & {
  content: T;
};

export class BodyDto {
  from: Address;
  password: string;
  to: string;
  subject: string;
  html: string;
  attachments: AttachmentDto[];
}
