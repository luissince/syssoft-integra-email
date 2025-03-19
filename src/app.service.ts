import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { AttachmentDto, BodyDto, Seresible } from './dto/body.dto';
import * as nodemailer from 'nodemailer';

@Injectable()
export class AppService {
  constructor() {}

  getHello(): string {
    return 'Enviado con éxito';
  }

  async sendMail(body: BodyDto): Promise<string> {
    try {
      const mailerService = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        auth: {
          user: body.from.address,
          pass: body.password,
        },
      });

      await mailerService.sendMail({
        from: body.from,
        to: body.to,
        subject: body.subject,
        html: body.html,
        attachments: body.attachments.map((item: AttachmentDto<Seresible>) => {
          if (item.content.type === 'Buffer') {
            return {
              ...item,
              content: Buffer.from(item.content.data),
            };
          }

          return item;
        }),
      });

      return 'Enviado con éxito';
    } catch (error) {
      throw new HttpException(
        error.message || 'Error al enviar el correo electrónico',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
