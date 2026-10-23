import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { jest } from '@jest/globals';
import * as bcrypt from 'bcrypt';
import { Movimiento } from '../database/entities/movimiento.entity';
import { Rol } from '../database/entities/rol.entity';
import { Usuario } from '../database/entities/usuario.entity';
import { UsuariosService } from './usuarios.service';

describe('UsuariosService', () => {
  let service: UsuariosService;
  let usuariosRepo: {
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
  };
  let rolesRepo: { findOne: jest.Mock };
  let movimientosRepo: { count: jest.Mock };
  const role = { id: 2, nombre: 'CONSULTOR' } as Rol;

  beforeEach(async () => {
    usuariosRepo = {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn((value) => value),
      save: jest.fn(async (user) => ({
        ...user,
        id: 17,
        fechaCreacion: new Date(),
      })),
    };
    rolesRepo = { findOne: jest.fn().mockResolvedValue(role) };
    movimientosRepo = { count: jest.fn().mockResolvedValue(0) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsuariosService,
        { provide: getRepositoryToken(Usuario), useValue: usuariosRepo },
        { provide: getRepositoryToken(Rol), useValue: rolesRepo },
        { provide: getRepositoryToken(Movimiento), useValue: movimientosRepo },
      ],
    }).compile();

    service = module.get<UsuariosService>(UsuariosService);
  });

  it('hashes account passwords and returns only public user fields', async () => {
    const result = await service.create({
      nombre: 'Test User',
      correo: 'test@example.test',
      password: 'safe-password-123',
      rolId: role.id,
    });

    const persisted = usuariosRepo.save.mock.calls[0][0] as Usuario;
    expect(await bcrypt.compare('safe-password-123', persisted.password)).toBe(
      true,
    );
    expect(result).not.toHaveProperty('password');
    expect(result).not.toHaveProperty('passwordHash');
    expect(result.rol.nombre).toBe('CONSULTOR');
  });

  it('rejects assignment to a role that does not exist', async () => {
    rolesRepo.findOne.mockResolvedValueOnce(null);
    await expect(
      service.create({
        nombre: 'Test User',
        correo: 'test@example.test',
        password: 'safe-password-123',
        rolId: 999,
      }),
    ).rejects.toMatchObject({ status: 404 });
    expect(usuariosRepo.save).not.toHaveBeenCalled();
  });
});
