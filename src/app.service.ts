import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { S3Client, PutObjectCommand, ListObjectsV2Command, GetObjectCommand } from '@aws-sdk/client-s3';
import * as nodemailer from 'nodemailer';
import { AttachmentDto, BodyDto, Seresible } from './dto/body.dto';
import { Readable } from 'stream';

@Injectable()
export class AppService {
  private sesClient: SESClient;
  private s3Client: S3Client;
  private s3BucketName = process.env.S3_BUCKET_NAME;

  constructor() {
    this.sesClient = new SESClient({
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    });

    this.s3Client = new S3Client({
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    });
  }

  async sendMail(body: BodyDto): Promise<string> {
    try {
      const hasAttachments = Array.isArray(body.attachments) && body.attachments.length > 0;
  
      if (hasAttachments) {
        // Usar nodemailer (SMTP) si hay adjuntos
        const transporter = nodemailer.createTransport({
          host: 'email-smtp.us-east-2.amazonaws.com',
          port: 465,
          secure: true,
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          },
        });
  
        const mailOptions = {
          from: `"${body.from.name || ''}" <${body.from.address}>`,
          to: `"${body.to.name || ''}" <${body.to.address}>`,
          subject: body.subject,
          html: body.html,
          attachments: body.attachments.map((item: AttachmentDto<Seresible>) => ({
            ...item,
            content:
              item.content?.type === 'Buffer'
                ? Buffer.from(item.content.data)
                : item.content,
          })),
        };
  
        await transporter.sendMail(mailOptions);
      } else {
        // Usar SDK SES directo si NO hay adjuntos (más rápido y limpio)
        const command = new SendEmailCommand({
          Source: body.from.address,
          Destination: {
            ToAddresses: [body.to.address],
          },
          Message: {
            Subject: {
              Data: body.subject,
              Charset: 'UTF-8',
            },
            Body: {
              Html: {
                Data: body.html,
                Charset: 'UTF-8',
              },
            },
          },
        });
  
        await this.sesClient.send(command);
      }
  
      // Guardar correo en S3 (opcional, útil para auditoría)
      const emailRecord = {
        from: body.from,
        to: body.to,
        subject: body.subject,
        html: body.html,
        attachments: body.attachments.length > 0 ? body.attachments.map(((attachment)=>({filename: attachment.filename}))) : [],
        sentAt: new Date().toISOString(),
      };
  
      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: this.s3BucketName,
          Key: `emails/${Date.now()}_${Math.random().toString(36).substring(2, 8)}.json`,
          Body: JSON.stringify(emailRecord, null, 2),
          ContentType: 'application/json',
        }),
      );
  
      return 'Correo enviado y guardado en S3 con éxito';
    } catch (error) {
      console.error('Error al enviar correo:', error);
      throw new HttpException(
        error.message || 'Error al enviar el correo electrónico',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
  

  async listEmails(): Promise<any[]> {
    try {
      const response = await this.s3Client.send(
        new ListObjectsV2Command({
          Bucket: this.s3BucketName,
          Prefix: 'emails/', // solo los archivos bajo esta carpeta
        }),
      );

      const emails = await Promise.all(
        (response.Contents || []).map(async (item) => {
          const command = new GetObjectCommand({
            Bucket: this.s3BucketName,
            Key: item.Key!,
          });

          const result = await this.s3Client.send(command);
          const body = await this.streamToString(result.Body as Readable);
          return JSON.parse(body);
        }),
      );

      return emails;
    } catch (error) {
      console.error('Error al listar emails:', error);
      throw new HttpException('No se pudieron listar los correos', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async listEmailsByUser(userEmail: string): Promise<any[]> {
    try {
      const response = await this.s3Client.send(
        new ListObjectsV2Command({
          Bucket: this.s3BucketName,
          Prefix: 'emails/',
        }),
      );

      const userEmails = await Promise.all(
        (response.Contents || []).map(async (item) => {
          const command = new GetObjectCommand({
            Bucket: this.s3BucketName,
            Key: item.Key!,
          });

          const result = await this.s3Client.send(command);
          const body = await this.streamToString(result.Body as Readable);
          const emailRecord = JSON.parse(body);

          // Filtrar por dirección de correo electrónico del destinatario
          if (emailRecord.to.address === userEmail) {
            return emailRecord;
          }
        }),
      );

      // Filtrar elementos nulos (correos que no coinciden con el usuario)
      return userEmails.filter(email => email !== undefined);
    } catch (error) {
      console.error('Error al listar emails por usuario:', error);
      throw new HttpException('No se pudieron listar los correos del usuario', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  private async streamToString(stream: Readable): Promise<string> {
    return new Promise((resolve, reject) => {
      const chunks: any[] = [];
      stream.on('data', (chunk) => chunks.push(chunk));
      stream.on('error', reject);
      stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
    });
  }

}
