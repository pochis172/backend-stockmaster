import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Categoria } from '../database/entities/categoria.entity';
import { Movimiento } from '../database/entities/movimiento.entity';
import { Producto } from '../database/entities/producto.entity';
import { ActualizarProductoDto } from './dto/actualizar-producto.dto';
import { CrearProductoDto } from './dto/crear-producto.dto';

@Injectable()
export class ProductosService {
  constructor(
    @InjectRepository(Producto)
    private readonly productosRepo: Repository<Producto>,
    @InjectRepository(Categoria)
    private readonly categoriasRepo: Repository<Categoria>,
    @InjectRepository(Movimiento)
    private readonly movimientosRepo: Repository<Movimiento>,
  ) {}

  create(dto: CrearProductoDto) {
    const { categoriaId, nombre, descripcion, precio } = dto;
    return this.saveWithCategory(
      { categoriaId },
      this.productosRepo.create({
        nombre,
        descripcion,
        precio: String(precio),
      }),
    );
  }

  findAll() {
    return this.productosRepo.find({ order: { nombre: 'ASC' } });
  }

  async findOne(id: number) {
    const producto = await this.productosRepo.findOne({ where: { id } });
    if (!producto) {
      throw new NotFoundException('Producto no encontrado');
    }
    return producto;
  }

  async update(id: number, dto: ActualizarProductoDto) {
    const producto = await this.findOne(id);
    const { categoriaId: _categoriaId, precio, ...fields } = dto;
    Object.assign(producto, fields);
    if (precio !== undefined) {
      producto.precio = String(precio);
    }
    return this.saveWithCategory(dto, producto);
  }

  async remove(id: number) {
    const producto = await this.findOne(id);
    const movements = await this.movimientosRepo.count({
      where: { producto: { id } },
    });

    if (movements > 0) {
      throw new BadRequestException(
        'No se puede eliminar un producto con movimientos registrados',
      );
    }

    await this.productosRepo.remove(producto);
    return { mensaje: 'Producto eliminado correctamente' };
  }

  private async saveWithCategory(
    dto: CrearProductoDto | ActualizarProductoDto,
    producto: Producto,
  ) {
    if (dto.categoriaId !== undefined) {
      const categoria = await this.categoriasRepo.findOne({
        where: { id: dto.categoriaId },
      });
      if (!categoria) {
        throw new NotFoundException('Categoría no encontrada');
      }
      producto.categoria = categoria;
    }

    return this.productosRepo.save(producto);
  }
}
