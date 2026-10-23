
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import {
  Movimiento,
  TipoMovimiento,
} from '../database/entities/movimiento.entity';
import { Producto } from '../database/entities/producto.entity';
import { Usuario } from '../database/entities/usuario.entity';
import { CrearMovimientoDto } from './dto/crear-movimiento.dto';

@Injectable()
export class MovimientosService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Movimiento)
    private readonly movimientosRepo: Repository<Movimiento>,
    @InjectRepository(Producto)
    private readonly productosRepo: Repository<Producto>,
    @InjectRepository(Usuario)
    private readonly usuariosRepo: Repository<Usuario>,
  ) {}

  async create(dto: CrearMovimientoDto, usuarioId: number) {
    return this.dataSource.transaction(async (manager) => {
      const productos = manager.getRepository(Producto);
      const movimientos = manager.getRepository(Movimiento);
      const usuarios = manager.getRepository(Usuario);

      const producto = await productos
        .createQueryBuilder('producto')
        .setLock('pessimistic_write')
        .where('producto.id = :id', { id: dto.productoId })
        .getOne();

      if (!producto) {
        throw new NotFoundException('Producto no encontrado');
      }

      const usuario = await usuarios.findOne({
        where: { id: usuarioId },
        relations: { rol: true },
      });

      if (!usuario) {
        throw new NotFoundException('Usuario responsable no encontrado');
      }

      if (dto.tipo === TipoMovimiento.SALIDA) {
        if (producto.stockActual < dto.cantidad) {
          throw new BadRequestException(
            `Stock insuficiente. Disponible: ${producto.stockActual}`,
          );
        }

        producto.stockActual -= dto.cantidad;
      } else {
        if (dto.cantidad > 2147483647 - producto.stockActual) {
          throw new BadRequestException(
            'La entrada supera el máximo de stock permitido',
          );
        }
        producto.stockActual += dto.cantidad;
      }

      await productos.save(producto);

      const movimiento = movimientos.create({
        tipo: dto.tipo,
        cantidad: dto.cantidad,
        producto,
        usuario,
      });

      return movimientos.save(movimiento);
    });
  }

  findAll() {
    return this.movimientosRepo.find({
      relations: { producto: true, usuario: true },
      order: { fecha: 'DESC' },
    });
  }

  async findByProduct(productoId: number) {
    const producto = await this.productosRepo.findOne({
      where: { id: productoId },
    });

    if (!producto) {
      throw new NotFoundException('Producto no encontrado');
    }

    return this.movimientosRepo.find({
      where: { producto: { id: productoId } },
      relations: { producto: true, usuario: true },
      order: { fecha: 'DESC' },
    });
  }
}
