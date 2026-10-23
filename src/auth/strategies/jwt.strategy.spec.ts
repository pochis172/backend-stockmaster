import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { jest } from '@jest/globals';
import { Repository } from 'typeorm';
import { Usuario } from '../../database/entities/usuario.entity';
import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let usuariosRepo: { findOne: jest.Mock };

  beforeEach(() => {
    usuariosRepo = {
      findOne: jest.fn().mockResolvedValue({
        id: 7,
        nombre: 'Database user',
        correo: 'user@example.test',
        rol: { nombre: 'CONSULTOR' },
      }),
    };
    strategy = new JwtStrategy(
      { get: jest.fn().mockReturnValue('configured-secret') } as unknown as ConfigService,
      usuariosRepo as unknown as Repository<Usuario>,
    );
  });

  it('resolves the current role from the database, not token claims', async () => {
    const requestUser = await strategy.validate({
      sub: 7,
      correo: 'user@example.test',
      rol: { nombre: 'ADMIN' },
    });

    expect(requestUser.rol.nombre).toBe('CONSULTOR');
    expect(requestUser).not.toHaveProperty('password');
    expect(usuariosRepo.findOne).toHaveBeenCalledWith({
      where: { id: 7 },
      relations: { rol: true },
    });
  });

  it('rejects tokens whose account no longer exists', async () => {
    usuariosRepo.findOne.mockResolvedValueOnce(null);
    await expect(
      strategy.validate({ sub: 7, correo: 'user@example.test' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
