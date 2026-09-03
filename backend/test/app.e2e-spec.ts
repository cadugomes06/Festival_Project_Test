import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';
import { HttpExceptionFilter } from './../src/common/filters/http-exception.filter';

/**
 * E2e do fluxo real da API, contra o banco de desenvolvimento (mesmo Postgres
 * usado por `npm run start:dev`, populado via `npx prisma db seed`) — este
 * projeto não tem um banco de teste separado, então os testes de detalhe do
 * pedido dependem de haver ao menos um pedido seedado.
 */
describe('AppController (e2e)', () => {
  let app: INestApplication;
  let adminPassword: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }),
    );
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();

    // A senha em texto puro só existe fora do backend (README/.env.example);
    // o e2e usa a mesma credencial de dev documentada ali.
    adminPassword = 'festival2026';
  });

  afterAll(async () => {
    await app.close();
  });

  it('/health (GET) responde ok sem autenticação', () => {
    return request(app.getHttpServer()).get('/health').expect(200).expect({ status: 'ok' });
  });

  it('/orders (GET) rejeita com 401 sem token', () => {
    return request(app.getHttpServer()).get('/orders').expect(401);
  });

  it('/auth/login (POST) rejeita com 401 quando a senha está errada', () => {
    const configService = app.get(ConfigService);
    const adminEmail = configService.get<string>('ADMIN_EMAIL');

    return request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: adminEmail, password: 'senha-errada' })
      .expect(401);
  });

  it('/auth/login (POST) autentica e /orders (GET) lista pedidos com o token', async () => {
    const configService = app.get(ConfigService);
    const adminEmail = configService.get<string>('ADMIN_EMAIL');

    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: adminEmail, password: adminPassword })
      .expect(200);

    expect(loginResponse.body).toEqual({ accessToken: expect.any(String) });
    const { accessToken } = loginResponse.body;

    const ordersResponse = await request(app.getHttpServer())
      .get('/orders')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(ordersResponse.body).toMatchObject({
      total: expect.any(Number),
      page: 1,
      limit: 10,
      totalPages: expect.any(Number),
    });
    expect(Array.isArray(ordersResponse.body.data)).toBe(true);
    expect(ordersResponse.body.data.length).toBeGreaterThan(0);
    expect(ordersResponse.body.data[0]).toEqual({
      id: expect.any(Number),
      data: expect.any(String),
      nomeCliente: expect.any(String),
      valorTotal: expect.any(Number),
    });
  });

  it('/orders (GET) pagina com page/limit', async () => {
    const configService = app.get(ConfigService);
    const adminEmail = configService.get<string>('ADMIN_EMAIL');

    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: adminEmail, password: adminPassword });
    const { accessToken } = loginResponse.body;

    const pagina1 = await request(app.getHttpServer())
      .get('/orders?page=1&limit=1')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(pagina1.body.data).toHaveLength(1);
    expect(pagina1.body.limit).toBe(1);
    expect(pagina1.body.totalPages).toBeGreaterThan(1);

    const pagina2 = await request(app.getHttpServer())
      .get('/orders?page=2&limit=1')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(pagina2.body.data).toHaveLength(1);
    expect(pagina2.body.data[0].id).not.toBe(pagina1.body.data[0].id);
  });

  it('/orders/:id (GET) retorna o detalhe do pedido (itens + comprador)', async () => {
    const configService = app.get(ConfigService);
    const adminEmail = configService.get<string>('ADMIN_EMAIL');

    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: adminEmail, password: adminPassword });
    const { accessToken } = loginResponse.body;

    const ordersResponse = await request(app.getHttpServer())
      .get('/orders')
      .set('Authorization', `Bearer ${accessToken}`);
    const [primeiroPedido] = ordersResponse.body.data;

    const detailResponse = await request(app.getHttpServer())
      .get(`/orders/${primeiroPedido.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(detailResponse.body).toMatchObject({
      id: primeiroPedido.id,
      cliente: {
        id: expect.any(Number),
        nome: expect.any(String),
        email: expect.any(String),
        telefone: expect.any(String),
      },
      itens: expect.arrayContaining([
        expect.objectContaining({
          itemId: expect.any(Number),
          nome: expect.any(String),
          quantidade: expect.any(Number),
          valorUnitarioPraticado: expect.any(Number),
          subtotal: expect.any(Number),
        }),
      ]),
    });
  });

  it('/orders/:id (GET) retorna 404 para um pedido inexistente', async () => {
    const configService = app.get(ConfigService);
    const adminEmail = configService.get<string>('ADMIN_EMAIL');

    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: adminEmail, password: adminPassword });
    const { accessToken } = loginResponse.body;

    return request(app.getHttpServer())
      .get('/orders/999999')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(404);
  });
});
