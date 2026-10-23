import { Test, TestingModule } from '@nestjs/testing';
import { jest } from '@jest/globals';
import { JwtService } from '@nestjs/jwt';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Rol } from '../database/entities/rol.entity';
import { Usuario } from '../database/entities/usuario.entity';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let jwtService: { signAsync: jest.Mock };
  let usersRepository: {
    createQueryBuilder: jest.Mock;
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
  };
  let rolesRepository: { findOne: jest.Mock };
  let queryBuilder: {
    addSelect: jest.Mock;
    leftJoinAndSelect: jest.Mock;
    where: jest.Mock;
    getOne: jest.Mock;
  };
  let user: Usuario;

  beforeEach(async () => {
    user = {
      id: 5,
      nombre: 'Test User',
      correo: 'test@example.test',
      password: await bcrypt.hash('correct-password', 4),
      rol: { id: 1, nombre: 'ADMIN' },
    } as Usuario;
    queryBuilder = {
      addSelect: jest.fn().mockReturnThis(),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(user),
    };
    jwtService = { signAsync: jest.fn().mockResolvedValue('signed-token') };
    usersRepository = {
      createQueryBuilder: jest.fn(() => queryBuilder),
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn((value) => value),
      save: jest.fn(async (value) => ({
        ...value,
        id: 9,
        fechaCreacion: new Date(),
      })),
    };
    rolesRepository = {
      findOne: jest.fn().mockResolvedValue({ id: 3, nombre: 'CONSULTOR' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(Usuario),
          useValue: usersRepository,
        },
        { provide: getRepositoryToken(Rol), useValue: rolesRepository },
        { provide: JwtService, useValue: jwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('authenticates using the persisted role and omits password hashes', async () => {
    const response = await service.login(
      'test@example.test',
      'correct-password',
    );
    expect(response.access_token).toBe('signed-token');
    expect(response.usuario.rol).toBe('ADMIN');
    expect(response.usuario).not.toHaveProperty('password');
    expect(response.usuario).not.toHaveProperty('passwordHash');
    expect(jwtService.signAsync).toHaveBeenCalledWith({
      sub: user.id,
      correo: user.correo,
    });
  });

  it('rejects incorrect passwords and does not issue a token', async () => {
    await expect(
      service.login('test@example.test', 'incorrect-password'),
    ).rejects.toMatchObject({ status: 401 });
    expect(jwtService.signAsync).not.toHaveBeenCalled();
  });

  it('rejects unknown email addresses', async () => {
    queryBuilder.getOne.mockResolvedValueOnce(null);
    await expect(
      service.login('missing@example.test', 'any-password'),
    ).rejects.toMatchObject({ status: 401 });
  });

  it('registers only as CONSULTOR and hashes the password', async () => {
    const result = await service.register({
      nombre: 'New user',
      correo: 'new@example.test',
      password: 'secure-password',
    });

    const saved = usersRepository.save.mock.calls[0][0];
    expect(await bcrypt.compare('secure-password', saved.password)).toBe(true);
    expect(result.rol).toBe('CONSULTOR');
    expect(result).not.toHaveProperty('password');
    expect(result).not.toHaveProperty('passwordHash');
  });

  it('rejects duplicate registration and does not create another account', async () => {
    usersRepository.findOne.mockResolvedValueOnce(user);
    await expect(
      service.register({
        nombre: 'Duplicate user',
        correo: user.correo,
        password: 'secure-password',
      }),
    ).rejects.toMatchObject({ status: 409 });
    expect(usersRepository.save).not.toHaveBeenCalled();
  });
});
