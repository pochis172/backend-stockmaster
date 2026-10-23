import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { jest } from '@jest/globals';
import { DataSource, EntityManager } from 'typeorm';
import {
  Movimiento,
  TipoMovimiento,
} from '../database/entities/movimiento.entity';
import { Producto } from '../database/entities/producto.entity';
import { Usuario } from '../database/entities/usuario.entity';
import { MovimientosService } from './movimientos.service';
import { CrearMovimientoDto } from './dto/crear-movimiento.dto';

describe('MovimientosService', () => {
  let service: MovimientosService;
  let producto: Producto;
  let productQuery: {
    setLock: jest.Mock;
    where: jest.Mock;
    getOne: jest.Mock;
  };
  let productRepo: { createQueryBuilder: jest.Mock; save: jest.Mock };
  let movementRepo: { create: jest.Mock; save: jest.Mock };
  let userRepo: { findOne: jest.Mock };
  let dataSource: { transaction: jest.Mock };

  beforeEach(async () => {
    producto = { id: 4, stockActual: 5 } as Producto;
    productQuery = {
      setLock: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(producto),
    };
    productRepo = {
      createQueryBuilder: jest.fn(() => productQuery),
      save: jest.fn(async (value) => value),
    };
    movementRepo = {
      create: jest.fn((value) => value),
      save: jest.fn(async (value) => value),
    };
    userRepo = {
      findOne: jest.fn().mockResolvedValue({
        id: 8,
        rol: { nombre: 'BODEGUERO' },
      }),
    };
    const repositories = new Map<unknown, unknown>([
      [Producto, productRepo],
      [Movimiento, movementRepo],
      [Usuario, userRepo],
    ]);
    const manager = {
      getRepository: jest.fn((entity: unknown) => repositories.get(entity)),
    };
    dataSource = {
      transaction: jest.fn((operation: (transactionManager: EntityManager) => unknown) =>
        operation(manager as EntityManager),
      ),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MovimientosService,
        { provide: DataSource, useValue: dataSource },
        {
          provide: getRepositoryToken(Movimiento),
          useValue: movementRepo,
        },
        { provide: getRepositoryToken(Producto), useValue: productRepo },
        { provide: getRepositoryToken(Usuario), useValue: userRepo },
      ],
    }).compile();

    service = module.get<MovimientosService>(MovimientosService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('locks the product and records outgoing movements inside a transaction', async () => {
    const dto: CrearMovimientoDto = {
      tipo: TipoMovimiento.SALIDA,
      cantidad: 3,
      productoId: producto.id,
    };

    await service.create(dto, 8);

    expect(dataSource.transaction).toHaveBeenCalledTimes(1);
    expect(productQuery.setLock).toHaveBeenCalledWith('pessimistic_write');
    expect(producto.stockActual).toBe(2);
    expect(productRepo.save).toHaveBeenCalledWith(producto);
    expect(movementRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ producto, cantidad: 3 }),
    );
  });

  it('rejects an outgoing movement larger than stock without writing', async () => {
    await expect(
      service.create(
        {
          tipo: TipoMovimiento.SALIDA,
          cantidad: 6,
          productoId: producto.id,
        },
        8,
      ),
    ).rejects.toMatchObject({ status: 400 });

    expect(productRepo.save).not.toHaveBeenCalled();
    expect(movementRepo.save).not.toHaveBeenCalled();
    expect(producto.stockActual).toBe(5);
  });
});
