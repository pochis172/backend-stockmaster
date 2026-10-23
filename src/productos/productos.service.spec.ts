import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Categoria } from '../database/entities/categoria.entity';
import { Movimiento } from '../database/entities/movimiento.entity';
import { Producto } from '../database/entities/producto.entity';
import { ProductosService } from './productos.service';

describe('ProductosService', () => {
  let service: ProductosService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductosService,
        { provide: getRepositoryToken(Producto), useValue: {} },
        { provide: getRepositoryToken(Categoria), useValue: {} },
        { provide: getRepositoryToken(Movimiento), useValue: {} },
      ],
    }).compile();

    service = module.get<ProductosService>(ProductosService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
