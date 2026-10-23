import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Categoria } from '../database/entities/categoria.entity';
import { Producto } from '../database/entities/producto.entity';
import { ActualizarCategoriaDto } from './dto/actualizar-categoria.dto';
import { CrearCategoriaDto } from './dto/crear-categoria.dto';

@Injectable()
export class CategoriasService {
  constructor(
    @InjectRepository(Categoria)
    private readonly categoriasRepo: Repository<Categoria>,
    @InjectRepository(Producto)
    private readonly productosRepo: Repository<Producto>,
  ) {}

  create(dto: CrearCategoriaDto) {
    return this.categoriasRepo.save(this.categoriasRepo.create(dto));
  }

  async update(id: number, dto: ActualizarCategoriaDto) {
    const categoria = await this.findOne(id);
    Object.assign(categoria, dto);
    return this.categoriasRepo.save(categoria);
  }

  findAll() {
    return this.categoriasRepo.find({ order: { nombre: 'ASC' } });
  }

  async findOne(id: number) {
    const categoria = await this.categoriasRepo.findOne({ where: { id } });
    if (!categoria) {
      throw new NotFoundException('Categoría no encontrada');
    }
    return categoria;
  }

  async remove(id: number) {
    const categoria = await this.findOne(id);
    const products = await this.productosRepo.count({
      where: { categoria: { id } },
    });

    if (products > 0) {
      throw new BadRequestException(
        'No se puede eliminar una categoría que tiene productos',
      );
    }

    await this.categoriasRepo.remove(categoria);
    return { mensaje: 'Categoría eliminada correctamente' };
  }
}
