import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';

describe('Pruebas básicas', () => {
  it('debe sumar dos números', () => {
    expect(2 + 3).toBe(5);
  });

  it('debe sumar números negativos', () => {
    expect(-2 + 5).toBe(3);
  });
});

describe('AppController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

   afterAll(async () => {
    await app.close();
  });

  it('/send (POST) - Gmail', async () => {
    const response = await request(app.getHttpServer())
      .post('/send')
      .send({
        from: {
          address: process.env.GMAIL_USER,
          name: 'Syssoft Integra',
        },
        to: {
          address: 'alexanderlara1996@gmail.com',
          name: 'Prueba',
        },
        subject: 'Prueba de envío Gmail',
        html: '<h1>¡Hola!</h1><p>Correo enviado correctamente desde NestJS con Gmail OAuth2.</p>',
        attachments: [],
      })
      .expect(201);

    console.log(response.body);
  });
});