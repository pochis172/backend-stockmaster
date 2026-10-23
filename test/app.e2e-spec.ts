import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { DataSource, In, Repository } from 'typeorm';
import { AppModule } from '../src/app.module';
import { Categoria } from '../src/database/entities/categoria.entity';
import { Movimiento } from '../src/database/entities/movimiento.entity';
import { Producto } from '../src/database/entities/producto.entity';
import { Rol } from '../src/database/entities/rol.entity';
import { Usuario } from '../src/database/entities/usuario.entity';

describe('StockMaster API (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let usersRepo: Repository<Usuario>;
  let rolesRepo: Repository<Rol>;
  let categoriesRepo: Repository<Categoria>;
  let productsRepo: Repository<Producto>;
  let movementsRepo: Repository<Movimiento>;
  let category: Categoria;
  let product: Producto;
  let admin: Usuario;
  let stockkeeper: Usuario;
  let consultant: Usuario;
  let adminToken: string;
  let stockkeeperToken: string;
  let consultantToken: string;
  let registeredConsultantToken: string;
  const suffix = randomUUID();
  const password = 'StockMaster-test-password';
  const userIds: number[] = [];
  const extraProductIds: number[] = [];
  const previousNodeEnv = process.env.NODE_ENV;

  beforeAll(async () => {
    process.env.NODE_ENV = 'production';
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    dataSource = app.get(DataSource);
    usersRepo = dataSource.getRepository(Usuario);
    rolesRepo = dataSource.getRepository(Rol);
    categoriesRepo = dataSource.getRepository(Categoria);
    productsRepo = dataSource.getRepository(Producto);
    movementsRepo = dataSource.getRepository(Movimiento);

    const [adminRole, stockkeeperRole, consultantRole] = await Promise.all([
      rolesRepo.findOneBy({ nombre: 'ADMIN' }),
      rolesRepo.findOneBy({ nombre: 'BODEGUERO' }),
      rolesRepo.findOneBy({ nombre: 'CONSULTOR' }),
    ]);
    if (!adminRole || !stockkeeperRole || !consultantRole) {
      throw new Error('Run the StockMaster migration before e2e tests');
    }

    const passwordHash = await bcrypt.hash(password, 4);
    [admin, stockkeeper, consultant] = await usersRepo.save([
      usersRepo.create({
        nombre: `e2e admin ${suffix}`,
        correo: `e2e-admin-${suffix}@example.test`,
        password: passwordHash,
        rol: adminRole,
      }),
      usersRepo.create({
        nombre: `e2e stockkeeper ${suffix}`,
        correo: `e2e-stockkeeper-${suffix}@example.test`,
        password: passwordHash,
        rol: stockkeeperRole,
      }),
      usersRepo.create({
        nombre: `e2e consultant ${suffix}`,
        correo: `e2e-consultant-${suffix}@example.test`,
        password: passwordHash,
        rol: consultantRole,
      }),
    ]);
    userIds.push(admin.id, stockkeeper.id, consultant.id);

    const [adminLogin, stockkeeperLogin, consultantLogin] = await Promise.all([
      request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ correo: admin.correo, password })
        .expect(200),
      request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ correo: stockkeeper.correo, password })
        .expect(200),
      request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ correo: consultant.correo, password })
        .expect(200),
    ]);
    adminToken = adminLogin.body.access_token;
    stockkeeperToken = stockkeeperLogin.body.access_token;
    consultantToken = consultantLogin.body.access_token;

    const categoryResponse = await request(app.getHttpServer())
      .post('/api/categorias')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ nombre: `e2e category ${suffix}` })
      .expect(201);
    category = categoryResponse.body as Categoria;
    const productResponse = await request(app.getHttpServer())
      .post('/api/productos')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        nombre: `e2e product ${suffix}`,
        precio: 1.25,
        categoriaId: category.id,
      })
      .expect(201);
    product = productResponse.body as Producto;
  });

  afterAll(async () => {
    if (dataSource?.isInitialized) {
      const productIds = [
        ...(product?.id ? [product.id] : []),
        ...extraProductIds,
      ];
      if (productIds.length > 0 || userIds.length > 0) {
        const query = movementsRepo
          .createQueryBuilder()
          .delete()
          .from(Movimiento);
        if (productIds.length > 0 && userIds.length > 0) {
          await query
            .where('producto_id IN (:...productIds)', { productIds })
            .orWhere('usuario_id IN (:...userIds)', { userIds })
            .execute();
        } else if (productIds.length > 0) {
          await query
            .where('producto_id IN (:...productIds)', { productIds })
            .execute();
        } else if (userIds.length > 0) {
          await query
            .where('usuario_id IN (:...userIds)', { userIds })
            .execute();
        }
      }
      if (productIds.length > 0) {
        await productsRepo.delete({ id: In(productIds) });
      }
      if (category?.id) {
        await categoriesRepo.delete(category.id);
      }
      if (userIds.length > 0) {
        await usersRepo.delete({ id: In(userIds) });
      }
    }
    await app?.close();
    if (previousNodeEnv === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = previousNodeEnv;
    }
  });

  it('authenticates users and never returns password hashes', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ correo: admin.correo, password: 'incorrect password' })
      .expect(401);

    const response = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ correo: admin.correo, password })
      .expect(200);

    expect(response.body.access_token).toEqual(expect.any(String));
    expect(response.body.usuario).not.toHaveProperty('password');
    expect(response.body.usuario).not.toHaveProperty('passwordHash');
    await request(app.getHttpServer()).get('/api/productos').expect(401);
  });

  it('registers public accounts only as CONSULTOR and rejects role escalation', async () => {
    const registration = {
      nombre: `registered ${suffix}`,
      correo: `registered-${suffix}@example.test`,
      password: 'registered-password-123',
    };
    const response = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send(registration)
      .expect(201);
    userIds.push(response.body.id as number);

    expect(response.body.rol).toBe('CONSULTOR');
    expect(response.body).not.toHaveProperty('password');
    expect(response.body).not.toHaveProperty('passwordHash');

    const savedUser = await usersRepo
      .createQueryBuilder('usuario')
      .addSelect('usuario.password')
      .where('usuario.id = :id', { id: response.body.id })
      .getOneOrFail();
    expect(await bcrypt.compare(registration.password, savedUser.password)).toBe(
      true,
    );
    const registrationLogin = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        correo: registration.correo,
        password: registration.password,
      })
      .expect(200);
    registeredConsultantToken = registrationLogin.body.access_token;

    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ ...registration, rolId: admin.rol.id })
      .expect(400);
    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send(registration)
      .expect(409);
  });

  it('serves the fixed role catalogue only to authenticated users', async () => {
    await request(app.getHttpServer())
      .get('/api/roles')
      .expect(401);

    const response = await request(app.getHttpServer())
      .get('/api/roles')
      .set('Authorization', `Bearer ${consultantToken}`)
      .expect(200);

    expect(response.body.map((role: Rol) => role.nombre).sort()).toEqual([
      'ADMIN',
      'BODEGUERO',
      'CONSULTOR',
    ]);
  });

  it('restricts user administration to ADMIN and supports safe account CRUD', async () => {
    const createDto = {
      nombre: `managed user ${suffix}`,
      correo: `managed-${suffix}@example.test`,
      password: 'managed-password-123',
      rolId: consultant.rol.id,
    };

    await request(app.getHttpServer())
      .post('/api/usuarios')
      .set('Authorization', `Bearer ${consultantToken}`)
      .set('x-role', 'ADMIN')
      .send({ ...createDto, rol: { nombre: 'ADMIN' } })
      .expect(403);
    const forgedAdminToken = await app
      .get(JwtService)
      .signAsync({
        sub: consultant.id,
        correo: consultant.correo,
        rol: { nombre: 'ADMIN' },
      });
    await request(app.getHttpServer())
      .get('/api/usuarios')
      .set('Authorization', `Bearer ${forgedAdminToken}`)
      .expect(403);

    const created = await request(app.getHttpServer())
      .post('/api/usuarios')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(createDto)
      .expect(201);
    const newUserId = created.body.id as number;
    userIds.push(newUserId);

    expect(created.body).not.toHaveProperty('password');
    expect(created.body).not.toHaveProperty('passwordHash');
    expect(created.body.rol.nombre).toBe('CONSULTOR');
    await request(app.getHttpServer())
      .get(`/api/usuarios/${newUserId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const passwordRecord = await usersRepo
      .createQueryBuilder('usuario')
      .addSelect('usuario.password')
      .where('usuario.id = :id', { id: newUserId })
      .getOneOrFail();
    expect(passwordRecord.password).not.toBe(createDto.password);
    expect(await bcrypt.compare(createDto.password, passwordRecord.password)).toBe(
      true,
    );

    const updated = await request(app.getHttpServer())
      .patch(`/api/usuarios/${newUserId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        nombre: `updated ${suffix}`,
        password: 'new-password-123',
        rolId: stockkeeper.rol.id,
      })
      .expect(200);
    expect(updated.body.nombre).toBe(`updated ${suffix}`);
    expect(updated.body.rol.nombre).toBe('BODEGUERO');
    expect(updated.body).not.toHaveProperty('password');
    const updatedPassword = await usersRepo
      .createQueryBuilder('usuario')
      .addSelect('usuario.password')
      .where('usuario.id = :id', { id: newUserId })
      .getOneOrFail();
    expect(await bcrypt.compare('new-password-123', updatedPassword.password)).toBe(
      true,
    );

    await request(app.getHttpServer())
      .patch(`/api/usuarios/${newUserId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ rol: { nombre: 'ADMIN' } })
      .expect(400);

    await request(app.getHttpServer())
      .get('/api/usuarios')
      .set('Authorization', `Bearer ${consultantToken}`)
      .expect(403);
    const users = await request(app.getHttpServer())
      .get('/api/usuarios')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(users.body.every((user: Usuario) => !('password' in user))).toBe(
      true,
    );

    await request(app.getHttpServer())
      .delete(`/api/usuarios/${newUserId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
  });

  it('protects category and product CRUD and preserves references', async () => {
    await request(app.getHttpServer())
      .post('/api/categorias')
      .set('Authorization', `Bearer ${consultantToken}`)
      .send({ nombre: `forbidden ${suffix}` })
      .expect(403);
    await request(app.getHttpServer())
      .post('/api/categorias')
      .set('Authorization', `Bearer ${stockkeeperToken}`)
      .send({ nombre: `forbidden stockkeeper category ${suffix}` })
      .expect(403);
    for (const token of [adminToken, stockkeeperToken, consultantToken]) {
      await request(app.getHttpServer())
        .get('/api/categorias')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
    }

    await request(app.getHttpServer())
      .patch(`/api/categorias/${category.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ descripcion: 'updated category' })
      .expect(200);
    const disposableCategory = await request(app.getHttpServer())
      .post('/api/categorias')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ nombre: `disposable category ${suffix}` })
      .expect(201);
    await request(app.getHttpServer())
      .delete(`/api/categorias/${disposableCategory.body.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    await request(app.getHttpServer())
      .post('/api/productos')
      .set('Authorization', `Bearer ${stockkeeperToken}`)
      .send({
        nombre: `stockkeeper product ${suffix}`,
        precio: 2,
        categoriaId: category.id,
        stockActual: 50,
      })
      .expect(400);
    const stockkeeperProduct = await request(app.getHttpServer())
      .post('/api/productos')
      .set('Authorization', `Bearer ${stockkeeperToken}`)
      .send({
        nombre: `stockkeeper product ${suffix}`,
        precio: 2,
        categoriaId: category.id,
      })
      .expect(201);
    extraProductIds.push(stockkeeperProduct.body.id as number);

    await request(app.getHttpServer())
      .patch(`/api/productos/${product.id}`)
      .set('Authorization', `Bearer ${consultantToken}`)
      .send({ nombre: 'forbidden update' })
      .expect(403);

    await request(app.getHttpServer())
      .patch(`/api/productos/${product.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ stockActual: 100 })
      .expect(400);

    const disposableProduct = await request(app.getHttpServer())
      .post('/api/productos')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        nombre: `disposable product ${suffix}`,
        precio: 3,
        categoriaId: category.id,
      })
      .expect(201);
    await request(app.getHttpServer())
      .patch(`/api/productos/${disposableProduct.body.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ precio: 4.5 })
      .expect(200);
    await request(app.getHttpServer())
      .delete(`/api/productos/${disposableProduct.body.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const products = await request(app.getHttpServer())
      .get('/api/productos')
      .set('Authorization', `Bearer ${consultantToken}`)
      .expect(200);
    expect(products.body.some((item: Producto) => item.id === product.id)).toBe(
      true,
    );
    await request(app.getHttpServer())
      .get('/api/productos')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    await request(app.getHttpServer())
      .get('/api/productos')
      .set('Authorization', `Bearer ${registeredConsultantToken}`)
      .expect(200);
    await request(app.getHttpServer())
      .get(`/api/productos/${product.id}`)
      .set('Authorization', `Bearer ${stockkeeperToken}`)
      .expect(200);

    await request(app.getHttpServer())
      .delete(`/api/categorias/${category.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(400);
  });

  it('enforces the authorization matrix for every protected API endpoint', async () => {
    const roleTokens = {
      ADMIN: adminToken,
      BODEGUERO: stockkeeperToken,
      CONSULTOR: consultantToken,
    };
    const roleNames = Object.keys(roleTokens) as Array<
      keyof typeof roleTokens
    >;
    const readCases: Array<{
      path: string;
      allowedRoles: Array<keyof typeof roleTokens>;
    }> = [
      { path: '/api/roles', allowedRoles: roleNames },
      { path: `/api/roles/${admin.rol.id}`, allowedRoles: roleNames },
      { path: '/api/usuarios', allowedRoles: ['ADMIN'] },
      { path: `/api/usuarios/${admin.id}`, allowedRoles: ['ADMIN'] },
      { path: '/api/categorias', allowedRoles: roleNames },
      { path: `/api/categorias/${category.id}`, allowedRoles: roleNames },
      { path: '/api/productos', allowedRoles: roleNames },
      { path: `/api/productos/${product.id}`, allowedRoles: roleNames },
      { path: '/api/movimientos', allowedRoles: roleNames },
      {
        path: `/api/movimientos/producto/${product.id}`,
        allowedRoles: roleNames,
      },
    ];

    for (const { path, allowedRoles } of readCases) {
      await request(app.getHttpServer()).get(path).expect(401);
      for (const role of roleNames) {
        const response = await request(app.getHttpServer())
          .get(path)
          .set('Authorization', `Bearer ${roleTokens[role]}`);
        expect(response.status).toBe(
          allowedRoles.includes(role) ? 200 : 403,
        );
      }
    }

    const writeCases: Array<{
      method: 'post' | 'patch' | 'delete';
      path: string;
      allowedRoles: Array<keyof typeof roleTokens>;
    }> = [
      { method: 'post', path: '/api/usuarios', allowedRoles: ['ADMIN'] },
      {
        method: 'patch',
        path: `/api/usuarios/${admin.id}`,
        allowedRoles: ['ADMIN'],
      },
      {
        method: 'delete',
        path: `/api/usuarios/${admin.id}`,
        allowedRoles: ['ADMIN'],
      },
      { method: 'post', path: '/api/categorias', allowedRoles: ['ADMIN'] },
      {
        method: 'patch',
        path: `/api/categorias/${category.id}`,
        allowedRoles: ['ADMIN'],
      },
      {
        method: 'delete',
        path: `/api/categorias/${category.id}`,
        allowedRoles: ['ADMIN'],
      },
      {
        method: 'post',
        path: '/api/productos',
        allowedRoles: ['ADMIN', 'BODEGUERO'],
      },
      {
        method: 'patch',
        path: `/api/productos/${product.id}`,
        allowedRoles: ['ADMIN'],
      },
      {
        method: 'delete',
        path: `/api/productos/${product.id}`,
        allowedRoles: ['ADMIN'],
      },
      { method: 'post', path: '/api/movimientos', allowedRoles: ['BODEGUERO'] },
    ];

    for (const { method, path, allowedRoles } of writeCases) {
      await request(app.getHttpServer())[method](path).expect(401);
      for (const role of roleNames) {
        if (!allowedRoles.includes(role)) {
          await request(app.getHttpServer())
            [method](path)
            .set('Authorization', `Bearer ${roleTokens[role]}`)
            .expect(403);
        }
      }
    }
  });

  it('records stock movements transactionally and rejects insufficient stock', async () => {
    const entry = {
      tipo: 'entrada',
      cantidad: 10,
      productoId: product.id,
    };
    await request(app.getHttpServer())
      .post('/api/movimientos')
      .set('Authorization', `Bearer ${consultantToken}`)
      .send(entry)
      .expect(403);

    await request(app.getHttpServer())
      .post('/api/movimientos')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(entry)
      .expect(403);
    for (const invalid of [
      { ...entry, cantidad: 0 },
      { ...entry, cantidad: 1.5 },
      { ...entry, tipo: 'invalid' },
      { ...entry, productoId: -1 },
    ]) {
      await request(app.getHttpServer())
        .post('/api/movimientos')
        .set('Authorization', `Bearer ${stockkeeperToken}`)
        .send(invalid)
        .expect(400);
    }

    const movement = await request(app.getHttpServer())
      .post('/api/movimientos')
      .set('Authorization', `Bearer ${stockkeeperToken}`)
      .send(entry)
      .expect(201);
    expect(movement.body.usuario).not.toHaveProperty('password');

    await request(app.getHttpServer())
      .post('/api/movimientos')
      .set('Authorization', `Bearer ${stockkeeperToken}`)
      .send({ ...entry, tipo: 'salida', cantidad: 11 })
      .expect(400);

    let storedProduct = await productsRepo.findOneByOrFail({ id: product.id });
    expect(storedProduct.stockActual).toBe(10);

    await request(app.getHttpServer())
      .post('/api/movimientos')
      .set('Authorization', `Bearer ${stockkeeperToken}`)
      .send({ ...entry, tipo: 'salida', cantidad: 8 })
      .expect(201);
    storedProduct = await productsRepo.findOneByOrFail({ id: product.id });
    expect(storedProduct.stockActual).toBe(2);
    const movements = await request(app.getHttpServer())
      .get(`/api/movimientos/producto/${product.id}`)
      .set('Authorization', `Bearer ${consultantToken}`)
      .expect(200);
    expect(movements.body).toHaveLength(2);
    for (const token of [adminToken, stockkeeperToken]) {
      await request(app.getHttpServer())
        .get(`/api/movimientos/producto/${product.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
    }
    await request(app.getHttpServer())
      .get('/api/movimientos')
      .set('Authorization', `Bearer ${consultantToken}`)
      .expect(200);

    await request(app.getHttpServer())
      .post('/api/movimientos')
      .set('Authorization', `Bearer ${stockkeeperToken}`)
      .send({ ...entry, tipo: 'salida', cantidad: 3 })
      .expect(400);
    storedProduct = await productsRepo.findOneByOrFail({ id: product.id });
    expect(storedProduct.stockActual).toBe(2);

    const concurrentResults = await Promise.all([
      request(app.getHttpServer())
        .post('/api/movimientos')
        .set('Authorization', `Bearer ${stockkeeperToken}`)
        .send({ ...entry, tipo: 'salida', cantidad: 2 }),
      request(app.getHttpServer())
        .post('/api/movimientos')
        .set('Authorization', `Bearer ${stockkeeperToken}`)
        .send({ ...entry, tipo: 'salida', cantidad: 2 }),
    ]);
    expect(concurrentResults.map((result) => result.status).sort()).toEqual([
      201,
      400,
    ]);
    storedProduct = await productsRepo.findOneByOrFail({ id: product.id });
    expect(storedProduct.stockActual).toBe(0);

    await request(app.getHttpServer())
      .delete(`/api/productos/${product.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(400);
  });
});
